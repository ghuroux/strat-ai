/**
 * In-memory sliding window rate limiter.
 *
 * Uses the Cloudflare/Stripe "sliding window counter" algorithm:
 * previous window count is weighted by overlap with current window,
 * giving a smooth approximation with O(1) memory per key.
 *
 * Counters reset on server restart (acceptable for single-instance).
 */

// --- Types ---

type KeyType = 'userId' | 'ip';

interface RateLimitRule {
	id: string;
	pattern: string | RegExp;
	methods: string[];
	windowMs: number;
	limit: number;
	keyType: KeyType;
}

interface WindowBucket {
	count: number;
	windowStart: number;
}

interface RateLimitEntry {
	current: WindowBucket;
	previous: WindowBucket;
}

interface RateLimitResult {
	allowed: boolean;
	retryAfterSeconds?: number;
}

// --- Rules (most specific first) ---

const RULES: RateLimitRule[] = [
	{
		id: 'llm-second-opinion',
		pattern: '/api/chat/second-opinion',
		methods: ['POST'],
		windowMs: 60_000,
		limit: 15,
		keyType: 'userId'
	},
	{
		id: 'llm-chat',
		pattern: '/api/chat',
		methods: ['POST'],
		windowMs: 60_000,
		limit: 15,
		keyType: 'userId'
	},
	{
		id: 'llm-assist',
		pattern: '/api/assist',
		methods: ['POST'],
		windowMs: 60_000,
		limit: 15,
		keyType: 'userId'
	},
	{
		id: 'upload-documents',
		pattern: '/api/documents',
		methods: ['POST'],
		windowMs: 60_000,
		limit: 20,
		keyType: 'userId'
	},
	{
		id: 'upload',
		pattern: '/api/upload',
		methods: ['POST'],
		windowMs: 60_000,
		limit: 20,
		keyType: 'userId'
	},
	{
		id: 'login',
		pattern: '/login',
		methods: ['POST'],
		windowMs: 900_000, // 15 minutes
		limit: 10,
		keyType: 'ip'
	},
	{
		id: 'auth',
		pattern: /^\/api\/auth\//,
		methods: ['POST'],
		windowMs: 900_000, // 15 minutes
		limit: 5,
		keyType: 'ip'
	},
	{
		id: 'global-mutation',
		pattern: '/api/',
		methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
		windowMs: 60_000,
		limit: 60,
		keyType: 'userId'
	}
];

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// --- Storage ---

// Key format: "ruleId:key" → entry
const buckets = new Map<string, RateLimitEntry>();

// --- Core functions ---

function matchesPattern(path: string, pattern: string | RegExp): boolean {
	if (pattern instanceof RegExp) {
		return pattern.test(path);
	}
	// Exact match for patterns without trailing slash
	// Prefix match for patterns with trailing slash (like '/api/')
	if (pattern.endsWith('/')) {
		return path.startsWith(pattern) || path === pattern.slice(0, -1);
	}
	return path === pattern;
}

export function matchRule(path: string, method: string): RateLimitRule | null {
	if (!MUTATING_METHODS.has(method)) {
		return null;
	}

	for (const rule of RULES) {
		if (rule.methods.includes(method) && matchesPattern(path, rule.pattern)) {
			return rule;
		}
	}
	return null;
}

export function checkRateLimit(key: string, ruleId: string, rule: RateLimitRule): RateLimitResult {
	const bucketKey = `${ruleId}:${key}`;
	const now = Date.now();
	const windowStart = now - (now % rule.windowMs);

	let entry = buckets.get(bucketKey);

	if (!entry) {
		entry = {
			current: { count: 0, windowStart },
			previous: { count: 0, windowStart: windowStart - rule.windowMs }
		};
		buckets.set(bucketKey, entry);
	}

	// Rotate windows if we've moved past the current window
	if (now - entry.current.windowStart >= rule.windowMs) {
		// If we've skipped an entire window, previous should be zeroed
		if (now - entry.current.windowStart >= rule.windowMs * 2) {
			entry.previous = { count: 0, windowStart: windowStart - rule.windowMs };
		} else {
			entry.previous = { ...entry.current };
		}
		entry.current = { count: 0, windowStart };
	}

	// Calculate effective count using sliding window approximation
	const elapsed = now - entry.current.windowStart;
	const elapsedRatio = elapsed / rule.windowMs;
	const effectiveCount = entry.previous.count * (1 - elapsedRatio) + entry.current.count;

	if (effectiveCount >= rule.limit) {
		// How long until the window slides enough to allow a request
		const retryAfterSeconds = Math.ceil((rule.windowMs - elapsed) / 1000);
		return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
	}

	// Allow and increment
	entry.current.count++;
	return { allowed: true };
}

export function getClientIp(request: Request): string {
	// Standard proxy headers (most specific first)
	const forwarded = request.headers.get('x-forwarded-for');
	if (forwarded) {
		return forwarded.split(',')[0].trim();
	}
	const realIp = request.headers.get('x-real-ip');
	if (realIp) {
		return realIp.trim();
	}
	return '127.0.0.1';
}

// --- Cleanup ---

const MAX_BUCKETS = 10_000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function cleanup() {
	const now = Date.now();

	for (const [key, entry] of buckets) {
		// Find the rule's windowMs from the ruleId prefix
		const ruleId = key.split(':')[0];
		const rule = RULES.find((r) => r.id === ruleId);
		const windowMs = rule?.windowMs ?? 60_000;

		// Evict if both windows are stale (no activity for 2 full windows)
		if (now - entry.current.windowStart >= windowMs * 2) {
			buckets.delete(key);
		}
	}

	// Hard cap: if still over limit, evict oldest entries
	if (buckets.size > MAX_BUCKETS) {
		const entries = [...buckets.entries()].sort(
			(a, b) => a[1].current.windowStart - b[1].current.windowStart
		);
		const toRemove = entries.slice(0, buckets.size - MAX_BUCKETS);
		for (const [key] of toRemove) {
			buckets.delete(key);
		}
	}
}

// Start cleanup interval (runs in background, doesn't prevent process exit)
const cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL_MS);
cleanupTimer.unref?.();
