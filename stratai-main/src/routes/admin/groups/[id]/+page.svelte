<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';

	interface GroupData {
		id: string;
		name: string;
		description: string | null;
		memberCount: number;
		systemPrompt: string | null;
		allowedTiers: string[] | null;
		monthlyBudget: number | null;
		createdAt: string;
		updatedAt: string;
	}

	interface MemberData {
		userId: string;
		userName: string | null;
		userEmail: string;
		role: 'lead' | 'member';
		orgRole: 'owner' | 'admin' | 'member';
		joinedAt: string;
	}

	interface AvailableUser {
		id: string;
		displayName: string | null;
		email: string;
		username: string;
		role: 'owner' | 'admin' | 'member';
	}

	let { data } = $props<{
		data: {
			group: GroupData;
			members: MemberData[];
			availableUsers: AvailableUser[];
			activeTab: string;
		};
	}>();

	// Tab state
	let activeTab = $state(data.activeTab);

	// Details tab state
	let name = $state(data.group.name);
	let description = $state(data.group.description || '');
	let systemPrompt = $state(data.group.systemPrompt || '');
	let monthlyBudget = $state(data.group.monthlyBudget?.toString() || '');
	let noLimit = $state(data.group.monthlyBudget === null);
	let allowedTiers = $state<string[]>(data.group.allowedTiers || ['basic', 'standard', 'premium']);

	// Form states
	let isSaving = $state(false);
	let saveError = $state('');
	let saveSuccess = $state(false);

	// Members tab state
	let showAddMember = $state(false);
	let selectedUserId = $state('');
	let selectedRole = $state<'lead' | 'member'>('member');
	let isAddingMember = $state(false);
	let addMemberError = $state('');

	// Delete modal state
	let showDeleteModal = $state(false);
	let isDeleting = $state(false);
	let deleteError = $state('');
	let confirmName = $state('');

	const SYSTEM_PROMPT_MAX = 2000;

	// Sync state when data changes
	$effect(() => {
		name = data.group.name;
		description = data.group.description || '';
		systemPrompt = data.group.systemPrompt || '';
		monthlyBudget = data.group.monthlyBudget?.toString() || '';
		noLimit = data.group.monthlyBudget === null;
		allowedTiers = data.group.allowedTiers || ['basic', 'standard', 'premium'];
		activeTab = data.activeTab;
	});

	function setTab(tab: string) {
		activeTab = tab;
		const url = new URL($page.url);
		if (tab === 'details') {
			url.searchParams.delete('tab');
		} else {
			url.searchParams.set('tab', tab);
		}
		goto(url.toString(), { replaceState: true, noScroll: true });
	}

	function toggleTier(tier: string) {
		if (allowedTiers.includes(tier)) {
			allowedTiers = allowedTiers.filter((t) => t !== tier);
		} else {
			allowedTiers = [...allowedTiers, tier];
		}
	}

	async function saveDetails() {
		saveError = '';
		saveSuccess = false;
		isSaving = true;

		try {
			const response = await fetch(`/api/admin/groups/${data.group.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					description: description.trim() || null,
					allowedTiers: allowedTiers.length > 0 ? allowedTiers : null,
					monthlyBudget: noLimit ? null : parseFloat(monthlyBudget) || null
				})
			});

			if (!response.ok) {
				const responseData = await response.json();
				throw new Error(responseData.error || 'Failed to save');
			}

			saveSuccess = true;
			await invalidateAll();
			setTimeout(() => (saveSuccess = false), 3000);
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'Failed to save';
		} finally {
			isSaving = false;
		}
	}

	async function saveSystemPrompt() {
		saveError = '';
		saveSuccess = false;
		isSaving = true;

		try {
			const response = await fetch(`/api/admin/groups/${data.group.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					systemPrompt: systemPrompt.trim() || null
				})
			});

			if (!response.ok) {
				const responseData = await response.json();
				throw new Error(responseData.error || 'Failed to save');
			}

			saveSuccess = true;
			await invalidateAll();
			setTimeout(() => (saveSuccess = false), 3000);
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'Failed to save';
		} finally {
			isSaving = false;
		}
	}

	async function addMember() {
		if (!selectedUserId) return;

		addMemberError = '';
		isAddingMember = true;

		try {
			const response = await fetch(`/api/admin/groups/${data.group.id}/members`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: selectedUserId,
					role: selectedRole
				})
			});

			if (!response.ok) {
				const responseData = await response.json();
				throw new Error(responseData.error || 'Failed to add member');
			}

			showAddMember = false;
			selectedUserId = '';
			selectedRole = 'member';
			await invalidateAll();
		} catch (err) {
			addMemberError = err instanceof Error ? err.message : 'Failed to add member';
		} finally {
			isAddingMember = false;
		}
	}

	async function removeMember(userId: string) {
		try {
			const response = await fetch(`/api/admin/groups/${data.group.id}/members/${userId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const responseData = await response.json();
				throw new Error(responseData.error || 'Failed to remove member');
			}

			await invalidateAll();
		} catch (err) {
			console.error('Failed to remove member:', err);
		}
	}

	async function updateMemberRole(userId: string, newRole: 'lead' | 'member') {
		try {
			const response = await fetch(`/api/admin/groups/${data.group.id}/members/${userId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: newRole })
			});

			if (!response.ok) {
				const responseData = await response.json();
				throw new Error(responseData.error || 'Failed to update role');
			}

			await invalidateAll();
		} catch (err) {
			console.error('Failed to update role:', err);
		}
	}

	async function deleteGroup() {
		if (confirmName !== data.group.name) {
			deleteError = 'Please type the group name to confirm';
			return;
		}

		deleteError = '';
		isDeleting = true;

		try {
			const response = await fetch(`/api/admin/groups/${data.group.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const responseData = await response.json();
				throw new Error(responseData.error || 'Failed to delete');
			}

			goto('/admin/groups');
		} catch (err) {
			deleteError = err instanceof Error ? err.message : 'Failed to delete';
		} finally {
			isDeleting = false;
		}
	}

	function formatOrgRole(role: string): string {
		return role.charAt(0).toUpperCase() + role.slice(1);
	}
</script>

<svelte:head>
	<title>{data.group.name} | Groups | Admin | StratAI</title>
</svelte:head>

<div class="group-detail-page">
	<header class="page-header">
		<a href="/admin/groups" class="back-link">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
			</svg>
			Groups
		</a>
		<button class="btn-delete" onclick={() => (showDeleteModal = true)}>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
			</svg>
			Delete Group
		</button>
	</header>

	<div class="group-header">
		<h1>{data.group.name}</h1>
		{#if data.group.description}
			<p class="group-description">{data.group.description}</p>
		{/if}
		<p class="group-meta">{data.group.memberCount} member{data.group.memberCount === 1 ? '' : 's'}</p>
	</div>

	<div class="tabs">
		<button class="tab" class:active={activeTab === 'details'} onclick={() => setTab('details')}>
			Details
		</button>
		<button class="tab" class:active={activeTab === 'members'} onclick={() => setTab('members')}>
			Members
		</button>
		<button class="tab" class:active={activeTab === 'prompt'} onclick={() => setTab('prompt')}>
			System Prompt
		</button>
	</div>

	<div class="tab-content">
		{#if activeTab === 'details'}
			<div class="content-card">
				<h2>Group Details</h2>

				{#if saveError}
					<div class="error-message">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						{saveError}
					</div>
				{/if}

				{#if saveSuccess}
					<div class="success-message">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
						Changes saved successfully
					</div>
				{/if}

				<form onsubmit={(e) => { e.preventDefault(); saveDetails(); }}>
					<div class="form-group">
						<label for="name">Name</label>
						<input type="text" id="name" bind:value={name} required />
					</div>

					<div class="form-group">
						<label for="description">Description</label>
						<input type="text" id="description" bind:value={description} placeholder="Brief description of this group" />
					</div>

					<div class="form-group">
						<label>Model Access</label>
						<div class="tier-options">
							<label class="tier-option">
								<input type="checkbox" checked={allowedTiers.includes('basic')} onchange={() => toggleTier('basic')} />
								<span>Basic</span>
							</label>
							<label class="tier-option">
								<input type="checkbox" checked={allowedTiers.includes('standard')} onchange={() => toggleTier('standard')} />
								<span>Standard</span>
							</label>
							<label class="tier-option">
								<input type="checkbox" checked={allowedTiers.includes('premium')} onchange={() => toggleTier('premium')} />
								<span>Premium</span>
							</label>
						</div>
					</div>

					<div class="form-group">
						<label for="budget">Monthly Budget</label>
						<div class="budget-input-wrapper">
							<div class="budget-input" class:disabled={noLimit}>
								<span class="currency">$</span>
								<input type="number" id="budget" bind:value={monthlyBudget} placeholder="0.00" min="0" step="0.01" disabled={noLimit} />
								<span class="suffix">USD</span>
							</div>
							<label class="no-limit-option">
								<input type="checkbox" bind:checked={noLimit} />
								<span>No limit</span>
							</label>
						</div>
					</div>

					<div class="form-actions">
						<button type="submit" class="btn-primary" disabled={isSaving}>
							{#if isSaving}Saving...{:else}Save Changes{/if}
						</button>
					</div>
				</form>
			</div>
		{:else if activeTab === 'members'}
			<div class="content-card">
				<div class="card-header">
					<h2>Members ({data.members.length})</h2>
					<button class="btn-primary" onclick={() => (showAddMember = true)} disabled={data.availableUsers.length === 0}>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Add Members
					</button>
				</div>

				{#if showAddMember}
					<div class="add-member-form">
						{#if addMemberError}
							<div class="error-message">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								{addMemberError}
							</div>
						{/if}

						<div class="form-row">
							<div class="form-group flex-1">
								<label for="user-select">User</label>
								<select id="user-select" bind:value={selectedUserId}>
									<option value="">Select a user...</option>
									{#each data.availableUsers as user (user.id)}
										<option value={user.id}>
											{user.displayName || user.username} ({user.email})
										</option>
									{/each}
								</select>
							</div>

							<div class="form-group">
								<label for="role-select">Role</label>
								<select id="role-select" bind:value={selectedRole}>
									<option value="member">Member</option>
									<option value="lead">Lead</option>
								</select>
							</div>
						</div>

						<div class="form-actions-inline">
							<button type="button" class="btn-secondary" onclick={() => (showAddMember = false)}>Cancel</button>
							<button type="button" class="btn-primary" onclick={addMember} disabled={isAddingMember || !selectedUserId}>
								{#if isAddingMember}Adding...{:else}Add to Group{/if}
							</button>
						</div>
					</div>
				{/if}

				{#if data.members.length === 0}
					<div class="empty-state">
						<p>No members in this group yet.</p>
						<p class="hint">Add members to give them access to group settings and model tiers.</p>
					</div>
				{:else}
					<table class="members-table">
						<thead>
							<tr>
								<th>User</th>
								<th>Group Role</th>
								<th>Org Role</th>
								<th>Joined</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each data.members as member (member.userId)}
								<tr>
									<td class="user-cell">
										<span class="user-name">{member.userName || member.userEmail}</span>
										{#if member.userName}
											<span class="user-email">{member.userEmail}</span>
										{/if}
									</td>
									<td>
										<select class="role-select" value={member.role} onchange={(e) => updateMemberRole(member.userId, (e.target as HTMLSelectElement).value as 'lead' | 'member')}>
											<option value="member">Member</option>
											<option value="lead">Lead</option>
										</select>
									</td>
									<td>
										<span class="org-role-badge" class:owner={member.orgRole === 'owner'} class:admin={member.orgRole === 'admin'}>
											{formatOrgRole(member.orgRole)}
										</span>
									</td>
									<td class="date-cell">
										{new Date(member.joinedAt).toLocaleDateString()}
									</td>
									<td class="action-cell">
										<button class="btn-remove" onclick={() => removeMember(member.userId)} title="Remove from group">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		{:else if activeTab === 'prompt'}
			<div class="content-card">
				<h2>Team System Prompt</h2>
				<p class="card-description">
					This context is included in AI conversations for {data.group.name} team members, in addition to the organization-wide prompt.
				</p>

				{#if saveError}
					<div class="error-message">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						{saveError}
					</div>
				{/if}

				{#if saveSuccess}
					<div class="success-message">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
						Changes saved successfully
					</div>
				{/if}

				<form onsubmit={(e) => { e.preventDefault(); saveSystemPrompt(); }}>
					<div class="form-group">
						<textarea id="prompt" bind:value={systemPrompt} placeholder="e.g., When helping Engineering team members, follow our TypeScript style guide..." rows="8"></textarea>
						<div class="char-count" class:warning={systemPrompt.length > SYSTEM_PROMPT_MAX * 0.9} class:error={systemPrompt.length > SYSTEM_PROMPT_MAX}>
							{systemPrompt.length} / {SYSTEM_PROMPT_MAX}
						</div>
					</div>

					<div class="form-actions">
						<button type="submit" class="btn-primary" disabled={isSaving || systemPrompt.length > SYSTEM_PROMPT_MAX}>
							{#if isSaving}Saving...{:else}Save Changes{/if}
						</button>
					</div>
				</form>
			</div>
		{/if}
	</div>
</div>

{#if showDeleteModal}
	<div class="modal-backdrop" onclick={() => (showDeleteModal = false)} role="dialog" aria-modal="true">
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<header class="modal-header">
				<div class="header-icon danger">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				</div>
				<h2>Delete Group</h2>
				<button class="btn-close" onclick={() => (showDeleteModal = false)}>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</header>

			<div class="modal-body">
				{#if deleteError}
					<div class="error-message">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						{deleteError}
					</div>
				{/if}

				<p>Are you sure you want to delete <strong>{data.group.name}</strong>?</p>

				{#if data.group.memberCount > 0}
					<div class="warning-box">
						<p><strong>{data.group.memberCount} member{data.group.memberCount === 1 ? '' : 's'}</strong> will be removed from this group.</p>
					</div>
				{/if}

				<div class="confirm-section">
					<label for="confirm-name">Type <strong>{data.group.name}</strong> to confirm:</label>
					<input type="text" id="confirm-name" bind:value={confirmName} placeholder="Type group name" autocomplete="off" />
				</div>
			</div>

			<footer class="modal-footer">
				<button class="btn-secondary" onclick={() => (showDeleteModal = false)} disabled={isDeleting}>Cancel</button>
				<button class="btn-danger" onclick={deleteGroup} disabled={isDeleting || confirmName !== data.group.name}>
					{#if isDeleting}Deleting...{:else}Delete Group{/if}
				</button>
			</footer>
		</div>
	</div>
{/if}

<style>
	.group-detail-page {
		max-width: 900px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.back-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-surface-400);
		text-decoration: none;
		transition: color 0.15s ease;
	}

	.back-link:hover {
		color: var(--color-surface-200);
	}

	.btn-delete {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		color: var(--color-error-400);
		background: transparent;
		border: 1px solid var(--color-error-500);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-delete:hover {
		color: white;
		background: var(--color-error-500);
	}

	.group-header {
		margin-bottom: 1.5rem;
	}

	.group-header h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-surface-100);
		margin-bottom: 0.25rem;
	}

	.group-description {
		font-size: 0.9375rem;
		color: var(--color-surface-400);
		margin-bottom: 0.25rem;
	}

	.group-meta {
		font-size: 0.875rem;
		color: var(--color-surface-500);
	}

	/* Tabs */
	.tabs {
		display: flex;
		gap: 0;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-surface-800);
	}

	.tab {
		padding: 0.75rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-400);
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		transition: all 0.15s ease;
		margin-bottom: -1px;
	}

	.tab:hover {
		color: var(--color-surface-200);
	}

	.tab.active {
		color: var(--color-primary-400);
		border-bottom-color: var(--color-primary-500);
	}

	/* Content Card */
	.content-card {
		padding: 1.5rem;
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-800);
		border-radius: 0.75rem;
	}

	.content-card h2 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-surface-100);
		margin-bottom: 1rem;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.card-header h2 {
		margin-bottom: 0;
	}

	.card-description {
		font-size: 0.875rem;
		color: var(--color-surface-400);
		margin-bottom: 1rem;
		line-height: 1.5;
	}

	/* Form */
	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-200);
	}

	input[type='text'],
	input[type='number'],
	textarea,
	select {
		width: 100%;
		padding: 0.625rem 0.75rem;
		font-size: 0.875rem;
		color: var(--color-surface-100);
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		outline: none;
		transition: border-color 0.15s ease;
	}

	input:focus,
	textarea:focus,
	select:focus {
		border-color: var(--color-primary-500);
	}

	input::placeholder,
	textarea::placeholder {
		color: var(--color-surface-500);
	}

	textarea {
		resize: vertical;
		min-height: 100px;
	}

	.tier-options {
		display: flex;
		gap: 1.5rem;
	}

	.tier-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-surface-200);
		cursor: pointer;
	}

	.tier-option input {
		width: auto;
		accent-color: var(--color-primary-500);
	}

	.budget-input-wrapper {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.budget-input {
		flex: 1;
		max-width: 200px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 0.75rem;
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
	}

	.budget-input.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.budget-input input {
		flex: 1;
		padding: 0;
		background: transparent;
		border: none;
	}

	.currency,
	.suffix {
		font-size: 0.875rem;
		color: var(--color-surface-400);
	}

	.no-limit-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-surface-300);
		cursor: pointer;
	}

	.char-count {
		text-align: right;
		margin-top: 0.375rem;
		font-size: 0.75rem;
		color: var(--color-surface-500);
	}

	.char-count.warning {
		color: var(--color-warning-400);
	}

	.char-count.error {
		color: var(--color-error-400);
	}

	.form-actions {
		margin-top: 1.5rem;
	}

	/* Add Member Form */
	.add-member-form {
		padding: 1rem;
		margin-bottom: 1rem;
		background: var(--color-surface-850);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
	}

	.form-row {
		display: flex;
		gap: 1rem;
	}

	.flex-1 {
		flex: 1;
	}

	.form-actions-inline {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	/* Members Table */
	.members-table {
		width: 100%;
		border-collapse: collapse;
	}

	.members-table th {
		padding: 0.75rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-align: left;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-surface-400);
		border-bottom: 1px solid var(--color-surface-800);
	}

	.members-table td {
		padding: 0.75rem;
		border-bottom: 1px solid var(--color-surface-800);
	}

	.members-table tr:last-child td {
		border-bottom: none;
	}

	.user-cell {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.user-name {
		font-weight: 500;
		color: var(--color-surface-100);
	}

	.user-email {
		font-size: 0.8125rem;
		color: var(--color-surface-400);
	}

	.role-select {
		width: auto;
		padding: 0.375rem 0.5rem;
		font-size: 0.8125rem;
	}

	.org-role-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-surface-300);
		background: var(--color-surface-800);
		border-radius: 9999px;
	}

	.org-role-badge.owner {
		color: var(--color-warning-400);
		background: color-mix(in srgb, var(--color-warning-500) 15%, transparent);
	}

	.org-role-badge.admin {
		color: var(--color-primary-400);
		background: color-mix(in srgb, var(--color-primary-500) 15%, transparent);
	}

	.date-cell {
		font-size: 0.875rem;
		color: var(--color-surface-400);
	}

	.action-cell {
		text-align: right;
	}

	.btn-remove {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		color: var(--color-surface-400);
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-remove:hover {
		color: var(--color-error-400);
		background: color-mix(in srgb, var(--color-error-500) 15%, transparent);
	}

	/* Empty State */
	.empty-state {
		padding: 2rem;
		text-align: center;
	}

	.empty-state p {
		color: var(--color-surface-400);
	}

	.empty-state .hint {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-surface-500);
	}

	/* Messages */
	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
		font-size: 0.875rem;
		color: var(--color-error-300);
		background: color-mix(in srgb, var(--color-error-500) 15%, transparent);
		border: 1px solid var(--color-error-500);
		border-radius: 0.5rem;
	}

	.success-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
		font-size: 0.875rem;
		color: var(--color-success-300);
		background: color-mix(in srgb, var(--color-success-500) 15%, transparent);
		border: 1px solid var(--color-success-500);
		border-radius: 0.5rem;
	}

	/* Buttons */
	.btn-primary {
		display: inline-flex;
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

	.btn-primary:hover:not(:disabled) {
		background: var(--color-primary-600);
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-secondary {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-300);
		background: transparent;
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-secondary:hover:not(:disabled) {
		color: var(--color-surface-100);
		border-color: var(--color-surface-600);
	}

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Modal */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: rgb(0 0 0 / 0.6);
		backdrop-filter: blur(4px);
	}

	.modal {
		width: 100%;
		max-width: 440px;
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.75rem;
	}

	.modal-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--color-surface-800);
	}

	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 9999px;
	}

	.header-icon.danger {
		color: var(--color-error-400);
		background: color-mix(in srgb, var(--color-error-500) 15%, transparent);
	}

	.modal-header h2 {
		flex: 1;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-surface-100);
		margin: 0;
	}

	.btn-close {
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
	}

	.btn-close:hover {
		color: var(--color-surface-200);
		background: var(--color-surface-800);
	}

	.modal-body {
		padding: 1.25rem;
	}

	.modal-body p {
		font-size: 0.9375rem;
		color: var(--color-surface-200);
		line-height: 1.5;
		margin-bottom: 1rem;
	}

	.modal-body strong {
		color: var(--color-surface-100);
	}

	.warning-box {
		padding: 0.875rem 1rem;
		margin-bottom: 1rem;
		background: color-mix(in srgb, var(--color-warning-500) 10%, transparent);
		border: 1px solid var(--color-warning-500);
		border-radius: 0.5rem;
	}

	.warning-box p {
		font-size: 0.875rem;
		color: var(--color-surface-200);
		margin: 0;
	}

	.confirm-section {
		margin-bottom: 1rem;
	}

	.confirm-section label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-surface-300);
	}

	.confirm-section strong {
		font-family: monospace;
		background: var(--color-surface-800);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}

	.confirm-section input {
		width: 100%;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid var(--color-surface-800);
	}

	.btn-danger {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
		background: var(--color-error-500);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
	}

	.btn-danger:hover:not(:disabled) {
		background: var(--color-error-600);
	}

	.btn-danger:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
