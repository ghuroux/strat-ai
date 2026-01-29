<script lang="ts">
	/**
	 * MeetingScheduleStep — Step 3: Schedule
	 *
	 * Duration selector (pill buttons), date/time inputs,
	 * Teams toggle (when calendar connected), and human-readable summary line.
	 */
	import { Clock, Video } from 'lucide-svelte';

	interface Props {
		date: string;
		time: string;
		durationMinutes: number;
		calendarConnected: boolean;
		isOnlineMeeting: boolean;
		onDateChange: (value: string) => void;
		onTimeChange: (value: string) => void;
		onDurationChange: (value: number) => void;
		onOnlineMeetingChange: (value: boolean) => void;
	}

	let {
		date,
		time,
		durationMinutes,
		calendarConnected,
		isOnlineMeeting,
		onDateChange,
		onTimeChange,
		onDurationChange,
		onOnlineMeetingChange
	}: Props = $props();

	const durationOptions = [15, 30, 45, 60, 90, 120];

	function durationLabel(minutes: number): string {
		if (minutes < 60) return `${minutes}m`;
		const hrs = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
	}

	// Today's date in YYYY-MM-DD for min attribute
	const today = new Date().toISOString().split('T')[0];

	// Human-readable summary
	const summary = $derived.by(() => {
		if (!date || !time) return '';

		const dateObj = new Date(`${date}T${time}`);
		if (isNaN(dateObj.getTime())) return '';

		const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
		const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

		return `${dayName}, ${monthDay} at ${timeStr} (${durationLabel(durationMinutes)})`;
	});

	const hasSchedule = $derived(!!date && !!time);
</script>

<div class="space-y-6">
	<!-- Duration selector -->
	<div class="space-y-3">
		<label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
			Duration
		</label>
		<div class="flex flex-wrap gap-2">
			{#each durationOptions as option}
				<button
					type="button"
					onclick={() => onDurationChange(option)}
					class="px-4 py-2 rounded-lg text-sm font-medium
					       border transition-all duration-150
					       {durationMinutes === option
					         ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
					         : 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-primary-500/50 hover:text-primary-600 dark:hover:text-primary-400'}"
				>
					{durationLabel(option)}
				</button>
			{/each}
		</div>
	</div>

	<!-- Date and Time -->
	<div class="grid grid-cols-2 gap-4">
		<div class="space-y-2">
			<label for="meeting-date" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
				Date
			</label>
			<input
				id="meeting-date"
				type="date"
				value={date}
				min={today}
				oninput={(e) => onDateChange(e.currentTarget.value)}
				class="w-full px-3 py-2.5 rounded-lg text-sm
				       bg-zinc-50 dark:bg-zinc-800/50
				       border border-zinc-200 dark:border-zinc-700
				       text-zinc-900 dark:text-zinc-100
				       focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
				       transition-all duration-150"
			/>
		</div>
		<div class="space-y-2">
			<label for="meeting-time" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
				Time
			</label>
			<input
				id="meeting-time"
				type="time"
				value={time}
				oninput={(e) => onTimeChange(e.currentTarget.value)}
				class="w-full px-3 py-2.5 rounded-lg text-sm
				       bg-zinc-50 dark:bg-zinc-800/50
				       border border-zinc-200 dark:border-zinc-700
				       text-zinc-900 dark:text-zinc-100
				       focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
				       transition-all duration-150"
			/>
		</div>
	</div>

	<!-- Teams toggle (only when calendar connected) -->
	{#if calendarConnected}
		<div class="space-y-2">
			<button
				type="button"
				onclick={() => onOnlineMeetingChange(!isOnlineMeeting)}
				class="w-full flex items-center justify-between px-4 py-3 rounded-lg
				       border transition-all duration-150
				       {isOnlineMeeting
				         ? 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/20'
				         : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'}"
			>
				<div class="flex items-center gap-3">
					<Video class="w-5 h-5 {isOnlineMeeting ? 'text-blue-500' : 'text-zinc-400 dark:text-zinc-500'}" />
					<div class="text-left">
						<div class="text-sm font-medium {isOnlineMeeting ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-700 dark:text-zinc-300'}">
							Microsoft Teams Meeting
						</div>
						<div class="text-xs {isOnlineMeeting ? 'text-blue-500/70 dark:text-blue-400/70' : 'text-zinc-500 dark:text-zinc-400'}">
							Adds Teams link for attendees to join online
						</div>
					</div>
				</div>
				<!-- Toggle switch -->
				<div
					class="relative w-11 h-6 rounded-full transition-colors duration-200
					       {isOnlineMeeting ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-600'}"
				>
					<div
						class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm
						       transition-transform duration-200
						       {isOnlineMeeting ? 'translate-x-5' : 'translate-x-0'}"
					></div>
				</div>
			</button>

			<!-- Calendar hint -->
			{#if hasSchedule}
				<p class="text-xs text-zinc-500 dark:text-zinc-400 pl-1">
					Will create event in your Outlook calendar
				</p>
			{/if}
		</div>
	{/if}

	<!-- Summary -->
	{#if summary}
		<div class="flex items-center gap-2 px-4 py-3 rounded-lg
		            bg-primary-500/5 dark:bg-primary-500/10
		            border border-primary-500/15">
			<Clock class="w-4 h-4 text-primary-500 flex-shrink-0" />
			<span class="text-sm font-medium text-primary-700 dark:text-primary-300">
				{summary}
			</span>
		</div>
	{/if}
</div>
