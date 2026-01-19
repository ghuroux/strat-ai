# Run Database Migrations

Execute pending database schema migrations for StratAI.

## Quick Command (Recommended)

Run all migrations using Node.js (uses same connection as app):

```bash
node -e "
import('postgres').then(({ default: postgres }) => {
  import('fs').then(fs => {
    const sql = postgres(process.env.DATABASE_URL || 'postgres://ghuroux@localhost:5432/stratai');
    const schemas = [
      'schema.sql',
      'users-schema.sql',
      'organizations-schema.sql',
      'org-memberships-schema.sql',
      'user-id-mappings-schema.sql',
      'tasks-schema.sql',
      'documents-schema.sql',
      'focus-areas-schema.sql',
      'spaces-schema.sql',
      'arena-schema.sql',
      'tool-cache-schema.sql'
    ];
    (async () => {
      for (const file of schemas) {
        console.log(\`Running: \${file}\`);
        const schema = fs.readFileSync(\`src/lib/server/persistence/\${file}\`, 'utf-8');
        await sql.unsafe(schema).catch(e => console.log(\`Notice: \${e.message}\`));
      }
      await sql.end();
      console.log('✅ Migrations complete');
    })();
  });
});
"
```

## Schema Files Location

```
src/lib/server/persistence/
├── schema.sql                    # Conversations (messages, chat history)
├── users-schema.sql              # Users
├── organizations-schema.sql      # Organizations
├── org-memberships-schema.sql    # Organization memberships
├── user-id-mappings-schema.sql   # User ID mappings
├── tasks-schema.sql              # Tasks and subtasks
├── documents-schema.sql          # Documents (uploaded files)
├── focus-areas-schema.sql        # Areas (formerly focus areas)
├── spaces-schema.sql             # Spaces (workspaces)
├── arena-schema.sql              # Arena battles
└── tool-cache-schema.sql         # Tool cache
```

## Alternative: Using psql (if in PATH)

If `psql` is available in your PATH:

```bash
/opt/homebrew/opt/postgresql@18/bin/psql -d stratai -f src/lib/server/persistence/schema.sql
/opt/homebrew/opt/postgresql@18/bin/psql -d stratai -f src/lib/server/persistence/users-schema.sql
# ... repeat for each schema file
```

For migrations:

```bash
/opt/homebrew/opt/postgresql@18/bin/psql -d stratai -f src/lib/server/persistence/migrations/[migration-file].sql
```

## Why Node.js Method is Preferred

1. **Uses same connection as app**: Reads `DATABASE_URL` from environment
2. **No PATH issues**: Doesn't depend on `psql` being in PATH
3. **Consistent behavior**: Uses `postgres.js` library (same as app)
4. **Works everywhere**: Works on any system where Node.js is installed
5. **Safe to run multiple times**: Uses `CREATE TABLE IF NOT EXISTS`

## Database Connection

The connection string is defined in `.env`:

```bash
DATABASE_URL=postgres://ghuroux@localhost:5432/stratai
```

## Troubleshooting

### "psql: command not found"

Use the full path on macOS with Homebrew:
```bash
/opt/homebrew/opt/postgresql@18/bin/psql -d stratai -f [schema-file].sql
```

Or use the Node.js method above instead.

### "Connection refused"

Check that postgres is running:
```bash
ps aux | grep postgres
```

Start postgres if needed (depends on your installation method).

### "Database does not exist"

Create the database first:
```bash
createdb stratai
# or via psql:
# /opt/homebrew/opt/postgresql@18/bin/psql -d postgres -c "CREATE DATABASE stratai;"
```

## Notes

- **Safe to run multiple times**: All schemas use `CREATE TABLE IF NOT EXISTS`
- **Notice messages are normal**: "relation already exists, skipping" means tables are already created
- **Order matters**: Some schemas depend on others (users before conversations, etc.)
- **Verify after migration**: Check that tables exist by inspecting the database
