<script lang="ts">
	/**
	 * Space Skills Dashboard
	 *
	 * Displays all skills in a Space with:
	 * - Grid of SkillCards
	 * - [+ New Skill] button
	 * - SkillEditorModal for create/edit
	 * - Empty state with CTA
	 *
	 * Route: /spaces/[space]/skills
	 */
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Plus, ChevronLeft, Zap } from 'lucide-svelte';

	import { skillStore } from '$lib/stores/skills.svelte';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';

	import SkillCard from '$lib/components/skills/SkillCard.svelte';
	import SkillEditorModal from '$lib/components/skills/SkillEditorModal.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	import type { Skill } from '$lib/types/skills';

	// Route params
	let spaceSlug = $derived($page.params.space);

	// Get space from store
	let space = $derived.by(() => {
		if (!spaceSlug) return null;
		return spacesStore.getSpaceBySlug(spaceSlug);
	});

	let spaceColor = $derived(space?.color || '#3b82f6');

	// Skills for this space
	let skills = $derived.by(() => {
		if (!space) return [];
		return skillStore.getSkillsForSpace(space.id);
	});

	// UI state
	let isLoading = $state(true);
	let showEditor = $state(false);
	let editingSkill = $state<Skill | null>(null);

	onMount(async () => {
		if (!spaceSlug) {
			goto('/spaces');
			return;
		}

		// Ensure spaces are loaded
		await spacesStore.loadSpaces();
		const spaceFromStore = spacesStore.getSpaceBySlug(spaceSlug);

		if (!spaceFromStore) {
			toastStore.error('Space not found');
			goto('/spaces');
			return;
		}

		// Load skills for this space
		await skillStore.loadSkills(spaceFromStore.id);
		isLoading = false;
	});

	function handleNewSkill() {
		editingSkill = null;
		showEditor = true;
	}

	function handleEditSkill(skill: Skill) {
		editingSkill = skill;
		showEditor = true;
	}

	function handleDeleteSkill(skill: Skill) {
		// Open editor in delete mode
		editingSkill = skill;
		showEditor = true;
	}

	function handleEditorClose() {
		showEditor = false;
		editingSkill = null;
	}

	function handleSkillSaved(_skill: Skill) {
		// Store already updated via skillStore methods
	}

	function handleBack() {
		goto(`/spaces/${spaceSlug}`);
	}
</script>

<svelte:head>
	<title>Skills - {space?.name || 'Space'} | StratAI</title>
</svelte:head>

<div class="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">
	{#if isLoading}
		<!-- Loading state -->
		<div class="flex flex-col items-center justify-center h-full gap-4 text-zinc-500 dark:text-zinc-400">
			<div class="w-8 h-8 border-2 border-zinc-200 dark:border-zinc-700 border-t-primary-500 rounded-full animate-spin"></div>
			<p>Loading skills...</p>
		</div>
	{:else}
		<!-- Header -->
		<header class="flex items-center justify-between px-6 py-4 border-b
					   bg-white dark:bg-zinc-900
					   border-zinc-200 dark:border-zinc-800">
			<div class="flex items-center gap-3">
				<button
					type="button"
					class="flex items-center justify-center w-9 h-9 rounded-lg
						   border border-zinc-200 dark:border-zinc-700
						   text-zinc-500 dark:text-zinc-400
						   hover:bg-zinc-100 dark:hover:bg-zinc-800
						   hover:text-zinc-900 dark:hover:text-zinc-100
						   hover:border-zinc-300 dark:hover:border-zinc-600
						   transition-colors"
					onclick={handleBack}
					aria-label="Back to space"
				>
					<ChevronLeft size={20} />
				</button>
				<div class="flex flex-col gap-0.5">
					<h1 class="text-xl font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
						Skills
					</h1>
					{#if space}
						<span class="text-sm text-zinc-500 dark:text-zinc-400">{space.name}</span>
					{/if}
				</div>
			</div>

			<button
				type="button"
				class="flex items-center gap-2 px-4 py-2.5 rounded-lg
					   bg-primary-500 hover:bg-primary-600
					   text-sm font-medium text-white
					   disabled:opacity-50 disabled:cursor-not-allowed
					   transition-colors"
				onclick={handleNewSkill}
			>
				<Plus size={18} />
				<span class="hidden sm:inline">New Skill</span>
			</button>
		</header>

		<!-- Main content -->
		<main class="flex-1 overflow-y-auto">
			<div class="max-w-4xl mx-auto px-6 py-6">
				{#if skills.length === 0}
					<EmptyState
						icon={Zap}
						iconColor="text-amber-400"
						heading="No skills yet"
						description="Skills are reusable AI instruction sets — methodologies, workflows, and rubrics that shape how your AI responds in this space."
						ctaLabel="Create Skill"
						onCtaClick={handleNewSkill}
						size="lg"
					/>
				{:else}
					<div class="mb-4">
						<p class="text-sm text-zinc-500 dark:text-zinc-400">
							{skills.length} skill{skills.length === 1 ? '' : 's'} available to all areas in this space
						</p>
					</div>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						{#each skills as skill (skill.id)}
							<SkillCard
								{skill}
								showActions={true}
								{spaceColor}
								onEdit={() => handleEditSkill(skill)}
								onDelete={() => handleDeleteSkill(skill)}
							/>
						{/each}
					</div>
				{/if}
			</div>
		</main>
	{/if}
</div>

<!-- Skill Editor Modal -->
{#if space}
	<SkillEditorModal
		open={showEditor}
		skill={editingSkill}
		spaceId={space.id}
		onClose={handleEditorClose}
		onSave={handleSkillSaved}
	/>
{/if}
