<!--
	PromptRunnerCanvas.svelte - Core Prompt Runner Game Logic

	A canvas-based endless runner themed as a token traversing an LLM pipeline.
	Jump over error obstacles (HALLUCINATION, TOKEN_LIMIT, 403, etc.).

	- Space / Click / ↑: Jump
	- Auto-scrolling ground with streaming code text
	- Procedural obstacle spawning with increasing difficulty
	- Score = "tokens processed" (increases over time)
	- Level up every 1000 tokens (speed increases)

	Props:
	- isPaused: External pause control
	- isDarkMode: Theme for colors

	Events:
	- onScore: Called when score updates (every 10 frames)
	- onLevelUp: Called when level increases
	- onGameOver: Called with final stats
	- onGameStart: Called when game begins
-->
<script lang="ts">
	import { onMount } from 'svelte';

	// =============================================================================
	// Types
	// =============================================================================

	export interface RunnerStats {
		score: number;
		level: number;
		obstaclesCleared: number;
		timeMs: number;
	}

	interface Obstacle {
		x: number;
		width: number;
		height: number;
		label: string;
		color: string;
		passed: boolean;
	}

	interface BgText {
		x: number;
		y: number;
		text: string;
		opacity: number;
		speed: number;
	}

	interface TrailParticle {
		x: number;
		y: number;
		life: number;
		maxLife: number;
		size: number;
	}

	// =============================================================================
	// Props
	// =============================================================================

	interface Props {
		isPaused?: boolean;
		isDarkMode?: boolean;
		onScore?: (score: number) => void;
		onLevelUp?: (level: number) => void;
		onGameOver?: (stats: RunnerStats) => void;
		onGameStart?: () => void;
	}

	let {
		isPaused = false,
		isDarkMode = true,
		onScore,
		onLevelUp,
		onGameOver,
		onGameStart
	}: Props = $props();

	// =============================================================================
	// Canvas
	// =============================================================================

	let canvas: HTMLCanvasElement | undefined = $state();
	let canvasWidth = $state(800);
	let canvasHeight = $state(336);
	let dpr = $state(1);

	// =============================================================================
	// Game State
	// =============================================================================

	let gameState = $state<'idle' | 'playing' | 'gameover'>('idle');
	let score = $state(0);
	let level = $state(1);
	let obstaclesCleared = $state(0);
	let startTime = $state(0);

	// =============================================================================
	// Physics Constants
	// =============================================================================

	const GRAVITY = 0.7;
	const JUMP_VELOCITY = -12;
	const GROUND_OFFSET = 50;
	const PLAYER_WIDTH = 28;
	const PLAYER_HEIGHT = 34;
	const PLAYER_X = 80;

	// =============================================================================
	// Player State
	// =============================================================================

	let playerY = $state(0);
	let playerVelocity = $state(0);
	let isOnGround = $state(true);

	// =============================================================================
	// World State (mutable, not reactive — updated in game loop)
	// =============================================================================

	let obstacles: Obstacle[] = [];
	let bgTexts: BgText[] = [];
	let trail: TrailParticle[] = [];
	let groundScrollX = 0;
	let frameCount = 0;
	let spawnTimer = 0;
	let scoreAccumulator = 0;
	let trailTimer = 0;
	let lastScoreReportFrame = 0;

	// =============================================================================
	// Speed & Difficulty
	// =============================================================================

	const BASE_SPEED = 4;
	const SPEED_INCREMENT = 0.5;
	const LEVEL_THRESHOLD = 1000;
	const MIN_GAP = 250;
	const MAX_GAP = 450;
	const TARGET_FRAME_MS = 1000 / 60; // Normalize game speed to 60fps across all refresh rates

	// =============================================================================
	// Derived
	// =============================================================================

	let groundY = $derived(canvasHeight - GROUND_OFFSET);
	let currentSpeed = $derived(BASE_SPEED + (level - 1) * SPEED_INCREMENT);

	// =============================================================================
	// Theme Colors
	// =============================================================================

	let colors = $derived({
		bg: isDarkMode ? '#0c0c14' : '#f4f5f7',
		ground: isDarkMode ? '#1a1a2e' : '#e2e8f0',
		groundLine: '#06b6d4',
		groundText: isDarkMode ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.12)',
		player: '#06b6d4',
		playerGlow: 'rgba(6, 182, 212, 0.4)',
		text: isDarkMode ? '#ffffff' : '#18181b',
		textFaint: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
		overlay: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)'
	});

	// =============================================================================
	// Obstacle Types
	// =============================================================================

	const OBS_TYPES = [
		{ label: 'HALLUCINATION', color: '#ef4444', w: 44, h: 40 },
		{ label: 'TOKEN_LIMIT', color: '#f97316', w: 52, h: 35 },
		{ label: '403', color: '#dc2626', w: 28, h: 48 },
		{ label: 'RATE_LIMITED', color: '#a855f7', w: 48, h: 36 },
		{ label: 'NULL', color: '#6b7280', w: 26, h: 30 },
		{ label: 'TIMEOUT', color: '#eab308', w: 42, h: 34 },
		{ label: 'OOM', color: '#ef4444', w: 34, h: 52 },
		{ label: 'NaN', color: '#f43f5e', w: 24, h: 30 },
		{ label: 'SIGTERM', color: '#dc2626', w: 46, h: 38 },
		{ label: 'DEADLOCK', color: '#9333ea', w: 48, h: 42 },
		{ label: 'SEGFAULT', color: '#b91c1c', w: 44, h: 44 },
		{ label: '500', color: '#dc2626', w: 26, h: 34 }
	];

	// =============================================================================
	// Streaming Text (for ground and background)
	// =============================================================================

	const STREAM_TEXTS = [
		'generating response...',
		'attention_layer.forward()',
		'embedding(dim=4096)',
		'softmax(Q·K^T/√d)',
		'beam_search(k=5)',
		'temperature=0.7',
		'top_p=0.9',
		'context_window=128k',
		'cross_entropy_loss()',
		'gradient_descent(lr=3e-4)',
		'transformer.decode()',
		'next_token_prediction',
		'KV_cache.update()',
		'rotary_embedding(x)',
		'layer_norm(x)',
		'feed_forward(x)',
		'multi_head_attention()',
		'logits=model(input_ids)',
		'tokenizer.encode()',
		'residual_connection()',
		'dropout(p=0.1)',
		'weight_decay=0.01'
	];

	const MONO_FONT = '"SF Mono", "Fira Code", "Consolas", monospace';

	// =============================================================================
	// Game Logic
	// =============================================================================

	function initGame() {
		playerY = groundY - PLAYER_HEIGHT;
		playerVelocity = 0;
		isOnGround = true;
		score = 0;
		level = 1;
		obstaclesCleared = 0;
		obstacles = [];
		trail = [];
		groundScrollX = 0;
		frameCount = 0;
		spawnTimer = 300;
		scoreAccumulator = 0;
		trailTimer = 0;
		lastScoreReportFrame = 0;
		startTime = Date.now();
		gameState = 'playing';

		// Seed background text
		bgTexts = [];
		for (let i = 0; i < 8; i++) {
			bgTexts.push({
				x: Math.random() * canvasWidth,
				y: 20 + Math.random() * (groundY - 40),
				text: STREAM_TEXTS[Math.floor(Math.random() * STREAM_TEXTS.length)],
				opacity: 0.03 + Math.random() * 0.04,
				speed: 0.5 + Math.random() * 1
			});
		}

		onGameStart?.();
	}

	function jump() {
		if (gameState === 'idle' || gameState === 'gameover') {
			initGame();
			return;
		}
		if (gameState !== 'playing' || isPaused) return;
		if (!isOnGround) return;

		playerVelocity = JUMP_VELOCITY;
		isOnGround = false;
	}

	function spawnObstacle() {
		const type = OBS_TYPES[Math.floor(Math.random() * OBS_TYPES.length)];
		obstacles.push({
			x: canvasWidth + 20,
			width: type.w,
			height: type.h,
			label: type.label,
			color: type.color,
			passed: false
		});
	}

	function checkCollision(): boolean {
		// Forgiving hitbox (inset by 4px on each side)
		const px = PLAYER_X + 4;
		const py = playerY + 4;
		const pw = PLAYER_WIDTH - 8;
		const ph = PLAYER_HEIGHT - 4;

		for (const obs of obstacles) {
			const ox = obs.x;
			const oy = groundY - obs.height;
			if (px < ox + obs.width && px + pw > ox && py + ph > oy && py < oy + obs.height) {
				return true;
			}
		}
		return false;
	}

	function endGame() {
		gameState = 'gameover';
		onScore?.(score);
		onGameOver?.({
			score,
			level,
			obstaclesCleared,
			timeMs: Date.now() - startTime
		});
	}

	// =============================================================================
	// Update (called every frame when playing)
	// =============================================================================

	function update(dt: number) {
		// Physics (delta-time normalized to 60fps)
		playerVelocity += GRAVITY * dt;
		playerY += playerVelocity * dt;

		if (playerY >= groundY - PLAYER_HEIGHT) {
			playerY = groundY - PLAYER_HEIGHT;
			playerVelocity = 0;
			isOnGround = true;
		}

		// Move obstacles
		for (const obs of obstacles) {
			obs.x -= currentSpeed * dt;
			if (!obs.passed && obs.x + obs.width < PLAYER_X) {
				obs.passed = true;
				obstaclesCleared++;
			}
		}
		obstacles = obstacles.filter((o) => o.x > -100);

		// Spawn obstacles
		spawnTimer -= currentSpeed * dt;
		if (spawnTimer <= 0) {
			spawnObstacle();
			let gap = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
			gap -= level * 10;
			spawnTimer = Math.max(gap, 180);
		}

		// Score (accumulate fractional frames for consistent scoring across refresh rates)
		scoreAccumulator += dt;
		while (scoreAccumulator >= 1) {
			score++;
			scoreAccumulator -= 1;
		}
		frameCount += dt;

		// Level check
		const newLevel = Math.floor(score / LEVEL_THRESHOLD) + 1;
		if (newLevel > level) {
			level = newLevel;
			onLevelUp?.(level);
		}

		// Report score periodically (~10 logical frames)
		if (frameCount - lastScoreReportFrame >= 10) {
			onScore?.(score);
			lastScoreReportFrame = frameCount;
		}

		// Collision
		if (checkCollision()) {
			endGame();
			return;
		}

		// Ground scroll
		groundScrollX = (groundScrollX + currentSpeed * dt) % 200;

		// Trail particles (every ~2 logical frames)
		trailTimer += dt;
		if (trailTimer >= 2) {
			trailTimer -= 2;
			trail.push({
				x: PLAYER_X - 2,
				y: playerY + PLAYER_HEIGHT / 2 + (Math.random() - 0.5) * 8,
				life: 12,
				maxLife: 12,
				size: 2 + Math.random() * 2
			});
		}
		for (const p of trail) {
			p.x -= currentSpeed * 0.3 * dt;
			p.life -= dt;
		}
		trail = trail.filter((p) => p.life > 0);

		// Background text
		for (const t of bgTexts) {
			t.x -= (t.speed + currentSpeed * 0.3) * dt;
			if (t.x < -250) {
				t.x = canvasWidth + 20;
				t.y = 20 + Math.random() * (groundY - 40);
				t.text = STREAM_TEXTS[Math.floor(Math.random() * STREAM_TEXTS.length)];
			}
		}
	}

	// =============================================================================
	// Rendering
	// =============================================================================

	function render() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.save();
		ctx.scale(dpr, dpr);

		// Background
		ctx.fillStyle = colors.bg;
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);

		// Background floating text
		ctx.font = `11px ${MONO_FONT}`;
		for (const t of bgTexts) {
			ctx.globalAlpha = t.opacity;
			ctx.fillStyle = colors.player;
			ctx.fillText(t.text, t.x, t.y);
		}
		ctx.globalAlpha = 1;

		// Ground area
		ctx.fillStyle = colors.ground;
		ctx.fillRect(0, groundY, canvasWidth, GROUND_OFFSET);

		// Ground line with glow
		ctx.shadowColor = colors.groundLine;
		ctx.shadowBlur = 6;
		ctx.strokeStyle = colors.groundLine;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(0, groundY);
		ctx.lineTo(canvasWidth, groundY);
		ctx.stroke();
		ctx.shadowBlur = 0;

		// Ground scrolling text
		renderGroundText(ctx);

		// Speed lines at high levels
		if (gameState === 'playing' && level >= 3 && !isPaused) {
			renderSpeedLines(ctx);
		}

		// Obstacles
		renderObstacles(ctx);

		// Trail particles
		for (const p of trail) {
			ctx.globalAlpha = (p.life / p.maxLife) * 0.4;
			ctx.fillStyle = colors.player;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;

		// Player
		if (gameState === 'playing' || gameState === 'gameover') {
			renderPlayer(ctx);
		}

		// Overlays
		if (gameState === 'idle') {
			renderIdleScreen(ctx);
		} else if (gameState === 'gameover') {
			renderGameOverScreen(ctx);
		} else if (isPaused) {
			renderPauseScreen(ctx);
		}

		ctx.restore();
	}

	function renderGroundText(ctx: CanvasRenderingContext2D) {
		ctx.font = `10px ${MONO_FONT}`;
		ctx.fillStyle = colors.groundText;

		const groundStr = STREAM_TEXTS.join('   ·   ');
		const scrollX = -(groundScrollX % 200);

		// Two rows of scrolling text
		for (let offset = scrollX; offset < canvasWidth + 200; offset += 1200) {
			ctx.fillText(groundStr, offset, groundY + 20);
			ctx.fillText(groundStr, offset + 300, groundY + 35);
		}
	}

	function renderSpeedLines(ctx: CanvasRenderingContext2D) {
		ctx.globalAlpha = Math.min(0.15, (level - 2) * 0.03);
		ctx.strokeStyle = colors.player;
		ctx.lineWidth = 1;
		const lineCount = Math.min(level - 2, 5);
		for (let i = 0; i < lineCount; i++) {
			const ly = 20 + ((frameCount * 3 + i * 47) % (groundY - 30));
			const lx = (frameCount * 7 + i * 131) % canvasWidth;
			ctx.beginPath();
			ctx.moveTo(lx, ly);
			ctx.lineTo(lx - 30 - (level * 3), ly);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}

	function renderObstacles(ctx: CanvasRenderingContext2D) {
		for (const obs of obstacles) {
			const ox = obs.x;
			const oy = groundY - obs.height;

			// Glow
			ctx.shadowColor = obs.color;
			ctx.shadowBlur = 8;

			// Body
			ctx.fillStyle = obs.color;
			ctx.beginPath();
			ctx.roundRect(ox, oy, obs.width, obs.height, 4);
			ctx.fill();
			ctx.shadowBlur = 0;

			// Scanline effect
			ctx.fillStyle = 'rgba(0,0,0,0.15)';
			for (let sy = oy + 3; sy < oy + obs.height; sy += 4) {
				ctx.fillRect(ox, sy, obs.width, 1);
			}

			// Label
			const fontSize = obs.label.length > 6 ? 7 : 8;
			ctx.font = `bold ${fontSize}px ${MONO_FONT}`;
			ctx.fillStyle = 'rgba(255,255,255,0.9)';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(obs.label, ox + obs.width / 2, oy + obs.height / 2);
			ctx.textAlign = 'start';
			ctx.textBaseline = 'alphabetic';
		}
	}

	function renderPlayer(ctx: CanvasRenderingContext2D) {
		const px = PLAYER_X;
		const py = playerY;

		// Glow (intensifies with speed)
		const glowIntensity = 10 + level * 2;
		ctx.shadowColor = colors.playerGlow;
		ctx.shadowBlur = glowIntensity;

		// Body
		ctx.fillStyle = colors.player;
		ctx.beginPath();
		ctx.roundRect(px, py, PLAYER_WIDTH, PLAYER_HEIGHT, 6);
		ctx.fill();
		ctx.shadowBlur = 0;

		// Border
		ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(px, py, PLAYER_WIDTH, PLAYER_HEIGHT, 6);
		ctx.stroke();

		// Prompt cursor ">_"
		ctx.fillStyle = isDarkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)';
		ctx.font = `bold 13px ${MONO_FONT}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('>_', px + PLAYER_WIDTH / 2, py + PLAYER_HEIGHT / 2);
		ctx.textAlign = 'start';
		ctx.textBaseline = 'alphabetic';
	}

	// =============================================================================
	// Screen Overlays
	// =============================================================================

	function renderIdleScreen(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = colors.overlay;
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);

		const cx = canvasWidth / 2;
		const cy = canvasHeight / 2;

		// Title with glow
		ctx.shadowColor = colors.player;
		ctx.shadowBlur = 20;
		ctx.fillStyle = colors.player;
		ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('>_ Prompt Runner', cx, cy - 30);
		ctx.shadowBlur = 0;

		// Subtitle
		ctx.fillStyle = colors.textFaint;
		ctx.font = '13px system-ui, -apple-system, sans-serif';
		ctx.fillText('Navigate the LLM pipeline. Avoid errors.', cx, cy + 8);

		// Start instruction
		ctx.fillStyle = colors.text;
		ctx.font = '12px system-ui, -apple-system, sans-serif';
		ctx.fillText('Press Space or Click to start', cx, cy + 40);

		ctx.textAlign = 'start';
		ctx.textBaseline = 'alphabetic';
	}

	function renderGameOverScreen(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = colors.overlay;
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);

		const cx = canvasWidth / 2;
		const cy = canvasHeight / 2;

		// Title
		ctx.fillStyle = '#ef4444';
		ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('Buffer Overflow!', cx, cy - 35);

		// Score
		ctx.fillStyle = colors.text;
		ctx.font = '16px system-ui, -apple-system, sans-serif';
		ctx.fillText(`${score.toLocaleString()} tokens processed`, cx, cy + 2);

		// Stats
		ctx.fillStyle = colors.textFaint;
		ctx.font = '12px system-ui, -apple-system, sans-serif';
		ctx.fillText(`Level ${level}  ·  ${obstaclesCleared} obstacles cleared`, cx, cy + 26);

		// Restart
		ctx.fillStyle = colors.text;
		ctx.font = '12px system-ui, -apple-system, sans-serif';
		ctx.fillText('Press Space or Click to retry', cx, cy + 56);

		ctx.textAlign = 'start';
		ctx.textBaseline = 'alphabetic';
	}

	function renderPauseScreen(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = colors.overlay;
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);

		const cx = canvasWidth / 2;
		const cy = canvasHeight / 2;

		ctx.fillStyle = colors.text;
		ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('⏸ Paused', cx, cy);

		ctx.fillStyle = colors.textFaint;
		ctx.font = '14px system-ui, -apple-system, sans-serif';
		ctx.fillText('Press Space to resume', cx, cy + 35);

		ctx.textAlign = 'start';
		ctx.textBaseline = 'alphabetic';
	}

	// =============================================================================
	// Input Handling
	// =============================================================================

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === ' ' || e.key === 'ArrowUp') {
			e.preventDefault();
			jump();
		}
	}

	function handleClick() {
		jump();
	}

	// =============================================================================
	// Game Loop (onMount)
	// =============================================================================

	onMount(() => {
		if (!canvas) return;

		dpr = window.devicePixelRatio || 1;
		canvasWidth = Math.min(800, canvas.parentElement?.clientWidth || 800);
		canvasHeight = Math.round(canvasWidth * 0.42);

		canvas.width = canvasWidth * dpr;
		canvas.height = canvasHeight * dpr;
		canvas.style.width = `${canvasWidth}px`;
		canvas.style.height = `${canvasHeight}px`;

		// Init player position
		playerY = groundY - PLAYER_HEIGHT;

		// Initial render
		render();

		let animationId: number;
		let lastTime = 0;

		function loop(timestamp: number) {
			if (lastTime === 0) lastTime = timestamp;
			const rawDelta = timestamp - lastTime;
			lastTime = timestamp;

			// Cap delta to prevent huge jumps after tab switch (max ~3 frames at 60fps)
			const deltaMs = Math.min(rawDelta, TARGET_FRAME_MS * 3);
			const dt = deltaMs / TARGET_FRAME_MS;

			if (gameState === 'playing' && !isPaused) {
				update(dt);
			}
			render();
			animationId = requestAnimationFrame(loop);
		}

		animationId = requestAnimationFrame(loop);

		return () => {
			cancelAnimationFrame(animationId);
		};
	});

	// =============================================================================
	// Public API
	// =============================================================================

	export function start() {
		initGame();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="runner-canvas-container">
	<!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
	<canvas
		bind:this={canvas}
		class="runner-canvas"
		onclick={handleClick}
		aria-label="Prompt Runner game - press Space or click to jump over obstacles"
	></canvas>
</div>

<style>
	.runner-canvas-container {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
	}

	.runner-canvas {
		border-radius: 0.75rem;
		max-width: 100%;
		height: auto;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
		cursor: pointer;
	}
</style>
