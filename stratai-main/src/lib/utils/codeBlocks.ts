/**
 * Utilities for extracting and downloading code blocks from markdown content
 */

export interface CodeBlock {
	language: string;
	code: string;
	filename?: string;
	index: number;
}

/**
 * Language to file extension mapping
 */
const LANGUAGE_EXTENSIONS: Record<string, string> = {
	// Web
	javascript: 'js',
	typescript: 'ts',
	jsx: 'jsx',
	tsx: 'tsx',
	html: 'html',
	css: 'css',
	scss: 'scss',
	sass: 'sass',
	less: 'less',
	svelte: 'svelte',
	vue: 'vue',
	json: 'json',
	xml: 'xml',
	svg: 'svg',

	// Backend / Systems
	python: 'py',
	py: 'py',
	ruby: 'rb',
	rb: 'rb',
	php: 'php',
	java: 'java',
	kotlin: 'kt',
	scala: 'scala',
	go: 'go',
	rust: 'rs',
	c: 'c',
	cpp: 'cpp',
	'c++': 'cpp',
	csharp: 'cs',
	'c#': 'cs',
	swift: 'swift',
	dart: 'dart',
	elixir: 'ex',
	erlang: 'erl',
	haskell: 'hs',
	clojure: 'clj',
	lua: 'lua',
	perl: 'pl',
	r: 'r',

	// Shell / Scripts
	bash: 'sh',
	sh: 'sh',
	shell: 'sh',
	zsh: 'sh',
	powershell: 'ps1',
	ps1: 'ps1',
	bat: 'bat',
	cmd: 'cmd',

	// Infrastructure / Config
	terraform: 'tf',
	tf: 'tf',
	hcl: 'hcl',
	yaml: 'yaml',
	yml: 'yaml',
	toml: 'toml',
	ini: 'ini',
	dockerfile: 'dockerfile',
	docker: 'dockerfile',
	nginx: 'conf',
	apache: 'conf',

	// Data / Query
	sql: 'sql',
	graphql: 'graphql',
	gql: 'graphql',
	prisma: 'prisma',

	// Markup / Docs
	markdown: 'md',
	md: 'md',
	latex: 'tex',
	tex: 'tex',
	rst: 'rst',

	// Config files
	env: 'env',
	gitignore: 'gitignore',
	editorconfig: 'editorconfig',

	// Other
	plaintext: 'txt',
	text: 'txt',
	txt: 'txt'
};

/**
 * Extract code blocks from markdown content
 */
export function extractCodeBlocks(markdown: string): CodeBlock[] {
	const codeBlockRegex = /```(\w+)?(?:\s+([^\n]+))?\n([\s\S]*?)```/g;
	const blocks: CodeBlock[] = [];
	let match;
	let index = 0;

	while ((match = codeBlockRegex.exec(markdown)) !== null) {
		const language = match[1]?.toLowerCase() || 'text';
		const possibleFilename = match[2]?.trim();
		const code = match[3];

		blocks.push({
			language,
			code,
			filename: possibleFilename || undefined,
			index: index++
		});
	}

	return blocks;
}

/**
 * Get file extension for a language
 */
export function getExtensionForLanguage(language: string): string {
	const normalizedLang = language.toLowerCase();
	return LANGUAGE_EXTENSIONS[normalizedLang] || normalizedLang || 'txt';
}

/**
 * Generate a filename for a code block
 */
export function generateFilename(block: CodeBlock, fallbackName?: string): string {
	// If the block has an explicit filename, use it
	if (block.filename) {
		// Check if it already has an extension
		if (block.filename.includes('.')) {
			return block.filename;
		}
		// Add extension based on language
		return `${block.filename}.${getExtensionForLanguage(block.language)}`;
	}

	// Try to extract a sensible name from the code
	const inferredName = inferFilenameFromCode(block.code, block.language);
	if (inferredName) {
		return inferredName;
	}

	// Use fallback or generate generic name
	const baseName = fallbackName || `code-${block.index + 1}`;
	return `${baseName}.${getExtensionForLanguage(block.language)}`;
}

/**
 * Try to infer a filename from the code content
 */
