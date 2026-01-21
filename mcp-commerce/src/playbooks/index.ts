/**
 * Playbooks Module - Discovery-First Commerce Automation
 *
 * This module provides:
 * - Type definitions for site playbooks
 * - Storage functions for loading/saving playbooks
 *
 * @see docs/DISCOVERY_FIRST_ARCHITECTURE.md
 */

// Type exports
export type {
  // Core types
  SitePlaybook,
  ElementSelector,
  BoundingBox,

  // Authentication
  AuthConfig,

  // Flows
  Flow,
  FlowStep,
  FlowAction,
  FailureStrategy,

  // Configuration
  SearchConfig,
  ProductPageConfig,
  CartConfig,
  CheckoutConfig,
  PopupPattern,

  // Discovery
  DiscoverySession,
  DiscoveryStatus,
  DiscoveryProgress,
  DiscoveryScreenshot,
  DiscoveryError,

  // Validation
  SelectorValidation,
  PlaybookValidation,
} from './types.js';

// Store exports
export {
  // Loading
  loadCurrentPlaybook,
  loadPlaybookVersion,
  listPlaybookVersions,
  getCurrentVersion,

  // Saving
  savePlaybook,
  setCurrentVersion,
  getNextVersion,

  // Screenshots
  saveScreenshot,
  loadScreenshot,
  listScreenshots,

  // Validation
  updateValidation,

  // Initialization
  initializeStore,
  getPlaybooksDir,
  createIndex,
} from './store.js';
