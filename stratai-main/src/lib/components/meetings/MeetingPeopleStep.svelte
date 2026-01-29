<script lang="ts">
	/**
	 * MeetingPeopleStep — Step 2: People & Ownership
	 *
	 * Space member checkboxes, external email input,
	 * and outcome owner selector.
	 */
	import { X, UserPlus } from 'lucide-svelte';
	import type { SpaceMembershipWithUser } from '$lib/types/space-memberships';

	interface Props {
		members: SpaceMembershipWithUser[];
		selectedMemberIds: string[];
		externalEmails: { email: string; name?: string }[];
		ownerId: string;
		currentUserId: string;
		onSelectedMemberIdsChange: (ids: string[]) => void;
		onExternalEmailsChange: (emails: { email: string; name?: string }[]) => void;
		onOwnerIdChange: (id: string) => void;
	}

	let {
		members,
		selectedMemberIds,
		externalEmails,
		ownerId,
		currentUserId,
		onSelectedMemberIdsChange,
		onExternalEmailsChange,
		onOwnerIdChange
	}: Props = $props();

	// Local state for external email input
	let emailInput = $state('');
	let nameInput = $state('');
	let emailError = $state('');
	let showExternalForm = $state(false);

	// Derive selected members for the owner dropdown
	const selectedMembers = $derived(
		members.filter(m => m.userId && selectedMemberIds.includes(m.userId))
	);

	function toggleMember(userId: string) {
		const isSelected = selectedMemberIds.includes(userId);
		if (isSelected) {
			const updated = selectedMemberIds.filter(id => id !== userId);
			onSelectedMemberIdsChange(updated);
			// If removed member was the owner, reset to current user
			if (ownerId === userId) {
				onOwnerIdChange(currentUserId);
			}
		} else {
			onSelectedMemberIdsChange([...selectedMemberIds, userId]);
		}
	}

	function addExternalEmail() {
		const email = emailInput.trim().toLowerCase();
		if (!email) return;

		// Basic email validation
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			emailError = 'Please enter a valid email address';
			return;
		}

		// Check for duplicates
		if (externalEmails.some(e => e.email === email)) {
			emailError = 'This email is already added';
			return;
		}

		emailError = '';
		const entry = { email, ...(nameInput.trim() ? { name: nameInput.trim() } : {}) };
		onExternalEmailsChange([...externalEmails, entry]);
		emailInput = '';
		nameInput = '';
		showExternalForm = false;
	}

	function removeExternalEmail(index: number) {
		const updated = externalEmails.filter((_, i) => i !== index);
		onExternalEmailsChange(updated);
	}

	function handleEmailKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addExternalEmail();
		}
		if (e.key === 'Escape') {
			showExternalForm = false;
			emailInput = '';
			nameInput = '';
			emailError = '';
		}
	}

	function getInitials(name: string | null | undefined): string {
		if (!name) return '?';
		return name
			.split(' ')
			.map(w => w[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}
</script>

<div class="space-y-6">
	<!-- Space Members -->
	<div class="space-y-3">
		<label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
			Space Members
		</label>

		{#if members.length === 0}
			<p class="text-sm text-zinc-500 dark:text-zinc-400 italic">
				No space members found.
			</p>
		{:else}
			<div class="space-y-1.5 max-h-48 overflow-y-auto">
				{#each members as member (member.id)}
					{@const userId = member.userId}
					{@const user = member.user}
					{@const isSelected = userId ? selectedMemberIds.includes(userId) : false}
					{#if userId}
						<button
							type="button"
							onclick={() => toggleMember(userId)}
							class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left
							       transition-all duration-150
							       {isSelected
							         ? 'bg-primary-500/10 border border-primary-500/25'
							         : 'bg-zinc-50 dark:bg-zinc-800/30 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700'}"
						>
							<input
								type="checkbox"
								checked={isSelected}
								tabindex={-1}
								class="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600
								       text-primary-600 accent-primary-500 pointer-events-none"
								readonly
							/>
							<!-- Avatar -->
							<div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium
							            {isSelected
							              ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400'
							              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}">
								{getInitials(user?.displayName)}
							</div>
							<div class="flex-1 min-w-0">
								<span class="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate block">
									{user?.displayName || 'Unknown'}
									{#if userId === currentUserId}
										<span class="text-xs text-zinc-400 dark:text-zinc-500">(you)</span>
									{/if}
								</span>
								{#if user?.email}
									<span class="text-xs text-zinc-500 dark:text-zinc-400 truncate block">
										{user.email}
									</span>
								{/if}
							</div>
						</button>
					{/if}
				{/each}
			</div>
		{/if}
	</div>

	<!-- External Attendees -->
	<div class="space-y-3">
		<label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
			External Attendees
		</label>

		<!-- Email tags -->
		{#if externalEmails.length > 0}
			<div class="flex flex-wrap gap-2">
				{#each externalEmails as entry, index}
					<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
					             bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300
					             border border-zinc-200 dark:border-zinc-700">
						{entry.name ? `${entry.name} (${entry.email})` : entry.email}
						<button
							type="button"
							onclick={() => removeExternalEmail(index)}
							class="p-0.5 rounded-full text-zinc-400 hover:text-red-500 dark:hover:text-red-400
							       hover:bg-red-500/10 transition-colors duration-150"
						>
							<X class="w-3 h-3" />
						</button>
					</span>
				{/each}
			</div>
		{/if}

		<!-- Add external form -->
		{#if showExternalForm}
			<div class="space-y-2 p-3 rounded-lg
			            bg-zinc-50 dark:bg-zinc-800/30
			            border border-zinc-200 dark:border-zinc-700/50">
				<div class="flex gap-2">
					<input
						type="email"
						bind:value={emailInput}
						onkeydown={handleEmailKeydown}
						placeholder="Email address"
						class="flex-1 px-3 py-1.5 text-sm rounded-md
						       bg-white dark:bg-zinc-800
						       border border-zinc-200 dark:border-zinc-600
						       text-zinc-900 dark:text-zinc-100
						       placeholder:text-zinc-400
						       focus:outline-none focus:ring-1 focus:ring-primary-500
						       transition-all duration-150"
					/>
					<input
						type="text"
						bind:value={nameInput}
						onkeydown={handleEmailKeydown}
						placeholder="Name (optional)"
						class="w-36 px-3 py-1.5 text-sm rounded-md
						       bg-white dark:bg-zinc-800
						       border border-zinc-200 dark:border-zinc-600
						       text-zinc-900 dark:text-zinc-100
						       placeholder:text-zinc-400
						       focus:outline-none focus:ring-1 focus:ring-primary-500
						       transition-all duration-150"
					/>
				</div>
				{#if emailError}
					<p class="text-xs text-red-500 dark:text-red-400">{emailError}</p>
				{/if}
				<div class="flex gap-2">
					<button
						type="button"
						onclick={addExternalEmail}
						disabled={!emailInput.trim()}
						class="px-3 py-1.5 text-xs font-medium rounded-md
						       bg-primary-500 text-white
						       hover:bg-primary-600
						       disabled:opacity-40 disabled:cursor-not-allowed
						       transition-all duration-150"
					>
						Add
					</button>
					<button
						type="button"
						onclick={() => { showExternalForm = false; emailInput = ''; nameInput = ''; emailError = ''; }}
						class="px-3 py-1.5 text-xs font-medium rounded-md
						       text-zinc-600 dark:text-zinc-400
						       hover:text-zinc-800 dark:hover:text-zinc-200
						       transition-colors duration-150"
					>
						Cancel
					</button>
				</div>
			</div>
		{:else}
			<button
				type="button"
				onclick={() => (showExternalForm = true)}
				class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm
				       text-zinc-500 dark:text-zinc-400
				       border border-dashed border-zinc-300 dark:border-zinc-600
				       hover:border-zinc-400 dark:hover:border-zinc-500
				       hover:text-zinc-600 dark:hover:text-zinc-300
				       hover:bg-zinc-50 dark:hover:bg-zinc-800/30
				       transition-all duration-150"
			>
				<UserPlus class="w-4 h-4" />
				Add external attendee
			</button>
		{/if}
	</div>

	<!-- Owner selector -->
	<div class="space-y-2">
		<label for="outcome-owner" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
			Who owns the outcomes?
		</label>
		<select
			id="outcome-owner"
			value={ownerId}
			onchange={(e) => onOwnerIdChange(e.currentTarget.value)}
			class="w-full px-3 py-2 rounded-lg text-sm
			       bg-zinc-50 dark:bg-zinc-800/50
			       border border-zinc-200 dark:border-zinc-700
			       text-zinc-900 dark:text-zinc-100
			       focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
			       transition-all duration-150"
		>
			{#each selectedMembers as member (member.id)}
				{@const userId = member.userId}
				{#if userId}
					<option value={userId}>
						{member.user?.displayName || 'Unknown'}
						{#if userId === currentUserId} (you){/if}
					</option>
				{/if}
			{/each}
			<!-- Always include current user even if not in selected members -->
			{#if !selectedMemberIds.includes(currentUserId)}
				<option value={currentUserId}>You (default)</option>
			{/if}
		</select>
		<p class="text-xs text-zinc-500 dark:text-zinc-400">
			The owner is accountable for following up on meeting outcomes.
		</p>
	</div>
</div>