function inferFilenameFromCode(code: string, language: string): string | null {
	const lines = code.split('\n').slice(0, 10); // Check first 10 lines

	for (const line of lines) {
		// Look for common patterns like "# filename.py" or "// filename.js"
		const commentPatterns = [
			/^#\s*(\S+\.\w+)\s*$/,           // # filename.ext
			/^\/\/\s*(\S+\.\w+)\s*$/,        // // filename.ext
			/^\/\*\s*(\S+\.\w+)\s*\*\/$/,    // /* filename.ext */
			/^<!--\s*(\S+\.\w+)\s*-->$/,     // <!-- filename.ext -->
			/^;\s*(\S+\.\w+)\s*$/,           // ; filename.ext
		];

		for (const pattern of commentPatterns) {
			const match = line.match(pattern);
			if (match) {
				return match[1];
			}
		}
	}

	// Try to infer from class/function/module names
	if (language === 'python' || language === 'py') {
		const classMatch = code.match(/^class\s+(\w+)/m);
		if (classMatch) {
			return `${classMatch[1].toLowerCase()}.py`;
		}
	}

	if (language === 'java') {
		const classMatch = code.match(/public\s+class\s+(\w+)/);
		if (classMatch) {
			return `${classMatch[1]}.java`;
		}
	}

	if (language === 'terraform' || language === 'tf') {
		// Common Terraform file patterns
		if (code.includes('terraform {')) return 'main.tf';
		if (code.includes('variable "')) return 'variables.tf';
		if (code.includes('output "')) return 'outputs.tf';
		if (code.includes('provider "')) return 'providers.tf';
	}

	return null;
}

/**
 * Download a single code block as a file
 */
export function downloadCodeBlock(block: CodeBlock, filename?: string): void {
	const finalFilename = filename || generateFilename(block);
	const blob = new Blob([block.code], { type: 'text/plain;charset=utf-8' });
	downloadBlob(blob, finalFilename);
}

/**
 * Download multiple code blocks as a zip file
 */
export async function downloadAllCodeBlocks(blocks: CodeBlock[], zipFilename: string = 'code-files.zip'): Promise<void> {
	if (blocks.length === 0) return;

	if (blocks.length === 1) {
		// Just download the single file
		downloadCodeBlock(blocks[0]);
		return;
	}

	// Use JSZip if available, otherwise download individually
	try {
		const JSZip = (await import('jszip')).default;
		const zip = new JSZip();

		// Track filenames to avoid duplicates
		const usedFilenames = new Set<string>();

		for (const block of blocks) {
			let filename = generateFilename(block);

			// Ensure unique filenames
			if (usedFilenames.has(filename)) {
				const ext = filename.split('.').pop() || '';
				const base = filename.slice(0, -(ext.length + 1));
				let counter = 2;
				while (usedFilenames.has(`${base}-${counter}.${ext}`)) {
					counter++;
				}
				filename = `${base}-${counter}.${ext}`;
			}

			usedFilenames.add(filename);
			zip.file(filename, block.code);
		}

		const content = await zip.generateAsync({ type: 'blob' });
		downloadBlob(content, zipFilename);
	} catch {
		// Fallback: download files individually with a delay
		console.warn('JSZip not available, downloading files individually');
		for (let i = 0; i < blocks.length; i++) {
			setTimeout(() => {
				downloadCodeBlock(blocks[i]);
			}, i * 200);
		}
	}
}

/**
 * Helper to download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Copy code to clipboard
 */
export async function copyCodeToClipboard(code: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(code);
		return true;
	} catch {
		// Fallback for older browsers
		try {
			const textarea = document.createElement('textarea');
			textarea.value = code;
			textarea.style.position = 'fixed';
			textarea.style.opacity = '0';
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
			return true;
		} catch {
			return false;
		}
	}
}

/**
 * Get a human-readable language name
 */
export function getLanguageDisplayName(language: string): string {
	const displayNames: Record<string, string> = {
		javascript: 'JavaScript',
		typescript: 'TypeScript',
		python: 'Python',
		py: 'Python',
		ruby: 'Ruby',
		go: 'Go',
		rust: 'Rust',
		java: 'Java',
		kotlin: 'Kotlin',
		swift: 'Swift',
		csharp: 'C#',
		cpp: 'C++',
		c: 'C',
		php: 'PHP',
		bash: 'Bash',
		sh: 'Shell',
		shell: 'Shell',
		sql: 'SQL',
		html: 'HTML',
		css: 'CSS',
		scss: 'SCSS',
		json: 'JSON',
		yaml: 'YAML',
		yml: 'YAML',
		xml: 'XML',
		markdown: 'Markdown',
		md: 'Markdown',
		terraform: 'Terraform',
		tf: 'Terraform',
		hcl: 'HCL',
		dockerfile: 'Dockerfile',
		graphql: 'GraphQL',
		svelte: 'Svelte',
		vue: 'Vue',
		jsx: 'JSX',
		tsx: 'TSX'
	};

	return displayNames[language.toLowerCase()] || language.toUpperCase();
}
