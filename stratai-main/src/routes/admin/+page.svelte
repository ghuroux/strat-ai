<script lang="ts">
	import { enhance } from '$app/forms';
	import { fly, fade } from 'svelte/transition';
	import type { PageData, ActionData } from './$types';
	import UsageDashboard from '$lib/components/admin/UsageDashboard.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Active tab state
	let activeTab = $state<'users' | 'usage'>('users');

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
		displayName: '',
		password: '',
		role: 'member' as 'owner' | 'admin' | 'member'
	});

	let editForm = $state({
		email: '',
		username: '',
		displayName: '',
		role: 'member' as 'owner' | 'admin' | 'member'
	});

	let newPassword = $state('');
	let generatedPassword = $state<string | null>(null);

	// Role display helper
	function getRoleBadgeClass(role: string) {
		switch (role) {
			case 'owner':
				return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
			case 'admin':
				return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
			default:
				return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
		}
	}

	function getStatusBadgeClass(status: string) {
		return status === 'active'
			? 'bg-green-500/20 text-green-400 border-green-500/30'
			: 'bg-red-500/20 text-red-400 border-red-500/30';
	}

	function openEditModal(user: (typeof data.users)[0]) {
		selectedUser = user;
		editForm = {
			email: user.email,
			username: user.username,
			displayName: user.displayName || '',
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
			displayName: '',
			password: '',
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
	<title>Admin - {activeTab === 'users' ? 'User Management' : 'Usage'} | StratAI</title>
</svelte:head>

<div class="admin-container">
	<header class="admin-header">
		<div class="header-left">
			<a href="/" class="back-link">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 19l-7-7m0 0l7-7m-7 7h18"
					/>
				</svg>
			</a>
			<h1>Admin Panel</h1>
		</div>
		<div class="header-right">
			{#if activeTab === 'users'}
				<button class="btn-primary" onclick={() => (showCreateModal = true)}>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					Add User
				</button>
			{/if}
		</div>
	</header>

	<!-- Tabs -->
	<div class="tabs-container">
		<button
			class="tab-button"
			class:active={activeTab === 'users'}
			onclick={() => (activeTab = 'users')}
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
				/>
			</svg>
			Users
		</button>
		<button
			class="tab-button"
			class:active={activeTab === 'usage'}
			onclick={() => (activeTab = 'usage')}
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
				/>
			</svg>
			Usage
		</button>
	</div>

	<!-- Error/Success Messages -->
	{#if form?.error}
		<div class="alert alert-error" transition:fly={{ y: -10, duration: 200 }}>
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="alert alert-success" transition:fly={{ y: -10, duration: 200 }}>
			{#if form.tempPassword}
				User created! Temporary password: <code>{form.tempPassword}</code>
			{:else}
				Operation completed successfully
			{/if}
		</div>
	{/if}

	<!-- Tab Content -->
	{#if activeTab === 'usage'}
		<UsageDashboard
			stats={data.usage.stats}
			modelBreakdown={data.usage.modelBreakdown}
			userBreakdown={data.usage.userBreakdown}
			dailyUsage={data.usage.dailyUsage}
			period={data.usage.period}
		/>
	{:else}
		<!-- Users Table -->
	<div class="table-container">
		<table class="users-table">
			<thead>
				<tr>
					<th>User</th>
					<th>Email</th>
					<th>Role</th>
					<th>Status</th>
					<th>Last Login</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each data.users as user (user.id)}
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
						<td>
							<span class="badge {getStatusBadgeClass(user.status)}">{user.status}</span>
						</td>
						<td class="date-cell">{formatDate(user.lastLoginAt)}</td>
						<td class="actions-cell">
							<button class="btn-icon" onclick={() => openEditModal(user)} title="Edit user">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
									/>
								</svg>
							</button>
							<button
								class="btn-icon"
								onclick={() => openResetPasswordModal(user)}
								title="Reset password"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
									/>
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
									<input
										type="hidden"
										name="status"
										value={user.status === 'active' ? 'inactive' : 'active'}
									/>
									<button
										type="submit"
										class="btn-icon {user.status === 'active' ? 'text-red-400' : 'text-green-400'}"
										title={user.status === 'active' ? 'Deactivate' : 'Activate'}
									>
										{#if user.status === 'active'}
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
												/>
											</svg>
										{:else}
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
												/>
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
	{/if}
</div>

<!-- Create User Modal -->
{#if showCreateModal}
	<div class="modal-backdrop" onclick={closeModals} transition:fade={{ duration: 150 }}>
		<div
			class="modal"
			onclick={(e) => e.stopPropagation()}
			transition:fly={{ y: 20, duration: 200 }}
		>
			<div class="modal-header">
				<h2>Add New User</h2>
				<button class="btn-icon" onclick={closeModals}>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
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
						<input
							type="email"
							id="create-email"
							name="email"
							bind:value={createForm.email}
							required
							placeholder="user@example.com"
						/>
					</div>
					<div class="form-group">
						<label for="create-username">Username</label>
						<input
							type="text"
							id="create-username"
							name="username"
							bind:value={createForm.username}
							required
							placeholder="johndoe"
						/>
					</div>
					<div class="form-group">
						<label for="create-displayName">Display Name</label>
						<input
							type="text"
							id="create-displayName"
							name="displayName"
							bind:value={createForm.displayName}
							placeholder="John Doe"
						/>
					</div>
					<div class="form-group">
						<label for="create-password">Password</label>
						<input
							type="text"
							id="create-password"
							name="password"
							bind:value={createForm.password}
							required
							placeholder="Enter password"
						/>
					</div>
					<div class="form-group">
						<label for="create-role">Role</label>
						<select id="create-role" name="role" bind:value={createForm.role}>
							<option value="member">Member</option>
							<option value="admin">Admin</option>
							<option value="owner">Owner</option>
						</select>
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
		<div
			class="modal"
			onclick={(e) => e.stopPropagation()}
			transition:fly={{ y: 20, duration: 200 }}
		>
			<div class="modal-header">
				<h2>Edit User</h2>
				<button class="btn-icon" onclick={closeModals}>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
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
						<input
							type="text"
							id="edit-username"
							name="username"
							bind:value={editForm.username}
							required
						/>
					</div>
					<div class="form-group">
						<label for="edit-displayName">Display Name</label>
						<input
							type="text"
							id="edit-displayName"
							name="displayName"
							bind:value={editForm.displayName}
						/>
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
		<div
			class="modal"
			onclick={(e) => e.stopPropagation()}
			transition:fly={{ y: 20, duration: 200 }}
		>
			<div class="modal-header">
				<h2>Reset Password</h2>
				<button class="btn-icon" onclick={closeModals}>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
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
					<p class="text-sm text-zinc-400 mb-4">
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
							<input
								type="text"
								id="reset-password"
								name="password"
								bind:value={newPassword}
								placeholder="Enter new password or leave blank"
							/>
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
	.admin-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.admin-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	/* Tabs */
	.tabs-container {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #27272a;
	}

	.tab-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.tab-button:hover {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.05);
	}

	.tab-button.active {
		color: rgba(255, 255, 255, 0.95);
		background: rgba(59, 130, 246, 0.15);
	}

	.back-link {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		color: rgba(255, 255, 255, 0.6);
		border-radius: 0.5rem;
		transition: all 0.15s ease;
	}

	.back-link:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.05);
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.95);
	}

	.btn-primary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
		background: #3b82f6;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-primary:hover {
		background: #2563eb;
	}

	.btn-secondary {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.8);
		background: transparent;
		border: 1px solid #3f3f46;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-secondary:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: #52525b;
	}

	.btn-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		color: rgba(255, 255, 255, 0.6);
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-icon:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.08);
	}

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

	.table-container {
		background: #18181b;
		border: 1px solid #27272a;
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.users-table {
		width: 100%;
		border-collapse: collapse;
	}

	.users-table th {
		padding: 0.75rem 1rem;
		text-align: left;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.5);
		background: #27272a;
		border-bottom: 1px solid #3f3f46;
	}

	.users-table td {
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.8);
		border-bottom: 1px solid #27272a;
	}

	.users-table tr:last-child td {
		border-bottom: none;
	}

	.users-table tr:hover {
		background: rgba(255, 255, 255, 0.02);
	}

	.users-table tr.current-user {
		background: rgba(59, 130, 246, 0.05);
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
		color: rgba(255, 255, 255, 0.95);
	}

	.user-username {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.badge {
		display: inline-flex;
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		border: 1px solid;
		border-radius: 9999px;
		text-transform: capitalize;
	}

	.date-cell {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.actions-cell {
		display: flex;
		gap: 0.25rem;
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
		background: #18181b;
		border: 1px solid #27272a;
		border-radius: 0.75rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid #27272a;
	}

	.modal-header h2 {
		font-size: 1.125rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.95);
	}

	.modal-body {
		padding: 1.25rem;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid #27272a;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group:last-child {
		margin-bottom: 0;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.375rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
	}

	.form-group input,
	.form-group select {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.9);
		background: #27272a;
		border: 1px solid #3f3f46;
		border-radius: 0.5rem;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.form-group input:focus,
	.form-group select:focus {
		border-color: #3b82f6;
	}

	.form-group input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}

	.text-sm {
		font-size: 0.875rem;
	}

	.text-xs {
		font-size: 0.75rem;
	}

	.text-lg {
		font-size: 1.125rem;
	}

	.text-zinc-400 {
		color: #a1a1aa;
	}

	.mb-2 {
		margin-bottom: 0.5rem;
	}

	.mb-4 {
		margin-bottom: 1rem;
	}

	.mt-2 {
		margin-top: 0.5rem;
	}
</style>
