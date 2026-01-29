/**
 * Calendar DateTime Utilities
 *
 * Shared helpers for parsing Microsoft Graph datetime values.
 * Graph returns naive datetime strings (e.g., "2026-01-28T14:00:00")
 * with a separate timeZone field. These need to be interpreted in the
 * source timezone and converted to proper UTC-aware ISO strings.
 */

/** Default timezone for calendar operations */
export const DEFAULT_TIMEZONE = 'Africa/Johannesburg';

/**
 * Parse a Microsoft Graph datetime string, interpreting it in the given timezone.
 *
 * Graph returns naive datetimes like "2026-01-28T14:00:00" that are implicitly
 * in the event's timezone (e.g., "Africa/Johannesburg"). Without conversion,
 * `new Date("2026-01-28T14:00:00")` treats it as UTC, causing events to appear
 * in the wrong time bucket (e.g., yesterday's 23:00 SAST meeting shows as today
 * because 21:00 UTC is still "today" in UTC).
 *
 * @param dateTimeStr - Naive datetime string like "2026-01-28T14:00:00"
 * @param sourceTimezone - The timezone this datetime is in (e.g., "Africa/Johannesburg")
 * @returns Date object representing the correct instant in time
 */
export function parseGraphDateTime(dateTimeStr: string, sourceTimezone: string): Date {
	// If the string already has timezone info (Z or offset), parse directly
	if (dateTimeStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateTimeStr)) {
		return new Date(dateTimeStr);
	}

	// For naive datetimes, we need to interpret them in the source timezone
	// Use Intl.DateTimeFormat to get the UTC offset for that timezone at that time
	const naive = new Date(dateTimeStr);

	// Get the offset for the source timezone at this datetime
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone: sourceTimezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	});

	const utcFormatter = new Intl.DateTimeFormat('en-US', {
		timeZone: 'UTC',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	});

	// Parse parts from both formatters
	const getParts = (f: Intl.DateTimeFormat, d: Date) => {
		const parts = f.formatToParts(d);
		const get = (type: string) => parts.find(p => p.type === type)?.value || '0';
		return {
			year: parseInt(get('year')),
			month: parseInt(get('month')),
			day: parseInt(get('day')),
			hour: parseInt(get('hour')),
			minute: parseInt(get('minute')),
			second: parseInt(get('second'))
		};
	};

	// Create a reference date at the naive time interpreted as UTC
	const refUtc = new Date(Date.UTC(
		naive.getFullYear(),
		naive.getMonth(),
		naive.getDate(),
		naive.getHours(),
		naive.getMinutes(),
		naive.getSeconds()
	));

	// Get what time it is in the source timezone when it's that time in UTC
	const inSourceTz = getParts(formatter, refUtc);

	// Calculate offset: how much to subtract from naive to get UTC
	const sourceDate = new Date(Date.UTC(
		inSourceTz.year,
		inSourceTz.month - 1,
		inSourceTz.day,
		inSourceTz.hour,
		inSourceTz.minute,
		inSourceTz.second
	));

	const offsetMs = sourceDate.getTime() - refUtc.getTime();

	// Apply offset: the naive time IS in source timezone, so subtract offset to get UTC
	return new Date(refUtc.getTime() - offsetMs);
}
