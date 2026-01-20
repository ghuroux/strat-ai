/**
 * Generate Schema Reference Documentation
 *
 * Reads all migration files and generates comprehensive
 * schema documentation in markdown format.
 *
 * Usage: npx tsx scripts/generate-schema-docs.ts
 */

import fs from 'fs';
import path from 'path';

interface Column {
	name: string;
	type: string;
	nullable: boolean;
	defaultValue: string | null;
	description: string | null;
}

interface Index {
	name: string;
	columns: string[];
	unique: boolean;
	where: string | null;
}

interface ForeignKey {
	column: string;
	references: string;
	onDelete: string | null;
}

interface Table {
	name: string;
	columns: Column[];
	indexes: Index[];
	foreignKeys: ForeignKey[];
	description: string | null;
}

function toCamelCase(str: string): string {
	return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function mapSqlTypeToTs(sqlType: string): string {
	const upper = sqlType.toUpperCase();
	if (upper.includes('TEXT') || upper.includes('VARCHAR') || upper.includes('CHAR')) return 'string';
	if (upper.includes('INT') || upper.includes('SERIAL')) return 'number';
	if (upper.includes('BOOLEAN') || upper.includes('BOOL')) return 'boolean';
	if (upper.includes('TIMESTAMPTZ') || upper.includes('TIMESTAMP')) return 'Date';
	if (upper.includes('DATE')) return 'Date';
	if (upper.includes('UUID')) return 'string';
	if (upper.includes('JSONB') || upper.includes('JSON')) return 'object';
	if (upper.includes('DECIMAL') || upper.includes('NUMERIC') || upper.includes('FLOAT') || upper.includes('REAL') || upper.includes('DOUBLE')) return 'number';
	if (upper.includes('[]')) return mapSqlTypeToTs(upper.replace('[]', '')) + '[]';
	return 'unknown';
}

function parseCreateTable(sql: string, tables: Map<string, Table>): void {
	// Match CREATE TABLE statements
	const createTableRegex = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)\s*\(([\s\S]*?)\);/gi;
	let match;

	while ((match = createTableRegex.exec(sql)) !== null) {
		const tableName = match[1];
		const body = match[2];

		const table: Table = {
			name: tableName,
			columns: [],
			indexes: [],
			foreignKeys: [],
			description: null
		};

		// Parse columns
		const lines = body.split('\n').map(l => l.trim()).filter(Boolean);

		for (const line of lines) {
			// Skip constraints
			if (line.toUpperCase().startsWith('CONSTRAINT') ||
			    line.toUpperCase().startsWith('PRIMARY KEY') ||
			    line.toUpperCase().startsWith('FOREIGN KEY') ||
			    line.toUpperCase().startsWith('UNIQUE') ||
			    line.toUpperCase().startsWith('CHECK')) {
				continue;
			}

			// Parse column definition
			const colMatch = line.match(/^(\w+)\s+([A-Za-z0-9_\[\]()]+)(?:\s+(.*))?[,]?$/i);
			if (colMatch) {
				const colName = colMatch[1];
				let colType = colMatch[2];
				const rest = colMatch[3] || '';

				// Skip if this is actually a constraint
				if (colName.toUpperCase() === 'PRIMARY' || colName.toUpperCase() === 'FOREIGN') {
					continue;
				}

				// Parse nullable
				const notNull = rest.toUpperCase().includes('NOT NULL');
				const hasDefault = rest.toUpperCase().includes('DEFAULT');

				// Extract default value
				let defaultValue: string | null = null;
				if (hasDefault) {
					const defaultMatch = rest.match(/DEFAULT\s+([^,\s]+(?:\s*\([^)]*\))?)/i);
					if (defaultMatch) {
						defaultValue = defaultMatch[1];
					}
				}

				// Handle REFERENCES
				const refMatch = rest.match(/REFERENCES\s+(\w+)\s*\((\w+)\)(?:\s+ON DELETE\s+(\w+(?:\s+\w+)?))?/i);
				if (refMatch) {
					table.foreignKeys.push({
						column: colName,
						references: `${refMatch[1]}.${refMatch[2]}`,
						onDelete: refMatch[3] || null
					});
				}

				table.columns.push({
					name: colName,
					type: colType,
					nullable: !notNull,
					defaultValue,
					description: null
				});
			}
		}

		tables.set(tableName, table);
	}
}

