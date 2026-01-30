/**
 * Task Assigned Email Template
 *
 * Sent when a task is assigned to a Space member by another user.
 * Follows existing template patterns (purple gradient header, CTA button, plain text fallback).
 */

import { env } from '$env/dynamic/private';

function getBaseUrl(): string {
	return env.BASE_URL || 'http://localhost:5173';
}

interface TaskAssignedTemplateData {
	assigneeName: string;
	assignerName: string;
	taskTitle: string;
	taskDescription?: string;
	dueDate?: string;
	priority?: string;
	spaceName: string;
	areaName?: string;
	taskLink: string;
}

/**
 * Generate task assignment notification email
 */
export function getTaskAssignedEmail(data: TaskAssignedTemplateData) {
	const {
		assigneeName,
		assignerName,
		taskTitle,
		taskDescription,
		dueDate,
		priority,
		spaceName,
		areaName,
		taskLink
	} = data;

	// Build metadata section
	const metaItems: string[] = [];
	if (areaName) metaItems.push(`<strong>Area:</strong> ${areaName}`);
	if (priority === 'high') metaItems.push(`<strong>Priority:</strong> <span style="color: #ef4444;">High</span>`);
	if (dueDate) metaItems.push(`<strong>Due:</strong> ${dueDate}`);

	const metaHtml = metaItems.length > 0
		? `<div style="background: #f3f4f6; padding: 12px 16px; border-radius: 6px; margin: 16px 0; font-size: 14px; color: #4b5563;">${metaItems.join(' &nbsp;·&nbsp; ')}</div>`
		: '';

	const descriptionHtml = taskDescription
		? `<p style="color: #6b7280; font-size: 14px; margin: 12px 0; padding: 12px 16px; border-left: 3px solid #e5e7eb;">${taskDescription}</p>`
		: '';

	const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>New Task Assignment</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0;">
		<h1 style="color: white; margin: 0; font-size: 24px;">StratAI</h1>
	</div>
	<div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
		<h2 style="margin-top: 0;">New Task Assignment</h2>
		<p>Hi ${assigneeName},</p>
		<p><strong>${assignerName}</strong> assigned you a task in <strong>${spaceName}</strong>:</p>
		<div style="background: white; padding: 16px 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
			<h3 style="margin: 0 0 8px 0; color: #111827;">${taskTitle}</h3>
			${descriptionHtml}
			${metaHtml}
		</div>
		<div style="text-align: center; margin: 30px 0;">
			<a href="${taskLink}" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View Task</a>
		</div>
		<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
		<p style="color: #9ca3af; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${taskLink}" style="color: #667eea; word-break: break-all;">${taskLink}</a></p>
	</div>
</body>
</html>`;

	// Plain text version
	const metaText: string[] = [];
	if (areaName) metaText.push(`Area: ${areaName}`);
	if (priority === 'high') metaText.push('Priority: High');
	if (dueDate) metaText.push(`Due: ${dueDate}`);

	const text = `New Task Assignment

Hi ${assigneeName},

${assignerName} assigned you a task in ${spaceName}:

"${taskTitle}"
${taskDescription ? `\n${taskDescription}\n` : ''}${metaText.length > 0 ? `${metaText.join(' | ')}\n` : ''}
View task: ${taskLink}

- The StratAI Team`;

	return {
		subject: `[StratAI] ${assignerName} assigned you a task: ${taskTitle}`,
		html,
		text
	};
}

/**
 * Build a task link for email
 */
export function buildTaskLink(spaceSlug: string, taskId: string): string {
	return `${getBaseUrl()}/spaces/${spaceSlug}/task/${taskId}`;
}
