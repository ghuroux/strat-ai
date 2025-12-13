<script lang="ts">
	// Welcome screen for the Model Arena
</script>

<div class="arena-welcome text-center py-8">
	<!-- Icon -->
	<div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6" style="background: var(--gradient-primary);">
		<svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
		</svg>
	</div>

	<!-- Title -->
	<h1 class="text-3xl font-bold text-gradient mb-3">Model Arena</h1>

	<!-- Description -->
	<p class="text-surface-400 text-lg mb-8 max-w-xl mx-auto">
		Compare AI models side-by-side. Select 2-4 models, enter a prompt, and see them compete in real-time with AI-powered judging.
	</p>

	<!-- Feature highlights -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
		<div class="p-4 rounded-xl bg-surface-800/50 border border-surface-700">
			<div class="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center mx-auto mb-3">
				<svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
				</svg>
			</div>
			<h3 class="font-medium text-surface-100 mb-1">Side-by-Side</h3>
			<p class="text-sm text-surface-400">Compare up to 4 models simultaneously</p>
		</div>

		<div class="p-4 rounded-xl bg-surface-800/50 border border-surface-700">
			<div class="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center mx-auto mb-3">
				<svg class="w-5 h-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
				</svg>
			</div>
			<h3 class="font-medium text-surface-100 mb-1">AI Judge</h3>
			<p class="text-sm text-surface-400">Get objective ratings from Claude</p>
		</div>

		<div class="p-4 rounded-xl bg-surface-800/50 border border-surface-700">
			<div class="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
				<svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
				</svg>
			</div>
			<h3 class="font-medium text-surface-100 mb-1">Your Vote</h3>
			<p class="text-sm text-surface-400">Pick your personal winner</p>
		</div>
	</div>

	<!-- Quick tips -->
	<div class="mt-8 p-4 rounded-xl bg-surface-800/30 border border-surface-700/50 max-w-2xl mx-auto">
		<h4 class="text-sm font-medium text-surface-300 mb-2 flex items-center justify-center gap-2">
			<svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			Quick Tips
		</h4>
		<ul class="text-sm text-surface-400 space-y-1">
			<li>Select models by clicking the cards below</li>
			<li>Numbers show the order you selected them</li>
			<li>Extended thinking and web search work with supported models</li>
		</ul>
	</div>
</div>
