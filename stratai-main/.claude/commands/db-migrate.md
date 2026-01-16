# Run Database Migrations

Execute pending database schema migrations for StratAI.

## Steps

1. Check for new schema files in `src/lib/server/persistence/*-schema.sql`
2. Connect to the PostgreSQL database
3. Run the CREATE TABLE IF NOT EXISTS statements
4. Report what was created or updated

## Schema Files Location

```
src/lib/server/persistence/
├── schema.sql              # Conversations
├── tasks-schema.sql        # Tasks and subtasks
├── documents-schema.sql    # Documents
├── focus-areas-schema.sql  # Focus areas
├── spaces-schema.sql       # Spaces
├── arena-schema.sql        # Arena battles
└── tool-cache-schema.sql   # Tool cache
```

## Command

Run each schema file against the database:

```bash
/opt/homebrew/opt/postgresql@18/bin/psql -d stratai -f src/lib/server/persistence/[schema-file].sql
```

For migrations:

```bash
/opt/homebrew/opt/postgresql@18/bin/psql -d stratai -f src/lib/server/persistence/migrations/[migration-file].sql
```

## Notes

- Uses `CREATE TABLE IF NOT EXISTS` so safe to run multiple times
- Check for new index definitions that may need to be added
- Always verify tables exist after migration
