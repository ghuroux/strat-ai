/**
 * DiagramNode Extension for TipTap
 *
 * A custom node that embeds Excalidraw diagrams in the document.
 * Stores the diagram data as JSON and renders a preview.
 *
 * Features:
 * - Stores full Excalidraw scene data (elements, appState, files)
 * - Renders as a static SVG preview in the editor
 * - Double-click to edit in modal
 * - Resizable (future)
 */

import { Node, mergeAttributes } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface DiagramNodeAttributes {
	/** Unique ID for the diagram */
	id: string;
	/** Excalidraw elements array (serialized JSON) */
	elements: string;
	/** Excalidraw appState (serialized JSON) */
	appState: string;
	/** Excalidraw files object (serialized JSON) */
	files: string;
	/** SVG preview string */
	svg: string;
	/** Width of the diagram container */
	width: number | null;
	/** Height of the diagram container */
	height: number | null;
	/** Caption/title for the diagram */
	caption: string | null;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		diagramNode: {
			/**
			 * Insert a new diagram node
			 */
			insertDiagram: (attrs?: Partial<DiagramNodeAttributes>) => ReturnType;
			/**
			 * Update an existing diagram node's data
			 */
			updateDiagram: (attrs: Partial<DiagramNodeAttributes>) => ReturnType;
		};
	}
}

export const DiagramNode = Node.create({
	name: 'diagram',

	group: 'block',

	atom: true, // Cannot be split or have cursor inside

	draggable: true, // Can be dragged

	addAttributes() {
		return {
			id: {
				default: () => `diagram-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
			},
			elements: {
				default: '[]'
			},
			appState: {
				default: '{}'
			},
			files: {
				default: '{}'
			},
			svg: {
				default: ''
			},
			width: {
				default: null
			},
			height: {
				default: null // Let SVG determine height
			},
			caption: {
				default: null
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'div[data-diagram]'
			}
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(HTMLAttributes, {
				'data-diagram': '',
				'class': 'diagram-node',
				'data-diagram-id': HTMLAttributes.id
			}),
			[
				'div',
				{ class: 'diagram-preview' },
				'Double-click to edit diagram'
			]
		];
	},

	addCommands() {
		return {
			insertDiagram:
				(attrs = {}) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs
					});
				},
			updateDiagram:
				(attrs) =>
				({ tr, state }) => {
					const { selection } = state;
					const node = selection.$anchor.nodeAfter;

					if (node?.type.name !== this.name) {
						return false;
					}

					const pos = selection.$anchor.pos;
					tr.setNodeMarkup(pos, undefined, {
						...node.attrs,
						...attrs
					});

					return true;
				}
		};
	},

	addNodeView() {
		return ({ node, getPos, editor }) => {
			// Create the DOM structure
			const dom = document.createElement('div');
			dom.classList.add('diagram-node');
			dom.setAttribute('data-diagram', '');
			dom.setAttribute('data-diagram-id', node.attrs.id);

			const preview = document.createElement('div');
			preview.classList.add('diagram-preview');

			const caption = document.createElement('div');
			caption.classList.add('diagram-caption');

			dom.appendChild(preview);
			dom.appendChild(caption);

			// Render the diagram preview
			const renderPreview = (currentNode: ProseMirrorNode) => {
				try {
					const elements = JSON.parse(currentNode.attrs.elements || '[]');
					const svgContent = currentNode.attrs.svg || '';

					if (elements.length === 0) {
						preview.innerHTML = `
							<div class="diagram-empty">
								<span class="diagram-empty-icon">📊</span>
								<span class="diagram-empty-text">Double-click to create diagram</span>
							</div>
						`;
					} else if (svgContent) {
						// Render the SVG preview
						preview.innerHTML = `
							<div class="diagram-svg-container">
								${svgContent}
							</div>
							<div class="diagram-edit-overlay">
								<span class="diagram-edit-hint">Double-click to edit</span>
							</div>
						`;

						// Make SVG responsive - use style instead of attributes to avoid SVG validation errors
						const svg = preview.querySelector('svg');
						if (svg) {
							svg.removeAttribute('width');
							svg.removeAttribute('height');
							svg.style.width = '100%';
							svg.style.height = 'auto';
							svg.style.maxHeight = '500px';
							svg.style.display = 'block';
						}
					} else {
						// Fallback: show element count
						preview.innerHTML = `
							<div class="diagram-content">
								<span class="diagram-content-icon">📊</span>
								<span class="diagram-content-text">${elements.length} element${elements.length !== 1 ? 's' : ''}</span>
								<span class="diagram-edit-hint">Double-click to edit</span>
							</div>
						`;
					}

					// Update caption
					if (currentNode.attrs.caption) {
						caption.textContent = currentNode.attrs.caption;
						caption.style.display = 'block';
					} else {
						caption.style.display = 'none';
					}
				} catch (e) {
					console.error('[DiagramNode] Failed to parse elements:', e);
					preview.innerHTML = '<div class="diagram-error">Failed to load diagram</div>';
				}
			};

			renderPreview(node);

			// Handle double-click to edit
			dom.addEventListener('dblclick', (e) => {
				e.preventDefault();
				e.stopPropagation();

				// Dispatch a custom event that the PageEditor can listen for
				const event = new CustomEvent('diagram:edit', {
					detail: {
						id: node.attrs.id,
						elements: node.attrs.elements,
						appState: node.attrs.appState,
						files: node.attrs.files,
						pos: typeof getPos === 'function' ? getPos() : null
					},
					bubbles: true
				});
				dom.dispatchEvent(event);
			});

			return {
				dom,
				update(updatedNode) {
					if (updatedNode.type.name !== 'diagram') {
						return false;
					}
					renderPreview(updatedNode);
					return true;
				}
			};
		};
	}
});
