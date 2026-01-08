<!--
	AreaHeader.svelte

	Header component for Area pages.
	Features:
	- Back navigation to space dashboard
	- Breadcrumb (Space > Area)
	- Conversation drawer toggle
	- Tool icons for Tasks and Docs panels
	- Model selector
	- New chat and settings buttons
-->
<script lang="ts">
	import ModelSelector from '$lib/components/ModelSelector.svelte';
	import SpaceIcon from '$lib/components/SpaceIcon.svelte';
	import type { Space, SystemSpaceSlug } from '$lib/types/spaces';
	import { isSystemSpace } from '$lib/types/spaces';
	import type { Area } from '$lib/types/areas';

	interface Props {
		space: Space;
		area: Area;
		effectiveModel: string;
		conversationCount: number;
		taskCount?: number;
		documentCount?: number;
		onBack: () => void;
		onAreaClick: () => void;
		onDrawerOpen: () => void;
		onModelChange: (model: string) => void;
		onNewChat: () => void;
		onSettingsOpen: () => void;
		onTasksOpen?: () => void;
		onDocsOpen?: () => void;
	}

	let {
		space,
		area,
		effectiveModel,
		conversationCount,
		taskCount = 0,
		documentCount = 0,
		onBack,
		onAreaClick,
		onDrawerOpen,
		onModelChange,
		onNewChat,
		onSettingsOpen,
		onTasksOpen,
		onDocsOpen
	}: Props = $props();

	let areaColor = $derived(area.color || space.color || '#3b82f6');
</script>

<header class="area-header" style="--area-color: {areaColor}">
	<div class="header-left">
		<button type="button" class="back-button" onclick={onBack} title="Back to {space.name}">
			<svg viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/>
			</svg>
		</button>
		<div class="breadcrumb">
			<button type="button" class="breadcrumb-space" onclick={onBack}>
				{#if isSystemSpace(space.slug)}
					<SpaceIcon space={space.slug as SystemSpaceSlug} size="sm" class="space-icon-svg" />
				{:else if space.icon}
					<span class="space-icon">{space.icon}</span>
				{/if}
				{space.name}
			</button>
			<span class="breadcrumb-separator">/</span>
			<button type="button" class="breadcrumb-area" style="--badge-color: {areaColor}" onclick={onAreaClick}>
				{#if area.icon}<span class="area-icon">{area.icon}</span>{/if}
				{area.name}
			</button>
			<!-- Conversations drawer toggle -->
			<button
				type="button"
				class="drawer-toggle"
				class:has-conversations={conversationCount > 0}
				onclick={onDrawerOpen}
				title="View all conversations ({conversationCount})"
			>
				<svg viewBox="0 0 20 20" fill="currentColor">
					<path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
					<path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
				</svg>
				{#if conversationCount > 0}
					<span class="badge">{conversationCount}</span>
				{/if}
			</button>
		</div>
	</div>

	<!-- Tools cluster -->
	<div class="header-tools">
		{#if onTasksOpen}
			<button
				type="button"
				class="tool-button"
				onclick={onTasksOpen}
				title="Tasks ({taskCount})"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
				</svg>
				{#if taskCount > 0}
					<span class="badge">{taskCount}</span>
				{/if}
			</button>
		{/if}
		{#if onDocsOpen}
			<button
				type="button"
				class="tool-button"
				onclick={onDocsOpen}
				title="Documents ({documentCount})"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
				</svg>
				{#if documentCount > 0}
					<span class="badge">{documentCount}</span>
				{/if}
			</button>
		{/if}
	</div>

	<div class="header-right">
		<ModelSelector
			selectedModel={effectiveModel}
			onchange={onModelChange}
		/>
		<button
			type="button"
			class="new-chat-button"
			onclick={onNewChat}
			title="New chat in this area"
		>
			<svg viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
			</svg>
		</button>
		<button
			type="button"
			class="settings-button"
			onclick={onSettingsOpen}
			title="Settings"
		>
			<svg viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
			</svg>
		</button>
	</div>
</header>

<style>
	.area-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.02);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		flex-shrink: 0;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		min-width: 0;
	}

	.back-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		flex-shrink: 0;
		color: rgba(255, 255, 255, 0.5);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.back-button:hover {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.9);
	}

	.back-button svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		min-width: 0;
	}

	.breadcrumb-space,
	.breadcrumb-area {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.breadcrumb-space:hover,
	.breadcrumb-area:hover {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.95);
	}

	.breadcrumb-area {
		color: var(--area-color);
	}

	.breadcrumb-area:hover {
		color: var(--area-color);
	}

	.space-icon,
	.area-icon {
		font-size: 1rem;
	}

	/* SVG space icon styling */
	:global(.space-icon-svg) {
		flex-shrink: 0;
		opacity: 0.8;
	}

	.breadcrumb-separator {
		color: rgba(255, 255, 255, 0.25);
		font-size: 0.875rem;
	}

	.drawer-toggle {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		flex-shrink: 0;
		margin-left: 0.25rem;
		color: rgba(255, 255, 255, 0.4);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.drawer-toggle:hover {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.7);
	}

	.drawer-toggle.has-conversations {
		color: var(--area-color);
	}

	.drawer-toggle svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	.badge {
		position: absolute;
		top: 0;
		right: 0;
		min-width: 1rem;
		height: 1rem;
		padding: 0 0.25rem;
		font-size: 0.625rem;
		font-weight: 600;
		line-height: 1rem;
		text-align: center;
		color: #fff;
		background: var(--area-color);
		border-radius: 9999px;
		transform: translate(25%, -25%);
	}

	/* Tools cluster */
	.header-tools {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.tool-button {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.5rem;
		transition: all 0.15s ease;
	}

	.tool-button:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.1);
		color: var(--area-color);
	}

	.tool-button svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	.tool-button .badge {
		background: color-mix(in srgb, var(--area-color) 85%, #000);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.new-chat-button,
	.settings-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		color: rgba(255, 255, 255, 0.5);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.new-chat-button:hover,
	.settings-button:hover {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.9);
	}

	.new-chat-button svg,
	.settings-button svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.area-header {
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.header-left {
			flex: 1 1 100%;
		}

		.header-tools {
			order: 3;
			flex: 1;
		}

		.header-right {
			flex: 0 0 auto;
		}

		.breadcrumb-space span:not(.space-icon),
		.breadcrumb-area span:not(.area-icon) {
			max-width: 6rem;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}
</style>
