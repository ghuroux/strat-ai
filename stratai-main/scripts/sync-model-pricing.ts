#!/usr/bin/env npx tsx
/**
 * Model Pricing Sync Script
 *
 * Fetches pricing from LiteLLM's maintained database and compares/updates
 * our model-capabilities.ts file.
 *
 * Usage:
 *   npx tsx scripts/sync-model-pricing.ts           # Preview changes (dry run)
 *   npx tsx scripts/sync-model-pricing.ts --apply   # Apply changes to file
 *
 * Source: https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LITELLM_PRICING_URL =
	'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

const MODEL_CAPABILITIES_PATH = path.join(
	__dirname,
	'../src/lib/config/model-capabilities.ts'
);

/**
 * Model ID Mapping Configuration
 *
 * Maps our internal model IDs to potential LiteLLM pricing database IDs.
 * LiteLLM uses various naming conventions:
 * - Dated versions: claude-opus-4-5-20251101
 * - Provider prefixes: anthropic/, openai/, bedrock/, gemini/, vertex_ai/
 * - Plain names: gpt-4o, o3-mini
 *
 * We try multiple variations in order of preference.
 */

// Models that exist in LiteLLM's pricing database (or likely do)
const MODEL_ID_MAPPING: Record<string, string[]> = {
	// ============================================
	// ANTHROPIC - Direct API (dated versions)
	// Our litellm-config.yaml routes to: anthropic/claude-*-YYYYMMDD
	// ============================================
	'claude-opus-4-5': [
		'claude-opus-4-5-20251101',
		'anthropic/claude-opus-4-5-20251101',
		'claude-3-opus-20240229', // Fallback to older model
		'claude-3-opus'
	],
	'claude-sonnet-4-5': [
		'claude-sonnet-4-5-20250929',
		'anthropic/claude-sonnet-4-5-20250929',
		'claude-3-5-sonnet-20241022',
		'claude-3-5-sonnet-latest'
	],
	'claude-sonnet-4': [
		'claude-sonnet-4-20250514',
		'anthropic/claude-sonnet-4-20250514',
		'claude-3-5-sonnet-20240620',
		'claude-3-sonnet-20240229'
	],
	'claude-3-7-sonnet': [
		'claude-3-7-sonnet-20250219',
		'anthropic/claude-3-7-sonnet-20250219',
		'claude-3-5-sonnet-20241022' // Fallback pricing reference
	],
	'claude-haiku-4-5': [
		'claude-haiku-4-5-20251001',
		'anthropic/claude-haiku-4-5-20251001',
		'claude-3-5-haiku-20241022',
		'claude-3-5-haiku-latest'
	],
	'claude-3-5-haiku': [
		'claude-3-5-haiku-20241022',
		'anthropic/claude-3-5-haiku-20241022',
		'claude-3-5-haiku-latest'
	],

	// ============================================
	// OPENAI GPT-4 Series - Direct API (well-established)
	// ============================================
	'gpt-4o': ['gpt-4o', 'openai/gpt-4o', 'gpt-4o-2024-08-06'],
	'gpt-4o-mini': ['gpt-4o-mini', 'openai/gpt-4o-mini', 'gpt-4o-mini-2024-07-18'],
	'gpt-4.1': ['gpt-4.1', 'openai/gpt-4.1', 'gpt-4-turbo', 'gpt-4-turbo-2024-04-09'],
	'gpt-4.1-mini': ['gpt-4.1-mini', 'openai/gpt-4.1-mini', 'gpt-4-0125-preview'],

	// ============================================
	// OPENAI O-Series - Reasoning models
	// ============================================
	'o3': ['o3', 'openai/o3', 'o3-2025-04-16'],
	'o3-mini': ['o3-mini', 'openai/o3-mini', 'o3-mini-2025-01-31'],
	'o4-mini': ['o4-mini', 'openai/o4-mini'],

	// ============================================
	// OPENAI GPT-5 Series - Real models with official pricing
	// Prices verified against OpenAI pricing page Jan 2026
	// ============================================
	'gpt-5.2': ['gpt-5.2', 'openai/gpt-5.2'],
	'gpt-5.2-pro': ['gpt-5.2-pro', 'openai/gpt-5.2-pro'],
	'gpt-5.2-chat-latest': ['gpt-5.2-chat-latest', 'openai/gpt-5.2-chat-latest'],
	'gpt-5.1': ['gpt-5.1', 'openai/gpt-5.1'],
	'gpt-5.1-chat-latest': ['gpt-5.1-chat-latest', 'openai/gpt-5.1-chat-latest'],
	'gpt-5.2-codex': ['gpt-5.2-codex', 'openai/gpt-5.2-codex'],
	'gpt-5.1-codex-max': ['gpt-5.1-codex-max', 'openai/gpt-5.1-codex-max'],
	'gpt-5.1-codex-mini': ['gpt-5.1-codex-mini', 'openai/gpt-5.1-codex-mini'],

	// ============================================
	// GOOGLE GEMINI - Direct API
	// Our config: gemini/gemini-2.5-pro, gemini/gemini-2.5-flash
	// ============================================
	'gemini-2.5-pro': [
		'gemini-2.5-pro',
		'gemini/gemini-2.5-pro',
		'gemini-1.5-pro-latest',
		'gemini-1.5-pro',
		'vertex_ai/gemini-1.5-pro'
	],
	'gemini-2.5-flash': [
		'gemini-2.5-flash',
		'gemini/gemini-2.5-flash',
		'gemini-1.5-flash-latest',
		'gemini-1.5-flash',
		'vertex_ai/gemini-1.5-flash'
	],

	// ============================================
	// AWS BEDROCK MODELS - Use bedrock/ prefix for pricing
	// ============================================

	// Meta Llama 3.x (well-established in Bedrock)
	'llama-3-3-70b': [
		'bedrock/us.meta.llama3-3-70b-instruct-v1:0',
		'bedrock/meta.llama3-3-70b-instruct-v1:0',
		'meta.llama3-3-70b-instruct-v1:0',
		'llama-3.3-70b-versatile'
	],
	'llama-3-1-8b': [
		'bedrock/us.meta.llama3-1-8b-instruct-v1:0',
		'bedrock/meta.llama3-1-8b-instruct-v1:0',
		'meta.llama3-1-8b-instruct-v1:0'
	],

	// Amazon Nova
	'nova-pro': [
		'bedrock/amazon.nova-pro-v1:0',
		'amazon.nova-pro-v1:0',
		'us.amazon.nova-pro-v1:0',
		'amazon-nova-pro'
	],

	// DeepSeek via Bedrock
	'deepseek-r1': [
		'bedrock/us.deepseek.r1-v1:0',
		'bedrock/deepseek-r1',
		'deepseek-reasoner',
		'deepseek/deepseek-reasoner'
	],
	'deepseek-v3': [
		'bedrock/deepseek.v3-v1:0',
		'deepseek-chat',
		'deepseek/deepseek-chat'
	],

	// Mistral via Bedrock
	'mistral-large-3': [
		'bedrock/mistral.mistral-large-3-675b-instruct',
		'bedrock/mistral.mistral-large-2407-v1:0',
		'mistral-large-latest',
		'mistral/mistral-large-latest'
	],

	// Gemma via Bedrock
	'gemma-3-27b': [
		'bedrock/google.gemma-3-27b-it',
		'gemma-2-27b',
		'vertex_ai/gemma-2-27b'
	]
};

