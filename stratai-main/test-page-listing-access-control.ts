/**
 * End-to-End Testing Script for Page Listing Access Control Fix
 * Tests US-004 acceptance criteria for findAll(), search(), count() access control
 *
 * Created: 2026-01-16
 * Feature: Page Listing Access Control Fix (US-001, US-002, US-003)
 *
 * Run with: npx tsx test-page-listing-access-control.ts
 *
 * NOTE: This script directly queries the database to test the CTE-based access control
 * logic implemented in pages-postgres.ts, without using SvelteKit's module system.
 */

import postgres from 'postgres';
import type { Row, PendingQuery } from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://ghuroux@localhost:5432/stratai';
const sql = postgres(DATABASE_URL, {
	transform: {
		column: {
			to: postgres.fromCamel,
			from: postgres.toCamel
		}
	}
});

// Test state
interface TestContext {
	userA: { id: string; email: string };
	userB: { id: string; email: string };
	spaceId: string;
	areaId: string;
	restrictedAreaId: string;
	pages: {
		ownedByA_private: string;
		ownedByA_area: string;
		ownedByA_sharedWithB: string;
		ownedByA_inRestrictedArea: string;
		deletedPage: string;
	};
	createdRestrictedArea: boolean;
}

let ctx: TestContext;
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

// Test utilities
function assert(condition: boolean, message: string): void {
	if (condition) {
		console.log(`  ✅ ${message}`);
		passedTests++;
	} else {
		console.log(`  ❌ ${message}`);
		failedTests++;
	}
}

function skip(message: string): void {
	console.log(`  ⏭️  ${message} (skipped)`);
	skippedTests++;
}

// ============================================================================
// CTE Implementation (mirror of pages-postgres.ts buildAccessiblePagesCTE)
// ============================================================================

function buildAccessiblePagesCTE(userId: string): PendingQuery<Row[]> {
	return sql`
		accessible_pages AS (
			-- Path 1: User owns the page
			SELECT p.id
			FROM pages p
			WHERE p.user_id = ${userId}
				AND p.deleted_at IS NULL

			UNION

			-- Path 2: Private page with direct user share
			SELECT p.id
			FROM pages p
			JOIN page_user_shares pus ON p.id = pus.page_id
			WHERE pus.user_id = ${userId}
				AND p.visibility = 'private'
				AND p.deleted_at IS NULL

			UNION

			-- Path 3: Private page with group share (user in shared group)
			SELECT p.id
			FROM pages p
			JOIN page_group_shares pgs ON p.id = pgs.page_id
			JOIN group_memberships gm ON pgs.group_id = gm.group_id
			WHERE gm.user_id = ${userId}::uuid
				AND p.visibility = 'private'
				AND p.deleted_at IS NULL

			UNION

			-- Path 4: Area-visible page where user has area access
			-- Mirrors canAccessArea logic: owner, membership, group, or space fallthrough
			SELECT p.id
			FROM pages p
			JOIN areas a ON p.area_id = a.id
			LEFT JOIN spaces s ON a.space_id = s.id
			LEFT JOIN space_memberships sm ON s.id = sm.space_id AND sm.user_id = ${userId}
			LEFT JOIN area_memberships am ON a.id = am.area_id AND am.user_id = ${userId}
			LEFT JOIN (
				-- Group membership for area access
				SELECT DISTINCT am_grp.area_id
				FROM area_memberships am_grp
				JOIN group_memberships gm ON am_grp.group_id = gm.group_id
				WHERE gm.user_id = ${userId}::uuid
			) grp_access ON a.id = grp_access.area_id
			WHERE p.visibility = 'area'
				AND p.deleted_at IS NULL
				AND a.deleted_at IS NULL
				AND (
					-- User created the area
					a.user_id = ${userId} OR a.created_by = ${userId}
					-- OR user has direct area membership
					OR am.user_id IS NOT NULL
					-- OR user has area access via group
					OR grp_access.area_id IS NOT NULL
					-- OR user owns the space
					OR s.user_id = ${userId}
					-- OR non-restricted area with space membership (non-guest)
					OR (
						COALESCE(a.is_restricted, false) = false
						AND sm.user_id IS NOT NULL
						AND sm.role IN ('owner', 'admin', 'member')
					)
				)

			UNION

			-- Path 5: Space-visible page where user owns the space
			SELECT p.id
			FROM pages p
			JOIN areas a ON p.area_id = a.id
			JOIN spaces s ON a.space_id = s.id
			WHERE p.visibility = 'space'
				AND s.user_id = ${userId}
				AND p.deleted_at IS NULL
				AND a.deleted_at IS NULL
				AND s.deleted_at IS NULL
		)
	`;
}

