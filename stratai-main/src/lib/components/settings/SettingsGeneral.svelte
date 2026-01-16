<script lang="ts">
	import { userStore } from '$lib/stores/user.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { HomePagePreference, HomePageType } from '$lib/types/user';

	interface SpaceInfo {
		id: string;
		name: string;
		slug: string;
		isSystem: boolean;
	}

	interface AreaInfo {
		id: string;
		name: string;
		slug: string;
	}

	interface Props {
		spaces: SpaceInfo[];
		areasMap: Record<string, AreaInfo[]>;
	}

	let { spaces, areasMap }: Props = $props();

	// Current selection state
	let selectedType = $state<HomePageType>(userStore.homePage.type);
	let selectedSpaceId = $state<string | null>(userStore.homePage.spaceId ?? null);
	let selectedAreaId = $state<string | null>(userStore.homePage.areaId ?? null);
	let isSaving = $state(false);

	// Derived values
	let selectedSpace = $derived(spaces.find((s) => s.id === selectedSpaceId));
	let availableAreas = $derived(selectedSpaceId ? areasMap[selectedSpaceId] ?? [] : []);

	// Initialize from user preferences
	$effect(() => {
		const pref = userStore.homePage;
		selectedType = pref.type;
		selectedSpaceId = pref.spaceId ?? null;
		selectedAreaId = pref.areaId ?? null;
	});

	// When space changes, reset area selection
	$effect(() => {
		if (selectedSpaceId && availableAreas.length > 0) {
			const areaExists = availableAreas.some((a) => a.id === selectedAreaId);
			if (!areaExists && selectedType === 'area') {
				selectedAreaId = availableAreas[0].id;
			}
		}
	});

	async function savePreference() {
		if (isSaving) return;

		// Validate selection
		if ((selectedType === 'space' || selectedType === 'task-dashboard') && !selectedSpaceId) {
			toastStore.error('Please select a space');
			return;
		}
		if (selectedType === 'area' && (!selectedSpaceId || !selectedAreaId)) {
			toastStore.error('Please select a space and area');
			return;
		}

		isSaving = true;

		try {
			const homePage: HomePagePreference = { type: selectedType };

			if (selectedType !== 'main-chat' && selectedSpaceId) {
				homePage.spaceId = selectedSpaceId;
				homePage.spaceSlug = selectedSpace?.slug;
			}

			if (selectedType === 'area' && selectedAreaId) {
				const area = availableAreas.find((a) => a.id === selectedAreaId);
				homePage.areaId = selectedAreaId;
				homePage.areaSlug = area?.slug;
			}

			const response = await fetch('/api/user/preferences', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ homePage })
			});

			if (!response.ok) {
				throw new Error('Failed to save preference');
			}

			const result = await response.json();
			userStore.setPreferences(result.preferences);
			toastStore.success('Home page preference saved');
		} catch (error) {
			console.error('Failed to save preference:', error);
			toastStore.error('Failed to save preference');
		} finally {
			isSaving = false;
		}
	}

	function handleTypeChange(type: HomePageType) {
		selectedType = type;

		if ((type === 'space' || type === 'task-dashboard' || type === 'area') && !selectedSpaceId) {
			// Default to Personal space or first available space
			const personalSpace = spaces.find((s) => s.slug === 'personal');
			selectedSpaceId = personalSpace?.id ?? spaces[0]?.id ?? null;
		}

		if (type === 'area' && selectedSpaceId && !selectedAreaId) {
			const areas = areasMap[selectedSpaceId] ?? [];
			selectedAreaId = areas[0]?.id ?? null;
		}

		savePreference();
	}

	function handleSpaceChange(spaceId: string) {
		selectedSpaceId = spaceId;

		if (selectedType === 'area') {
			const areas = areasMap[spaceId] ?? [];
			selectedAreaId = areas[0]?.id ?? null;
		}

		savePreference();
	}

	function handleAreaChange(areaId: string) {
		selectedAreaId = areaId;
		savePreference();
	}
</script>

