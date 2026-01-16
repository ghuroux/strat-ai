<script lang="ts">
	import { enhance } from '$app/forms';
	import { fly, fade } from 'svelte/transition';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Active tab state
	let activeTab = $state<'members' | 'invitations'>('members');

	// Search/filter state
	let searchQuery = $state('');
	let roleFilter = $state<'all' | 'owner' | 'admin' | 'member'>('all');

	// Filtered users based on search and role
	let filteredUsers = $derived(() => {
		let result = data.users;

		// Filter by role
		if (roleFilter !== 'all') {
			result = result.filter(u => u.role === roleFilter);
		}

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter(u =>
				u.displayName?.toLowerCase().includes(query) ||
				u.username.toLowerCase().includes(query) ||
				u.email.toLowerCase().includes(query)
			);
		}

		return result;
	});

	// Modal states
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let showResetPasswordModal = $state(false);

	// Selected user for editing
	let selectedUser = $state<(typeof data.users)[0] | null>(null);

	// Form states
	let createForm = $state({
		email: '',
		username: '',
		firstName: '',
		lastName: '',
		role: 'member' as 'owner' | 'admin' | 'member'
	});

	let editForm = $state({
		email: '',
		username: '',
		firstName: '',
		lastName: '',
		role: 'member' as 'owner' | 'admin' | 'member'
	});

	let newPassword = $state('');
	let generatedPassword = $state<string | null>(null);

	// Role display helper
	function getRoleBadgeClass(role: string) {
		switch (role) {
			case 'owner':
				return 'badge-purple';
			case 'admin':
				return 'badge-blue';
			default:
				return 'badge-gray';
		}
	}

	function getStatusBadgeClass(status: string) {
		return status === 'active' ? 'badge-green' : 'badge-red';
	}

	function openEditModal(user: (typeof data.users)[0]) {
		selectedUser = user;
		editForm = {
			email: user.email,
			username: user.username,
			firstName: user.firstName || '',
			lastName: user.lastName || '',
			role: user.role
		};
		showEditModal = true;
	}

	function openResetPasswordModal(user: (typeof data.users)[0]) {
		selectedUser = user;
		newPassword = '';
		generatedPassword = null;
		showResetPasswordModal = true;
	}

	function closeModals() {
		showCreateModal = false;
		showEditModal = false;
		showResetPasswordModal = false;
		selectedUser = null;
		generatedPassword = null;
	}

	function resetCreateForm() {
		createForm = {
			email: '',
			username: '',
			firstName: '',
			lastName: '',
			role: 'member'
		};
	}

	// Format date helper
	function formatDate(dateStr: string | null) {
		if (!dateStr) return 'Never';
		return new Date(dateStr).toLocaleDateString('en-ZA', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Members | Admin | StratAI</title>
</svelte:head>

<div class="members-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Members</h1>
			<p class="page-description">Manage organization members, roles, and group assignments.</p>
		</div>
		<button class="btn-primary" onclick={() => (showCreateModal = true)}>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Add User
		</button>
	</header>

	<!-- Tabs -->
	<div class="tabs-container">
		<button
			class="tab-button"
			class:active={activeTab === 'members'}
			onclick={() => (activeTab = 'members')}
		>
			All Members ({data.users.length})
		</button>
		<button
			class="tab-button"
			class:active={activeTab === 'invitations'}
			onclick={() => (activeTab = 'invitations')}
		>
			Invitations ({data.invitations.length})
		</button>
	</div>

	<!-- Search and Filter Bar -->
	{#if activeTab === 'members'}
		<div class="filter-bar">
			<div class="search-wrapper">
				<svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					type="text"
					class="search-input"
					placeholder="Search by name, username, or email..."
					bind:value={searchQuery}
				/>
				{#if searchQuery}
					<button class="search-clear" onclick={() => (searchQuery = '')}>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				{/if}
			</div>
			<div class="role-filter">
				<button class="filter-btn" class:active={roleFilter === 'all'} onclick={() => (roleFilter = 'all')}>All</button>
				<button class="filter-btn" class:active={roleFilter === 'owner'} onclick={() => (roleFilter = 'owner')}>Owners</button>
				<button class="filter-btn" class:active={roleFilter === 'admin'} onclick={() => (roleFilter = 'admin')}>Admins</button>
				<button class="filter-btn" class:active={roleFilter === 'member'} onclick={() => (roleFilter = 'member')}>Members</button>
			</div>
		</div>
	{/if}

	<!-- Error/Success Messages -->
	{#if form?.error}
		<div class="alert alert-error" transition:fly={{ y: -10, duration: 200 }}>
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="alert alert-success" transition:fly={{ y: -10, duration: 200 }}>
			{#if form.welcomeEmailSent}
				User created. Welcome email sent to {form.email}
			{:else if form.tempPassword}
				User created! Temporary password: <code>{form.tempPassword}</code>
			{:else}
				Operation completed successfully
			{/if}
		</div>
	{/if}

	<!-- Tab Content -->
	{#if activeTab === 'members'}
		{@const users = filteredUsers()}
		{#if users.length > 0}
			<div class="table-container">
				<table class="data-table">
					<thead>
						<tr>
							<th>User</th>
							<th>Email</th>
							<th>Role</th>
							<th>Groups</th>
							<th>Status</th>
							<th>Last Login</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each users as user (user.id)}
							<tr class:current-user={user.id === data.currentUserId}>
								<td class="user-cell">
									<div class="user-info">
										<span class="user-name">{user.displayName || user.username}</span>
										<span class="user-username">@{user.username}</span>
									</div>
								</td>
								<td>{user.email}</td>
								<td>
									<span class="badge {getRoleBadgeClass(user.role)}">{user.role}</span>
								</td>
								<td class="groups-cell">
									{#if user.groups.length > 0}
										<div class="groups-list">
											{#each user.groups.slice(0, 2) as group}
												<span class="group-badge" class:lead={group.role === 'lead'} title={group.role === 'lead' ? 'Group Lead' : 'Member'}>
													{group.name}
													{#if group.role === 'lead'}
														<svg class="lead-icon" viewBox="0 0 16 16" fill="currentColor">
															<path d="M8 0l2 4 4 2-4 2-2 4-2-4-4-2 4-2z"/>
														</svg>
													{/if}
												</span>
											{/each}
											{#if user.groups.length > 2}
												<span class="groups-more" title={user.groups.slice(2).map(g => g.name).join(', ')}>
													+{user.groups.length - 2}
												</span>
											{/if}
										</div>
									{:else}
										<span class="no-groups">No groups</span>
									{/if}
								</td>
								<td>
									<span class="badge {getStatusBadgeClass(user.status)}">{user.status}</span>
								</td>
								<td class="date-cell">{formatDate(user.lastLoginAt)}</td>
								<td class="actions-cell">
									<button class="btn-icon" onclick={() => openEditModal(user)} title="Edit user">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
										</svg>
									</button>
									<button class="btn-icon" onclick={() => openResetPasswordModal(user)} title="Reset password">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
										</svg>
									</button>
									{#if user.id !== data.currentUserId}
										<form
											method="POST"
											action="?/toggleStatus"
											use:enhance={() => {
												return async ({ update }) => {
													await update();
												};
											}}
										>
											<input type="hidden" name="userId" value={user.id} />
											<input type="hidden" name="status" value={user.status === 'active' ? 'inactive' : 'active'} />
											<button
												type="submit"
												class="btn-icon {user.status === 'active' ? 'text-error-400' : 'text-success-400'}"
												title={user.status === 'active' ? 'Deactivate' : 'Activate'}
											>
												{#if user.status === 'active'}
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
													</svg>
												{:else}
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
													</svg>
												{/if}
											</button>
										</form>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else if searchQuery || roleFilter !== 'all'}
			<div class="empty-state">
				<svg class="w-12 h-12 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<p>No members found</p>
				<span class="text-sm text-surface-500">Try adjusting your search or filters</span>
				<button class="btn-secondary mt-4" onclick={() => { searchQuery = ''; roleFilter = 'all'; }}>
					Clear filters
				</button>
			</div>
		{:else}
			<div class="empty-state">
				<svg class="w-12 h-12 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
				</svg>
				<p>No members yet</p>
				<span class="text-sm text-surface-500">Add your first team member to get started</span>
			</div>
		{/if}
	{:else}
		<!-- Invitations Tab -->
		{#if data.invitations.length > 0}
			<div class="table-container">
				<table class="data-table">
					<thead>
						<tr>
							<th>User</th>
							<th>Email</th>
							<th>Status</th>
							<th>Invited</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.invitations as invitation (invitation.id)}
							<tr>
								<td class="user-cell">
									<div class="user-info">
										<span class="user-name">{invitation.displayName || invitation.username || 'New User'}</span>
										{#if invitation.username}
											<span class="user-username">@{invitation.username}</span>
										{/if}
									</div>
								</td>
								<td>{invitation.email}</td>
								<td>
									<span class="badge {invitation.status === 'pending' ? 'badge-yellow' : 'badge-red'}">
										{invitation.status === 'pending' ? 'Pending' : 'Expired'}
									</span>
								</td>
								<td class="date-cell">{formatDate(invitation.invitedAt)}</td>
								<td class="actions-cell">
									<form
											method="POST"
											action="?/resendWelcome"
											use:enhance={() => {
												return async ({ update }) => {
													await update();
												};
											}}
										>
											<input type="hidden" name="userId" value={invitation.id} />
											<button
												type="submit"
												class="btn-icon"
												title="Resend welcome email"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
												</svg>
											</button>
										</form>
										<form
											method="POST"
											action="?/revokeInvitation"
											use:enhance={() => {
												return async ({ update }) => {
													await update();
												};
											}}
										>
											<input type="hidden" name="userId" value={invitation.id} />
											<button
												type="submit"
												class="btn-icon text-error-400"
												title="Revoke invitation"
												onclick={(e) => {
													if (!confirm('Are you sure you want to revoke this invitation? The user will be deleted.')) {
														e.preventDefault();
													}
												}}
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
												</svg>
											</button>
										</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="empty-state">
				<svg class="w-12 h-12 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
				</svg>
				<p>No pending invitations</p>
				<span class="text-sm text-surface-500">Users who haven't logged in yet will appear here</span>
			</div>
		{/if}
	{/if}
</div>

<!-- Create User Modal -->
{#if showCreateModal}
	<div class="modal-backdrop" onclick={closeModals} transition:fade={{ duration: 150 }}>
		<div class="modal" onclick={(e) => e.stopPropagation()} transition:fly={{ y: 20, duration: 200 }}>
			<div class="modal-header">
				<h2>Add New User</h2>
				<button class="btn-icon" onclick={closeModals}>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<form
				method="POST"
				action="?/create"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							closeModals();
							resetCreateForm();
						}
						await update();
					};
				}}
			>
				<div class="modal-body">
					<div class="form-group">
						<label for="create-email">Email</label>
						<input type="email" id="create-email" name="email" bind:value={createForm.email} required placeholder="user@example.com" />
					</div>
					<div class="form-group">
						<label for="create-username">Username</label>
						<input type="text" id="create-username" name="username" bind:value={createForm.username} required placeholder="johndoe" />
					</div>
					<div class="name-row">
						<div class="form-group">
							<label for="create-firstName">First Name</label>
							<input type="text" id="create-firstName" name="firstName" bind:value={createForm.firstName} placeholder="John" />
						</div>
						<div class="form-group">
							<label for="create-lastName">Last Name</label>
							<input type="text" id="create-lastName" name="lastName" bind:value={createForm.lastName} placeholder="Doe" />
						</div>
					</div>
					<div class="form-group">
						<label for="create-role">Role</label>
						<select id="create-role" name="role" bind:value={createForm.role}>
							<option value="member">Member</option>
							<option value="admin">Admin</option>
							<option value="owner">Owner</option>
						</select>
					</div>
					<div class="info-message">
						<svg class="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
						</svg>
						<span>A welcome email will be sent with a link to set password</span>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn-secondary" onclick={closeModals}>Cancel</button>
					<button type="submit" class="btn-primary">Create User</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Edit User Modal -->
{#if showEditModal && selectedUser}
	<div class="modal-backdrop" onclick={closeModals} transition:fade={{ duration: 150 }}>
		<div class="modal" onclick={(e) => e.stopPropagation()} transition:fly={{ y: 20, duration: 200 }}>
			<div class="modal-header">
				<h2>Edit User</h2>
				<button class="btn-icon" onclick={closeModals}>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<form
				method="POST"
				action="?/update"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							closeModals();
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="userId" value={selectedUser.id} />
				<input type="hidden" name="membershipId" value={selectedUser.membershipId} />
				<div class="modal-body">
					<div class="form-group">
						<label for="edit-email">Email</label>
						<input type="email" id="edit-email" name="email" bind:value={editForm.email} required />
					</div>
					<div class="form-group">
						<label for="edit-username">Username</label>
						<input type="text" id="edit-username" name="username" bind:value={editForm.username} required />
					</div>
					<div class="name-row">
						<div class="form-group">
							<label for="edit-firstName">First Name</label>
							<input type="text" id="edit-firstName" name="firstName" bind:value={editForm.firstName} />
						</div>
						<div class="form-group">
							<label for="edit-lastName">Last Name</label>
							<input type="text" id="edit-lastName" name="lastName" bind:value={editForm.lastName} />
						</div>
					</div>
					<div class="form-group">
						<label for="edit-role">Role</label>
						<select id="edit-role" name="role" bind:value={editForm.role}>
							<option value="member">Member</option>
							<option value="admin">Admin</option>
							<option value="owner">Owner</option>
						</select>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn-secondary" onclick={closeModals}>Cancel</button>
					<button type="submit" class="btn-primary">Save Changes</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Reset Password Modal -->
{#if showResetPasswordModal && selectedUser}
	<div class="modal-backdrop" onclick={closeModals} transition:fade={{ duration: 150 }}>
		<div class="modal" onclick={(e) => e.stopPropagation()} transition:fly={{ y: 20, duration: 200 }}>
			<div class="modal-header">
				<h2>Reset Password</h2>
				<button class="btn-icon" onclick={closeModals}>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<form
				method="POST"
				action="?/resetPassword"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success' && result.data && 'tempPassword' in result.data && result.data.tempPassword) {
							generatedPassword = result.data.tempPassword as string;
						} else if (result.type === 'success') {
							closeModals();
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="userId" value={selectedUser.id} />
				<div class="modal-body">
					<p class="text-sm text-surface-400 mb-4">
						Reset password for <strong>{selectedUser.displayName || selectedUser.username}</strong>
					</p>

					{#if generatedPassword}
						<div class="alert alert-success">
							<p class="mb-2">Password has been reset. New temporary password:</p>
							<code class="text-lg">{generatedPassword}</code>
							<p class="text-xs mt-2">Please share this securely with the user.</p>
						</div>
					{:else}
						<div class="form-group">
							<label for="reset-password">New Password (leave blank to auto-generate)</label>
							<input type="text" id="reset-password" name="password" bind:value={newPassword} placeholder="Enter new password or leave blank" />
						</div>
					{/if}
				</div>
				<div class="modal-footer">
					{#if generatedPassword}
						<button type="button" class="btn-primary" onclick={closeModals}>Done</button>
					{:else}
						<button type="button" class="btn-secondary" onclick={closeModals}>Cancel</button>
						<button type="submit" class="btn-primary">Reset Password</button>
					{/if}
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.members-page {
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

	/* Tabs */
	.tabs-container {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-surface-800);
	}

	.tab-button {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-400);
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.tab-button:hover {
		color: var(--color-surface-200);
		background: var(--color-surface-800);
	}

	.tab-button.active {
		color: var(--color-surface-100);
		background: var(--color-primary-500)/15;
	}

	/* Buttons */
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

	.btn-secondary {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-200);
		background: transparent;
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-secondary:hover {
		background: var(--color-surface-800);
		border-color: var(--color-surface-600);
	}

	.btn-icon {
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

	.btn-icon:hover {
		color: var(--color-surface-100);
		background: var(--color-surface-800);
	}

	/* Alerts */
	.alert {
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}

	.alert-error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #fca5a5;
	}

	.alert-success {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
		color: #86efac;
	}

	.alert code {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 0.25rem;
		font-family: monospace;
	}

	/* Table */
	.table-container {
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-800);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
	}

	.data-table th {
		padding: 0.75rem 1rem;
		text-align: left;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-surface-400);
		background: var(--color-surface-800);
		border-bottom: 1px solid var(--color-surface-700);
	}

	.data-table td {
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		color: var(--color-surface-200);
		border-bottom: 1px solid var(--color-surface-800);
	}

	.data-table tr:last-child td {
		border-bottom: none;
	}

	.data-table tr:hover {
		background: var(--color-surface-800)/50;
	}

	.data-table tr.current-user {
		background: var(--color-primary-500)/5;
	}

	.user-cell {
		min-width: 180px;
	}

	.user-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.user-name {
		font-weight: 500;
		color: var(--color-surface-100);
	}

	.user-username {
		font-size: 0.75rem;
		color: var(--color-surface-500);
	}

	/* Badges */
	.badge {
		display: inline-flex;
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		border: 1px solid;
		border-radius: 9999px;
		text-transform: capitalize;
	}

	.badge-purple {
		background: rgba(168, 85, 247, 0.15);
		border-color: rgba(168, 85, 247, 0.3);
		color: #c084fc;
	}

	.badge-blue {
		background: rgba(59, 130, 246, 0.15);
		border-color: rgba(59, 130, 246, 0.3);
		color: #93c5fd;
	}

	.badge-gray {
		background: rgba(113, 113, 122, 0.15);
		border-color: rgba(113, 113, 122, 0.3);
		color: #a1a1aa;
	}

	.badge-green {
		background: rgba(34, 197, 94, 0.15);
		border-color: rgba(34, 197, 94, 0.3);
		color: #86efac;
	}

	.badge-red {
		background: rgba(239, 68, 68, 0.15);
		border-color: rgba(239, 68, 68, 0.3);
		color: #fca5a5;
	}

	.badge-yellow {
		background: rgba(234, 179, 8, 0.15);
		border-color: rgba(234, 179, 8, 0.3);
		color: #fde047;
	}

	.date-cell {
		font-size: 0.8125rem;
		color: var(--color-surface-500);
	}

	.actions-cell {
		display: flex;
		gap: 0.25rem;
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		color: var(--color-surface-400);
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-800);
		border-radius: 0.75rem;
		gap: 0.75rem;
	}

	/* Modal styles */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.7);
		z-index: 100;
	}

	.modal {
		width: 100%;
		max-width: 480px;
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-800);
		border-radius: 0.75rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--color-surface-800);
	}

	.modal-header h2 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-surface-100);
	}

	.modal-body {
		padding: 1.25rem;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid var(--color-surface-800);
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group:last-child {
		margin-bottom: 0;
	}

	.name-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.name-row .form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.375rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-surface-300);
	}

	.form-group input,
	.form-group select {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		color: var(--color-surface-100);
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.form-group input:focus,
	.form-group select:focus {
		border-color: var(--color-primary-500);
	}

	.form-group input::placeholder {
		color: var(--color-surface-500);
	}

	.text-sm { font-size: 0.875rem; }
	.text-xs { font-size: 0.75rem; }
	.text-lg { font-size: 1.125rem; }
	.mb-2 { margin-bottom: 0.5rem; }
	.mb-4 { margin-bottom: 1rem; }
	.mt-2 { margin-top: 0.5rem; }
	.mt-4 { margin-top: 1rem; }
	.text-error-400 { color: var(--color-error-400); }
	.text-success-400 { color: var(--color-success-400); }

	/* Info message for welcome email */
	.info-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
		padding: 0.75rem 1rem;
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.25);
		border-radius: 0.5rem;
		color: #93c5fd;
		font-size: 0.8125rem;
	}

	.info-icon {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	:global(html.light) .info-message {
		background: rgba(59, 130, 246, 0.08);
		border-color: rgba(59, 130, 246, 0.2);
		color: #2563eb;
	}

	/* Page description */
	.page-description {
		font-size: 0.875rem;
		color: var(--color-surface-400);
		margin-top: 0.25rem;
	}

	/* Filter Bar */
	.filter-bar {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.search-wrapper {
		flex: 1;
		min-width: 250px;
		position: relative;
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1rem;
		height: 1rem;
		color: var(--color-surface-500);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 2rem 0.5rem 2.25rem;
		font-size: 0.875rem;
		color: var(--color-surface-100);
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.search-input:focus {
		border-color: var(--color-primary-500);
	}

	.search-input::placeholder {
		color: var(--color-surface-500);
	}

	.search-clear {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		color: var(--color-surface-500);
		background: transparent;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
	}

	.search-clear:hover {
		color: var(--color-surface-300);
		background: var(--color-surface-700);
	}

	.role-filter {
		display: flex;
		background: var(--color-surface-800);
		border-radius: 0.5rem;
		padding: 0.25rem;
	}

	.filter-btn {
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-surface-400);
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.filter-btn:hover {
		color: var(--color-surface-200);
	}

	.filter-btn.active {
		color: white;
		background: var(--color-surface-700);
	}

	/* Groups Display */
	.groups-cell {
		min-width: 150px;
	}

	.groups-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.group-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-surface-300);
		background: var(--color-surface-700);
		border-radius: 9999px;
	}

	.group-badge.lead {
		color: #fbbf24;
		background: rgba(251, 191, 36, 0.15);
	}

	.lead-icon {
		width: 0.625rem;
		height: 0.625rem;
	}

	.groups-more {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.375rem;
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--color-surface-400);
		background: var(--color-surface-700);
		border-radius: 9999px;
		cursor: help;
	}

	.no-groups {
		font-size: 0.75rem;
		color: var(--color-surface-500);
		font-style: italic;
	}

	/* Light mode styles */
	:global(html.light) .page-title {
		color: #18181b;
	}

	:global(html.light) .page-description {
		color: #71717a;
	}

	:global(html.light) .tabs-container {
		border-color: #e4e4e7;
	}

	:global(html.light) .tab-button {
		color: #71717a;
	}

	:global(html.light) .tab-button:hover {
		color: #3f3f46;
		background: #f4f4f5;
	}

	:global(html.light) .tab-button.active {
		color: #18181b;
		background: rgba(59, 130, 246, 0.1);
	}

	:global(html.light) .filter-bar {
		background: transparent;
	}

	:global(html.light) .search-input {
		background: white;
		border-color: #d4d4d8;
		color: #18181b;
	}

	:global(html.light) .search-input::placeholder {
		color: #a1a1aa;
	}

	:global(html.light) .search-icon {
		color: #a1a1aa;
	}

	:global(html.light) .search-clear {
		color: #71717a;
	}

	:global(html.light) .search-clear:hover {
		color: #3f3f46;
		background: #e4e4e7;
	}

	:global(html.light) .role-filter {
		background: #f4f4f5;
	}

	:global(html.light) .filter-btn {
		color: #71717a;
	}

	:global(html.light) .filter-btn:hover {
		color: #3f3f46;
	}

	:global(html.light) .filter-btn.active {
		color: #18181b;
		background: white;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	:global(html.light) .table-container {
		background: white;
		border-color: #e4e4e7;
	}

	:global(html.light) .data-table th {
		background: #f4f4f5;
		color: #52525b;
		border-color: #e4e4e7;
	}

	:global(html.light) .data-table td {
		color: #3f3f46;
		border-color: #f4f4f5;
	}

	:global(html.light) .data-table tr:hover {
		background: #fafafa;
	}

	:global(html.light) .data-table tr.current-user {
		background: rgba(59, 130, 246, 0.05);
	}

	:global(html.light) .user-name {
		color: #18181b;
	}

	:global(html.light) .user-username {
		color: #71717a;
	}

	:global(html.light) .date-cell {
		color: #71717a;
	}

	:global(html.light) .group-badge {
		color: #52525b;
		background: #e4e4e7;
	}

	:global(html.light) .group-badge.lead {
		color: #b45309;
		background: rgba(251, 191, 36, 0.2);
	}

	:global(html.light) .groups-more {
		color: #71717a;
		background: #e4e4e7;
	}

	:global(html.light) .no-groups {
		color: #a1a1aa;
	}

	:global(html.light) .btn-icon {
		color: #71717a;
	}

	:global(html.light) .btn-icon:hover {
		color: #18181b;
		background: #f4f4f5;
	}

	:global(html.light) .btn-secondary {
		color: #3f3f46;
		border-color: #d4d4d8;
	}

	:global(html.light) .btn-secondary:hover {
		background: #f4f4f5;
		border-color: #a1a1aa;
	}

	:global(html.light) .empty-state {
		background: white;
		border-color: #e4e4e7;
		color: #71717a;
	}

	:global(html.light) .modal {
		background: white;
		border-color: #e4e4e7;
	}

	:global(html.light) .modal-header {
		border-color: #e4e4e7;
	}

	:global(html.light) .modal-header h2 {
		color: #18181b;
	}

	:global(html.light) .modal-footer {
		border-color: #e4e4e7;
	}

	:global(html.light) .form-group label {
		color: #52525b;
	}

	:global(html.light) .form-group input,
	:global(html.light) .form-group select {
		background: white;
		border-color: #d4d4d8;
		color: #18181b;
	}

	:global(html.light) .form-group input::placeholder {
		color: #a1a1aa;
	}

	:global(html.light) .alert-error {
		background: rgba(239, 68, 68, 0.08);
		border-color: rgba(239, 68, 68, 0.2);
		color: #dc2626;
	}

	:global(html.light) .alert-success {
		background: rgba(34, 197, 94, 0.08);
		border-color: rgba(34, 197, 94, 0.2);
		color: #16a34a;
	}

	:global(html.light) .alert code {
		background: rgba(0, 0, 0, 0.05);
	}

	/* Light mode badges */
	:global(html.light) .badge-purple {
		background: rgba(168, 85, 247, 0.1);
		border-color: rgba(168, 85, 247, 0.2);
		color: #9333ea;
	}

	:global(html.light) .badge-blue {
		background: rgba(59, 130, 246, 0.1);
		border-color: rgba(59, 130, 246, 0.2);
		color: #2563eb;
	}

	:global(html.light) .badge-gray {
		background: rgba(113, 113, 122, 0.1);
		border-color: rgba(113, 113, 122, 0.2);
		color: #52525b;
	}

	:global(html.light) .badge-green {
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.2);
		color: #16a34a;
	}

	:global(html.light) .badge-red {
		background: rgba(239, 68, 68, 0.1);
		border-color: rgba(239, 68, 68, 0.2);
		color: #dc2626;
	}

	:global(html.light) .badge-yellow {
		background: rgba(234, 179, 8, 0.1);
		border-color: rgba(234, 179, 8, 0.2);
		color: #ca8a04;
	}
</style>
