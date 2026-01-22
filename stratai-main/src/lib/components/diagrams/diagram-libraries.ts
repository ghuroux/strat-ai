/**
 * Diagram Library Definitions
 *
 * Pre-configured libraries for Excalidraw from the official library repository.
 * Libraries are loaded on-demand when selected by the user.
 *
 * Library source: https://libraries.excalidraw.com/
 * GitHub: https://github.com/excalidraw/excalidraw-libraries
 */

export interface DiagramLibrary {
	id: string;
	name: string;
	description: string;
	category: 'cloud' | 'development' | 'design' | 'general';
	/** Path relative to libraries.excalidraw.com/libraries/ */
	source: string;
	/** Preview image URL (optional) */
	preview?: string;
}

/**
 * Curated list of useful libraries for StratAI users
 * Source paths verified from: https://github.com/excalidraw/excalidraw-libraries/blob/main/libraries.json
 * Last verified: 2026-01-22
 */
export const DIAGRAM_LIBRARIES: DiagramLibrary[] = [
	// Cloud & Infrastructure
	{
		id: 'aws-architecture',
		name: 'AWS Architecture Icons',
		description: '180+ AWS service icons for cloud architecture diagrams',
		category: 'cloud',
		source: 'narhari-motivaras/aws-architecture-icons.excalidrawlib'
	},
	{
		id: 'aws-serverless',
		name: 'AWS Serverless Icons',
		description: 'Lambda, API Gateway, DynamoDB, and serverless services',
		category: 'cloud',
		source: 'slobodan/aws-serverless.excalidrawlib'
	},
	{
		id: 'aws-simple',
		name: 'AWS Simple Icons',
		description: 'Simplified AWS icons (EC2, RDS, S3, Lambda, etc.)',
		category: 'cloud',
		source: 'husainkhambaty/aws-simple-icons.excalidrawlib'
	},
	{
		id: 'gcp-icons',
		name: 'Google Cloud Icons',
		description: 'Google Cloud Platform service icons',
		category: 'cloud',
		source: 'clementbosc/gcp-icons.excalidrawlib'
	},
	{
		id: 'kubernetes',
		name: 'Kubernetes Icons',
		description: 'K8s pods, services, deployments, and more',
		category: 'cloud',
		source: 'lowess/kubernetes-icons-set.excalidrawlib'
	},

	// Development & System Design
	{
		id: 'software-architecture',
		name: 'Software Architecture',
		description: 'Components for system design diagrams',
		category: 'development',
		source: 'youritjang/software-architecture.excalidrawlib'
	},
	{
		id: 'uml-er',
		name: 'UML & ER Diagrams',
		description: 'Shapes for UML class diagrams and ER diagrams',
		category: 'development',
		source: 'BjoernKW/UML-ER-library.excalidrawlib'
	},
	{
		id: 'uml-activity',
		name: 'UML Activity Diagram',
		description: 'UML activity diagram components',
		category: 'development',
		source: 'https-github-com-papacrispy/uml-library-activity-diagram.excalidrawlib'
	},
	{
		id: 'data-structures',
		name: 'Data Structures',
		description: 'Trees, graphs, arrays, and algorithm visualizations',
		category: 'development',
		source: 'intradeus/algorithms-and-data-structures-arrays-matrices-trees.excalidrawlib'
	},

	// Design & UX
	{
		id: 'wireframe-kit',
		name: 'Lo-Fi Wireframing Kit',
		description: 'UI components for wireframing (buttons, forms, etc.)',
		category: 'design',
		source: 'spfr/lo-fi-wireframing-kit.excalidrawlib'
	},
	{
		id: 'flowchart',
		name: 'Flow Chart Symbols',
		description: 'Standard flowchart symbols and connectors',
		category: 'design',
		source: 'finfin/flow-chart-symbols.excalidrawlib'
	},
	{
		id: 'uml-component',
		name: 'UML Component Diagram',
		description: 'Component diagrams for service-oriented architecture',
		category: 'design',
		source: 'jordangeurtsen/uml-component-diagram.excalidrawlib'
	},

	// General
	{
		id: 'stick-figures',
		name: 'Stick Figures',
		description: 'People and character illustrations',
		category: 'general',
		source: 'youritjang/stick-figures.excalidrawlib'
	},
	{
		id: 'it-logos',
		name: 'IT Logos',
		description: 'Tech logos: React, Vue, Svelte, Docker, K8s, etc.',
		category: 'general',
		source: 'pclainchard/it-logos.excalidrawlib'
	}
];

/**
 * Get libraries by category
 */
export function getLibrariesByCategory(category: DiagramLibrary['category']): DiagramLibrary[] {
	return DIAGRAM_LIBRARIES.filter(lib => lib.category === category);
}

/**
 * Get library by ID
 */
export function getLibraryById(id: string): DiagramLibrary | undefined {
	return DIAGRAM_LIBRARIES.find(lib => lib.id === id);
}

/**
 * Fetch library data via our proxy endpoint (avoids CORS issues)
 *
 * Handles both library formats:
 * - Version 2: { libraryItems: [...] } - array of library item objects
 * - Version 1: { library: [[...], [...]] } - array of arrays of elements (each array is one item)
 */
export async function fetchLibraryData(library: DiagramLibrary): Promise<unknown[]> {
	// Use our proxy endpoint to avoid CORS issues with libraries.excalidraw.com
	const url = `/api/diagrams/library/${library.source}`;

	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch library: ${response.status}`);
		}

		const data = await response.json();

		// Version 2 format: { type: "excalidrawlib", version: 2, libraryItems: [...] }
		// libraryItems is an array of objects with { id, status, elements, created }
		if (data.libraryItems && Array.isArray(data.libraryItems)) {
			console.log(`[DiagramLibraries] Loaded ${library.id} (v2 format): ${data.libraryItems.length} items`);
			return data.libraryItems;
		}

		// Version 1 format: { type: "excalidrawlib", version: 1, library: [[...], [...]] }
		// library is an array of arrays, where each inner array is the elements for one library item
		// We need to convert to version 2 format for Excalidraw API
		if (data.library && Array.isArray(data.library)) {
			const convertedItems = data.library.map((elements: unknown[], index: number) => ({
				id: `${library.id}-item-${index}`,
				status: 'published',
				elements: elements,
				created: Date.now()
			}));
			console.log(`[DiagramLibraries] Loaded ${library.id} (v1 format, converted): ${convertedItems.length} items`);
			return convertedItems;
		}

		// Fallback: if it's already an array, return as-is
		if (Array.isArray(data)) {
			console.log(`[DiagramLibraries] Loaded ${library.id} (raw array): ${data.length} items`);
			return data;
		}

		console.warn(`[DiagramLibraries] Unexpected library format for ${library.id}:`, Object.keys(data));
		return [];
	} catch (error) {
		console.error(`[DiagramLibraries] Failed to load ${library.id}:`, error);
		throw error;
	}
}

/**
 * Category labels for UI
 */
export const CATEGORY_LABELS: Record<DiagramLibrary['category'], string> = {
	cloud: 'Cloud & Infrastructure',
	development: 'Development & System Design',
	design: 'Design & UX',
	general: 'General'
};