function parseAlterTable(sql: string, tables: Map<string, Table>): void {
	// Match ALTER TABLE ADD COLUMN statements
	const alterRegex = /ALTER TABLE\s+(\w+)\s+ADD COLUMN(?:\s+IF NOT EXISTS)?\s+(\w+)\s+([^;]+);/gi;
	let match;

	while ((match = alterRegex.exec(sql)) !== null) {
		const tableName = match[1];
		const colName = match[2];
		const colDef = match[3];

		let table = tables.get(tableName);
		if (!table) {
			table = {
				name: tableName,
				columns: [],
				indexes: [],
				foreignKeys: [],
				description: null
			};
			tables.set(tableName, table);
		}

		// Check if column already exists
		if (table.columns.some(c => c.name === colName)) {
			continue;
		}

		// Parse type and constraints
		const typeMatch = colDef.match(/^([A-Za-z0-9_\[\]()]+)/);
		const colType = typeMatch ? typeMatch[1] : 'TEXT';
		const notNull = colDef.toUpperCase().includes('NOT NULL');

		let defaultValue: string | null = null;
		const defaultMatch = colDef.match(/DEFAULT\s+([^,\s]+(?:\s*\([^)]*\))?)/i);
		if (defaultMatch) {
			defaultValue = defaultMatch[1];
		}

		table.columns.push({
			name: colName,
			type: colType,
			nullable: !notNull,
			defaultValue,
			description: null
		});
	}
}

function parseCreateIndex(sql: string, tables: Map<string, Table>): void {
	// Match CREATE INDEX statements
	const indexRegex = /CREATE\s+(UNIQUE\s+)?INDEX(?:\s+IF NOT EXISTS)?\s+(\w+)\s+ON\s+(\w+)\s*(?:USING\s+\w+\s*)?\(([^)]+)\)(?:\s+WHERE\s+(.+?))?;/gi;
	let match;

	while ((match = indexRegex.exec(sql)) !== null) {
		const unique = !!match[1];
		const indexName = match[2];
		const tableName = match[3];
		const columnsStr = match[4];
		const whereClause = match[5] || null;

		const table = tables.get(tableName);
		if (table) {
			const columns = columnsStr.split(',').map(c => c.trim().replace(/\s+.*$/, ''));
			table.indexes.push({
				name: indexName,
				columns,
				unique,
				where: whereClause
			});
		}
	}
}

function parseComments(sql: string, tables: Map<string, Table>): void {
	// Match COMMENT ON statements
	const commentRegex = /COMMENT ON COLUMN\s+(\w+)\.(\w+)\s+IS\s+'([^']+)'/gi;
	let match;

	while ((match = commentRegex.exec(sql)) !== null) {
		const tableName = match[1];
		const colName = match[2];
		const comment = match[3];

		const table = tables.get(tableName);
		if (table) {
			const column = table.columns.find(c => c.name === colName);
			if (column) {
				column.description = comment;
			}
		}
	}

	// Match COMMENT ON TABLE
	const tableCommentRegex = /COMMENT ON TABLE\s+(\w+)\s+IS\s+'([^']+)'/gi;
	while ((match = tableCommentRegex.exec(sql)) !== null) {
		const tableName = match[1];
		const comment = match[2];

		const table = tables.get(tableName);
		if (table) {
			table.description = comment;
		}
	}
}

function generateMarkdown(tables: Map<string, Table>): string {
	let md = '# Database Schema Reference\n\n';
	md += `> **Auto-generated** from migration files on ${new Date().toISOString().split('T')[0]}\n`;
	md += `> **Tables:** ${tables.size}\n\n`;
	md += '**Important:** postgres.js automatically transforms `snake_case` columns to `camelCase` at runtime.\n';
	md += 'Use camelCase in TypeScript, snake_case in SQL.\n\n';

	md += '---\n\n';

	// Table of contents
	md += '## Table of Contents\n\n';
	const sortedTables = Array.from(tables.values()).sort((a, b) => a.name.localeCompare(b.name));
	for (const table of sortedTables) {
		md += `- [${table.name}](#${table.name.toLowerCase()})\n`;
	}
	md += '\n---\n\n';

	// Each table
	for (const table of sortedTables) {
		md += generateTableDoc(table);
	}

	return md;
}

