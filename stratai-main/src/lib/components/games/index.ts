/**
 * Games Components
 *
 * Mini-games for quick dopamine hits between tasks.
 * Accessible via Command Palette (⌘K).
 */

// Snake
export { default as SnakeGame } from './SnakeGame.svelte';
export { default as SnakeCanvas } from './SnakeCanvas.svelte';
export { default as SnakeLeaderboard } from './SnakeLeaderboard.svelte';

// Wordle
export { default as WordleGame } from './WordleGame.svelte';
export { default as WordleBoard } from './WordleBoard.svelte';
export { default as WordleKeyboard } from './WordleKeyboard.svelte';
export * from './wordle-words';
