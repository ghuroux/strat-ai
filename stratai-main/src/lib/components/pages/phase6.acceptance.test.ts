/**
 * Phase 6: Integration & Polish - Acceptance Tests
 *
 * Tests the guided creation routing and template rendering logic.
 * These tests can run without SvelteKit environment.
 *
 * See: docs/GUIDED_CREATION.md Phase 6
 */

import { hasGuidedCreation, getTemplateSchema } from '../../config/page-templates';
import { renderTemplate, hasRenderer } from '../../services/template-renderer';
import '../../services/template-renderers/meeting-notes-renderer'; // Register the renderer
import type { GuidedCreationData } from '../../types/guided-creation';
import type { MeetingNotesData } from '../../types/meeting-notes-data';

// ============================================================================
// TEST DATA
// ============================================================================

// Helper to create meeting notes guided data
function createMeetingNotesData(overrides: Partial<MeetingNotesData> = {}): GuidedCreationData {
	const baseData: MeetingNotesData = {
		title: 'Phase 6 Test Meeting',
		datetime: new Date().toISOString(),
		attendees: { internal: [], external: [] },
		purpose: 'Test the guided creation flow',
		includeAreaContext: false,
		agendaItems: ['Test item 1', 'Test item 2'],
		discussionNotes: 'Discussion notes from test',
		outcomes: ['Outcome 1', 'Outcome 2'],
		decisions: [],
		actionItems: [
			{
				id: 'action-1',
				text: 'Action item 1 from test',
				assigneeId: undefined,
				dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
				createTask: true
			},
			{
				id: 'action-2',
				text: 'Action item 2 from test',
				assigneeId: undefined,
				dueDate: undefined,
				createTask: true
			},
			{
				id: 'action-3',
				text: 'Action item 3 - no task',
				assigneeId: undefined,
				dueDate: undefined,
				createTask: false
			}
		],
		...overrides
	};

	return {
		templateType: 'meeting_notes',
		schemaVersion: 1,
		collectedAt: new Date().toISOString(),
		data: baseData as unknown as Record<string, unknown>
	};
}

// ============================================================================
// TEST RESULTS
// ============================================================================

let passed = 0;
let failed = 0;
const results: { name: string; passed: boolean; error?: string }[] = [];

function assert(condition: boolean, message: string) {
	if (!condition) {
		throw new Error(message);
	}
}

async function runTest(name: string, testFn: () => Promise<void> | void) {
	try {
		await testFn();
		passed++;
		results.push({ name, passed: true });
		console.log(`  ✓ ${name}`);
	} catch (error) {
		failed++;
		const errorMsg = error instanceof Error ? error.message : String(error);
		results.push({ name, passed: false, error: errorMsg });
		console.log(`  ✗ ${name}`);
		console.log(`    Error: ${errorMsg}`);
	}
}

// ============================================================================
// MODAL ROUTING TESTS (5 tests)
// ============================================================================

async function runModalTests() {
	console.log('\n=== Modal Routing Tests (5) ===');

	await runTest('1. hasGuidedCreation returns true for meeting_notes', () => {
		const result = hasGuidedCreation('meeting_notes');
		assert(result === true, `Expected true, got ${result}`);
	});

	await runTest('2. hasGuidedCreation returns false for general', () => {
		const result = hasGuidedCreation('general');
		assert(result === false, `Expected false, got ${result}`);
	});

	await runTest('3. getTemplateSchema returns schema for meeting_notes', () => {
		const schema = getTemplateSchema('meeting_notes');
		assert(schema !== null, 'Expected schema, got null');
		assert(schema?.type === 'meeting_notes', `Expected meeting_notes, got ${schema?.type}`);
		assert(Array.isArray(schema?.steps), 'Expected steps array');
		assert(schema?.steps.length === 5, `Expected 5 steps, got ${schema?.steps.length}`);
	});

	await runTest('4. getTemplateSchema returns null for general', () => {
		const schema = getTemplateSchema('general');
		assert(schema === null, `Expected null, got ${schema}`);
	});

	await runTest('5. All non-guided page types return false', () => {
		const nonGuidedTypes = ['general', 'decision_record', 'proposal', 'project_brief', 'weekly_update', 'technical_spec'];
		for (const type of nonGuidedTypes) {
			const result = hasGuidedCreation(type as any);
			assert(result === false, `Expected false for ${type}, got ${result}`);
		}
	});
}

// ============================================================================
// TEMPLATE RENDERING TESTS (5 tests)
// ============================================================================

async function runRenderingTests() {
	console.log('\n=== Template Rendering Tests (5) ===');

	await runTest('6. hasRenderer returns true for meeting_notes', () => {
		const result = hasRenderer('meeting_notes');
		assert(result === true, `Expected true, got ${result}`);
	});

	await runTest('7. renderTemplate returns content and entitiesToCreate', () => {
		const guidedData = createMeetingNotesData();
		const result = renderTemplate(guidedData);

		assert(result !== null, 'Expected result, got null');
		assert(result.content !== null, 'Expected content');
		assert(result.content.type === 'doc', `Expected doc type, got ${result.content.type}`);
		assert(Array.isArray(result.entitiesToCreate), 'Expected entitiesToCreate array');
	});

	await runTest('8. renderTemplate extracts tasks from action items with createTask=true', () => {
		const guidedData = createMeetingNotesData();
		const result = renderTemplate(guidedData);

		// 2 action items have createTask=true
		assert(result.entitiesToCreate.length === 2, `Expected 2 entities, got ${result.entitiesToCreate.length}`);
	});

	await runTest('9. Extracted tasks have correct structure', () => {
		const guidedData = createMeetingNotesData();
		const result = renderTemplate(guidedData);

		const task = result.entitiesToCreate[0];
		assert(task.type === 'task', `Expected type task, got ${task.type}`);
		assert(task.data.title === 'Action item 1 from test', `Expected correct title, got ${task.data.title}`);
		assert(task.data.dueDate !== undefined, 'Expected dueDate to be set');
	});

	await runTest('10. Tasks without createTask=true are not extracted', () => {
		const guidedData = createMeetingNotesData({
			actionItems: [
				{ id: 'no-task-1', text: 'No task item', createTask: false }
			]
		});
		const result = renderTemplate(guidedData);

		assert(result.entitiesToCreate.length === 0, `Expected 0 entities, got ${result.entitiesToCreate.length}`);
	});
}

