<!--
	MatrixRain.svelte

	Classic Matrix-style binary rain effect.
	Used as a dramatic entrance when activating hacker theme.

	Uses canvas for smooth 60fps animation with falling binary digits.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	interface Props {
		duration?: number; // How long to show the effect (ms)
		onComplete?: () => void;
	}

	let { duration = 3000, onComplete }: Props = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	let isVisible = $state(true);

	onMount(() => {
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Set canvas to full screen
		const resize = () => {
			canvas!.width = window.innerWidth;
			canvas!.height = window.innerHeight;
		};
		resize();
		window.addEventListener('resize', resize);

		// Matrix rain configuration
		const fontSize = 14;
		const columns = Math.floor(canvas.width / fontSize);

		// Track the y position of each column's leading character
		const drops: number[] = Array(columns).fill(0).map(() => Math.random() * -100);

		// Binary characters (with some matrix-style additions)
		const chars = '01';

		// Animation variables
		let animationId: number;
		let startTime = Date.now();
		const fadeStartTime = duration - 800; // Start fading 800ms before end

		function draw() {
			const elapsed = Date.now() - startTime;

			// Calculate fade opacity
			let opacity = 1;
			if (elapsed > fadeStartTime) {
				opacity = 1 - ((elapsed - fadeStartTime) / 800);
			}

			// Semi-transparent black to create trail effect
			ctx!.fillStyle = `rgba(0, 0, 0, 0.05)`;
			ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

			// Green text with variable brightness
			ctx!.font = `${fontSize}px monospace`;

			for (let i = 0; i < drops.length; i++) {
				// Random character
				const char = chars[Math.floor(Math.random() * chars.length)];

				// Variable green brightness for depth effect
				const brightness = Math.random() > 0.98 ? 255 : Math.floor(100 + Math.random() * 155);
				const alpha = opacity * (0.8 + Math.random() * 0.2);

				// Leading character is brighter (white-green)
				if (Math.random() > 0.95) {
					ctx!.fillStyle = `rgba(180, 255, 180, ${alpha})`;
				} else {
					ctx!.fillStyle = `rgba(0, ${brightness}, 0, ${alpha})`;
				}

				// Draw the character
				const x = i * fontSize;
				const y = drops[i] * fontSize;
				ctx!.fillText(char, x, y);

				// Reset drop to top with random delay, or move it down
				if (y > canvas!.height && Math.random() > 0.975) {
					drops[i] = 0;
				}
				drops[i]++;
			}

			// Continue animation or complete
			if (elapsed < duration) {
				animationId = requestAnimationFrame(draw);
			} else {
				isVisible = false;
				onComplete?.();
			}
		}

		// Start the animation
		draw();

		return () => {
			window.removeEventListener('resize', resize);
			cancelAnimationFrame(animationId);
		};
	});
</script>

{#if isVisible}
	<div
		class="matrix-rain-overlay"
		transition:fade={{ duration: 300 }}
	>
		<canvas bind:this={canvas}></canvas>
	</div>
{/if}

<style>
	.matrix-rain-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: 9999;
		pointer-events: none;
		background: rgba(0, 0, 0, 0.9);
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
