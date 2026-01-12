/**
 * Guided Creation Flow Store
 *
 * State management for the step-based guided creation system.
 * This is separate from guidedCreation.svelte.ts which handles chat-based Q&A flows.
 *
 * See: docs/GUIDED_CREATION.md
 */

import type {
	TemplateSchema,
	GuidedCreationData,
	StepDefinition
} from '$lib/types/guided-creation';

class GuidedCreationFlowStore {
	// Core state
	isActive = $state(false);
	schema = $state<TemplateSchema | null>(null);
	currentStepIndex = $state(0);
	data = $state<Record<string, unknown>>({});

	// Context
	spaceId = $state<string | null>(null);
	areaId = $state<string | null>(null);

	// Derived values using getters
	get currentStep(): StepDefinition | null {
		return this.schema?.steps[this.currentStepIndex] ?? null;
	}

	get totalSteps(): number {
		return this.schema?.steps.length ?? 0;
	}

	get canGoBack(): boolean {
		return this.currentStepIndex > 0;
	}

	get canGoForward(): boolean {
		return this.currentStepIndex < this.totalSteps - 1;
	}

	get isLastStep(): boolean {
		return this.currentStepIndex === this.totalSteps - 1;
	}

	get isFirstStep(): boolean {
		return this.currentStepIndex === 0;
	}

	// Methods

	/**
	 * Start a new guided creation flow
	 */
	start(schema: TemplateSchema, spaceId: string, areaId: string | null): void {
		this.isActive = true;
		this.schema = schema;
		this.currentStepIndex = 0;
		this.data = this.initializeDefaults(schema);
		this.spaceId = spaceId;
		this.areaId = areaId;
	}

	/**
	 * Initialize field default values from schema
	 */
	private initializeDefaults(schema: TemplateSchema): Record<string, unknown> {
		const defaults: Record<string, unknown> = {};
		for (const step of schema.steps) {
			for (const field of step.fields) {
				if (field.defaultValue !== undefined) {
					defaults[field.id] =
						typeof field.defaultValue === 'function'
							? field.defaultValue()
							: field.defaultValue;
				}
			}
		}
		return defaults;
	}

	/**
	 * Advance to the next step
	 */
	nextStep(): void {
		if (this.canGoForward) {
			this.currentStepIndex++;
		}
	}

	/**
	 * Go back to the previous step
	 */
	previousStep(): void {
		if (this.canGoBack) {
			this.currentStepIndex--;
		}
	}

	/**
	 * Jump to a specific step by index
	 */
	goToStep(index: number): void {
		if (index >= 0 && index < this.totalSteps) {
			this.currentStepIndex = index;
		}
	}

	/**
	 * Update a field value
	 */
	updateField(fieldId: string, value: unknown): void {
		this.data = { ...this.data, [fieldId]: value };
	}

	/**
	 * Get field value by ID
	 */
	getFieldValue(fieldId: string): unknown {
		return this.data[fieldId];
	}

	/**
	 * Get collected data in the standard format
	 */
	getData(): GuidedCreationData {
		if (!this.schema) {
			throw new Error('Cannot get data: no schema loaded');
		}
		return {
			templateType: this.schema.type,
			schemaVersion: this.schema.version,
			collectedAt: new Date().toISOString(),
			data: this.data
		};
	}

	/**
	 * Reset the store to initial state
	 */
	reset(): void {
		this.isActive = false;
		this.schema = null;
		this.currentStepIndex = 0;
		this.data = {};
		this.spaceId = null;
		this.areaId = null;
	}
}

export const guidedCreationFlowStore = new GuidedCreationFlowStore();
