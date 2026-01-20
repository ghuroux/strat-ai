<!--
	SnakeCanvas.svelte - Core Snake Game Logic

	A canvas-based Snake game with:
	- Arrow keys / WASD controls
	- 20×20 grid, responsive canvas (max 500×500px)
	- Level progression: speed increases every 5 apples
	- Scoring: 10 × level points per apple
	- Wall and self-collision = game over

	Props:
	- isPaused: External pause control
	- gridSize: Grid dimensions (default 20)
	- isDarkMode: Theme for colors

	Events:
	- onScore: Called when score changes
	- onLevelUp: Called when level increases
	- onGameOver: Called with final stats
-->
<script lang="ts">
	import { onMount } from 'svelte';

	// =============================================================================
	// Types
	// =============================================================================

	interface Position {
		x: number;
		y: number;
	}

	type Direction = 'up' | 'down' | 'left' | 'right';

	export interface GameStats {
		score: number;
		level: number;
		length: number;
		applesEaten: number;
		timeMs: number;
	}

	// =============================================================================
	// Props
	// =============================================================================

	interface Props {
		isPaused?: boolean;
		gridSize?: number;
		isDarkMode?: boolean;
		onScore?: (score: number) => void;
		onLevelUp?: (level: number) => void;
		onGameOver?: (stats: GameStats) => void;
		onGameStart?: () => void;
	}

	let {
		isPaused = false,
		gridSize = 20,
		isDarkMode = true,
		onScore,
		onLevelUp,
		onGameOver,
		onGameStart
	}: Props = $props();

	// =============================================================================
	// Game State
	// =============================================================================

	let canvas: HTMLCanvasElement | undefined = $state();
	let canvasSize = $state(500); // CSS size (actual render size is multiplied by DPR)
	let dpr = $state(1); // Device pixel ratio for HiDPI support
	let gameState = $state<'idle' | 'playing' | 'gameover'>('idle');
	let score = $state(0);
	let level = $state(1);
	let applesEaten = $state(0);
	let snake = $state<Position[]>([]);
	let apple = $state<Position>({ x: 0, y: 0 });
	let direction = $state<Direction>('right');
	let nextDirection = $state<Direction>('right'); // Buffer for smoother turns
	let startTime = $state(0);

	// =============================================================================
	// Constants
	// =============================================================================

	// Speed: starts at 150ms, decreases by 20ms per level (min 70ms)
	function getSpeed(lvl: number): number {
		return Math.max(70, 150 - (lvl - 1) * 20);
	}

	// Apples per level
	const APPLES_PER_LEVEL = 5;

	// =============================================================================
	// Theme Colors
	// =============================================================================

	let colors = $derived({
		background: isDarkMode ? '#18181b' : '#fafafa',
		grid: isDarkMode ? '#3f3f46' : '#e4e4e7',
		snake: '#22c55e', // Green - same in both themes
		snakeHead: '#16a34a', // Darker green for head
		apple: '#ef4444' // Red - same in both themes
	});

	// =============================================================================
	// Game Logic
	// =============================================================================

	function initGame() {
		// Initialize snake in the middle
		const startX = Math.floor(gridSize / 2);
		const startY = Math.floor(gridSize / 2);
		snake = [
			{ x: startX, y: startY },
			{ x: startX - 1, y: startY },
			{ x: startX - 2, y: startY }
		];
		direction = 'right';
		nextDirection = 'right';
		score = 0;
		level = 1;
		applesEaten = 0;
		spawnApple();
		gameState = 'playing';
		startTime = Date.now();
		onGameStart?.();
	}

	function spawnApple() {
		let newApple: Position;
		do {
			newApple = {
				x: Math.floor(Math.random() * gridSize),
				y: Math.floor(Math.random() * gridSize)
			};
		} while (snake.some((s) => s.x === newApple.x && s.y === newApple.y));
		apple = newApple;
	}

	function moveSnake() {
		if (gameState !== 'playing' || isPaused) return;

		// Apply buffered direction
		direction = nextDirection;

		const head = snake[0];
		let newHead: Position;

		switch (direction) {
			case 'up':
				newHead = { x: head.x, y: head.y - 1 };
				break;
			case 'down':
				newHead = { x: head.x, y: head.y + 1 };
				break;
			case 'left':
				newHead = { x: head.x - 1, y: head.y };
				break;
			case 'right':
				newHead = { x: head.x + 1, y: head.y };
				break;
		}

		// Check wall collision
		if (newHead.x < 0 || newHead.x >= gridSize || newHead.y < 0 || newHead.y >= gridSize) {
			endGame();
			return;
		}

		// Check self collision
		if (snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
			endGame();
			return;
		}

		// Move snake
		snake = [newHead, ...snake];

		// Check apple collision
		if (newHead.x === apple.x && newHead.y === apple.y) {
			// Ate apple - don't remove tail
			applesEaten++;
			const points = 10 * level;
			score += points;
			onScore?.(score);

			// Check level up
			if (applesEaten % APPLES_PER_LEVEL === 0) {
				level++;
				onLevelUp?.(level);
			}

			spawnApple();
		} else {
			// No apple - remove tail
			snake = snake.slice(0, -1);
		}
	}

	function endGame() {
		gameState = 'gameover';
		const stats: GameStats = {
			score,
			level,
			length: snake.length,
			applesEaten,
			timeMs: Date.now() - startTime
		};
		onGameOver?.(stats);
	}

	// =============================================================================
	// Input Handling
	// =============================================================================

	function handleKeydown(e: KeyboardEvent) {
		// Start game on Enter when idle or game over
		if ((gameState === 'idle' || gameState === 'gameover') && e.key === 'Enter') {
			e.preventDefault();
			initGame();
			return;
		}

		// Ignore input when not playing
		if (gameState !== 'playing') return;

		// Direction changes - prevent 180° turns
		const directionMap: Record<string, { dir: Direction; opposite: Direction }> = {
			ArrowUp: { dir: 'up', opposite: 'down' },
			ArrowDown: { dir: 'down', opposite: 'up' },
			ArrowLeft: { dir: 'left', opposite: 'right' },
			ArrowRight: { dir: 'right', opposite: 'left' },
			w: { dir: 'up', opposite: 'down' },
			W: { dir: 'up', opposite: 'down' },
			s: { dir: 'down', opposite: 'up' },
			S: { dir: 'down', opposite: 'up' },
			a: { dir: 'left', opposite: 'right' },
			A: { dir: 'left', opposite: 'right' },
			d: { dir: 'right', opposite: 'left' },
			D: { dir: 'right', opposite: 'left' }
		};

		const mapping = directionMap[e.key];
		if (mapping && direction !== mapping.opposite) {
			e.preventDefault();
			nextDirection = mapping.dir;
		}
	}

	// =============================================================================
	// Rendering
	// =============================================================================

	function render() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Calculate cell size based on CSS size (not canvas buffer size)
		const cellSize = canvasSize / gridSize;

		// Save context and scale for HiDPI
		ctx.save();
		ctx.scale(dpr, dpr);

		// Clear background
		ctx.fillStyle = colors.background;
		ctx.fillRect(0, 0, canvasSize, canvasSize);

		// Draw subtle grid lines (fainter for less distraction)
		ctx.strokeStyle = colors.grid;
		ctx.lineWidth = 0.5;
		ctx.globalAlpha = 0.5;
		for (let i = 0; i <= gridSize; i++) {
			ctx.beginPath();
			ctx.moveTo(i * cellSize, 0);
			ctx.lineTo(i * cellSize, canvasSize);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0, i * cellSize);
			ctx.lineTo(canvasSize, i * cellSize);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;

		// Draw apple with leaf/stem
		const appleX = apple.x * cellSize + cellSize / 2;
		const appleY = apple.y * cellSize + cellSize / 2;
		const appleRadius = cellSize * 0.38;

		// Apple body
		ctx.fillStyle = colors.apple;
		ctx.beginPath();
		ctx.arc(appleX, appleY, appleRadius, 0, Math.PI * 2);
		ctx.fill();

		// Apple highlight (subtle shine)
		ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
		ctx.beginPath();
		ctx.arc(appleX - appleRadius * 0.3, appleY - appleRadius * 0.3, appleRadius * 0.25, 0, Math.PI * 2);
		ctx.fill();

		// Stem
		ctx.strokeStyle = '#7c3000';
		ctx.lineWidth = 2;
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(appleX, appleY - appleRadius);
		ctx.lineTo(appleX + 2, appleY - appleRadius - 4);
		ctx.stroke();

		// Leaf
		ctx.fillStyle = '#22c55e';
		ctx.beginPath();
		ctx.ellipse(appleX + 4, appleY - appleRadius - 2, 4, 2.5, Math.PI / 4, 0, Math.PI * 2);
		ctx.fill();

		// Draw snake with glow effect
		const padding = 1.5;
		const radius = cellSize * 0.28;

		// Draw subtle glow under snake (only during gameplay for performance)
		if (gameState === 'playing') {
			ctx.shadowColor = colors.snake;
			ctx.shadowBlur = 8;
		}

		snake.forEach((segment, index) => {
			const x = segment.x * cellSize;
			const y = segment.y * cellSize;

			// Body gradient - head is darker, fades slightly toward tail
			const fadeRatio = Math.min(0.3, index / snake.length * 0.3);
			ctx.fillStyle = index === 0 ? colors.snakeHead : colors.snake;
			ctx.globalAlpha = 1 - fadeRatio;

			// Rounded rectangle for segment
			ctx.beginPath();
			ctx.roundRect(x + padding, y + padding, cellSize - padding * 2, cellSize - padding * 2, radius);
			ctx.fill();

			// Draw eyes on the head
			if (index === 0) {
				ctx.globalAlpha = 1;
				ctx.shadowBlur = 0;
				const eyeSize = cellSize * 0.12;
				const eyeOffset = cellSize * 0.2;
				ctx.fillStyle = '#ffffff';

				// Position eyes based on direction
				let eye1X: number, eye1Y: number, eye2X: number, eye2Y: number;
				const centerX = x + cellSize / 2;
				const centerY = y + cellSize / 2;

				switch (direction) {
					case 'right':
						eye1X = centerX + eyeOffset; eye1Y = centerY - eyeOffset;
						eye2X = centerX + eyeOffset; eye2Y = centerY + eyeOffset;
						break;
					case 'left':
						eye1X = centerX - eyeOffset; eye1Y = centerY - eyeOffset;
						eye2X = centerX - eyeOffset; eye2Y = centerY + eyeOffset;
						break;
					case 'up':
						eye1X = centerX - eyeOffset; eye1Y = centerY - eyeOffset;
						eye2X = centerX + eyeOffset; eye2Y = centerY - eyeOffset;
						break;
					case 'down':
						eye1X = centerX - eyeOffset; eye1Y = centerY + eyeOffset;
						eye2X = centerX + eyeOffset; eye2Y = centerY + eyeOffset;
						break;
				}

				// Draw eyes
				ctx.beginPath();
				ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2);
				ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
				ctx.fill();

				// Pupils
				ctx.fillStyle = '#18181b';
				const pupilSize = eyeSize * 0.6;
				ctx.beginPath();
				ctx.arc(eye1X, eye1Y, pupilSize, 0, Math.PI * 2);
				ctx.arc(eye2X, eye2Y, pupilSize, 0, Math.PI * 2);
				ctx.fill();
			}
		});

		// Reset shadow and alpha
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;

		// Draw game over or idle overlay
		if (gameState === 'gameover' || gameState === 'idle') {
			ctx.fillStyle = isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.85)';
			ctx.fillRect(0, 0, canvasSize, canvasSize);

			ctx.fillStyle = isDarkMode ? '#ffffff' : '#18181b';
			ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';

			if (gameState === 'gameover') {
				ctx.fillText('Game Over!', canvasSize / 2, canvasSize / 2 - 35);
				ctx.font = '18px system-ui, -apple-system, sans-serif';
				ctx.fillText(`Score: ${score}`, canvasSize / 2, canvasSize / 2 + 10);
				ctx.font = '14px system-ui, -apple-system, sans-serif';
				ctx.fillStyle = isDarkMode ? '#a1a1aa' : '#71717a';
				ctx.fillText('Press Enter to play again', canvasSize / 2, canvasSize / 2 + 55);
			} else {
				// Draw snake icon
				ctx.fillStyle = colors.snake;
				ctx.font = '48px system-ui';
				ctx.fillText('🐍', canvasSize / 2, canvasSize / 2 - 40);

				ctx.fillStyle = isDarkMode ? '#ffffff' : '#18181b';
				ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
				ctx.fillText('Snake', canvasSize / 2, canvasSize / 2 + 15);
				ctx.font = '14px system-ui, -apple-system, sans-serif';
				ctx.fillStyle = isDarkMode ? '#a1a1aa' : '#71717a';
				ctx.fillText('Press Enter to start', canvasSize / 2, canvasSize / 2 + 45);
			}
		}

		// Draw pause overlay
		if (isPaused && gameState === 'playing') {
			ctx.fillStyle = isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.85)';
			ctx.fillRect(0, 0, canvasSize, canvasSize);

			ctx.fillStyle = isDarkMode ? '#ffffff' : '#18181b';
			ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText('⏸ Paused', canvasSize / 2, canvasSize / 2);

			ctx.font = '14px system-ui, -apple-system, sans-serif';
			ctx.fillStyle = isDarkMode ? '#a1a1aa' : '#71717a';
			ctx.fillText('Press Space to resume', canvasSize / 2, canvasSize / 2 + 35);
		}

		ctx.restore();
	}

	// =============================================================================
	// Game Loop
	// =============================================================================

	onMount(() => {
		if (!canvas) return;

		// Get device pixel ratio for HiDPI/Retina support
		dpr = window.devicePixelRatio || 1;

		// Set canvas CSS size (responsive, max 500px)
		canvasSize = Math.min(500, canvas.parentElement?.clientWidth || 500);

		// Set canvas internal resolution to CSS size × devicePixelRatio
		// This makes the canvas crisp on Retina displays
		canvas.width = canvasSize * dpr;
		canvas.height = canvasSize * dpr;

		// Set CSS display size
		canvas.style.width = `${canvasSize}px`;
		canvas.style.height = `${canvasSize}px`;

		// Initial render
		render();

		// Game tick interval (for snake movement)
		let gameInterval: ReturnType<typeof setInterval>;

		function startGameLoop() {
			if (gameInterval) clearInterval(gameInterval);
			gameInterval = setInterval(() => {
				moveSnake();
			}, getSpeed(level));
		}

		// Watch for game state changes to start/stop loop
		$effect(() => {
			if (gameState === 'playing' && !isPaused) {
				startGameLoop();
			} else {
				if (gameInterval) clearInterval(gameInterval);
			}
		});

		// Watch for level changes to update speed
		$effect(() => {
			if (gameState === 'playing' && !isPaused) {
				level; // Dependency
				startGameLoop();
			}
		});

		// Render loop (separate from game tick for smooth animation)
		let animationId: number;
		function renderLoop() {
			render();
			animationId = requestAnimationFrame(renderLoop);
		}
		renderLoop();

		return () => {
			cancelAnimationFrame(animationId);
			if (gameInterval) clearInterval(gameInterval);
		};
	});

	// Export method to start game programmatically
	export function start() {
		initGame();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="snake-canvas-container">
	<!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
	<canvas
		bind:this={canvas}
		class="snake-canvas"
		aria-label="Snake game canvas - use arrow keys or WASD to play"
	></canvas>
</div>

<style>
	.snake-canvas-container {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
	}

	.snake-canvas {
		border-radius: 0.75rem;
		max-width: 100%;
		height: auto;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}
</style>