function generateTableDoc(table: Table): string {
	let md = `## ${table.name}\n\n`;

	if (table.description) {
		md += `${table.description}\n\n`;
	}

	// Columns table
	md += '### Columns\n\n';
	md += '| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |\n';
	md += '|--------------|-------------|------|----------|---------|-------------|\n';

	for (const col of table.columns) {
		const jsName = toCamelCase(col.name);
		const nullable = col.nullable ? 'YES' : 'NO';
		const defaultVal = col.defaultValue || '-';
		const desc = col.description || '-';
		md += `| \`${col.name}\` | \`${jsName}\` | ${col.type} | ${nullable} | ${defaultVal} | ${desc} |\n`;
	}
	md += '\n';

	// Foreign Keys
	if (table.foreignKeys.length > 0) {
		md += '### Foreign Keys\n\n';
		for (const fk of table.foreignKeys) {
			const onDelete = fk.onDelete ? ` (ON DELETE ${fk.onDelete})` : '';
			md += `- \`${fk.column}\` → \`${fk.references}\`${onDelete}\n`;
		}
		md += '\n';
	}

	// Indexes
	if (table.indexes.length > 0) {
		md += '### Indexes\n\n';
		for (const idx of table.indexes) {
			const unique = idx.unique ? 'UNIQUE ' : '';
			const where = idx.where ? ` WHERE ${idx.where}` : '';
			md += `- **${idx.name}**: ${unique}(${idx.columns.join(', ')})${where}\n`;
		}
		md += '\n';
	}

	// TypeScript interface example
	md += '### TypeScript Interface\n\n';
	md += '```typescript\n';
	md += `interface ${toPascalCase(table.name)}Row {\n`;
	for (const col of table.columns) {
		const jsName = toCamelCase(col.name);
		const tsType = mapSqlTypeToTs(col.type);
		const nullSuffix = col.nullable ? ' | null' : '';
		md += `    ${jsName}: ${tsType}${nullSuffix};\n`;
	}
	md += '}\n';
	md += '```\n\n';

	md += '---\n\n';
	return md;
}

function toPascalCase(str: string): string {
	const camel = toCamelCase(str);
	return camel.charAt(0).toUpperCase() + camel.slice(1);
}

async function main() {
	const migrationsDir = path.join(process.cwd(), 'src/lib/server/persistence/migrations');
	const schemasDir = path.join(process.cwd(), 'src/lib/server/persistence');

	if (!fs.existsSync(migrationsDir)) {
		console.error('Error: Could not find migrations directory at', migrationsDir);
		process.exit(1);
	}

	console.log('Parsing migration files...');

	const tables = new Map<string, Table>();

	// First, parse schema files
	const schemaFiles = fs.readdirSync(schemasDir)
		.filter(f => f.endsWith('-schema.sql') || f === 'schema.sql')
		.sort();

	for (const file of schemaFiles) {
		const content = fs.readFileSync(path.join(schemasDir, file), 'utf-8');
		parseCreateTable(content, tables);
		parseCreateIndex(content, tables);
		parseComments(content, tables);
	}

	// Then, parse migrations in order
	const migrations = fs.readdirSync(migrationsDir)
		.filter(f => f.endsWith('.sql'))
		.sort();

	console.log(`Found ${schemaFiles.length} schema files and ${migrations.length} migration files`);

	for (const file of migrations) {
		const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
		parseCreateTable(content, tables);
		parseAlterTable(content, tables);
		parseCreateIndex(content, tables);
		parseComments(content, tables);
	}

	// Generate markdown
	const markdown = generateMarkdown(tables);

	// Write to docs
	const outputPath = path.join(process.cwd(), 'docs/database/SCHEMA_REFERENCE.md');
	fs.writeFileSync(outputPath, markdown);

	console.log(`\n✅ Generated schema docs for ${tables.size} tables`);
	console.log(`   Written to: ${outputPath}`);

	// List tables
	console.log('\nTables documented:');
	const sortedNames = Array.from(tables.keys()).sort();
	for (const name of sortedNames) {
		const table = tables.get(name)!;
		console.log(`  - ${name} (${table.columns.length} columns, ${table.indexes.length} indexes)`);
	}
}

main();