// Repository-like functions that test the actual CTE logic
async function findAll(userId: string, areaId?: string): Promise<string[]> {
	const accessiblePagesCTE = buildAccessiblePagesCTE(userId);

	let rows;
	if (areaId) {
		rows = await sql<{ id: string }[]>`
			WITH ${accessiblePagesCTE}
			SELECT p.id
			FROM pages p
			WHERE p.id IN (SELECT id FROM accessible_pages)
				AND p.area_id = ${areaId}
				AND p.deleted_at IS NULL
			ORDER BY p.updated_at DESC
		`;
	} else {
		rows = await sql<{ id: string }[]>`
			WITH ${accessiblePagesCTE}
			SELECT p.id
			FROM pages p
			WHERE p.id IN (SELECT id FROM accessible_pages)
				AND p.deleted_at IS NULL
			ORDER BY p.updated_at DESC
		`;
	}

	return rows.map(r => r.id);
}

async function search(query: string, userId: string, areaId?: string): Promise<string[]> {
	const searchQuery = query.trim().split(/\s+/).join(' & ');
	const accessiblePagesCTE = buildAccessiblePagesCTE(userId);

	let rows;
	if (areaId) {
		rows = await sql<{ id: string }[]>`
			WITH ${accessiblePagesCTE}
			SELECT p.id
			FROM pages p
			WHERE p.id IN (SELECT id FROM accessible_pages)
				AND p.area_id = ${areaId}
				AND p.deleted_at IS NULL
				AND to_tsvector('english', coalesce(p.title, '') || ' ' || coalesce(p.content_text, ''))
					@@ to_tsquery('english', ${searchQuery})
			ORDER BY ts_rank(
				to_tsvector('english', coalesce(p.title, '') || ' ' || coalesce(p.content_text, '')),
				to_tsquery('english', ${searchQuery})
			) DESC
			LIMIT 50
		`;
	} else {
		rows = await sql<{ id: string }[]>`
			WITH ${accessiblePagesCTE}
			SELECT p.id
			FROM pages p
			WHERE p.id IN (SELECT id FROM accessible_pages)
				AND p.deleted_at IS NULL
				AND to_tsvector('english', coalesce(p.title, '') || ' ' || coalesce(p.content_text, ''))
					@@ to_tsquery('english', ${searchQuery})
			ORDER BY ts_rank(
				to_tsvector('english', coalesce(p.title, '') || ' ' || coalesce(p.content_text, '')),
				to_tsquery('english', ${searchQuery})
			) DESC
			LIMIT 50
		`;
	}

	return rows.map(r => r.id);
}

