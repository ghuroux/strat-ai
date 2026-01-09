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

export { sql, testConnection, closeConnection } from './db';

// Backwards compatibility - re-export areas as focusAreas
export { postgresAreaRepository as postgresFocusAreaRepository } from './areas-postgres';
