<script lang="ts">
	import SettingsLayout from '$lib/components/settings/SettingsLayout.svelte';
	import SettingsGeneral from '$lib/components/settings/SettingsGeneral.svelte';
	import SettingsAppearance from '$lib/components/settings/SettingsAppearance.svelte';
	import SettingsProfile from '$lib/components/settings/SettingsProfile.svelte';
	import SettingsPassword from '$lib/components/settings/SettingsPassword.svelte';
	import SettingsAIPreferences from '$lib/components/settings/SettingsAIPreferences.svelte';
	import SettingsShortcuts from '$lib/components/settings/SettingsShortcuts.svelte';
	import SettingsPrivacy from '$lib/components/settings/SettingsPrivacy.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Active section state
	let activeSection = $state('general');

	function handleSectionChange(section: string) {
		activeSection = section;
	}
</script>

<svelte:head>
	<title>Settings - StratAI</title>
</svelte:head>

<SettingsLayout {activeSection} onSectionChange={handleSectionChange}>
	{#if activeSection === 'general'}
		<SettingsGeneral spaces={data.spaces} areasMap={data.areasMap} />
	{:else if activeSection === 'appearance'}
		<SettingsAppearance />
	{:else if activeSection === 'profile'}
		<SettingsProfile />
	{:else if activeSection === 'password'}
		<SettingsPassword />
	{:else if activeSection === 'ai-preferences'}
		<SettingsAIPreferences />
	{:else if activeSection === 'shortcuts'}
		<SettingsShortcuts />
	{:else if activeSection === 'privacy'}
		<SettingsPrivacy />
	{/if}
</SettingsLayout>