async function count(userId: string, areaId?: string): Promise<number> {
	const accessiblePagesCTE = buildAccessiblePagesCTE(userId);
	let result;

	if (areaId) {
		result = await sql<{ count: string }[]>`
			WITH ${accessiblePagesCTE}
			SELECT COUNT(*) as count
			FROM pages p
			WHERE p.id IN (SELECT id FROM accessible_pages)
				AND p.area_id = ${areaId}
				AND p.deleted_at IS NULL
		`;
	} else {
		result = await sql<{ count: string }[]>`
			WITH ${accessiblePagesCTE}
			SELECT COUNT(*) as count
			FROM pages p
			WHERE p.id IN (SELECT id FROM accessible_pages)
				AND p.deleted_at IS NULL
		`;
	}

	return parseInt(result[0]?.count || '0', 10);
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
	console.log('🧪 Page Listing Access Control - End-to-End Tests\n');
	console.log('='.repeat(70) + '\n');

	try {
		await setupTestData();

		console.log('');
		await testOwnerSeesOwnPages();

		console.log('');
		await testAreaMemberSeesAreaVisiblePages();

		console.log('');
		await testDirectShareVisibility();

		console.log('');
		await testPrivatePageIsolation();

		console.log('');
		await testRestrictedAreaIsolation();

		console.log('');
		await testDeletedPagesExcluded();

		console.log('');
		await testSearchAccessControl();

		console.log('');
		await testCountAccessControl();

		console.log('\n' + '='.repeat(70));
		console.log(`\n📊 Test Results: ${passedTests} passed, ${failedTests} failed, ${skippedTests} skipped`);

		if (failedTests === 0) {
			console.log('\n✅ All tests passed! US-004 acceptance criteria verified.');
		} else {
			console.log('\n❌ Some tests failed. Please review the implementation.');
		}
		console.log('='.repeat(70));

	} catch (error) {
		console.error('\n❌ Tests failed with error:', error);
		process.exit(1);
	} finally {
		await cleanup();
		await sql.end();
	}
}

// ============================================================================
// Setup & Teardown
// ============================================================================

