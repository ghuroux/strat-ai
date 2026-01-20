export * from './types';
export * from './memory';
export * from './postgres';
export * from './arena-postgres';
export * from './tasks-postgres';
export * from './documents-postgres';
export * from './areas-postgres';
export * from './spaces-postgres';

// Foundation tables (Phase 1 - Multi-tenant Identity)
export * from './organizations-postgres';
export * from './users-postgres';
export * from './org-memberships-postgres';
export * from './user-id-mappings-postgres';

// Email system (Phase 2 - Password Reset)
export { postgresPasswordResetTokenRepository } from './password-reset-tokens-postgres';
export { postgresEmailLogRepository } from './email-logs-postgres';

// Page sharing & audit (Phase 1: Page Sharing)
export { postgresPageSharingRepository } from './page-sharing-postgres';
export { postgresAuditRepository } from './audit-postgres';
export { postgresPageRepository } from './pages-postgres';

// Space memberships (Phase 2: Space Access Control)
export { postgresSpaceMembershipsRepository } from './space-memberships-postgres';
export type { SpaceAccessResult } from './space-memberships-postgres';

export { sql, testConnection, closeConnection } from './db';

// Game scores (mini-games)
export { postgresGameScoresRepository } from './game-scores-postgres';
export type { GameScore, GameScoreInput, GameScoreWithUser, GameType } from './game-scores-postgres';

// Backwards compatibility - re-export areas as focusAreas
export { postgresAreaRepository as postgresFocusAreaRepository } from './areas-postgres';
