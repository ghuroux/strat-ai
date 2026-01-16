/**
 * Intelligent Greeting System for Returning Users
 *
 * Generates context-aware greetings based on user's tasks,
 * time of day, and day of week.
 */

import type { Task, GreetingData } from '$lib/types/tasks';

/**
 * Get time-based greeting
 */
function getTimeGreeting(): string {
	const hour = new Date().getHours();
	if (hour < 12) return 'Good morning';
	if (hour < 17) return 'Good afternoon';
	return 'Good evening';
}

/**
 * Get casual greetings for variety
 */
function getCasualGreeting(): string {
	const greetings = [
		'Hey there',
		'Welcome back',
		'Hi again',
		'Good to see you'
	];
	return greetings[Math.floor(Math.random() * greetings.length)];
}

/**
 * Format task count naturally
 */
function formatTaskCount(count: number): string {
	if (count === 1) return '1 thing';
	if (count === 2) return 'a couple of things';
	if (count <= 4) return `${count} things`;
	return `${count} items`;
}

/**
 * Check if a date is today
 */
function isToday(date: Date): boolean {
	const today = new Date();
	return date.toDateString() === today.toDateString();
}

/**
 * Check if a date is tomorrow
 */
function isTomorrow(date: Date): boolean {
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	return date.toDateString() === tomorrow.toDateString();
}

/**
 * Check if a date is this week
 */
function isThisWeek(date: Date): boolean {
	const today = new Date();
	const weekFromNow = new Date();
	weekFromNow.setDate(today.getDate() + 7);
	return date <= weekFromNow;
}

/**
 * Check if a date is overdue
 */
function isOverdue(date: Date): boolean {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return date < today;
}

/**
 * Generate greeting data based on tasks and context
 */
export function generateGreeting(
	tasks: Task[],
	space: string | null
): GreetingData | null {
	// Show greetings in any space (removed work-only restriction)

	// Filter to active tasks only
	const activeTasks = tasks.filter(t => t.status === 'active');

	// No tasks = no greeting (let user start fresh)
	if (activeTasks.length === 0) return null;

	// Analyze task urgency
	const highPriorityTasks = activeTasks.filter(t => t.priority === 'high');
	const overdueTasks = activeTasks.filter(t => t.dueDate && isOverdue(t.dueDate));
	const dueTodayTasks = activeTasks.filter(t => t.dueDate && isToday(t.dueDate));
	const dueTomorrowTasks = activeTasks.filter(t => t.dueDate && isTomorrow(t.dueDate));
	const dueThisWeekTasks = activeTasks.filter(t => t.dueDate && isThisWeek(t.dueDate));

	// Build message based on urgency
	let message: string;
	let suggestedAction: Task | undefined;

	if (overdueTasks.length > 0) {
		// Urgent: overdue tasks
		const count = overdueTasks.length;
		message = `${getTimeGreeting()}! You have ${count === 1 ? 'a task that\'s overdue' : `${count} overdue tasks`}. Let's tackle ${count === 1 ? 'it' : 'one'} first?`;
		suggestedAction = overdueTasks[0];
	} else if (highPriorityTasks.length > 0 && dueTodayTasks.length > 0) {
		// High priority + due today
		message = `${getTimeGreeting()}! You have ${highPriorityTasks.length} high-priority ${highPriorityTasks.length === 1 ? 'task' : 'tasks'} and ${dueTodayTasks.length} due today. Ready to dive in?`;
		suggestedAction = highPriorityTasks[0];
	} else if (dueTodayTasks.length > 0) {
		// Tasks due today
		const count = dueTodayTasks.length;
		message = `${getTimeGreeting()}! ${count === 1 ? "There's 1 task" : `There are ${count} tasks`} due today. ${count === 1 ? "Let's get it done?" : "Where should we start?"}`;
		suggestedAction = dueTodayTasks[0];
	} else if (highPriorityTasks.length > 0) {
		// High priority tasks
		message = `${getCasualGreeting()}! You have ${formatTaskCount(activeTasks.length)} on your plate, ${highPriorityTasks.length === 1 ? 'one marked' : `${highPriorityTasks.length} marked`} high priority.`;
		suggestedAction = highPriorityTasks[0];
	} else if (dueTomorrowTasks.length > 0) {
		// Tasks due tomorrow
		message = `${getCasualGreeting()}! ${dueTomorrowTasks.length === 1 ? "There's a task" : `${dueTomorrowTasks.length} tasks`} due tomorrow. Good time to get ahead?`;
		suggestedAction = dueTomorrowTasks[0];
	} else if (dueThisWeekTasks.length > 0) {
		// Tasks due this week
		message = `${getCasualGreeting()}! You've got ${formatTaskCount(activeTasks.length)} this week. What's the focus today?`;
		suggestedAction = dueThisWeekTasks[0];
	} else if (activeTasks.length === 1) {
		// Just one task
		message = `${getCasualGreeting()}! Just "${activeTasks[0].title}" on the list. Let's knock it out?`;
		suggestedAction = activeTasks[0];
	} else if (activeTasks.length <= 3) {
		// A few tasks
		message = `${getCasualGreeting()}! ${formatTaskCount(activeTasks.length)} on your plate. Not bad!`;
		suggestedAction = activeTasks[0];
	} else {
		// Many tasks
		message = `${getCasualGreeting()}! You've got ${formatTaskCount(activeTasks.length)} going. Let's make progress on something?`;
		suggestedAction = activeTasks[0];
	}

	// Build action buttons based on context
	const buttons: string[] = [];

	if (suggestedAction) {
		// Truncate title if too long
		const taskTitle = suggestedAction.title.length > 25
			? suggestedAction.title.slice(0, 22) + '...'
			: suggestedAction.title;
		buttons.push(`Focus on "${taskTitle}"`);
	}

	if (activeTasks.length > 1) {
		buttons.push('Review all tasks');
	}

	buttons.push('Something new');

	return {
		message,
		tasks: activeTasks.slice(0, 4), // Show max 4 tasks in preview
		suggestedAction,
		buttons
	};
}

/**
 * Format greeting for chat display
 * Returns the message with optional task preview
 */
export function formatGreetingForChat(greeting: GreetingData): string {
	let formatted = greeting.message;

	// Add task preview if there are tasks
	if (greeting.tasks.length > 0) {
		formatted += '\n\n**Your current tasks:**\n';
		for (const task of greeting.tasks) {
			const priority = task.priority === 'high' ? ' ⭐' : '';
			let dueInfo = '';
			if (task.dueDate) {
				if (isOverdue(task.dueDate)) {
					dueInfo = ' *(overdue)*';
				} else if (isToday(task.dueDate)) {
					dueInfo = ' *(due today)*';
				} else if (isTomorrow(task.dueDate)) {
					dueInfo = ' *(due tomorrow)*';
				}
			}
			formatted += `- ${task.title}${priority}${dueInfo}\n`;
		}

		if (greeting.tasks.length < 4 && greeting.suggestedAction) {
			formatted += '\n*What would you like to focus on?*';
		}
	}

	return formatted;
}
