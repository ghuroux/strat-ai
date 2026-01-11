/**
 * Page Template Configuration
 *
 * Defines template content for each page type.
 * Based on DOCUMENT_SYSTEM.md Phase 4 specification.
 */

import type { PageType, TipTapContent } from '$lib/types/page';

/**
 * Guided question for template-based creation
 */
export interface GuidedQuestion {
	id: string;
	question: string;
	placeholder: string;
	required: boolean;
	multiline: boolean;
}

/**
 * Page type information including template
 */
export interface PageTypeInfo {
	type: PageType;
	label: string;
	description: string;
	icon: string; // SVG path or icon name
	template: TipTapContent | null;
	guidedQuestions?: GuidedQuestion[];
}

/**
 * All page type configurations with templates
 */
export const PAGE_TYPES: Record<PageType, PageTypeInfo> = {
	general: {
		type: 'general',
		label: 'Blank Page',
		description: 'Start with a blank page',
		icon: 'FileText',
		template: null
	},

	meeting_notes: {
		type: 'meeting_notes',
		label: 'Meeting Notes',
		description: 'Capture meeting discussions and action items',
		icon: 'Users',
		template: {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: 'Meeting Notes' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', marks: [{ type: 'bold' }], text: 'Date: ' },
						{ type: 'text', text: '' }
					]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', marks: [{ type: 'bold' }], text: 'Attendees: ' },
						{ type: 'text', text: '' }
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Agenda' }]
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [{ type: 'paragraph', content: [] }]
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Discussion' }]
				},
				{ type: 'paragraph', content: [] },
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Action Items' }]
				},
				{
					type: 'taskList',
					content: [
						{
							type: 'taskItem',
							attrs: { checked: false },
							content: [{ type: 'paragraph', content: [] }]
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Decisions Made' }]
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [{ type: 'paragraph', content: [] }]
						}
					]
				}
			]
		},
		guidedQuestions: [
			{
				id: 'date',
				question: 'When is/was this meeting?',
				placeholder: 'January 11, 2026',
				required: true,
				multiline: false
			},
			{
				id: 'attendees',
				question: 'Who attended?',
				placeholder: 'John, Sarah, Mike...',
				required: false,
				multiline: false
			},
			{
				id: 'purpose',
				question: 'What was the purpose of this meeting?',
				placeholder: 'Weekly sync, project kickoff...',
				required: true,
				multiline: false
			}
		]
	},

	decision_record: {
		type: 'decision_record',
		label: 'Decision Record',
		description: 'Document a decision with context and rationale',
		icon: 'Scale',
		template: {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: 'Decision: [Title]' }]
				},
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							marks: [{ type: 'italic' }],
							text: 'Status: Proposed | Accepted | Deprecated'
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Context' }]
				},
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: "What is the issue that we're seeing that is motivating this decision?"
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Options Considered' }]
				},
				{
					type: 'heading',
					attrs: { level: 3 },
					content: [{ type: 'text', text: 'Option 1: [Name]' }]
				},
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'Description, pros, cons...' }]
				},
				{
					type: 'heading',
					attrs: { level: 3 },
					content: [{ type: 'text', text: 'Option 2: [Name]' }]
				},
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'Description, pros, cons...' }]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Decision' }]
				},
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'What is the decision that was made?' }]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Rationale' }]
				},
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'Why did we make this decision?' }]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Consequences' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'What are the resulting context and consequences?' }
					]
				}
			]
		},
		guidedQuestions: [
			{
				id: 'title',
				question: 'What decision is being made?',
				placeholder: 'Choose database technology',
				required: true,
				multiline: false
			},
			{
				id: 'context',
				question: 'What problem or situation led to this decision?',
				placeholder: 'We need to scale our data storage...',
				required: true,
				multiline: true
			}
		]
	},

	proposal: {
		type: 'proposal',
		label: 'Proposal',
		description: 'Present an idea with problem, solution, and benefits',
		icon: 'Lightbulb',
		template: {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: 'Proposal: [Title]' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', marks: [{ type: 'bold' }], text: 'Author: ' },
						{ type: 'text', text: '' }
					]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', marks: [{ type: 'bold' }], text: 'Date: ' },
						{ type: 'text', text: '' }
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Summary' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Brief overview of what is being proposed...' }
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Problem Statement' }]
				},
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'What problem are we trying to solve?' }]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Proposed Solution' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Detailed description of the proposed solution...' }
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Benefits' }]
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [{ type: 'paragraph', content: [] }]
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Risks & Mitigations' }]
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [{ type: 'paragraph', content: [] }]
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Timeline' }]
				},
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'Estimated timeline for implementation...' }]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Resources Required' }]
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [{ type: 'paragraph', content: [] }]
						}
					]
				}
			]
		},
		guidedQuestions: [
			{
				id: 'title',
				question: 'What are you proposing?',
				placeholder: 'Implement new feature X',
				required: true,
				multiline: false
			},
			{
				id: 'problem',
				question: 'What problem does this solve?',
				placeholder: 'Users struggle with...',
				required: true,
				multiline: true
			}
		]
	},

	project_brief: {
		type: 'project_brief',
		label: 'Project Brief',
		description: 'Define project scope, goals, and success criteria',
		icon: 'Briefcase',
		template: {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: 'Project Brief: [Project Name]' }]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Overview' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Brief description of the project and its purpose.' }
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Objectives' }]
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									content: [{ type: 'text', text: 'Primary objective' }]
								}
							]
						},
						{
							type: 'listItem',
							content: [{ type: 'paragraph', content: [] }]
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Scope' }]
				},
				{
					type: 'heading',
					attrs: { level: 3 },
					content: [{ type: 'text', text: 'In Scope' }]
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [{ type: 'paragraph', content: [] }]
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 3 },
					content: [{ type: 'text', text: 'Out of Scope' }]
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [{ type: 'paragraph', content: [] }]
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Success Criteria' }]
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									content: [
										{
											type: 'text',
											text: 'How will we know this project is successful?'
										}
									]
								}
							]
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Stakeholders' }]
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									content: [
										{ type: 'text', marks: [{ type: 'bold' }], text: 'Sponsor: ' },
										{ type: 'text', text: '' }
									]
								}
							]
						},
						{
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									content: [
										{ type: 'text', marks: [{ type: 'bold' }], text: 'Lead: ' },
										{ type: 'text', text: '' }
									]
								}
							]
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Timeline' }]
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									content: [
										{ type: 'text', marks: [{ type: 'bold' }], text: 'Start: ' },
										{ type: 'text', text: '' }
									]
								}
							]
						},
						{
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									content: [
										{ type: 'text', marks: [{ type: 'bold' }], text: 'Target: ' },
										{ type: 'text', text: '' }
									]
								}
							]
						}
					]
				}
			]
		},
		guidedQuestions: [
			{
				id: 'name',
				question: 'What is the project name?',
				placeholder: 'Q1 Marketing Campaign',
				required: true,
				multiline: false
			},
			{
				id: 'overview',
				question: 'Briefly describe the project',
				placeholder: 'Launch new marketing campaign targeting...',
				required: true,
				multiline: true
			}
		]
	},

	weekly_update: {
		type: 'weekly_update',
		label: 'Weekly Update',
		description: 'Share progress, blockers, and next steps',
		icon: 'Calendar',
		template: {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: 'Weekly Update: Week of [Date]' }]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Highlights' }]
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									content: [{ type: 'text', text: 'Key accomplishments this week' }]
								}
							]
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Progress' }]
				},
				{
					type: 'taskList',
					content: [
						{
							type: 'taskItem',
							attrs: { checked: true },
							content: [
								{
									type: 'paragraph',
									content: [{ type: 'text', text: 'Completed task' }]
								}
							]
						},
						{
							type: 'taskItem',
							attrs: { checked: false },
							content: [
								{
									type: 'paragraph',
									content: [{ type: 'text', text: 'In progress' }]
								}
							]
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Blockers' }]
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									content: [{ type: 'text', text: 'Any impediments or issues' }]
								}
							]
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Next Week' }]
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									content: [{ type: 'text', text: 'Planned focus for next week' }]
								}
							]
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Metrics' }]
				},
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'Key numbers or performance indicators' }]
				}
			]
		},
		guidedQuestions: [
			{
				id: 'week',
				question: 'Which week is this update for?',
				placeholder: 'January 6-10, 2026',
				required: true,
				multiline: false
			}
		]
	},

	technical_spec: {
		type: 'technical_spec',
		label: 'Technical Spec',
		description: 'Document technical design and implementation details',
		icon: 'Code',
		template: {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: 'Technical Specification: [Feature Name]' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', marks: [{ type: 'bold' }], text: 'Author: ' },
						{ type: 'text', text: '' }
					]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', marks: [{ type: 'bold' }], text: 'Status: ' },
						{
							type: 'text',
							marks: [{ type: 'italic' }],
							text: 'Draft | In Review | Approved | Implemented'
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Overview' }]
				},
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: 'Brief description of what this specification covers.'
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Goals & Non-Goals' }]
				},
				{
					type: 'heading',
					attrs: { level: 3 },
					content: [{ type: 'text', text: 'Goals' }]
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [{ type: 'paragraph', content: [] }]
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 3 },
					content: [{ type: 'text', text: 'Non-Goals' }]
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [{ type: 'paragraph', content: [] }]
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Technical Design' }]
				},
				{
					type: 'heading',
					attrs: { level: 3 },
					content: [{ type: 'text', text: 'Architecture' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'High-level architecture and component design.' }
					]
				},
				{
					type: 'heading',
					attrs: { level: 3 },
					content: [{ type: 'text', text: 'Data Model' }]
				},
				{
					type: 'codeBlock',
					attrs: { language: 'typescript' },
					content: [{ type: 'text', text: '// Data structures and types' }]
				},
				{
					type: 'heading',
					attrs: { level: 3 },
					content: [{ type: 'text', text: 'API Design' }]
				},
				{
					type: 'codeBlock',
					attrs: { language: 'typescript' },
					content: [{ type: 'text', text: '// API endpoints and contracts' }]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Implementation Plan' }]
				},
				{
					type: 'orderedList',
					content: [
						{
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									content: [{ type: 'text', text: 'Phase 1: ...' }]
								}
							]
						},
						{
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									content: [{ type: 'text', text: 'Phase 2: ...' }]
								}
							]
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Testing Strategy' }]
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									content: [{ type: 'text', text: 'Unit tests' }]
								}
							]
						},
						{
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									content: [{ type: 'text', text: 'Integration tests' }]
								}
							]
						}
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Open Questions' }]
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [{ type: 'paragraph', content: [] }]
						}
					]
				}
			]
		},
		guidedQuestions: [
			{
				id: 'feature',
				question: 'What feature or system is this spec for?',
				placeholder: 'User authentication system',
				required: true,
				multiline: false
			},
			{
				id: 'overview',
				question: 'Briefly describe the technical problem',
				placeholder: 'We need to implement OAuth2 authentication...',
				required: true,
				multiline: true
			}
		]
	}
};

/**
 * Get all page types as an array (useful for iterating)
 */
export function getAllPageTypes(): PageTypeInfo[] {
	return Object.values(PAGE_TYPES);
}

/**
 * Get page type info by type
 */
export function getPageTypeInfo(type: PageType): PageTypeInfo {
	return PAGE_TYPES[type];
}

/**
 * Get template content for a page type (or null for blank)
 */
export function getTemplateContent(type: PageType): TipTapContent | null {
	return PAGE_TYPES[type].template;
}

/**
 * Get default title for a page type
 */
export function getDefaultTitle(type: PageType): string {
	switch (type) {
		case 'meeting_notes':
			return 'Meeting Notes';
		case 'decision_record':
			return 'Decision Record';
		case 'proposal':
			return 'Proposal';
		case 'project_brief':
			return 'Project Brief';
		case 'weekly_update':
			return 'Weekly Update';
		case 'technical_spec':
			return 'Technical Spec';
		default:
			return 'Untitled Page';
	}
}
