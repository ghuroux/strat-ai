/**
 * Discovery Module - AI-powered site exploration
 *
 * This module exports the DiscoveryAgent and related utilities
 * for discovering e-commerce site structure and generating playbooks.
 *
 * @see docs/DISCOVERY_FIRST_ARCHITECTURE.md
 */

export { DiscoveryAgent } from './agent.js';
export type { DiscoveryOptions, DiscoveryResult } from './agent.js';

export {
  DISCOVERY_SYSTEM_PROMPT,
  DISCOVERY_TOOLS,
  getDiscoveryPrompt,
  buildDiscoveryMessage,
} from './prompts.js';

export {
  detectAuthState,
  discoverAuthConfig,
  discoverLoginForm,
  discoverLoggedInIndicators,
  discoverLoggedOutIndicators,
  findWorkingSelector,
} from './flows/auth.js';
