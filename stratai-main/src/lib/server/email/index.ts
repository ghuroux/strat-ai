/**
 * Email Module
 *
 * Barrel export for email-related functionality.
 * See: docs/SENDGRID_EMAIL_INTEGRATION.md
 */

export { sendEmail } from './sendgrid';
export {
	getPasswordResetEmail,
	createPasswordResetLink,
	createSetPasswordLink,
	getWelcomeEmail,
	getSpaceInviteEmail,
	createSpaceInviteLink,
	getSpaceInvitationEmail,
	createSpaceLink
} from './templates';
