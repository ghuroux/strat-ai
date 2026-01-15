## Description

<!-- Brief description of changes -->

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Database migration (new/modified tables, columns, indexes)
- [ ] Documentation update

## Checklist

### General
- [ ] I have performed a self-review of my code
- [ ] `npm run check` passes (TypeScript)
- [ ] I have tested the changes locally

### Database Changes (if applicable)
- [ ] I have read [POSTGRES_JS_GUIDE.md](docs/database/POSTGRES_JS_GUIDE.md)
- [ ] All row property access uses **camelCase** (e.g., `row.userId` not `row.user_id`)
- [ ] All inline type definitions use **camelCase** (e.g., `sql<{ userId: string }>`)
- [ ] `npm run audit-db-access` shows **0 violations**
- [ ] I ran `npm run generate-schema-docs` if adding migrations

### New Repository Files (if applicable)
- [ ] Row interface uses camelCase for properties
- [ ] Converter function (rowToEntity) uses camelCase access
- [ ] Nullable columns have `| null` in type and proper handling
- [ ] File is exported from `persistence/index.ts`

## Database Pattern Reference

```typescript
// ✅ CORRECT - Use camelCase
interface UserRow {
    userId: string;
    displayName: string | null;
}
const name = row.displayName ?? 'Unknown';

// ❌ WRONG - Never use snake_case in TypeScript
interface UserRow {
    user_id: string;  // TypeScript won't catch this!
}
const name = row.user_id;  // Returns undefined!
```

## Related Issues

<!-- Link to related issues or tickets -->

