/**
 * Invite Body HTML Generator
 *
 * Generates inline-styled HTML for calendar invite bodies.
 * Used when creating Outlook calendar events from meeting wizard.
 *
 * All styles are inline for email client compatibility.
 */

// ============================================================================
// Types
// ============================================================================

export interface InviteBodyInput {
	title: string;
	purpose?: string;
	expectedOutcomes: Array<{
		label: string;
		type: 'decision' | 'action_item' | 'information' | 'custom';
	}>;
	ownerName?: string;
	areaName?: string;
	durationMinutes: number;
}

// ============================================================================
// Generator
// ============================================================================

/**
 * Generate HTML invite body for a calendar event.
 *
 * Pure function — no side effects, no I/O.
 */
export function generateInviteBodyHtml(input: InviteBodyInput): string {
	const sections: string[] = [];

	// Purpose section
	if (input.purpose) {
		sections.push(`
			<div style="margin-bottom: 16px;">
				<h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #374151;">Purpose</h3>
				<p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.5;">${escapeHtml(input.purpose)}</p>
			</div>
		`);
	}

	// Expected outcomes section
	if (input.expectedOutcomes.length > 0) {
		const outcomeItems = input.expectedOutcomes.map(o => {
			const badge = getTypeBadge(o.type);
			return `<li style="margin-bottom: 6px; font-size: 14px; color: #4b5563;">
				<span style="${badge.style}">${badge.label}</span>
				${escapeHtml(o.label)}
			</li>`;
		}).join('');

		sections.push(`
			<div style="margin-bottom: 16px;">
				<h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #374151;">Expected Outcomes</h3>
				<ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
					${outcomeItems}
				</ul>
			</div>
		`);
	}

	// Meta line (owner + area)
	const metaParts: string[] = [];
	if (input.ownerName) metaParts.push(`Owner: ${escapeHtml(input.ownerName)}`);
	if (input.areaName) metaParts.push(`Area: ${escapeHtml(input.areaName)}`);

	if (metaParts.length > 0) {
		sections.push(`
			<div style="margin-bottom: 16px; padding: 10px 14px; background-color: #f3f4f6; border-radius: 6px;">
				<p style="margin: 0; font-size: 13px; color: #6b7280;">${metaParts.join(' &middot; ')}</p>
			</div>
		`);
	}

	// Footer
	sections.push(`
		<div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
			<p style="margin: 0; font-size: 12px; color: #9ca3af;">
				Please come prepared to discuss the above. Created with StratAI
			</p>
		</div>
	`);

	return `
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px;">
			${sections.join('')}
		</div>
	`.trim();
}

// ============================================================================
// Helpers
// ============================================================================

function getTypeBadge(type: string): { label: string; style: string } {
	const baseStyle = 'display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; margin-right: 6px; vertical-align: middle;';

	switch (type) {
		case 'decision':
			return {
				label: 'Decision',
				style: `${baseStyle} background-color: #dbeafe; color: #1d4ed8;`
			};
		case 'action_item':
			return {
				label: 'Action',
				style: `${baseStyle} background-color: #dcfce7; color: #15803d;`
			};
		case 'information':
			return {
				label: 'Info',
				style: `${baseStyle} background-color: #fef3c7; color: #92400e;`
			};
		default:
			return {
				label: 'Custom',
				style: `${baseStyle} background-color: #f3f4f6; color: #4b5563;`
			};
	}
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
