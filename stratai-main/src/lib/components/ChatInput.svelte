<script lang="ts">
	import { chatStore } from '$lib/stores/chat.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';
	import { easterEggsStore } from '$lib/stores/easter-eggs.svelte';
	import SearchToggle from './chat/SearchToggle.svelte';
	import ThinkingToggle from './chat/ThinkingToggle.svelte';
	import SummarizeButton from './chat/SummarizeButton.svelte';
	import PromptOptimizeButton from './chat/PromptOptimizeButton.svelte';
	import FileUploadButton from './chat/FileUploadButton.svelte';
	import FilePreview from './chat/FilePreview.svelte';
	import ContextIndicator from './chat/ContextIndicator.svelte';
	import type { FileAttachment } from '$lib/types/chat';
	import {
		calculateConversationTokens,
		getContextUsagePercent,
		getContextWindowSize
	} from '$lib/services/tokenEstimation';

	// Svelte 5: Use $props with callback props instead of createEventDispatcher
	let {
		disabled = false,
		placeholder,
		onsend,
		onstop,
		onsummarize,
		oncompact,
		isGeneratingSummary = false,
		isCompacting = false
	}: {
		disabled?: boolean;
		placeholder?: string;
		onsend?: (message: string, attachments?: FileAttachment[]) => void;
		onstop?: () => void;
		onsummarize?: () => void;
		oncompact?: () => void;
		isGeneratingSummary?: boolean;
		isCompacting?: boolean;
	} = $props();

	// Pending file attachments
	let pendingAttachments = $state<FileAttachment[]>([]);

	let webSearchFeatureEnabled = $derived(settingsStore.webSearchFeatureEnabled);
	let searchEnabled = $derived(settingsStore.webSearchEnabled);
	let thinkingEnabled = $derived(settingsStore.extendedThinkingEnabled);

	// Show summarize button when conversation has 6+ messages
	let showSummarizeButton = $derived(chatStore.messages.length >= 6);
	let hasSummary = $derived(!!chatStore.activeConversation?.summary);

	// Effective placeholder (uses prop if provided, otherwise default)
	let effectivePlaceholder = $derived(
		placeholder ?? (chatStore.isStreaming ? 'AI is responding...' : 'Type a message... (Shift+Enter for new line)')
	);

	// Context window usage calculation
	let currentModel = $derived(chatStore.activeConversation?.model || settingsStore.selectedModel);
	let contextWindowSize = $derived(getContextWindowSize(currentModel));
	let continuationSummary = $derived(chatStore.activeConversation?.continuationSummary || '');
	let estimatedTokens = $derived(
		calculateConversationTokens(chatStore.messages, settingsStore.systemPrompt, continuationSummary, currentModel)
	);
	let contextUsagePercent = $derived(
		getContextUsagePercent(estimatedTokens, currentModel)
	);
	let showContextIndicator = $derived(
		chatStore.messages.length > 0 && contextUsagePercent >= settingsStore.contextThresholdPercent
	);

	// Check if current model supports tool use (required for web search)
	let modelSupportsTools = $derived(modelCapabilitiesStore.supportsTools(currentModel));

	// Svelte 5: Use $state for local reactive state
	let input = $state('');
	let textarea: HTMLTextAreaElement | undefined = $state();
	let isFocused = $state(false);
	let isSending = $state(false);

	// Listen for prepopulate-input events (from quick start buttons, etc.)
	$effect(() => {
		function handlePrepopulate(e: CustomEvent<{ text: string }>) {
			input = e.detail.text;
			// Auto-resize and focus the textarea
			setTimeout(() => {
				autoResize();
				textarea?.focus();
			}, 0);
		}

		document.addEventListener('prepopulate-input', handlePrepopulate as EventListener);

		return () => {
			document.removeEventListener('prepopulate-input', handlePrepopulate as EventListener);
		};
	});

	// Drag and drop state
	let isDragging = $state(false);
	let isUploading = $state(false);
	let dragCounter = $state(0); // Track enter/leave to handle nested elements

	// Vision capability check
	let supportsVision = $derived(settingsStore.canUseVision);
	let modelName = $derived(modelCapabilitiesStore.currentDisplayName);

	// Accepted file types for drag-drop validation
	const DOCUMENT_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.csv', '.json'];
	const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
	const ACCEPTED_EXTENSIONS = $derived(
		supportsVision
			? [...DOCUMENT_EXTENSIONS, ...IMAGE_EXTENSIONS]
			: DOCUMENT_EXTENSIONS
	);

	const DOCUMENT_MIME_TYPES = [
		'application/pdf',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'text/plain',
		'text/markdown',
		'text/csv',
		'application/json'
	];
	const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
	const ACCEPTED_MIME_TYPES = $derived(
		supportsVision
			? [...DOCUMENT_MIME_TYPES, ...IMAGE_MIME_TYPES]
			: DOCUMENT_MIME_TYPES
	);

	// Check if a file is an image
	function isImageFile(file: File): boolean {
		return file.type.startsWith('image/') ||
			IMAGE_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));
	}

	let charCount = $derived(input.length);
	let hasAttachments = $derived(pendingAttachments.length > 0);
	let canSend = $derived((input.trim().length > 0 || hasAttachments) && !disabled && !chatStore.isStreaming);

	function handleSubmit() {
		if (!canSend || isSending) return;

		// Set sending state
		isSending = true;

		// Easter eggs: Check for special phrases and hijack conversation if matched
		const lowerInput = input.trim().toLowerCase();
		const easterEggHandled = handleEasterEggCommand(lowerInput, input.trim());

		if (easterEggHandled) {
			// Easter egg handled - clear input and return without sending to LLM
			input = '';
			pendingAttachments = [];
			if (textarea) {
				textarea.style.height = '';
			}
			isSending = false;
			return;
		}

		// Normal flow - send to LLM
		onsend?.(input.trim(), pendingAttachments.length > 0 ? [...pendingAttachments] : undefined);
		input = '';
		pendingAttachments = [];
		// Reset textarea height to single row
		if (textarea) {
			textarea.style.height = '';
		}

		// Reset sending state after submission
		isSending = false;
	}

	/**
	 * Handle easter egg commands by hijacking the conversation.
	 * Returns true if an easter egg was triggered (conversation hijacked).
	 */
	function handleEasterEggCommand(lowerInput: string, originalInput: string): boolean {
		// Define easter egg patterns and their handlers
		// Some eggs use static responses, others use dynamic getResponse() after handler runs
		const easterEggs: Array<{
			patterns: string[];
			handler: () => void;
			response?: string | null;
			getResponse?: () => string;
		}> = [
			// Visual effect easter eggs
			{
				patterns: ['do a barrel roll', 'do a barrelroll'],
				handler: triggerBarrelRoll,
				response: getBarrelRollResponse()
			},
			{
				patterns: ['ship it', 'ship it!'],
				handler: triggerShipIt,
				response: getShipItResponse()
			},
			{
				patterns: ['enable party mode', 'party mode', 'party time'],
				handler: triggerPartyMode,
				response: getPartyModeResponse()
			},
			{
				patterns: ['show me the matrix', 'enter the matrix', 'matrix mode'],
				handler: triggerMatrixRain,
				response: getMatrixResponse()
			},
			// Classic programmer easter eggs (no animation)
			{
				patterns: ['what is the meaning of life', 'what is the meaning of life?', 'meaning of life', 'meaning of life?'],
				handler: () => {}, // No visual effect, just the response
				response: getMeaningOfLifeResponse()
			},
			{
				patterns: ['sudo make me a sandwich', 'sudo make me a sandwich.'],
				handler: () => {},
				response: getSudoSandwichResponse()
			},
			{
				patterns: ['hello world', 'hello, world', 'hello world!', 'hello, world!'],
				handler: triggerHelloWorld,
				response: getHelloWorldResponse()
			},
			{
				patterns: ["there's no place like 127.0.0.1", 'theres no place like 127.0.0.1', 'no place like 127.0.0.1', '127.0.0.1'],
				handler: () => {},
				response: getLocalhostResponse()
			},
			// Fun utility easter eggs (response generated dynamically)
			{
				patterns: ['flip a coin', 'flip coin', 'coin flip', 'heads or tails', 'heads or tails?'],
				handler: triggerCoinFlip,
				response: null, // Will be generated after handler runs
				getResponse: getCoinFlipResponse
			}
		];

		// Find matching easter egg
		for (const egg of easterEggs) {
			if (egg.patterns.includes(lowerInput)) {
				// Trigger the effect first (may set state for dynamic response)
				egg.handler();
				// Get response - use dynamic getResponse if available, otherwise use static response
				const response = egg.getResponse ? egg.getResponse() : (egg.response || '');
				// Add messages to conversation
				addEasterEggConversation(originalInput, response);
				return true;
			}
		}

		return false;
	}

	/**
	 * Add easter egg messages to the conversation (user message + AI response)
	 */
	function addEasterEggConversation(userMessage: string, aiResponse: string): void {
		// Ensure we have an active conversation
		let convId = chatStore.activeConversationId;
		if (!convId) {
			convId = chatStore.createConversation(settingsStore.selectedModel || 'gpt-4o');
		}

		// Add user message
		chatStore.addMessage(convId, {
			role: 'user',
			content: userMessage
		});

		// Add AI response after a tiny delay (feels more natural)
		setTimeout(() => {
			chatStore.addMessage(convId!, {
				role: 'assistant',
				content: aiResponse
			});
		}, 300);
	}

	// Easter egg response generators with ASCII art
	function getBarrelRollResponse(): string {
		const responses = [
			`Wheeee! 🌀 That was fun!

\`\`\`
    ___
   /   \\
  | o o |  ← me rn
   \\ ~ /
    ~~~
   SPINNING!
\`\`\`

Did you know this is a classic Google easter egg? I couldn't resist adding it here too.`,

			`*spins dramatically* 🎡

\`\`\`
  ╭──────────╮
  │  BARREL  │  ←───╮
  │   ROLL   │      │ rotation
  ╰──────────╯  ────╯
\`\`\`

Aileron roll, technically, but who's counting?`,

			`🌀 WHEEEEE! I love a good spin!

\`\`\`
   ↻ ↻ ↻ ↻ ↻
  ╭─────────╮
  │ WHEEEEE │
  ╰─────────╯
   ↺ ↺ ↺ ↺ ↺
\`\`\`

Thanks for the ride! Want to go again?`,

			`*does a flip* 🎢 Nailed it!

\`\`\`
      🎢
     /  \\
    /    \\
   ↺      ↻
  BARREL ROLL
   COMPLETE!
\`\`\`

10/10 execution. The judges are impressed.`
		];
		return responses[Math.floor(Math.random() * responses.length)];
	}

	function getShipItResponse(): string {
		const responses = [
			`🚀 TO THE MOON!

\`\`\`
        🌙
       *  *
      *    *
     🚀
    /|\\
   / | \\
  /  |  \\
 ────┴────
  LIFTOFF!
\`\`\`

That's the spirit - ship it and iterate!`,

			`🚀 SHIPPED!

\`\`\`
  ╔═══════════════╗
  ║  DEPLOYMENT   ║
  ║    STATUS:    ║
  ║  ✓ SUCCESS    ║
  ╚═══════════════╝
\`\`\`

Remember: done is better than perfect. Let's gooo!`,

			`*deploys to production* 🚀

\`\`\`
  ┌─────────────┐
  │ git push    │
  │ origin main │
  └──────┬──────┘
         │
         ▼
     🚀 SHIPPED!
\`\`\`

It's live, baby! No ragrets!`,

			`🚀 Houston, we have liftoff!

\`\`\`
     *  .  *
   .    🚀    .
  *   /    \\   *
     / SHIP \\
    /   IT   \\
   ────────────
\`\`\`

Another successful deployment! The code is in orbit!`
		];
		return responses[Math.floor(Math.random() * responses.length)];
	}

	function getPartyModeResponse(): string {
		const responses = [
			`🎉 PARTY TIME!

\`\`\`
  🎊  *  🎈  *  🎊
    \\  |  /
  *──PARTY──*
    /  |  \\
  🎈  *  🎊  *  🎈
\`\`\`

Let the confetti rain! Sometimes you just gotta celebrate the little wins.`,

			`🎊 WOOHOO!

\`\`\`
  ╔═══════════════════╗
  ║ 🎉 PARTY MODE 🎉 ║
  ║    ACTIVATED!     ║
  ╚═══════════════════╝
       🎈 🎊 🎈
\`\`\`

*throws confetti everywhere* Life's too short not to party!`,

			`🥳 IT'S A PARTY!

\`\`\`
    🎈     🎈
   /|\\   /|\\
  🎉│🎉 🎊│🎊
    │     │
   💃    🕺
  DANCE FLOOR
\`\`\`

Dancing is optional but highly encouraged!`,

			`🎉 CELEBRATION MODE!

\`\`\`
  *  🎊  *  🎈  *
   \\ \\|/ /
    \\═══/
     ║🎉║
     ║🎉║
    /═══\\
   / /|\\ \\
  *  🎈  *  🎊  *
\`\`\`

Quick, look busy... I mean, look like you're celebrating!`
		];
		return responses[Math.floor(Math.random() * responses.length)];
	}

	function getMatrixResponse(): string {
		const responses = [
			`🟢 Welcome to the Matrix.

\`\`\`
  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  ░ Wake up, Neo...           ░
  ░ The Matrix has you...     ░
  ░ Follow the white rabbit.  ░
  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
       01001101 01000001
       01010100 01010010
       01001001 01011000
\`\`\`

There is no spoon. But there ARE easter eggs.`,

			`🐇 Follow the white rabbit...

\`\`\`
   ╔══════════════════════════╗
   ║  THE MATRIX HAS YOU...   ║
   ║                          ║
   ║   > Take the red pill    ║
   ║     Take the blue pill   ║
   ╚══════════════════════════╝
        (\\(\\
        ( -.-)  ← white rabbit
        o_(")(")
\`\`\`

You chose the red pill. Welcome to the real world.`,

			`🖥️ System breach detected...

\`\`\`
  01001000 01000101 01001100
  01001100 01001111 00100000
  01001110 01000101 01001111

  > Accessing mainframe...
  > Decrypting reality...
  > WELCOME TO THE MATRIX
\`\`\`

I know Kung Fu. Well, I know JavaScript. Close enough.`
		];
		return responses[Math.floor(Math.random() * responses.length)];
	}

	function getMeaningOfLifeResponse(): string {
		const responses = [
			`🌌 Ah, the ultimate question...

\`\`\`
  ╔═══════════════════════════════════╗
  ║                                   ║
  ║              42                   ║
  ║                                   ║
  ╚═══════════════════════════════════╝
\`\`\`

The answer to Life, the Universe, and Everything.

*"I checked it very thoroughly,"* said the computer, *"and that quite definitely is the answer."*

— The Hitchhiker's Guide to the Galaxy`,

			`🤔 Computing the answer to Life, the Universe, and Everything...

\`\`\`
  Processing: ████████████████ 100%

  Result:
  ┌─────────────────────────┐
  │                         │
  │     >>> 42 <<<          │
  │                         │
  └─────────────────────────┘
\`\`\`

The problem, of course, is that we never really knew the question.

*Don't Panic.* 🐬`,

			`✨ After 7.5 million years of computation...

\`\`\`
       *    .  *       *
    .    *        .        .
  .   ╔═════════════════╗   *
     *║   ANSWER: 42    ║  .
  .   ╚═════════════════╝    .
    *     .    *    .     *
       .      *       .
\`\`\`

*"Forty-two!"* yelled Loonquawl. *"Is that all you've got to show for seven and a half million years' work?"*

*"I checked it very thoroughly,"* said Deep Thought. *"The Answer is definitely Forty-Two."*`
		];
		return responses[Math.floor(Math.random() * responses.length)];
	}

	function getSudoSandwichResponse(): string {
		const responses = [
			`🥪 Okay.

\`\`\`
  $ sudo make me a sandwich
  [sudo] password for user: ********

  ┌─────────────────────────────┐
  │ ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋ │  ← bread
  │ 🥬🥬🥬🥬🥬🥬🥬🥬🥬🥬🥬🥬 │  ← lettuce
  │ 🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅 │  ← tomato
  │ 🧀🧀🧀🧀🧀🧀🧀🧀🧀🧀🧀🧀 │  ← cheese
  │ 🥓🥓🥓🥓🥓🥓🥓🥓🥓🥓🥓🥓 │  ← bacon
  │ ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋ │  ← bread
  └─────────────────────────────┘

  Sandwich created successfully.
\`\`\`

You DID say sudo... 🤷`,

			`🥪 Permission granted.

\`\`\`
  ╭──────────────────────────────╮
  │    SANDWICH CONSTRUCTION     │
  │         IN PROGRESS          │
  ├──────────────────────────────┤
  │  [████████████████] 100%     │
  │                              │
  │  Ingredients loaded:         │
  │  ✓ Bread (artisan)           │
  │  ✓ Mystery meat              │
  │  ✓ Questionable cheese       │
  │  ✓ Existential lettuce       │
  ╰──────────────────────────────╯
\`\`\`

Here you go. One sandwich, made with ROOT privileges.`,

			`🥪 As you wish.

\`\`\`
        ____________________
       /                    \\
      |  ==================  |
      |  ~~~~~~~~~~~~~~~~~~  |
      |  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  |
      |  ==================  |
       \\____________________/

  $ whoami
  sandwich_maker
\`\`\`

Remember: with great power comes great sandwiches.`
		];
		return responses[Math.floor(Math.random() * responses.length)];
	}

	function getHelloWorldResponse(): string {
		const responses = [
			`👋 Hello, World!

\`\`\`
  ╔══════════════════════════════════════╗
  ║                                      ║
  ║   console.log("Hello, World!");      ║
  ║   print("Hello, World!")             ║
  ║   System.out.println("Hello!");      ║
  ║   fmt.Println("Hello, World!")       ║
  ║   puts "Hello, World!"               ║
  ║                                      ║
  ╚══════════════════════════════════════╝
\`\`\`

The sacred first words of every programmer. Welcome, fellow coder!

You've just initialized a beautiful friendship. 🤝`,

			`🌍 Hello, World!

\`\`\`
  ┌────────────────────────────────┐
  │  PROGRAM: hello_world          │
  │  STATUS: Running               │
  │  OUTPUT:                       │
  │  ┌──────────────────────────┐  │
  │  │  > Hello, World!         │  │
  │  │  > Process exited (0)    │  │
  │  └──────────────────────────┘  │
  └────────────────────────────────┘
\`\`\`

The most written, most copied, most celebrated two words in programming history.

Welcome to StratAI! Your journey begins here. 🚀`,

			`👨‍💻 *beep boop*

\`\`\`
     _   _      _ _
    | | | |    | | |
    | |_| | ___| | | ___
    |  _  |/ _ \\ | |/ _ \\
    | | | |  __/ | | (_) |
    \\_| |_/\\___|_|_|\\___/

    __        __         _     _
    \\ \\      / /__  _ __| | __| |
     \\ \\ /\\ / / _ \\| '__| |/ _\` |
      \\ V  V / (_) | |  | | (_| |
       \\_/\\_/ \\___/|_|  |_|\\__,_|
\`\`\`

The tradition continues! Every great codebase starts here.

Fun fact: "Hello World" first appeared in a 1972 C tutorial. You're part of history! 📜`
		];
		return responses[Math.floor(Math.random() * responses.length)];
	}

	function getLocalhostResponse(): string {
		const responses = [
			`🏠 There's no place like home.

\`\`\`
  ╔═══════════════════════════════════╗
  ║                                   ║
  ║   🏠 127.0.0.1 🏠                ║
  ║      localhost                    ║
  ║      ::1                          ║
  ║                                   ║
  ║   Home is where the server is.    ║
  ║                                   ║
  ╚═══════════════════════════════════╝
\`\`\`

*clicks ruby slippers together*

No latency, no firewalls, no DNS issues. Just pure, local bliss.`,

			`🌐 Home sweet home.

\`\`\`
  $ ping 127.0.0.1
  PING 127.0.0.1: 64 bytes
  ────────────────────────
  time=0.000ms  ← instant!
  time=0.000ms  ← still instant!
  time=0.000ms  ← you get the idea

  --- localhost statistics ---
  0% packet loss
  ∞% cozy vibes
\`\`\`

Where every request is a round-trip to yourself. Very zen. 🧘`,

			`💻 127.0.0.1 — The loopback address.

\`\`\`
  ┌─────────────────────────────┐
  │  NETWORK TOPOLOGY           │
  │                             │
  │    Internet                 │
  │       │                     │
  │    Router ← scary out here  │
  │       │                     │
  │    [YOU] ←── 127.0.0.1      │
  │     🏠 (safe zone)          │
  └─────────────────────────────┘
\`\`\`

*There's no place like 127.0.0.1* — The Wizard of Oz, developer edition.`
		];
		return responses[Math.floor(Math.random() * responses.length)];
	}

	// Coin flip state for dynamic response
	let lastCoinFlipResult = $state<'heads' | 'tails' | null>(null);

	/**
	 * Easter egg: Flip a coin - actually useful AND fun!
	 */
	function triggerCoinFlip() {
		const isFirstTime = easterEggsStore.discover('coin-flip');
		lastCoinFlipResult = Math.random() < 0.5 ? 'heads' : 'tails';

		// Create floating coin animation
		const coin = document.createElement('div');
		coin.className = 'coin-flip-animation';
		coin.innerHTML = lastCoinFlipResult === 'heads' ? '🪙' : '🪙';
		document.body.appendChild(coin);

		// Remove after animation
		setTimeout(() => {
			coin.remove();
		}, 1500);

		if (isFirstTime) {
			toastStore.discovery('You found the coin flip! A handy decision maker.', 3000);
		}
	}

	function getCoinFlipResponse(): string {
		const result = lastCoinFlipResult || (Math.random() < 0.5 ? 'heads' : 'tails');
		const isHeads = result === 'heads';

		const headsPhrases = [
			'**HEADS!** 🪙\n\n*The coin spins through the air and lands face-up.*',
			'**HEADS!** 🪙\n\n*A decisive flip reveals the head side.*',
			'**HEADS!** 🪙\n\n*The universe has spoken. Heads it is!*'
		];

		const tailsPhrases = [
			'**TAILS!** 🪙\n\n*The coin flips gracefully and settles on tails.*',
			'**TAILS!** 🪙\n\n*A crisp flip reveals the tail side.*',
			'**TAILS!** 🪙\n\n*Fortune favors tails today!*'
		];

		const phrases = isHeads ? headsPhrases : tailsPhrases;
		return phrases[Math.floor(Math.random() * phrases.length)];
	}

	/**
	 * Easter egg: Trigger a barrel roll animation on the chat container
	 */
	function triggerBarrelRoll() {
		const isFirstTime = easterEggsStore.discover('barrel-roll');

		// Find the main content area and apply barrel roll
		const mainContent = document.querySelector('.chat-messages-container') ||
		                    document.querySelector('main') ||
		                    document.body;

		if (mainContent) {
			mainContent.classList.add('barrel-roll');
			setTimeout(() => {
				mainContent.classList.remove('barrel-roll');
			}, 1000);
		}

		// Show toast after animation
		setTimeout(() => {
			if (isFirstTime) {
				toastStore.discovery('Wheeee! You found the barrel roll!', 3000);
			} else {
				toastStore.info('Here we go again!', 2000);
			}
		}, 500);
	}

	/**
	 * Easter egg: Launch a rocket animation when user types "ship it"
	 */
	function triggerShipIt() {
		const isFirstTime = easterEggsStore.discover('ship-it');

		// Create rocket container
		const container = document.createElement('div');
		container.className = 'ship-it-container';
		container.innerHTML = `
			<div class="ship-it-rocket">🚀</div>
			<div class="ship-it-particle"></div>
			<div class="ship-it-particle"></div>
			<div class="ship-it-particle"></div>
			<div class="ship-it-particle"></div>
			<div class="ship-it-particle"></div>
			<div class="ship-it-particle"></div>
		`;
		document.body.appendChild(container);

		// Add screen shake
		document.body.classList.add('ship-it-shake');
		setTimeout(() => {
			document.body.classList.remove('ship-it-shake');
		}, 400);

		// Remove container after animation
		setTimeout(() => {
			container.remove();
		}, 1600);

		// Show toast
		if (isFirstTime) {
			toastStore.discovery('SHIP IT! 🚀 You found the rocket launch!', 4000);
		} else {
			const messages = [
				'To infinity and beyond!',
				'Houston, we have liftoff!',
				'Deploying to production!',
				'🚀 Shipped!',
				'Full send!'
			];
			const message = messages[Math.floor(Math.random() * messages.length)];
			toastStore.success(message, 3000);
		}
	}

	/**
	 * Easter egg: Enable party mode with confetti!
	 */
	function triggerPartyMode() {
		const isFirstTime = easterEggsStore.discover('party-mode');

		// Trigger confetti via the store (rendered in layout)
		easterEggsStore.triggerConfetti();

		// Show toast
		if (isFirstTime) {
			toastStore.discovery('🎉 PARTY MODE ACTIVATED! You found the celebration!', 4000);
		} else {
			const messages = [
				'🎊 Party time!',
				'🎉 Let\'s celebrate!',
				'🥳 Woohoo!',
				'🎈 Party on!',
				'✨ Time to celebrate!'
			];
			const message = messages[Math.floor(Math.random() * messages.length)];
			toastStore.success(message, 3000);
		}
	}

	/**
	 * Easter egg: Show Matrix rain effect
	 */
	function triggerMatrixRain() {
		const isFirstTime = easterEggsStore.discover('matrix-rain');

		// Trigger matrix rain via the store (rendered in layout)
		easterEggsStore.triggerMatrixRain();

		// Show toast
		if (isFirstTime) {
			toastStore.discovery('🟢 You found the Matrix! Follow the white rabbit...', 4000);
		} else {
			toastStore.success('Welcome back to the Matrix.', 3000);
		}
	}

	/**
	 * Easter egg: Hello World - the classic programmer greeting
	 */
	function triggerHelloWorld() {
		const isFirstTime = easterEggsStore.discover('hello-world');

		// Subtle celebration for the classic
		if (isFirstTime) {
			toastStore.discovery('👋 You speak the ancient tongue! Welcome, fellow coder.', 4000);
		} else {
			toastStore.info('Hello again, friend!', 2000);
		}
	}

	function handleFileUpload(file: FileAttachment) {
		pendingAttachments = [...pendingAttachments, file];
	}

	function removeAttachment(id: string) {
		pendingAttachments = pendingAttachments.filter(a => a.id !== id);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && settingsStore.sendOnEnter) {
			e.preventDefault();
			handleSubmit();
		}
	}

	function autoResize() {
		if (textarea) {
			textarea.style.height = 'auto';
			textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
		}
	}

	function handleStop() {
		onstop?.();
	}

	// Prompt optimization handlers
	function handleOptimizedPrompt(optimizedText: string) {
		input = optimizedText;
		setTimeout(() => {
			autoResize();
			textarea?.focus();
		}, 0);
	}

	function handleUndoOptimization(originalText: string) {
		input = originalText;
		setTimeout(() => {
			autoResize();
			textarea?.focus();
		}, 0);
	}

	// Upload a file (shared by click upload and drag-drop)
	async function uploadFile(file: File): Promise<void> {
		if (disabled || chatStore.isStreaming || isUploading) return;

		// Check if trying to upload image when model doesn't support vision
		if (isImageFile(file) && !supportsVision) {
			toastStore.warning(`${modelName} doesn't support image analysis. Please select a vision-capable model or use a document file.`);
			return;
		}

		// Validate file type
		const extension = '.' + file.name.split('.').pop()?.toLowerCase();
		const isValidExtension = ACCEPTED_EXTENSIONS.includes(extension);
		const isValidMime = ACCEPTED_MIME_TYPES.includes(file.type) || file.type === '';

		if (!isValidExtension && !isValidMime) {
			const acceptedTypes = supportsVision
				? 'PDF, DOCX, TXT, MD, CSV, JSON, JPG, PNG, GIF, WebP'
				: 'PDF, DOCX, TXT, MD, CSV, JSON';
			toastStore.error(`Unsupported file type. Accepted: ${acceptedTypes}`);
			return;
		}

		isUploading = true;

		try {
			const formData = new FormData();
			formData.append('file', file);

			const response = await fetch('/api/upload', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (!response.ok || result.error) {
				throw new Error(result.error?.message || 'Upload failed');
			}

			// Success - add to pending attachments
			pendingAttachments = [...pendingAttachments, result as FileAttachment];
			toastStore.success(`${file.name} attached`);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to upload file';
			toastStore.error(message);
			console.error('Upload error:', err);
		} finally {
			isUploading = false;
		}
	}

	// Drag and drop handlers
	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragCounter++;

		// Check if dragging files
		if (e.dataTransfer?.types.includes('Files')) {
			isDragging = true;
		}
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragCounter--;

		// Only hide drop zone when fully left the area
		if (dragCounter === 0) {
			isDragging = false;
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'copy';
		}
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;
		dragCounter = 0;

		if (disabled || chatStore.isStreaming) return;

		const files = e.dataTransfer?.files;
		if (!files || files.length === 0) return;

		// Process each dropped file
		for (const file of Array.from(files)) {
			await uploadFile(file);
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="chat-input-container border-t border-surface-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-surface-900/80 backdrop-blur-xl relative"
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
>
	<!-- Drop zone overlay -->
	{#if isDragging || isUploading}
		<div
			class="absolute inset-0 z-50 flex items-center justify-center
				   bg-gradient-to-b from-surface-900/98 to-surface-950/98 backdrop-blur-md
				   rounded-lg transition-all duration-300 animate-fadeIn"
		>
			<div class="text-center">
				{#if isUploading}
					<!-- Uploading state -->
					<div class="w-16 h-16 mx-auto mb-4 relative">
						<div class="absolute inset-0 rounded-full border-2 border-surface-700"></div>
						<div class="absolute inset-0 rounded-full border-2 border-primary-500 border-t-transparent animate-spin"></div>
						<div class="absolute inset-3 flex items-center justify-center">
							<svg class="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
							</svg>
						</div>
					</div>
					<p class="text-lg font-medium text-surface-200">Processing file...</p>
					<p class="text-sm text-surface-500 mt-1">Extracting content</p>
				{:else}
					<!-- Drag state -->
					<div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center border border-primary-500/30 animate-pulse-subtle">
						<svg class="w-10 h-10 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</div>
					<p class="text-lg font-medium text-surface-100">Drop to attach</p>
					<p class="text-sm text-surface-500 mt-2">
						{supportsVision ? 'Images, PDF, DOCX, TXT, MD, CSV, JSON' : 'PDF, DOCX, TXT, MD, CSV, JSON'}
					</p>
				{/if}
			</div>
		</div>
	{/if}

	<div class="max-w-4xl mx-auto">
		<!-- Input container with gradient border on focus -->
		<div
			class="relative rounded-2xl transition-all duration-300
				   {isFocused ? 'gradient-border shadow-glow' : ''}
				   {isDragging ? 'ring-2 ring-primary-500/50 ring-offset-2 ring-offset-surface-900' : ''}"
		>
			<div class="chat-input-field flex items-end gap-3 bg-surface-800 rounded-2xl p-3 {isFocused ? '' : 'border border-surface-700'}">
				<!-- File upload button -->
				<FileUploadButton
					disabled={disabled || chatStore.isStreaming}
					onupload={handleFileUpload}
				/>

				<div class="flex-1 relative">
					<!-- File preview above textarea -->
					{#if hasAttachments}
						<FilePreview attachments={pendingAttachments} onremove={removeAttachment} />
					{/if}

					<textarea
						bind:this={textarea}
						bind:value={input}
						onkeydown={handleKeydown}
						oninput={autoResize}
						onfocus={() => (isFocused = true)}
						onblur={() => (isFocused = false)}
						placeholder={effectivePlaceholder}
						rows="1"
						class="w-full bg-transparent text-surface-100 placeholder-surface-500
							   resize-none focus:outline-none leading-relaxed"
						disabled={disabled || chatStore.isStreaming}
					></textarea>
				</div>

				<!-- Actions -->
				<div class="flex items-center gap-2">
					<!-- Summarize Button (only shown when 6+ messages) -->
					{#if showSummarizeButton}
						<div class="relative group">
							<SummarizeButton
								disabled={disabled || chatStore.isStreaming}
								isGenerating={isGeneratingSummary}
								{hasSummary}
								onclick={() => onsummarize?.()}
							/>
						</div>
					{/if}

					<!-- Prompt Optimize Button -->
					<div class="relative group">
						<PromptOptimizeButton
							inputText={input}
							disabled={disabled || chatStore.isStreaming}
							onoptimize={handleOptimizedPrompt}
							onundo={handleUndoOptimization}
						/>
					</div>

					<!-- Extended Thinking Toggle (for Claude models) -->
					<div class="relative group">
						<ThinkingToggle disabled={disabled || chatStore.isStreaming} />
					</div>

					<!-- Web Search Toggle (only shown when feature is enabled AND model supports tools) -->
					{#if webSearchFeatureEnabled && modelSupportsTools}
						<div class="relative group">
							<SearchToggle disabled={disabled || chatStore.isStreaming} />
						</div>
					{/if}

					{#if chatStore.isStreaming}
						<button
							type="button"
							onclick={handleStop}
							class="flex items-center justify-center w-10 h-10 rounded-xl
								   bg-red-600 hover:bg-red-700 text-white
								   transition-all duration-200 hover:scale-105"
							title="Stop generating"
						>
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
								<rect x="6" y="6" width="12" height="12" rx="2" />
							</svg>
						</button>
					{:else}
						<button
							type="button"
							onclick={handleSubmit}
							disabled={!canSend || isSending}
							class="flex items-center justify-center w-10 h-10 rounded-xl
								   transition-all duration-200
								   {canSend && !isSending
									? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white hover:scale-105 shadow-glow-sm'
									: 'bg-surface-700 text-surface-500 cursor-not-allowed'}"
							title="Send message"
						>
							{#if isSending}
								<svg class="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
							{:else}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
									/>
								</svg>
							{/if}
						</button>
					{/if}
				</div>
			</div>
		</div>

		<!-- Footer hints -->
		<div class="flex items-center justify-between mt-2 px-1">
			<div class="flex items-center gap-4 text-xs text-surface-500">
				{#if !chatStore.isStreaming}
					<span>
						<kbd class="px-1.5 py-0.5 bg-surface-800 rounded text-surface-400">Enter</kbd> to send
					</span>
					{#if thinkingEnabled}
						<span class="flex items-center gap-1.5 text-amber-400">
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
							</svg>
							Extended thinking
						</span>
					{/if}
					{#if webSearchFeatureEnabled && searchEnabled}
						<span class="flex items-center gap-1.5 text-primary-400">
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
							</svg>
							Web search
						</span>
					{/if}
					{#if !thinkingEnabled && !(webSearchFeatureEnabled && searchEnabled)}
						<span>
							<kbd class="px-1.5 py-0.5 bg-surface-800 rounded text-surface-400">Shift+Enter</kbd> new line
						</span>
					{/if}
				{:else}
					<span class="streaming-status flex items-center gap-2.5">
						<span class="status-orb">
							<span class="orb-core"></span>
							<span class="orb-ring"></span>
						</span>
						<span class="status-text">Generating response</span>
						<span class="status-dots">
							<span></span><span></span><span></span>
						</span>
					</span>
				{/if}
			</div>

			<!-- Right side: Context indicator or char count -->
			<div class="flex items-center gap-3">
				{#if showContextIndicator}
					<ContextIndicator
						usagePercent={contextUsagePercent}
						{estimatedTokens}
						{contextWindowSize}
						{isCompacting}
						oncompact={() => oncompact?.()}
						disabled={disabled || chatStore.isStreaming}
					/>
				{/if}
				{#if charCount > 0}
					<span class="text-xs text-surface-500">{charCount} chars</span>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	/* Drop zone animations */
	.animate-fadeIn {
		animation: fadeIn 0.2s ease-out forwards;
	}

	.animate-pulse-subtle {
		animation: pulseSublte 2s ease-in-out infinite;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes pulseSublte {
		0%, 100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.02);
			opacity: 0.9;
		}
	}

	/* Streaming status indicator */
	.streaming-status {
		padding: 4px 10px 4px 6px;
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(20, 184, 166, 0.08));
		border: 1px solid rgba(34, 197, 94, 0.2);
		border-radius: 20px;
	}

	.status-orb {
		position: relative;
		width: 14px;
		height: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.orb-core {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: linear-gradient(135deg, #22c55e, #14b8a6);
		box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
		animation: orbPulse 2s ease-in-out infinite;
	}

	.orb-ring {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		border: 1.5px solid rgba(34, 197, 94, 0.4);
		animation: ringExpand 2s ease-out infinite;
	}

	.status-text {
		font-size: 12px;
		font-weight: 500;
		background: linear-gradient(90deg, #22c55e, #14b8a6);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.status-dots {
		display: flex;
		gap: 3px;
	}

	.status-dots span {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: #22c55e;
		opacity: 0.4;
		animation: dotPulse 1.4s ease-in-out infinite;
	}

	.status-dots span:nth-child(1) { animation-delay: 0s; }
	.status-dots span:nth-child(2) { animation-delay: 0.15s; }
	.status-dots span:nth-child(3) { animation-delay: 0.3s; }

	@keyframes orbPulse {
		0%, 100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.15);
		}
	}

	@keyframes ringExpand {
		0% {
			transform: scale(0.8);
			opacity: 0.6;
		}
		100% {
			transform: scale(1.8);
			opacity: 0;
		}
	}

	@keyframes dotPulse {
		0%, 60%, 100% {
			transform: translateY(0);
			opacity: 0.4;
		}
		30% {
			transform: translateY(-3px);
			opacity: 1;
		}
	}
</style>
