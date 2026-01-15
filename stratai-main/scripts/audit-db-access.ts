/**
 * Audit Database Access Patterns
 *
 * Scans all *-postgres.ts files for:
 * 1. Snake_case property access (row.user_id)
 * 2. Type definitions with snake_case
 * 3. Inline type definitions with snake_case
 *
 * Usage: npx tsx scripts/audit-db-access.ts
 */

import fs from 'fs';
import path from 'path';

interface Violation {
	type: 'snake_case_access' | 'snake_case_type' | 'snake_case_inline_type';
	line: number;
	content: string;
	match: string;
	suggestion: string;
}

interface AuditResult {
	file: string;
	violations: Violation[];
}

// Common snake_case patterns in database code
const SNAKE_CASE_PATTERNS = [
	// Property access patterns: row.user_id, r.space_id, etc.
	{
		pattern: /\b(row|r|rows\[\d*\])\.([\w]*_[\w_]+)/g,
		type: 'snake_case_access' as const,
		getMessage: (match: string, prop: string) =>
			`Property access: ${match} → ${match.replace(prop, toCamelCase(prop))}`
	},
	// Interface/type property definitions: user_id: string
	{
		pattern: /^\s+([\w]+_[\w_]+)\s*[?]?:\s*[\w\[\]<>|, ]+[;,]?\s*$/gm,
		type: 'snake_case_type' as const,
		getMessage: (match: string, prop: string) =>
			`Type property: ${prop} → ${toCamelCase(prop)}`
	},
	// Inline type definitions in sql<>: { user_id: string }
	{
		pattern: /sql<[^>]*\{\s*([^}]*_[^}]*)\s*\}[^>]*>/g,
		type: 'snake_case_inline_type' as const,
		getMessage: (match: string) => `Inline type definition contains snake_case`
	}
];