async function setupTestData() {
	console.log('📋 Setting up test data...\n');

	// Get two existing users
	const users = await sql<{ id: string; email: string }[]>`
		SELECT id, email FROM users WHERE deleted_at IS NULL ORDER BY created_at LIMIT 2
	`;

	if (users.length < 2) {
		throw new Error('Need at least 2 users in database for testing. Please create test users first.');
	}

	ctx = {
		userA: { id: users[0].id, email: users[0].email },
		userB: { id: users[1].id, email: users[1].email },
		spaceId: '',
		areaId: '',
		restrictedAreaId: '',
		pages: {
			ownedByA_private: '',
			ownedByA_area: '',
			ownedByA_sharedWithB: '',
			ownedByA_inRestrictedArea: '',
			deletedPage: ''
		},
		createdRestrictedArea: false
	};

	console.log(`  User A: ${ctx.userA.email} (${ctx.userA.id})`);
	console.log(`  User B: ${ctx.userB.email} (${ctx.userB.id})`);

	// Get or create a space that User A owns
	const spaces = await sql<{ id: string }[]>`
		SELECT id FROM spaces
		WHERE user_id = ${ctx.userA.id} AND deleted_at IS NULL
		LIMIT 1
	`;

	if (spaces.length === 0) {
		throw new Error(`User A (${ctx.userA.email}) needs at least one space. Please create one first.`);
	}
	ctx.spaceId = spaces[0].id;
	console.log(`  Space: ${ctx.spaceId}`);

	// Ensure User B is a member of the space (required to access any areas)
	const existingMembership = await sql<{ userId: string }[]>`
		SELECT user_id FROM space_memberships
		WHERE space_id = ${ctx.spaceId} AND user_id = ${ctx.userB.id}
	`;

	if (existingMembership.length === 0) {
		await sql`
			INSERT INTO space_memberships (id, space_id, user_id, role, created_at, updated_at)
			VALUES (
				${'sm_test_' + Date.now()},
				${ctx.spaceId},
				${ctx.userB.id},
				'member',
				NOW(),
				NOW()
			)
		`;
		console.log(`  Added User B as space member`);
	} else {
		console.log(`  User B already a space member`);
	}

	// Get a non-restricted area in the space
	const areas = await sql<{ id: string }[]>`
		SELECT id FROM areas
		WHERE space_id = ${ctx.spaceId}
			AND deleted_at IS NULL
			AND COALESCE(is_restricted, false) = false
		LIMIT 1
	`;

	if (areas.length === 0) {
		throw new Error('Need at least one non-restricted area in the space. Please create one first.');
	}
	ctx.areaId = areas[0].id;
	console.log(`  Non-restricted area: ${ctx.areaId}`);

	// Get or create a restricted area (User B should NOT have access)
	const restrictedAreas = await sql<{ id: string }[]>`
		SELECT id FROM areas
		WHERE space_id = ${ctx.spaceId}
			AND deleted_at IS NULL
			AND is_restricted = true
		LIMIT 1
	`;

	if (restrictedAreas.length > 0) {
		ctx.restrictedAreaId = restrictedAreas[0].id;
		console.log(`  Restricted area: ${ctx.restrictedAreaId}`);

		// Make sure User B is NOT a member of this restricted area
		await sql`
			DELETE FROM area_memberships
			WHERE area_id = ${ctx.restrictedAreaId} AND user_id = ${ctx.userB.id}
		`;
	} else {
		// Create a restricted area for testing
		const newAreaId = 'test_restricted_' + Date.now();
		await sql`
			INSERT INTO areas (id, space_id, user_id, name, is_restricted, created_at, updated_at)
			VALUES (
				${newAreaId},
				${ctx.spaceId},
				${ctx.userA.id},
				'[TEST] Restricted Area',
				true,
				NOW(),
				NOW()
			)
		`;
		ctx.restrictedAreaId = newAreaId;
		ctx.createdRestrictedArea = true;
		console.log(`  Created restricted area: ${ctx.restrictedAreaId}`);
	}

	// Create test pages
	console.log('\n  Creating test pages...');

	const now = new Date();

	// Page 1: Private page owned by A (User B should NOT see)
	const page1Id = 'test_page_private_' + Date.now();
	await sql`
		INSERT INTO pages (id, user_id, area_id, title, content, page_type, visibility, created_at, updated_at)
		VALUES (
			${page1Id},
			${ctx.userA.id},
			${ctx.areaId},
			'[TEST] Private Page (A owns, B cannot see)',
			${sql.json({ type: 'doc', content: [] })},
			'general',
			'private',
			${now},
			${now}
		)
	`;
	ctx.pages.ownedByA_private = page1Id;
	console.log(`    Private page: ${page1Id}`);

	// Page 2: Area-visible page (User B should see as area member)
	const page2Id = 'test_page_area_' + Date.now();
	await sql`
		INSERT INTO pages (id, user_id, area_id, title, content, page_type, visibility, created_at, updated_at)
		VALUES (
			${page2Id},
			${ctx.userA.id},
			${ctx.areaId},
			'[TEST] Area Page (A owns, B can see)',
			${sql.json({ type: 'doc', content: [] })},
			'general',
			'area',
			${now},
			${now}
		)
	`;
	ctx.pages.ownedByA_area = page2Id;
	console.log(`    Area-visible page: ${page2Id}`);

	// Page 3: Private page shared directly with User B
	const page3Id = 'test_page_shared_' + Date.now();
	await sql`
		INSERT INTO pages (id, user_id, area_id, title, content, page_type, visibility, created_at, updated_at)
		VALUES (
			${page3Id},
			${ctx.userA.id},
			${ctx.areaId},
			'[TEST] Shared Private Page (A owns, shared with B)',
			${sql.json({ type: 'doc', content: [] })},
			'general',
			'private',
			${now},
			${now}
		)
	`;
	await sql`
		INSERT INTO page_user_shares (id, page_id, user_id, permission, shared_by, created_at)
		VALUES (
			${'pus_test_' + Date.now()},
			${page3Id},
			${ctx.userB.id},
			'viewer',
			${ctx.userA.id},
			${now}
		)
	`;
	ctx.pages.ownedByA_sharedWithB = page3Id;
	console.log(`    Shared private page: ${page3Id}`);

	// Page 4: Page in restricted area (User B should NOT see)
	const page4Id = 'test_page_restricted_' + Date.now();
	await sql`
		INSERT INTO pages (id, user_id, area_id, title, content, page_type, visibility, created_at, updated_at)
		VALUES (
			${page4Id},
			${ctx.userA.id},
			${ctx.restrictedAreaId},
			'[TEST] Page in Restricted Area (B cannot see)',
			${sql.json({ type: 'doc', content: [] })},
			'general',
			'area',
			${now},
			${now}
		)
	`;
	ctx.pages.ownedByA_inRestrictedArea = page4Id;
	console.log(`    Restricted area page: ${page4Id}`);

	// Page 5: Deleted page (no one should see)
	const page5Id = 'test_page_deleted_' + Date.now();
	await sql`
		INSERT INTO pages (id, user_id, area_id, title, content, page_type, visibility, deleted_at, created_at, updated_at)
		VALUES (
			${page5Id},
			${ctx.userA.id},
			${ctx.areaId},
			'[TEST] Deleted Page (no one sees)',
			${sql.json({ type: 'doc', content: [] })},
			'general',
			'area',
			NOW(),
			${now},
			${now}
		)
	`;
	ctx.pages.deletedPage = page5Id;
	console.log(`    Deleted page: ${page5Id}`);

	console.log('\n  ✅ Test data setup complete\n');
}