// ============================================
// AWS Bedrock models - pricing from web search, VERIFY at aws.amazon.com/bedrock/pricing
// These are based on web search results and should be verified in AWS Console
// Last updated: January 2026
// ============================================
const BEDROCK_NEEDS_VERIFICATION: string[] = [
	// DeepSeek via Bedrock - prices from web search ($1.35/$5.40 and $0.28/$1.10)
	'deepseek-r1',       // bedrock/us.deepseek.r1-v1:0
	'deepseek-v3',       // bedrock/deepseek.v3-v1:0

	// Meta Llama 4 via Bedrock - prices from AWS blog ($0.24/$0.97)
	'llama-4-scout',     // bedrock/us.meta.llama4-scout-17b-instruct-v1:0
	'llama-4-maverick',  // bedrock/us.meta.llama4-maverick-17b-instruct-v1:0

	// Niche Bedrock models - check AWS Bedrock pricing
	'minimax-m2',        // bedrock/minimax.minimax-m2
	'kimi-k2-thinking',  // bedrock/moonshot.kimi-k2-thinking
	'gemma-3-27b',       // bedrock/google.gemma-3-27b-it
];

// ============================================
// Models verified against official provider pricing pages
// These have been manually verified and should NOT be auto-updated from LiteLLM
// as LiteLLM may have outdated or incorrect data
// ============================================
const MANUALLY_VERIFIED_MODELS: string[] = [
	// GPT-5 series - verified against OpenAI pricing page Jan 2026
	'gpt-5.1',
	'gpt-5.1-chat-latest',
	'gpt-5.2',
	'gpt-5.2-pro',
	'gpt-5.2-chat-latest',
	'gpt-5.2-codex',
	'gpt-5.1-codex-max',
	'gpt-5.1-codex-mini',

	// Gemini series - verified against Google AI pricing page Jan 2026
	'gemini-3-pro',
	'gemini-3-flash',
	'gemini-2.5-pro',
	'gemini-2.5-flash',
];

