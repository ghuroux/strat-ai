<!--
	Confetti.svelte

	Celebratory confetti explosion effect!
	Used for party mode, milestones, achievements, and special occasions.

	Features:
	- Canvas-based particle system for smooth 60fps
	- Physics: gravity, air resistance, tumbling
	- Colorful pieces with random shapes
	- Configurable duration and intensity
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	interface Props {
		duration?: number; // How long to show the effect (ms)
		particleCount?: number; // Number of confetti pieces
		onComplete?: () => void;
	}

	let { duration = 4000, particleCount = 150, onComplete }: Props = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	let isVisible = $state(true);

	// Confetti colors - celebratory palette
	const colors = [
		'#ff6b6b', // Red
		'#feca57', // Yellow
		'#48dbfb', // Cyan
		'#ff9ff3', // Pink
		'#54a0ff', // Blue
		'#5f27cd', // Purple
		'#00d2d3', // Teal
		'#ff9f43', // Orange
		'#10ac84', // Green
		'#ee5a24', // Deep Orange
	];

	interface Particle {
		x: number;
		y: number;
		vx: number;
		vy: number;
		width: number;
		height: number;
		color: string;
		rotation: number;
		rotationSpeed: number;
		opacity: number;
	}

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

		// Create particles in waves for more dramatic effect
		const particles: Particle[] = [];

		for (let i = 0; i < particleCount; i++) {
			// Spawn across full width
			const spawnX = Math.random() * canvas.width;

			// First 60% of particles spawn visible immediately (the "explosion")
			// Remaining 40% spawn above viewport (the "rain")
			const isImmediateSpawn = i < particleCount * 0.6;
			const spawnY = isImmediateSpawn
				? Math.random() * canvas.height * 0.3 // Top 30% of screen
				: -20 - Math.random() * 200; // Above viewport

			// Immediate spawns get more dramatic outward velocity
			const vxMultiplier = isImmediateSpawn ? 20 : 12;
			const vyMultiplier = isImmediateSpawn ? 8 : 3;

			particles.push({
				x: spawnX,
				y: spawnY,
				vx: (Math.random() - 0.5) * vxMultiplier, // Horizontal velocity
				vy: Math.random() * vyMultiplier + 2, // Initial downward velocity
				width: Math.random() * 12 + 6, // Slightly bigger pieces
				height: Math.random() * 8 + 4,
				color: colors[Math.floor(Math.random() * colors.length)],
				rotation: Math.random() * Math.PI * 2,
				rotationSpeed: (Math.random() - 0.5) * 0.4, // More spin
				opacity: 1
			});
		}

		// Physics constants
		const gravity = 0.25;
		const airResistance = 0.99;
		const fadeStartTime = duration - 1000; // Start fading 1s before end

		// Animation
		let animationId: number;
		let startTime = Date.now();

		function draw() {
			const elapsed = Date.now() - startTime;

			// Clear canvas
			ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

			// Calculate global fade
			let globalOpacity = 1;
			if (elapsed > fadeStartTime) {
				globalOpacity = 1 - ((elapsed - fadeStartTime) / 1000);
			}

			// Update and draw each particle
			for (const p of particles) {
				// Apply physics
				p.vy += gravity; // Gravity
				p.vx *= airResistance; // Air resistance
				p.vy *= airResistance;

				// Add some flutter/wobble
				p.vx += Math.sin(elapsed * 0.01 + p.rotation) * 0.1;

				// Update position
				p.x += p.vx;
				p.y += p.vy;

				// Update rotation
				p.rotation += p.rotationSpeed;

				// Calculate opacity
				const opacity = globalOpacity * p.opacity;

				// Draw the confetti piece
				ctx!.save();
				ctx!.translate(p.x, p.y);
				ctx!.rotate(p.rotation);
				ctx!.globalAlpha = opacity;
				ctx!.fillStyle = p.color;

				// Draw rectangle (confetti shape)
				ctx!.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);

				ctx!.restore();
			}

			// Continue or complete
			if (elapsed < duration) {
				animationId = requestAnimationFrame(draw);
			} else {
				isVisible = false;
				onComplete?.();
			}
		}

		// Start animation
		draw();

		return () => {
			window.removeEventListener('resize', resize);
			cancelAnimationFrame(animationId);
		};
	});
</script>

{#if isVisible}
	<div
		class="confetti-overlay"
		transition:fade={{ duration: 300 }}
	>
		<canvas bind:this={canvas}></canvas>
	</div>
{/if}

<style>
	.confetti-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: 9999;
		pointer-events: none;
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
