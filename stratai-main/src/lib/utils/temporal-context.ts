/**
 * Temporal Context Utility for Task Dashboard
 *
 * Tracks user visits and generates contextual greetings based on:
 * - Time of day (morning/afternoon/evening)
 * - Day of week (Monday gets special treatment)
 * - Days since last visit (welcome back after absence)
 *
 * Uses localStorage for visit tracking.
 *
 * TODO: For more robust persistence (cross-device sync, server-side awareness),
 * migrate to database storage. See Phase 0.3e planning notes.
 */

const STORAGE_KEY = 'stratai-tasks-lastVisit';

export interface VisitRecord {
	lastVisitDate: string; // 'YYYY-MM-DD'
	lastVisitTimestamp: number; // Unix ms
}

export interface TemporalContext {
	isNewDay: boolean;
	isNewWeek: boolean; // Monday and first visit of the week
	isReturningAfterAbsence: boolean; // 3+ days since last visit
	daysSinceLastVisit: number;
	timeOfDay: 'morning' | 'afternoon' | 'evening';
	greeting: string;
}

/**
 * Get today's date as 'YYYY-MM-DD'
 */
function getTodayString(): string {
	const now = new Date();
	return now.toISOString().split('T')[0];
}

/**
 * Calculate days between two date strings
 */
function daysBetween(date1: string, date2: string): number {
	const d1 = new Date(date1);
	const d2 = new Date(date2);
	const diffTime = Math.abs(d2.getTime() - d1.getTime());
	return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if today is Monday
 */
function isMonday(): boolean {
	return new Date().getDay() === 1;
}

/**
 * Get time of day based on current hour
 */
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
	const hour = new Date().getHours();
	if (hour < 12) return 'morning';
	if (hour < 17) return 'afternoon';
	return 'evening';
}

/**
 * Load last visit record from localStorage
 */
function loadVisitRecord(): VisitRecord | null {
	if (typeof window === 'undefined') return null;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return null;
		return JSON.parse(stored) as VisitRecord;
	} catch {
		return null;
	}
}

/**
 * Save visit record to localStorage
 */
function saveVisitRecord(record: VisitRecord): void {
	if (typeof window === 'undefined') return;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
	} catch {
		// localStorage might be full or disabled - fail silently
	}
}

/**
 * Get current hour for special time-based greetings
 */
function getCurrentHour(): number {
	return new Date().getHours();
}

/**
 * Get current day of week (0 = Sunday, 5 = Friday)
 */
function getDayOfWeek(): number {
	return new Date().getDay();
}

/**
 * Special greetings for unusual hours (easter egg style)
 */
function getSpecialTimeGreeting(): string | null {
	const hour = getCurrentHour();
	const day = getDayOfWeek();

	// Late night workers (10pm - 3am) - random fun message
	if (hour >= 22 || hour < 3) {
		const lateNightGreetings = [
			'Burning the midnight oil?',
			'The night owl arrives',
			'Late night genius mode activated',
			'Coffee status: probably needed',
			'When everyone sleeps, we ship',
			'Nocturnal productivity mode'
		];
		return lateNightGreetings[Math.floor(Math.random() * lateNightGreetings.length)];
	}

	// Very early birds (3am - 5am)
	if (hour >= 3 && hour < 5) {
		const earlyBirdGreetings = [
			'Up before the sun!',
			'Early bird gets the code',
			'The world is still asleep...',
			'Maximum focus hours activated'
		];
		return earlyBirdGreetings[Math.floor(Math.random() * earlyBirdGreetings.length)];
	}

	// Friday afternoon/evening
	if (day === 5 && hour >= 15) {
		const fridayGreetings = [
			'Happy Friday!',
			'Weekend is loading...',
			'Friday mode: engaged',
			'Almost there...'
		];
		return fridayGreetings[Math.floor(Math.random() * fridayGreetings.length)];
	}

	// Sunday evening (pre-Monday blues)
	if (day === 0 && hour >= 18) {
		const sundayGreetings = [
			'Sunday evening planning?',
			'Getting ahead of the week',
			'Preparation is key'
		];
		return sundayGreetings[Math.floor(Math.random() * sundayGreetings.length)];
	}

	return null;
}

/**
 * Generate greeting based on temporal context
 */
function generateGreeting(ctx: Omit<TemporalContext, 'greeting'>): string {
	// Priority order:
	// 1. Returning after 3+ days
	// 2. Special time-based greeting (late night, early morning, etc.)
	// 3. New week (Monday)
	// 4. Time of day

	if (ctx.isReturningAfterAbsence) {
		return 'Welcome back';
	}

	// Check for special time-based greeting (easter egg style)
	const specialGreeting = getSpecialTimeGreeting();
	if (specialGreeting) {
		return specialGreeting;
	}

	if (ctx.isNewWeek) {
		return 'Happy Monday';
	}

	// Default: time-based greeting
	switch (ctx.timeOfDay) {
		case 'morning':
			return 'Good morning';
		case 'afternoon':
			return 'Good afternoon';
		case 'evening':
			return 'Good evening';
	}
}

/**
 * Get temporal context and update visit record
 *
 * Call this when the Task Dashboard loads to:
 * 1. Get contextual greeting information
 * 2. Update the last visit timestamp
 */
export function getTemporalContext(): TemporalContext {
	const today = getTodayString();
	const now = Date.now();
	const timeOfDay = getTimeOfDay();

	// Load previous visit
	const lastVisit = loadVisitRecord();

	// Calculate context
	let isNewDay = true;
	let daysSinceLastVisit = 0;

	if (lastVisit) {
		isNewDay = lastVisit.lastVisitDate !== today;
		daysSinceLastVisit = daysBetween(lastVisit.lastVisitDate, today);
	}

	const isNewWeek = isMonday() && isNewDay;
	const isReturningAfterAbsence = daysSinceLastVisit >= 3;

	// Build context object (without greeting first)
	const contextWithoutGreeting = {
		isNewDay,
		isNewWeek,
		isReturningAfterAbsence,
		daysSinceLastVisit,
		timeOfDay
	};

	// Generate greeting
	const greeting = generateGreeting(contextWithoutGreeting);

	// Update visit record
	saveVisitRecord({
		lastVisitDate: today,
		lastVisitTimestamp: now
	});

	return {
		...contextWithoutGreeting,
		greeting
	};
}

/**
 * Get greeting only (simpler API if you just need the greeting string)
 */
export function getGreeting(): string {
	return getTemporalContext().greeting;
}