interface LiteLLMModel {
	input_cost_per_token?: number;
	output_cost_per_token?: number;
	max_tokens?: number;
	max_input_tokens?: number;
	max_output_tokens?: number;
	litellm_provider?: string;
	mode?: string;
	supports_vision?: boolean;
	supports_function_calling?: boolean;
}

interface PricingComparison {
	modelId: string;
	currentInput: number | null;
	currentOutput: number | null;
	litellmInput: number | null;
	litellmOutput: number | null;
	litellmModelId: string | null;
	inputDiff: number | null;
	outputDiff: number | null;
	status: 'match' | 'diff' | 'not_found' | 'no_current' | 'verified' | 'manual_verify';
}

async function fetchLiteLLMPricing(): Promise<Record<string, LiteLLMModel>> {
	console.log('🔄 Fetching pricing from LiteLLM...');
	const response = await fetch(LITELLM_PRICING_URL);
	if (!response.ok) {
		throw new Error(`Failed to fetch LiteLLM pricing: ${response.status}`);
	}
	const data = await response.json();
	console.log(`✅ Fetched ${Object.keys(data).length} models from LiteLLM\n`);
	return data;
}

function extractCurrentPricing(fileContent: string): Map<string, { input: number; output: number }> {
	const pricing = new Map<string, { input: number; output: number }>();

	// Match model definitions with pricing
	// Pattern: 'model-id': { ... pricing: { input: X, output: Y } ... }
	const modelRegex = /'([^']+)':\s*\{[^}]*?pricing:\s*\{\s*input:\s*([\d.]+),\s*output:\s*([\d.]+)\s*\}/gs;

	let match;
	while ((match = modelRegex.exec(fileContent)) !== null) {
		const modelId = match[1];
		const input = parseFloat(match[2]);
		const output = parseFloat(match[3]);
		pricing.set(modelId, { input, output });
	}

	return pricing;
}

function findLiteLLMPrice(
	modelId: string,
	litellmData: Record<string, LiteLLMModel>
): { input: number; output: number; litellmModelId: string } | null {
	const mappings = MODEL_ID_MAPPING[modelId] || [modelId];

	for (const litellmId of mappings) {
		const model = litellmData[litellmId];
		if (model && model.input_cost_per_token && model.output_cost_per_token) {
			// Convert from per-token to per-million-tokens
			return {
				input: model.input_cost_per_token * 1_000_000,
				output: model.output_cost_per_token * 1_000_000,
				litellmModelId: litellmId
			};
		}
	}

	return null;
}

