<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import CreateGroupModal from './CreateGroupModal.svelte';
	import DeleteGroupModal from './DeleteGroupModal.svelte';

	interface GroupData {
		id: string;
		name: string;
		description: string | null;
		memberCount: number;
		systemPrompt: string | null;
		allowedTiers: string[] | null;
		monthlyBudget: number | null;
		createdAt: string;
	}

	let { data } = $props<{ data: { groups: GroupData[] } }>();

	let showCreateModal = $state(false);
	let showDeleteModal = $state(false);
	let groupToDelete = $state<GroupData | null>(null);
	let openMenuId = $state<string | null>(null);

	function formatBudget(budget: number | null): string {
		if (budget === null) return 'No limit';
		return `$${budget.toLocaleString()}/mo`;
	}

	function formatTiers(tiers: string[] | null): string {
		if (!tiers || tiers.length === 0) return 'Default';
		return tiers.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ');
	}

	function toggleMenu(groupId: string) {
		openMenuId = openMenuId === groupId ? null : groupId;
	}

	function closeMenus() {
		openMenuId = null;
	}

	function handleDeleteClick(group: GroupData) {
		groupToDelete = group;
		showDeleteModal = true;
		openMenuId = null;
	}

	async function handleGroupCreated() {
		showCreateModal = false;
		await invalidateAll();
	}

	async function handleGroupDeleted() {
		showDeleteModal = false;
		groupToDelete = null;
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Groups | Admin | StratAI</title>
</svelte:head>

<!-- Close menus when clicking outside -->
<svelte:window on:click={closeMenus} />

<div class="groups-page">
	<header class="page-header">
		<h1 class="page-title">Groups</h1>
		<button class="btn-primary" onclick={() => showCreateModal = true}>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Create Group
		</button>
	</header>

	{#if data.groups.length === 0}
		<div class="empty-state">
			<div class="icon-container">
				<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
				</svg>
			</div>
			<h2>No groups yet</h2>
			<p>Create your first group to organize team members, set budgets, and configure group-specific AI context.</p>
			<button class="btn-primary" onclick={() => showCreateModal = true}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Create First Group
			</button>
		</div>
	{:else}
		<div class="table-container">
			<table class="groups-table">
				<thead>
					<tr>
						<th class="col-group">Group</th>
						<th class="col-members">Members</th>
						<th class="col-access">Model Access</th>
						<th class="col-budget">Budget</th>
						<th class="col-actions">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.groups as group (group.id)}
						<tr>
							<td class="col-group">
								<div class="group-info">
									<span class="group-name">{group.name}</span>
									{#if group.description}
										<span class="group-description">{group.description}</span>
									{/if}
								</div>
							</td>
							<td class="col-members">
								<span class="member-count">{group.memberCount}</span>
							</td>
							<td class="col-access">
								<span class="tier-badge">{formatTiers(group.allowedTiers)}</span>
							</td>
							<td class="col-budget">
								<span class="budget-value" class:no-limit={group.monthlyBudget === null}>
									{formatBudget(group.monthlyBudget)}
								</span>
							</td>
							<td class="col-actions">
								<div class="actions-wrapper">
									<a href="/admin/groups/{group.id}" class="btn-edit">
										Edit
									</a>
									<div class="menu-container">
										<button
											class="btn-menu"
											onclick={(e) => { e.stopPropagation(); toggleMenu(group.id); }}
											aria-label="More actions"
										>
											<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
											</svg>
										</button>
										{#if openMenuId === group.id}
											<div class="dropdown-menu" onclick={(e) => e.stopPropagation()}>
												<a href="/admin/groups/{group.id}" class="menu-item">
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
													</svg>
													Edit details
												</a>
												<a href="/admin/groups/{group.id}?tab=members" class="menu-item">
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
													</svg>
													Manage members
												</a>
												<a href="/admin/groups/{group.id}?tab=prompt" class="menu-item">
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
													</svg>
													System prompt
												</a>
												<hr class="menu-divider" />
												<button class="menu-item danger" onclick={() => handleDeleteClick(group)}>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
													</svg>
													Delete group
												</button>
											</div>
										{/if}
									</div>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="table-footer">
			{data.groups.length} group{data.groups.length === 1 ? '' : 's'}
		</div>
	{/if}
</div>

{#if showCreateModal}
	<CreateGroupModal
		onclose={() => showCreateModal = false}
		oncreated={handleGroupCreated}
	/>
{/if}

{#if showDeleteModal && groupToDelete}
	<DeleteGroupModal
		group={groupToDelete}
		onclose={() => { showDeleteModal = false; groupToDelete = null; }}
		ondeleted={handleGroupDeleted}
	/>
{/if}

<style>
	.groups-page {
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-surface-100);
	}

	.btn-primary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
		background: var(--color-primary-500);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-primary:hover {
		background: var(--color-primary-600);
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 4rem 2rem;
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-800);
		border-radius: 0.75rem;
	}

	.icon-container {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 5rem;
		height: 5rem;
		margin-bottom: 1.5rem;
		color: var(--color-primary-400);
		background: color-mix(in srgb, var(--color-primary-500) 10%, transparent);
		border-radius: 1rem;
	}

	.empty-state h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-surface-100);
		margin-bottom: 0.5rem;
	}

	.empty-state > p {
		max-width: 400px;
		color: var(--color-surface-400);
		line-height: 1.6;
		margin-bottom: 1.5rem;
	}

	/* Table */
	.table-container {
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-800);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.groups-table {
		width: 100%;
		border-collapse: collapse;
	}

	.groups-table th {
		padding: 0.75rem 1rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-align: left;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-surface-400);
		background: var(--color-surface-850);
		border-bottom: 1px solid var(--color-surface-800);
	}

	.groups-table td {
		padding: 1rem;
		border-bottom: 1px solid var(--color-surface-800);
	}

	.groups-table tr:last-child td {
		border-bottom: none;
	}

	.groups-table tr:hover {
		background: var(--color-surface-850);
	}

	.col-group {
		width: 35%;
	}

	.col-members {
		width: 10%;
		text-align: center;
	}

	.col-access {
		width: 20%;
	}

	.col-budget {
		width: 20%;
	}

	.col-actions {
		width: 15%;
		text-align: right;
	}

	.group-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.group-name {
		font-weight: 500;
		color: var(--color-surface-100);
	}

	.group-description {
		font-size: 0.875rem;
		color: var(--color-surface-400);
	}

	.member-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2rem;
		padding: 0.25rem 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-200);
		background: var(--color-surface-800);
		border-radius: 9999px;
	}

	.tier-badge {
		font-size: 0.875rem;
		color: var(--color-surface-300);
	}

	.budget-value {
		font-size: 0.875rem;
		color: var(--color-surface-200);
	}

	.budget-value.no-limit {
		color: var(--color-surface-400);
		font-style: italic;
	}

	/* Actions */
	.actions-wrapper {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.btn-edit {
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-primary-400);
		background: transparent;
		border: 1px solid var(--color-primary-500);
		border-radius: 0.375rem;
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.btn-edit:hover {
		color: white;
		background: var(--color-primary-500);
	}

	.menu-container {
		position: relative;
	}

	.btn-menu {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		color: var(--color-surface-400);
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-menu:hover {
		color: var(--color-surface-200);
		background: var(--color-surface-800);
	}

	.dropdown-menu {
		position: absolute;
		top: 100%;
		right: 0;
		z-index: 50;
		min-width: 180px;
		margin-top: 0.25rem;
		padding: 0.25rem;
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.3);
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		color: var(--color-surface-200);
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		text-decoration: none;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.menu-item:hover {
		background: var(--color-surface-700);
	}

	.menu-item.danger {
		color: var(--color-error-400);
	}

	.menu-item.danger:hover {
		background: color-mix(in srgb, var(--color-error-500) 15%, transparent);
	}

	.menu-divider {
		margin: 0.25rem 0;
		border: none;
		border-top: 1px solid var(--color-surface-700);
	}

	.table-footer {
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		color: var(--color-surface-400);
		text-align: right;
	}
</style>