<div class="settings-section">
	<div class="settings-section-header">
		<h2 class="settings-section-title">Home Page</h2>
		<p class="settings-section-desc">Choose where you land when you click the logo or press Cmd+Shift+H</p>
	</div>

	<div class="options-list">
		<!-- Main Chat -->
		<label class="option-card" class:selected={selectedType === 'main-chat'}>
			<input
				type="radio"
				name="homePage"
				value="main-chat"
				checked={selectedType === 'main-chat'}
				onchange={() => handleTypeChange('main-chat')}
			/>
			<div class="option-content">
				<div class="option-icon">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
						/>
					</svg>
				</div>
				<div class="option-text">
					<span class="option-label">Main Chat</span>
					<span class="option-hint">Start fresh with the AI</span>
				</div>
			</div>
			<div class="option-check">
				{#if selectedType === 'main-chat'}
					<svg fill="currentColor" viewBox="0 0 24 24">
						<path
							fill-rule="evenodd"
							d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
							clip-rule="evenodd"
						/>
					</svg>
				{/if}
			</div>
		</label>

		<!-- Task Dashboard -->
		<label class="option-card" class:selected={selectedType === 'task-dashboard'}>
			<input
				type="radio"
				name="homePage"
				value="task-dashboard"
				checked={selectedType === 'task-dashboard'}
				onchange={() => handleTypeChange('task-dashboard')}
			/>
			<div class="option-content">
				<div class="option-icon task">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
						/>
					</svg>
				</div>
				<div class="option-text">
					<span class="option-label">Task Dashboard</span>
					<span class="option-hint">See your tasks at a glance</span>
				</div>
			</div>
			<div class="option-check">
				{#if selectedType === 'task-dashboard'}
					<svg fill="currentColor" viewBox="0 0 24 24">
						<path
							fill-rule="evenodd"
							d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
							clip-rule="evenodd"
						/>
					</svg>
				{/if}
			</div>
		</label>

		{#if selectedType === 'task-dashboard'}
			<div class="option-details">
				<label class="detail-label">Space</label>
				<select
					class="detail-select"
					value={selectedSpaceId ?? ''}
					onchange={(e) => handleSpaceChange(e.currentTarget.value)}
				>
					{#each spaces as space (space.id)}
						<option value={space.id}>{space.name}</option>
					{/each}
				</select>
			</div>
		{/if}

		<!-- Space Dashboard -->
		<label class="option-card" class:selected={selectedType === 'space'}>
			<input
				type="radio"
				name="homePage"
				value="space"
				checked={selectedType === 'space'}
				onchange={() => handleTypeChange('space')}
			/>
			<div class="option-content">
				<div class="option-icon space">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
						/>
					</svg>
				</div>
				<div class="option-text">
					<span class="option-label">Space Dashboard</span>
					<span class="option-hint">Land on a specific space</span>
				</div>
			</div>
			<div class="option-check">
				{#if selectedType === 'space'}
					<svg fill="currentColor" viewBox="0 0 24 24">
						<path
							fill-rule="evenodd"
							d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
							clip-rule="evenodd"
						/>
					</svg>
				{/if}
			</div>
		</label>

		{#if selectedType === 'space'}
			<div class="option-details">
				<label class="detail-label">Space</label>
				<select
					class="detail-select"
					value={selectedSpaceId ?? ''}
					onchange={(e) => handleSpaceChange(e.currentTarget.value)}
				>
					{#each spaces as space (space.id)}
						<option value={space.id}>{space.name}</option>
					{/each}
				</select>
			</div>
		{/if}

		<!-- Area Dashboard -->
		<label class="option-card" class:selected={selectedType === 'area'}>
			<input
				type="radio"
				name="homePage"
				value="area"
				checked={selectedType === 'area'}
				onchange={() => handleTypeChange('area')}
			/>
			<div class="option-content">
				<div class="option-icon area">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
						/>
					</svg>
				</div>
				<div class="option-text">
					<span class="option-label">Area Dashboard</span>
					<span class="option-hint">Land on a specific area within a space</span>
				</div>
			</div>
			<div class="option-check">
				{#if selectedType === 'area'}
					<svg fill="currentColor" viewBox="0 0 24 24">
						<path
							fill-rule="evenodd"
							d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
							clip-rule="evenodd"
						/>
					</svg>
				{/if}
			</div>
		</label>

		{#if selectedType === 'area'}
			<div class="option-details two-col">
				<div class="detail-field">
					<label class="detail-label">Space</label>
					<select
						class="detail-select"
						value={selectedSpaceId ?? ''}
						onchange={(e) => handleSpaceChange(e.currentTarget.value)}
					>
						{#each spaces as space (space.id)}
							<option value={space.id}>{space.name}</option>
						{/each}
					</select>
				</div>
				<div class="detail-field">
					<label class="detail-label">Area</label>
					<select
						class="detail-select"
						value={selectedAreaId ?? ''}
						onchange={(e) => handleAreaChange(e.currentTarget.value)}
						disabled={availableAreas.length === 0}
					>
						{#each availableAreas as area (area.id)}
							<option value={area.id}>{area.name}</option>
						{/each}
					</select>
				</div>
			</div>
		{/if}
	</div>

	{#if isSaving}
		<p class="save-status">Saving...</p>
	{/if}
</div>

<style>
	.settings-section {
		max-width: 600px;
	}

	.settings-section-header {
		margin-bottom: 1.5rem;
	}

	.settings-section-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: rgb(var(--color-surface-100));
		margin-bottom: 0.25rem;
	}

	.settings-section-desc {
		font-size: 0.875rem;
		color: rgb(var(--color-surface-500));
	}

	.options-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.option-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: rgb(var(--color-surface-800) / 0.5);
		border: 1px solid rgb(var(--color-surface-700));
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.option-card:hover {
		background: rgb(var(--color-surface-800));
		border-color: rgb(var(--color-surface-600));
	}

	.option-card.selected {
		background: rgb(var(--color-primary-500) / 0.1);
		border-color: rgb(var(--color-primary-500) / 0.5);
	}

	.option-card input[type='radio'] {
		display: none;
	}

	.option-content {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.875rem;
	}

	.option-icon {
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgb(var(--color-surface-700));
		border-radius: 0.625rem;
		color: rgb(var(--color-surface-400));
	}

	.option-icon svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.option-icon.task {
		background: rgb(34 197 94 / 0.15);
		color: rgb(34 197 94);
	}

	.option-icon.space {
		background: rgb(59 130 246 / 0.15);
		color: rgb(59 130 246);
	}

	.option-icon.area {
		background: rgb(168 85 247 / 0.15);
		color: rgb(168 85 247);
	}

	.option-text {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.option-label {
		font-size: 0.9375rem;
		font-weight: 500;
		color: rgb(var(--color-surface-100));
	}

	.option-hint {
		font-size: 0.8125rem;
		color: rgb(var(--color-surface-500));
	}

	.option-check {
		width: 1.5rem;
		height: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgb(var(--color-primary-500));
	}

	.option-check svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.option-details {
		padding: 1rem;
		margin-left: 1rem;
		background: rgb(var(--color-surface-800) / 0.3);
		border-left: 2px solid rgb(var(--color-primary-500) / 0.3);
		border-radius: 0 0.5rem 0.5rem 0;
	}

	.option-details.two-col {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.detail-field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.detail-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: rgb(var(--color-surface-400));
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.detail-select {
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		background: rgb(var(--color-surface-800));
		border: 1px solid rgb(var(--color-surface-700));
		border-radius: 0.5rem;
		color: rgb(var(--color-surface-100));
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.detail-select:hover {
		border-color: rgb(var(--color-surface-600));
	}

	.detail-select:focus {
		outline: none;
		border-color: rgb(var(--color-primary-500));
		box-shadow: 0 0 0 2px rgb(var(--color-primary-500) / 0.2);
	}

	.detail-select:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.save-status {
		margin-top: 1rem;
		font-size: 0.875rem;
		color: rgb(var(--color-surface-500));
	}

	@media (max-width: 640px) {
		.option-details.two-col {
			grid-template-columns: 1fr;
		}
	}
</style>