function comparePricing(
	currentPricing: Map<string, { input: number; output: number }>,
	litellmData: Record<string, LiteLLMModel>
): PricingComparison[] {
	const comparisons: PricingComparison[] = [];

	// Get all model IDs from our config (not from mapping - we want all models with pricing)
	const allModelIds = new Set([...currentPricing.keys()]);

	for (const modelId of allModelIds) {
		const current = currentPricing.get(modelId);

		// Check if this is a manually verified model (trusted, don't auto-update)
		if (MANUALLY_VERIFIED_MODELS.includes(modelId)) {
			comparisons.push({
				modelId,
				currentInput: current?.input ?? null,
				currentOutput: current?.output ?? null,
				litellmInput: null,
				litellmOutput: null,
				litellmModelId: null,
				inputDiff: null,
				outputDiff: null,
				status: 'verified'
			});
			continue;
		}

		// Check if this is a model that needs manual verification
		if (BEDROCK_NEEDS_VERIFICATION.includes(modelId)) {
			comparisons.push({
				modelId,
				currentInput: current?.input ?? null,
				currentOutput: current?.output ?? null,
				litellmInput: null,
				litellmOutput: null,
				litellmModelId: null,
				inputDiff: null,
				outputDiff: null,
				status: 'manual_verify'
			});
			continue;
		}

		const litellm = findLiteLLMPrice(modelId, litellmData);

		const comparison: PricingComparison = {
			modelId,
			currentInput: current?.input ?? null,
			currentOutput: current?.output ?? null,
			litellmInput: litellm?.input ?? null,
			litellmOutput: litellm?.output ?? null,
			litellmModelId: litellm?.litellmModelId ?? null,
			inputDiff: null,
			outputDiff: null,
			status: 'not_found'
		};

		if (!current) {
			comparison.status = 'no_current';
		} else if (!litellm) {
			comparison.status = 'not_found';
		} else {
			// Calculate percentage difference
			comparison.inputDiff = ((litellm.input - current.input) / current.input) * 100;
			comparison.outputDiff = ((litellm.output - current.output) / current.output) * 100;

			// Consider a match if within 1%
			const isMatch =
				Math.abs(comparison.inputDiff) < 1 && Math.abs(comparison.outputDiff) < 1;
			comparison.status = isMatch ? 'match' : 'diff';
		}

		comparisons.push(comparison);
	}

	// Sort: diffs first, then matches, then verified, then manual verify, then not found
	const statusOrder = { diff: 0, match: 1, verified: 2, manual_verify: 3, no_current: 4, not_found: 5 };
	comparisons.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

	return comparisons;
}

function formatPrice(price: number | null): string {
	if (price === null) return '-';
	return `$${price.toFixed(2)}`;
}

function formatDiff(diff: number | null): string {
	if (diff === null) return '';
	const sign = diff > 0 ? '+' : '';
	const emoji = diff > 5 ? '⬆️' : diff < -5 ? '⬇️' : '';
	return `${sign}${diff.toFixed(0)}% ${emoji}`;
}