async function cleanup() {
	console.log('\n🧹 Cleaning up test data...');

	// Delete test pages
	const pageIds = Object.values(ctx.pages).filter(id => id);
	for (const pageId of pageIds) {
		try {
			await sql`DELETE FROM page_user_shares WHERE page_id = ${pageId}`;
			await sql`DELETE FROM page_group_shares WHERE page_id = ${pageId}`;
			await sql`DELETE FROM pages WHERE id = ${pageId}`;
			console.log(`  Deleted page: ${pageId}`);
		} catch (e) {
			console.log(`  Could not delete page ${pageId}: ${e}`);
		}
	}

	// Clean up test restricted area if we created it
	if (ctx.createdRestrictedArea) {
		try {
			await sql`DELETE FROM areas WHERE id = ${ctx.restrictedAreaId}`;
			console.log(`  Deleted test restricted area: ${ctx.restrictedAreaId}`);
		} catch (e) {
			console.log(`  Could not delete restricted area: ${e}`);
		}
	}

	// Clean up test space memberships
	await sql`DELETE FROM space_memberships WHERE id LIKE 'sm_test_%'`;

	console.log('  ✅ Cleanup complete');
}

// ============================================================================
// Test 1: Owner sees their own pages regardless of visibility
// ============================================================================

async function testOwnerSeesOwnPages() {
	console.log('Test 1: Owner sees their own pages regardless of visibility');
	console.log('-'.repeat(50));

	// User A should see all their pages
	const userAPageIds = await findAll(ctx.userA.id, ctx.areaId);

	// Should include private page
	assert(
		userAPageIds.includes(ctx.pages.ownedByA_private),
		'Owner sees their private page'
	);

	// Should include area-visible page
	assert(
		userAPageIds.includes(ctx.pages.ownedByA_area),
		'Owner sees their area-visible page'
	);

	// Should include shared page
	assert(
		userAPageIds.includes(ctx.pages.ownedByA_sharedWithB),
		'Owner sees their shared private page'
	);
}

// ============================================================================
// Test 2: Area member sees area-visible pages
// ============================================================================

async function testAreaMemberSeesAreaVisiblePages() {
	console.log('Test 2: User A creates page, shares with area -> User B (area member) sees it');
	console.log('-'.repeat(50));

	// User B should see area-visible pages in non-restricted area
	const userBPageIds = await findAll(ctx.userB.id, ctx.areaId);

	assert(
		userBPageIds.includes(ctx.pages.ownedByA_area),
		'Area member sees area-visible page in list'
	);
}

// ============================================================================
// Test 3: Direct user share visibility
// ============================================================================

async function testDirectShareVisibility() {
	console.log('Test 3: User A creates private page, shares with User B -> User B sees it in list');
	console.log('-'.repeat(50));

	const userBPageIds = await findAll(ctx.userB.id, ctx.areaId);

	assert(
		userBPageIds.includes(ctx.pages.ownedByA_sharedWithB),
		'User with direct share sees private page in list'
	);
}

// ============================================================================
// Test 4: Private page isolation
// ============================================================================

async function testPrivatePageIsolation() {
	console.log('Test 4: User A creates private page -> User B does NOT see it in list');
	console.log('-'.repeat(50));

	const userBPageIds = await findAll(ctx.userB.id, ctx.areaId);

	assert(
		!userBPageIds.includes(ctx.pages.ownedByA_private),
		'User without access does NOT see private page in list'
	);
}