function toCamelCase(str: string): string {
	return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function analyzeFile(filePath: string): Violation[] {
	const content = fs.readFileSync(filePath, 'utf-8');
	const lines = content.split('\n');
	const violations: Violation[] = [];

	lines.forEach((line, index) => {
		const lineNum = index + 1;

		// Skip comment lines
		if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
			return;
		}

		// Check for snake_case property access: row.user_id, r.space_id
		const accessPattern = /\b(row|r)\.([\w]*_[\w_]+)/g;
		let match;
		while ((match = accessPattern.exec(line)) !== null) {
			const fullMatch = match[0];
			const prop = match[2];

			// Skip SQL template literals (we want snake_case in SQL)
			// Check if we're inside a template literal by looking for backticks
			const beforeMatch = line.substring(0, match.index);
			const afterMatch = line.substring(match.index + fullMatch.length);

			// If there's an unmatched backtick before, we're likely in SQL
			const backticksBeforeCount = (beforeMatch.match(/`/g) || []).length;
			if (backticksBeforeCount % 2 === 1) {
				continue; // Skip, we're inside a template literal
			}

			violations.push({
				type: 'snake_case_access',
				line: lineNum,
				content: line.trim(),
				match: fullMatch,
				suggestion: `${match[1]}.${toCamelCase(prop)}`
			});
		}

		// Check for inline type definitions with snake_case in sql<>
		if (line.includes('sql<') && line.includes('_') && line.includes(':')) {
			// Extract the type definition part
			const typeMatch = line.match(/sql<([^>]+)>/);
			if (typeMatch) {
				const typeContent = typeMatch[1];
				// Look for snake_case properties in the type
				const snakeProps = typeContent.match(/[\w]+_[\w_]+\s*:/g);
				if (snakeProps) {
					snakeProps.forEach((prop) => {
						const propName = prop.replace(/\s*:$/, '');
						violations.push({
							type: 'snake_case_inline_type',
							line: lineNum,
							content: line.trim(),
							match: propName,
							suggestion: toCamelCase(propName)
						});
					});
				}
			}
		}

		// Check for interface/type property definitions with snake_case
		// Match lines like: user_id: string; or space_id?: string | null;
		const typePropPattern = /^\s+([\w]+_[\w_]+)\s*[?]?:\s*[\w\[\]<>|, ]+/;
		const typePropMatch = line.match(typePropPattern);
		if (typePropMatch) {
			const prop = typePropMatch[1];
			// Make sure we're not in a SQL string (no backtick on this line before)
			// Also skip object literals used as function arguments (audit metadata, etc.)
			// These typically have variable values after the colon, not type names
			const hasVariableValue = /:\s*[a-z][a-zA-Z]*[,}]?\s*$/.test(line.trim());
			const isInsideObject = /^\s+\w+_\w+:\s*(?:updates\.|current|sharesRemoved|[a-z]+[A-Z])/.test(line);
			
			if (!line.includes('`') && !hasVariableValue && !isInsideObject) {
				violations.push({
					type: 'snake_case_type',
					line: lineNum,
					content: line.trim(),
					match: prop,
					suggestion: toCamelCase(prop)
				});
			}
		}
	});

	return violations;
}

function findPostgresFiles(dir: string): string[] {
	const files: string[] = [];

	function walk(currentDir: string) {
		const entries = fs.readdirSync(currentDir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(currentDir, entry.name);

			if (entry.isDirectory() && entry.name !== 'node_modules') {
				walk(fullPath);
			} else if (entry.isFile() && entry.name.endsWith('-postgres.ts')) {
				files.push(fullPath);
			}
		}
	}

	walk(dir);
	return files.sort();
}

function generateReport(results: AuditResult[]): void {
	const RED = '\x1b[31m';
	const GREEN = '\x1b[32m';
	const YELLOW = '\x1b[33m';
	const CYAN = '\x1b[36m';
	const RESET = '\x1b[0m';
	const BOLD = '\x1b[1m';

	console.log('\n' + BOLD + '═══════════════════════════════════════════════════════════════' + RESET);
	console.log(BOLD + '                  DATABASE ACCESS AUDIT REPORT' + RESET);
	console.log(BOLD + '═══════════════════════════════════════════════════════════════' + RESET + '\n');

	let totalViolations = 0;
	let filesWithIssues = 0;

	// Group violations by type for summary
	const violationsByType: Record<string, number> = {
		snake_case_access: 0,
		snake_case_type: 0,
		snake_case_inline_type: 0
	};

	results.forEach(({ file, violations }) => {
		if (violations.length === 0) return;

		filesWithIssues++;
		const relativePath = path.relative(process.cwd(), file);

		console.log(CYAN + '┌─ ' + BOLD + relativePath + RESET);
		console.log(CYAN + '│' + RESET + `  ${YELLOW}${violations.length} violation(s)${RESET}\n`);

		violations.forEach((v, i) => {
			violationsByType[v.type]++;
			totalViolations++;

			const typeLabel =
				v.type === 'snake_case_access'
					? 'Property Access'
					: v.type === 'snake_case_type'
						? 'Type Definition'
						: 'Inline Type';

			console.log(CYAN + '│' + RESET + `  ${BOLD}${i + 1}.${RESET} [${YELLOW}${typeLabel}${RESET}] Line ${v.line}`);
			console.log(CYAN + '│' + RESET + `     ${RED}✗${RESET} ${v.content.substring(0, 80)}${v.content.length > 80 ? '...' : ''}`);
			console.log(CYAN + '│' + RESET + `     ${GREEN}✓${RESET} Change: ${RED}${v.match}${RESET} → ${GREEN}${v.suggestion}${RESET}`);
			console.log(CYAN + '│' + RESET);
		});

		console.log(CYAN + '└───────────────────────────────────────────────────────────────' + RESET + '\n');
	});

	// Summary
	console.log(BOLD + '═══════════════════════════════════════════════════════════════' + RESET);
	console.log(BOLD + '                           SUMMARY' + RESET);
	console.log(BOLD + '═══════════════════════════════════════════════════════════════' + RESET + '\n');

	if (totalViolations === 0) {
		console.log(GREEN + '  ✓ No violations found! All database access patterns are correct.' + RESET + '\n');
	} else {
		console.log(`  ${RED}Total Violations:${RESET} ${BOLD}${totalViolations}${RESET}`);
		console.log(`  ${RED}Files with Issues:${RESET} ${filesWithIssues} of ${results.length}\n`);

		console.log('  ' + BOLD + 'By Type:' + RESET);
		console.log(`    • Property Access (row.snake_case): ${violationsByType.snake_case_access}`);
		console.log(`    • Type Definitions (snake_case: type): ${violationsByType.snake_case_type}`);
		console.log(`    • Inline Types (sql<{snake_case}>): ${violationsByType.snake_case_inline_type}`);

		console.log('\n  ' + BOLD + 'Next Steps:' + RESET);
		console.log('    1. Fix each violation by using camelCase');
		console.log('    2. Run ' + CYAN + 'npm run check' + RESET + ' to verify TypeScript compiles');
		console.log('    3. Run ' + CYAN + 'npm run audit-db-access' + RESET + ' again to verify fixes');
		console.log('\n  ' + BOLD + 'Reference:' + RESET);
		console.log('    See ' + CYAN + 'docs/database/POSTGRES_JS_GUIDE.md' + RESET + ' for patterns\n');
	}

	// Exit with error code if violations found
	process.exit(totalViolations > 0 ? 1 : 0);
}

async function main() {
	const persistenceDir = path.join(process.cwd(), 'src/lib/server/persistence');

	if (!fs.existsSync(persistenceDir)) {
		console.error('Error: Could not find persistence directory at', persistenceDir);
		console.error('Make sure you are running this from the stratai-main directory.');
		process.exit(1);
	}

	console.log('Scanning for *-postgres.ts files in:', persistenceDir);

	const files = findPostgresFiles(persistenceDir);
	console.log(`Found ${files.length} repository files to audit.\n`);

	const results: AuditResult[] = [];

	for (const file of files) {
		const violations = analyzeFile(file);
		results.push({ file, violations });
	}

	generateReport(results);
}

main();

