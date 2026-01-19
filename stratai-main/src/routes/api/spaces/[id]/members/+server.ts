/**
 * Space Members API - List and Add
 *
 * GET /api/spaces/[id]/members - List all members
 * POST /api/spaces/[id]/members - Add a member (user or group)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresSpaceMembershipsRepository, postgresUserRepository } from '$lib/server/persistence';
import { canManageSpaceMembers, type SpaceRole, type SpaceMembershipWithUser } from '$lib/types/space-memberships';
import { sql } from '$lib/server/persistence/db';
import { sendEmail } from '$lib/server/email/sendgrid';
import { getSpaceInvitationEmail } from '$lib/server/email/templates';

/**
 * GET /api/spaces/[id]/members
 * Returns all members of the space with user/group details
 * Includes requester's role and access source
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const spaceId = params.id;

	try {
		// Check access
		const access = await postgresSpaceMembershipsRepository.canAccessSpace(userId, spaceId);

		if (!access.hasAccess) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		// Fetch all members from memberships table
		const members = await postgresSpaceMembershipsRepository.getMembers(spaceId);

		// Fetch the space owner (stored in spaces.user_id, not in memberships)
		// Use COALESCE for display_name fallback to first_name + last_name
		const ownerRows = await sql<{
			ownerId: string;
			ownerEmail: string;
			ownerDisplayName: string | null;
			spaceCreatedAt: Date;
		}[]>`
			SELECT
				s.user_id as owner_id,
				u.email as owner_email,
				COALESCE(u.display_name, CONCAT_WS(' ', u.first_name, u.last_name)) as owner_display_name,
				s.created_at as space_created_at
			FROM spaces s
			JOIN users u ON s.user_id = u.id
			WHERE s.id = ${spaceId}
				AND s.deleted_at IS NULL
		`;

		// Check if owner already exists in members list (from space_memberships table)
		// This prevents duplicates since migration 031 auto-creates owner memberships
		let allMembers: SpaceMembershipWithUser[] = [...members];

		if (ownerRows.length > 0) {
			const owner = ownerRows[0];

			// Check if owner is already in the members list
			const ownerAlreadyExists = members.some(m => m.userId === owner.ownerId);

			if (!ownerAlreadyExists) {
				// Only synthesize owner record if they're not already in the list
				const ownerMembership: SpaceMembershipWithUser = {
					id: `owner_${spaceId}`, // Synthetic ID
					spaceId,
					userId: owner.ownerId,
					// groupId and invitedBy omitted (undefined) for owner
					role: 'owner',
					createdAt: owner.spaceCreatedAt,
					updatedAt: owner.spaceCreatedAt, // Same as created for synthetic record
					user: {
						id: owner.ownerId,
						email: owner.ownerEmail,
						displayName: owner.ownerDisplayName,
						avatarUrl: null // avatar_url column not yet in database
					}
				};
				// Owner goes first
				allMembers = [ownerMembership, ...members];
			}
		}

		return json({
			members: allMembers,
			userRole: access.role,
			accessSource: access.source
		});
	} catch (error) {
		console.error('Failed to fetch space members:', error);
		return json(
			{
				error: 'Failed to fetch members',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * POST /api/spaces/[id]/members
 * Body: { targetUserId?: string, groupId?: string, role: SpaceRole }
 *
 * Must provide exactly one of targetUserId or groupId (XOR constraint).
 * Role must be one of: admin, member, guest (owner is implicit via space ownership).
 * Requires admin+ permission.
 */
export const POST: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const spaceId = params.id;

	try {
		// Check access and permission
		const access = await postgresSpaceMembershipsRepository.canAccessSpace(userId, spaceId);

		if (!access.hasAccess) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		if (!canManageSpaceMembers(access.role)) {
			return json(
				{ error: 'Insufficient permissions. Admin access required.' },
				{ status: 403 }
			);
		}

		const body = await request.json();
		const { targetUserId, groupId, role } = body;

		// Validate XOR: must have exactly one of userId or groupId
		if ((!targetUserId && !groupId) || (targetUserId && groupId)) {
			return json(
				{ error: 'Must provide exactly one of targetUserId or groupId' },
				{ status: 400 }
			);
		}

		// Validate role (cannot assign 'owner' via membership - ownership is through spaces.user_id)
		const validRoles: SpaceRole[] = ['admin', 'member', 'guest'];
		if (!validRoles.includes(role)) {
			return json(
				{ error: 'Invalid role. Must be one of: admin, member, guest' },
				{ status: 400 }
			);
		}

		// Get space details for email (need name, slug, type)
		const spaceRows = await sql<{ name: string; slug: string; type: string }[]>`
			SELECT name, slug, space_type as type FROM spaces WHERE id = ${spaceId} AND deleted_at IS NULL
		`;
		const space = spaceRows[0];

		if (!space) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		// Add the member (upsert pattern - updates role if already exists)
		const membership = targetUserId
			? await postgresSpaceMembershipsRepository.addUserMember(spaceId, targetUserId, role, userId)
			: await postgresSpaceMembershipsRepository.addGroupMember(spaceId, groupId, role, userId);

		// Send space invitation email (only for user memberships, not group or org spaces)
		// Don't send if: org space, self-add, or group membership
		if (targetUserId && space.type !== 'organization' && targetUserId !== userId) {
			try {
				// Get target user details
				const targetUser = await postgresUserRepository.findById(targetUserId);
				// Get inviter details
				const inviter = await postgresUserRepository.findById(userId);

				if (targetUser?.email) {
					const inviterName = inviter?.displayName || inviter?.firstName || inviter?.email || 'A team member';
					const firstName = targetUser.firstName || targetUser.displayName || 'there';

					const emailContent = getSpaceInvitationEmail({
						firstName,
						inviterName,
						spaceName: space.name,
						spaceSlug: space.slug,
						role: role as 'admin' | 'member' | 'guest'
					});

					await sendEmail({
						to: targetUser.email,
						subject: emailContent.subject,
						html: emailContent.html,
						text: emailContent.text,
						orgId: locals.session.organizationId,
						userId: targetUserId,
						emailType: 'space_invite',
						metadata: { spaceId, spaceName: space.name, role, invitedBy: userId }
					});
				}
			} catch (emailError) {
				// Log but don't fail - membership was created successfully
				console.error('Failed to send space invitation email:', emailError);
			}
		}

		return json(membership, { status: 201 });
	} catch (error) {
		console.error('Failed to add space member:', error);
		return json(
			{
				error: 'Failed to add member',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