// ============================================================================
// CONTENT RENDERING TESTS (4 tests)
// ============================================================================

async function runContentTests() {
	console.log('\n=== Content Rendering Tests (4) ===');

	await runTest('11. Rendered content has title heading', () => {
		const guidedData = createMeetingNotesData({ title: 'Test Title XYZ' });
		const result = renderTemplate(guidedData);

		// Check for heading node
		const content = result.content.content || [];
		const headings = content.filter((n: any) => n.type === 'heading' && n.attrs?.level === 1);
		assert(headings.length >= 1, 'Expected at least one H1 heading');

		// Check title text
		const h1 = headings[0];
		const textContent = h1.content?.map((c: any) => c.text).join('') || '';
		assert(textContent.includes('Test Title XYZ'), `Expected title in content, got: ${textContent}`);
	});

	await runTest('12. Rendered content includes purpose section', () => {
		const guidedData = createMeetingNotesData({ purpose: 'Unique Purpose Text 123' });
		const result = renderTemplate(guidedData);

		// Find paragraph with purpose
		const content = JSON.stringify(result.content);
		assert(content.includes('Unique Purpose Text 123'), 'Expected purpose in content');
	});

	await runTest('13. Rendered content includes outcomes', () => {
		const guidedData = createMeetingNotesData({
			outcomes: ['Outcome Alpha', 'Outcome Beta']
		});
		const result = renderTemplate(guidedData);

		const content = JSON.stringify(result.content);
		assert(content.includes('Outcome Alpha'), 'Expected Outcome Alpha in content');
		assert(content.includes('Outcome Beta'), 'Expected Outcome Beta in content');
	});

	await runTest('14. Rendered content includes action items section', () => {
		const guidedData = createMeetingNotesData({
			actionItems: [
				{ id: 'action-abc', text: 'Unique Action ABC', createTask: true },
				{ id: 'action-def', text: 'Unique Action DEF', createTask: false }
			]
		});
		const result = renderTemplate(guidedData);

		const content = JSON.stringify(result.content);
		assert(content.includes('Unique Action ABC'), 'Expected Action ABC in content');
		assert(content.includes('Unique Action DEF'), 'Expected Action DEF in content');
	});
}

// ============================================================================
// ENTITY EXTRACTION TESTS (4 tests)
// ============================================================================

async function runEntityExtractionTests() {
	console.log('\n=== Entity Extraction Tests (4) ===');

	await runTest('15. All createTask=true items become entities', () => {
		const guidedData = createMeetingNotesData({
			actionItems: [
				{ id: 'task-1', text: 'Task 1', createTask: true },
				{ id: 'task-2', text: 'Task 2', createTask: true },
				{ id: 'task-3', text: 'Task 3', createTask: true },
				{ id: 'not-task', text: 'Not a task', createTask: false }
			]
		});
		const result = renderTemplate(guidedData);

		assert(result.entitiesToCreate.length === 3, `Expected 3 entities, got ${result.entitiesToCreate.length}`);
	});

	await runTest('16. Entity titles match action item titles', () => {
		const guidedData = createMeetingNotesData({
			actionItems: [
				{ id: 'specific-1', text: 'Specific Title 1', createTask: true },
				{ id: 'specific-2', text: 'Specific Title 2', createTask: true }
			]
		});
		const result = renderTemplate(guidedData);

		assert(result.entitiesToCreate[0].data.title === 'Specific Title 1', 'Expected matching title 1');
		assert(result.entitiesToCreate[1].data.title === 'Specific Title 2', 'Expected matching title 2');
	});

	await runTest('17. Entity due dates are preserved', () => {
		const dueDate = '2026-02-15';
		const guidedData = createMeetingNotesData({
			actionItems: [
				{ id: 'task-date', text: 'Task with date', dueDate, createTask: true }
			]
		});
		const result = renderTemplate(guidedData);

		assert(result.entitiesToCreate[0].data.dueDate === dueDate, `Expected date ${dueDate}, got ${result.entitiesToCreate[0].data.dueDate}`);
	});

	await runTest('18. Entity assignees are preserved', () => {
		const assigneeId = 'user-123-abc';
		const guidedData = createMeetingNotesData({
			actionItems: [
				{ id: 'task-assignee', text: 'Task with assignee', assigneeId, createTask: true }
			]
		});
		const result = renderTemplate(guidedData);

		assert(result.entitiesToCreate[0].data.assigneeId === assigneeId, `Expected assignee ${assigneeId}, got ${result.entitiesToCreate[0].data.assigneeId}`);
	});
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
	console.log('Phase 6: Integration & Polish - Acceptance Tests\n');
	console.log('================================================');
	console.log('Testing: Modal routing, template rendering, entity extraction');
	console.log('(API/Database entity creation verified via Phase 5 tests)\n');

	await runModalTests();
	await runRenderingTests();
	await runContentTests();
	await runEntityExtractionTests();

	console.log('\n====================================');
	console.log(`Phase 6 Acceptance Tests: ${passed} passed, ${failed} failed`);
	console.log('====================================');

	if (failed > 0) {
		process.exit(1);
	}
}

main().catch(console.error);