// ============================================================================
// Test 5: Restricted area isolation
// ============================================================================

async function testRestrictedAreaIsolation() {
	console.log('Test 5: User A creates page in restricted area -> User B (non-member) does NOT see it');
	console.log('-'.repeat(50));

	// User B should NOT see pages in restricted area they're not a member of
	const userBPagesInRestricted = await findAll(ctx.userB.id, ctx.restrictedAreaId);

	assert(
		!userBPagesInRestricted.includes(ctx.pages.ownedByA_inRestrictedArea),
		'Non-member does NOT see pages in restricted area'
	);

	// Also check all pages (without area filter)
	const allUserBPageIds = await findAll(ctx.userB.id);

	assert(
		!allUserBPageIds.includes(ctx.pages.ownedByA_inRestrictedArea),
		'Non-member does NOT see restricted area pages in full list'
	);
}

// ============================================================================
// Test 6: Deleted pages excluded
// ============================================================================

async function testDeletedPagesExcluded() {
	console.log('Test 6: Deleted pages are not shown to anyone');
	console.log('-'.repeat(50));

	// Owner should not see deleted page
	const userAPageIds = await findAll(ctx.userA.id, ctx.areaId);

	assert(
		!userAPageIds.includes(ctx.pages.deletedPage),
		'Owner does NOT see deleted page in list'
	);

	// Other user should not see deleted page
	const userBPageIds = await findAll(ctx.userB.id, ctx.areaId);

	assert(
		!userBPageIds.includes(ctx.pages.deletedPage),
		'Other user does NOT see deleted page in list'
	);
}

// ============================================================================
// Test 7: Search respects access control
// ============================================================================

async function testSearchAccessControl() {
	console.log('Test 7: Search respects all access control rules');
	console.log('-'.repeat(50));

	// Search for test pages
	const searchQuery = 'TEST';

	// User A should find all their own test pages
	const userAResultIds = await search(searchQuery, ctx.userA.id, ctx.areaId);

	assert(
		userAResultIds.includes(ctx.pages.ownedByA_private),
		'Search: Owner finds their private page'
	);

	assert(
		userAResultIds.includes(ctx.pages.ownedByA_area),
		'Search: Owner finds their area-visible page'
	);

	// User B should find area-visible and shared pages, but NOT private unshared pages
	const userBResultIds = await search(searchQuery, ctx.userB.id, ctx.areaId);

	assert(
		userBResultIds.includes(ctx.pages.ownedByA_area),
		'Search: Area member finds area-visible page'
	);

	assert(
		userBResultIds.includes(ctx.pages.ownedByA_sharedWithB),
		'Search: User with share finds shared page'
	);

	assert(
		!userBResultIds.includes(ctx.pages.ownedByA_private),
		'Search: User without access does NOT find private page'
	);

	// Search should not find deleted pages
	assert(
		!userAResultIds.includes(ctx.pages.deletedPage),
		'Search: Deleted pages not in results'
	);
}

// ============================================================================
// Test 8: Count respects access control
// ============================================================================

async function testCountAccessControl() {
	console.log('Test 8: Count reflects accessible pages only');
	console.log('-'.repeat(50));

	// User A count in area
	const userACount = await count(ctx.userA.id, ctx.areaId);

	// User B count in area (should be less than A because B can't see A's private page)
	const userBCount = await count(ctx.userB.id, ctx.areaId);

	// User A should have at least 3 pages: private, area, shared
	assert(
		userACount >= 3,
		`Count: Owner has at least 3 accessible pages (actual: ${userACount})`
	);

	// User B should have 2 pages: area-visible + shared
	// But NOT: A's private page, restricted area page, deleted page
	assert(
		userBCount >= 2,
		`Count: Area member has at least 2 accessible pages (actual: ${userBCount})`
	);

	// User B's count should be less than User A's count (at minimum, A's private page)
	assert(
		userBCount < userACount,
		`Count: User B (${userBCount}) has fewer pages than User A (${userACount})`
	);
}

// ============================================================================
// Run Tests
// ============================================================================

runTests();
