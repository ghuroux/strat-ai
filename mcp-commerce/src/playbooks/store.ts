/**
 * Playbook Store - Load/Save Playbooks from Disk
 *
 * Manages versioned playbooks stored in /playbooks/{siteId}/{version}/
 * Each version contains:
 *   - playbook.json: The playbook data
 *   - screenshots/: Element screenshots
 *
 * The "current" symlink points to the active version.
 *
 * @see docs/DISCOVERY_FIRST_ARCHITECTURE.md
 */

import { readFile, writeFile, mkdir, readdir, symlink, unlink, lstat, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import type { SitePlaybook, PlaybookValidation } from './types';
import type { SiteId } from '../types';

// ============================================================================
// Configuration
// ============================================================================

/** Base directory for playbook storage */
const PLAYBOOKS_DIR = join(dirname(dirname(__dirname)), 'playbooks');

/** Playbook filename within version directory */
const PLAYBOOK_FILENAME = 'playbook.json';

/** Screenshots subdirectory name */
const SCREENSHOTS_DIR = 'screenshots';

/** Current version symlink name */
const CURRENT_LINK = 'current';

// ============================================================================
// Directory Helpers
// ============================================================================

/**
 * Get path to a site's playbook directory
 */
function getSiteDir(siteId: SiteId): string {
  return join(PLAYBOOKS_DIR, siteId);
}

/**
 * Get path to a specific version directory
 */
function getVersionDir(siteId: SiteId, version: string): string {
  return join(getSiteDir(siteId), `v${version}`);
}

/**
 * Get path to the current version symlink
 */
function getCurrentLink(siteId: SiteId): string {
  return join(getSiteDir(siteId), CURRENT_LINK);
}

/**
 * Get path to playbook.json for a version
 */
function getPlaybookPath(siteId: SiteId, version: string): string {
  return join(getVersionDir(siteId, version), PLAYBOOK_FILENAME);
}

/**
 * Get path to screenshots directory for a version
 */
function getScreenshotsDir(siteId: SiteId, version: string): string {
  return join(getVersionDir(siteId, version), SCREENSHOTS_DIR);
}

/**
 * Ensure directory exists
 */
async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

// ============================================================================
// Playbook Loading
// ============================================================================

/**
 * Load the current (active) playbook for a site
 * Returns null if no playbook exists
 */
export async function loadCurrentPlaybook(siteId: SiteId): Promise<SitePlaybook | null> {
  const currentLink = getCurrentLink(siteId);

  // Check if current symlink exists
  if (!existsSync(currentLink)) {
    console.log(`[PlaybookStore] No current playbook for ${siteId}`);
    return null;
  }

  try {
    // Read the symlink to get version
    const linkStats = await lstat(currentLink);
    if (!linkStats.isSymbolicLink() && !linkStats.isDirectory()) {
      console.error(`[PlaybookStore] ${currentLink} is not a symlink or directory`);
      return null;
    }

    // Read playbook.json from current directory
    const playbookPath = join(currentLink, PLAYBOOK_FILENAME);
    const content = await readFile(playbookPath, 'utf-8');
    const playbook = JSON.parse(content) as SitePlaybook;

    console.log(`[PlaybookStore] Loaded playbook ${siteId} v${playbook.version}`);
    return playbook;
  } catch (error) {
    console.error(`[PlaybookStore] Error loading playbook for ${siteId}:`, error);
    return null;
  }
}

/**
 * Load a specific version of a playbook
 */
export async function loadPlaybookVersion(
  siteId: SiteId,
  version: string
): Promise<SitePlaybook | null> {
  const playbookPath = getPlaybookPath(siteId, version);

  if (!existsSync(playbookPath)) {
    console.log(`[PlaybookStore] Playbook ${siteId} v${version} not found`);
    return null;
  }

  try {
    const content = await readFile(playbookPath, 'utf-8');
    return JSON.parse(content) as SitePlaybook;
  } catch (error) {
    console.error(`[PlaybookStore] Error loading playbook ${siteId} v${version}:`, error);
    return null;
  }
}

/**
 * List all available versions for a site
 */
export async function listPlaybookVersions(siteId: SiteId): Promise<string[]> {
  const siteDir = getSiteDir(siteId);

  if (!existsSync(siteDir)) {
    return [];
  }

  try {
    const entries = await readdir(siteDir, { withFileTypes: true });
    const versions: string[] = [];

    for (const entry of entries) {
      // Version directories start with 'v'
      if ((entry.isDirectory() || entry.isSymbolicLink()) && entry.name.startsWith('v')) {
        versions.push(entry.name.slice(1)); // Remove 'v' prefix
      }
    }

    // Sort by semver (newest first)
    return versions.sort((a, b) => {
      const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
      const [bMajor, bMinor, bPatch] = b.split('.').map(Number);

      if (aMajor !== bMajor) return bMajor - aMajor;
      if (aMinor !== bMinor) return bMinor - aMinor;
      return bPatch - aPatch;
    });
  } catch (error) {
    console.error(`[PlaybookStore] Error listing versions for ${siteId}:`, error);
    return [];
  }
}

/**
 * Get the current version string for a site
 */
export async function getCurrentVersion(siteId: SiteId): Promise<string | null> {
  const playbook = await loadCurrentPlaybook(siteId);
  return playbook?.version ?? null;
}

// ============================================================================
// Playbook Saving
// ============================================================================

/**
 * Save a new playbook version
 * Optionally sets it as the current version
 */
export async function savePlaybook(
  playbook: SitePlaybook,
  setAsCurrent: boolean = true
): Promise<void> {
  const { siteId, version } = playbook;
  const versionDir = getVersionDir(siteId, version);
  const screenshotsDir = getScreenshotsDir(siteId, version);
  const playbookPath = getPlaybookPath(siteId, version);

  // Ensure directories exist
  await ensureDir(versionDir);
  await ensureDir(screenshotsDir);

  // Update timestamps
  const now = new Date().toISOString();
  playbook.updatedAt = now;
  if (!playbook.createdAt) {
    playbook.createdAt = now;
  }

  // Ensure ID exists
  if (!playbook.id) {
    playbook.id = randomUUID();
  }

  // Write playbook JSON
  await writeFile(playbookPath, JSON.stringify(playbook, null, 2), 'utf-8');
  console.log(`[PlaybookStore] Saved playbook ${siteId} v${version}`);

  // Set as current if requested
  if (setAsCurrent) {
    await setCurrentVersion(siteId, version);
  }
}

/**
 * Set the current version for a site
 */
export async function setCurrentVersion(siteId: SiteId, version: string): Promise<void> {
  const currentLink = getCurrentLink(siteId);
  const versionDir = getVersionDir(siteId, version);

  // Verify version exists
  if (!existsSync(versionDir)) {
    throw new Error(`Version ${version} does not exist for ${siteId}`);
  }

  // Remove existing symlink if present
  if (existsSync(currentLink)) {
    await unlink(currentLink);
  }

  // Create new symlink (relative path for portability)
  await symlink(`v${version}`, currentLink);
  console.log(`[PlaybookStore] Set current ${siteId} -> v${version}`);
}

/**
 * Generate the next version number
 * Increments patch version by default
 */
export async function getNextVersion(
  siteId: SiteId,
  incrementType: 'major' | 'minor' | 'patch' = 'patch'
): Promise<string> {
  const versions = await listPlaybookVersions(siteId);

  if (versions.length === 0) {
    return '1.0.0';
  }

  const current = versions[0]; // Already sorted newest first
  const [major, minor, patch] = current.split('.').map(Number);

  switch (incrementType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

// ============================================================================
// Screenshot Management
// ============================================================================

/**
 * Save a screenshot for a playbook
 * Returns the relative filename
 */
export async function saveScreenshot(
  siteId: SiteId,
  version: string,
  name: string,
  imageBuffer: Buffer
): Promise<string> {
  const screenshotsDir = getScreenshotsDir(siteId, version);
  await ensureDir(screenshotsDir);

  // Sanitize filename
  const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  const filename = `${safeName}.jpg`;
  const filepath = join(screenshotsDir, filename);

  await writeFile(filepath, imageBuffer);
  console.log(`[PlaybookStore] Saved screenshot ${filename}`);

  return filename;
}

/**
 * Load a screenshot as base64
 */
export async function loadScreenshot(
  siteId: SiteId,
  version: string,
  filename: string
): Promise<string | null> {
  const filepath = join(getScreenshotsDir(siteId, version), filename);

  if (!existsSync(filepath)) {
    return null;
  }

  try {
    const buffer = await readFile(filepath);
    return buffer.toString('base64');
  } catch (error) {
    console.error(`[PlaybookStore] Error loading screenshot ${filename}:`, error);
    return null;
  }
}

/**
 * List all screenshots for a playbook version
 */
export async function listScreenshots(siteId: SiteId, version: string): Promise<string[]> {
  const screenshotsDir = getScreenshotsDir(siteId, version);

  if (!existsSync(screenshotsDir)) {
    return [];
  }

  try {
    const entries = await readdir(screenshotsDir);
    return entries.filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
  } catch (error) {
    console.error(`[PlaybookStore] Error listing screenshots:`, error);
    return [];
  }
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Update playbook with validation result
 */
export async function updateValidation(
  siteId: SiteId,
  validation: PlaybookValidation
): Promise<void> {
  const playbook = await loadCurrentPlaybook(siteId);
  if (!playbook) {
    throw new Error(`No current playbook for ${siteId}`);
  }

  playbook.lastValidatedAt = validation.timestamp;
  playbook.lastValidationResult = {
    passed: validation.passed,
    failedSelectors: validation.selectorResults
      .filter(r => !r.primaryValid)
      .map(r => r.path),
    timestamp: validation.timestamp,
  };

  await savePlaybook(playbook, true);
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize playbook storage directories
 */
export async function initializeStore(): Promise<void> {
  await ensureDir(PLAYBOOKS_DIR);
  console.log(`[PlaybookStore] Initialized at ${PLAYBOOKS_DIR}`);
}

/**
 * Get playbooks directory path
 */
export function getPlaybooksDir(): string {
  return PLAYBOOKS_DIR;
}

// ============================================================================
// Export Index
// ============================================================================

/**
 * Create an index file exporting all playbook types
 */
export async function createIndex(siteId: SiteId): Promise<void> {
  const siteDir = getSiteDir(siteId);
  const indexPath = join(siteDir, 'index.json');

  const versions = await listPlaybookVersions(siteId);
  const currentVersion = await getCurrentVersion(siteId);

  const index = {
    siteId,
    currentVersion,
    versions,
    updatedAt: new Date().toISOString(),
  };

  await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
}