function printComparison(comparisons: PricingComparison[]): void {
	console.log('📊 Pricing Comparison:\n');

	const diffs = comparisons.filter((c) => c.status === 'diff');
	const matches = comparisons.filter((c) => c.status === 'match');
	const notFound = comparisons.filter((c) => c.status === 'not_found');
	const manualVerify = comparisons.filter((c) => c.status === 'manual_verify');
	const verified = comparisons.filter((c) => c.status === 'verified');
	const noCurrent = comparisons.filter((c) => c.status === 'no_current');

	if (diffs.length > 0) {
		console.log('⚠️  PRICE DIFFERENCES DETECTED:');
		console.log('┌─────────────────────────┬──────────────────┬──────────────────┬────────────────┐');
		console.log('│ Model                   │ Current (in/out) │ LiteLLM (in/out) │ Change         │');
		console.log('├─────────────────────────┼──────────────────┼──────────────────┼────────────────┤');
		for (const c of diffs) {
			const model = c.modelId.padEnd(23);
			const current = `${formatPrice(c.currentInput)}/${formatPrice(c.currentOutput)}`.padEnd(16);
			const litellm = `${formatPrice(c.litellmInput)}/${formatPrice(c.litellmOutput)}`.padEnd(16);
			const change = `${formatDiff(c.inputDiff)}/${formatDiff(c.outputDiff)}`.padEnd(14);
			console.log(`│ ${model} │ ${current} │ ${litellm} │ ${change} │`);
		}
		console.log('└─────────────────────────┴──────────────────┴──────────────────┴────────────────┘\n');
	}

	if (matches.length > 0) {
		console.log(`✅ ${matches.length} models have matching prices (within 1%):`);
		for (const c of matches) {
			console.log(`   - ${c.modelId}: ${formatPrice(c.currentInput)}/${formatPrice(c.currentOutput)} ← ${c.litellmModelId}`);
		}
		console.log('');
	}

	if (manualVerify.length > 0) {
		console.log(`🔍 ${manualVerify.length} AWS Bedrock models (verify at aws.amazon.com/bedrock/pricing):`);
		for (const c of manualVerify) {
			console.log(`   - ${c.modelId}: ${formatPrice(c.currentInput)}/${formatPrice(c.currentOutput)}`);
		}
		console.log('   ℹ️  Prices from web search - verify in AWS Console\n');
	}

	if (verified.length > 0) {
		console.log(`✔️  ${verified.length} manually verified models (trusted, skip LiteLLM lookup):`);
		for (const c of verified) {
			console.log(`   - ${c.modelId}: ${formatPrice(c.currentInput)}/${formatPrice(c.currentOutput)}`);
		}
		console.log('   ℹ️  Verified against official provider pricing pages\n');
	}

	if (notFound.length > 0) {
		console.log(`❓ ${notFound.length} models not found in LiteLLM (may need mapping update):`);
		for (const c of notFound) {
			console.log(`   - ${c.modelId}: ${formatPrice(c.currentInput)}/${formatPrice(c.currentOutput)}`);
		}
		console.log('   ℹ️  Consider adding these to MODEL_ID_MAPPING or BEDROCK_NEEDS_VERIFICATION\n');
	}

	if (noCurrent.length > 0) {
		console.log(`📝 ${noCurrent.length} models in mapping but not in our config:`);
		for (const c of noCurrent) {
			if (c.litellmInput) {
				console.log(`   - ${c.modelId}: LiteLLM has ${formatPrice(c.litellmInput)}/${formatPrice(c.litellmOutput)}`);
			}
		}
		console.log('');
	}

	// Summary
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log(`📋 Summary: ${matches.length} LiteLLM | ${verified.length} provider-verified | ${manualVerify.length} Bedrock (verify) | ${diffs.length} different | ${notFound.length} not found`);
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function applyChanges(
	fileContent: string,
	comparisons: PricingComparison[]
): string {
	let updatedContent = fileContent;
	const diffs = comparisons.filter((c) => c.status === 'diff' && c.litellmInput && c.litellmOutput);

	for (const c of diffs) {
		// Find and replace the pricing line for this model
		const modelPattern = new RegExp(
			`('${c.modelId}':[^}]*pricing:\\s*\\{\\s*input:\\s*)([\\d.]+)(,\\s*output:\\s*)([\\d.]+)(\\s*\\})`,
			's'
		);

		updatedContent = updatedContent.replace(
			modelPattern,
			`$1${c.litellmInput!.toFixed(2)}$3${c.litellmOutput!.toFixed(2)}$5`
		);
	}

	return updatedContent;
}

async function main() {
	const args = process.argv.slice(2);
	const shouldApply = args.includes('--apply');

	try {
		// Fetch LiteLLM pricing
		const litellmData = await fetchLiteLLMPricing();

		// Read current model capabilities
		const fileContent = fs.readFileSync(MODEL_CAPABILITIES_PATH, 'utf-8');
		const currentPricing = extractCurrentPricing(fileContent);
		console.log(`📁 Found ${currentPricing.size} models with pricing in model-capabilities.ts\n`);

		// Compare
		const comparisons = comparePricing(currentPricing, litellmData);
		printComparison(comparisons);

		const diffs = comparisons.filter((c) => c.status === 'diff');

		if (diffs.length === 0) {
			console.log('🎉 All prices are up to date!\n');
			return;
		}

		if (shouldApply) {
			console.log('📝 Applying changes...\n');
			const updatedContent = applyChanges(fileContent, comparisons);
			fs.writeFileSync(MODEL_CAPABILITIES_PATH, updatedContent);
			console.log(`✅ Updated ${diffs.length} model prices in model-capabilities.ts\n`);
			console.log('Run `npm run check` to verify the changes.\n');
		} else {
			console.log('💡 Run with --apply to update model-capabilities.ts\n');
			console.log('   npx tsx scripts/sync-model-pricing.ts --apply\n');
		}
	} catch (error) {
		console.error('❌ Error:', error);
		process.exit(1);
	}
}

main();
