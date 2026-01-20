/**
 * Session Manager - Browser session pool with persistent contexts
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { BrowserSession, SiteId, SessionInfo } from './types.js';

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

export class SessionManager {
  private browser: Browser | null = null;
  private sessions: Map<string, BrowserSession> = new Map();
  private profilesDir: string;
  private headless: boolean;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options?: { headless?: boolean; profilesDir?: string }) {
    this.headless = options?.headless ?? (process.env.MCP_HEADLESS !== 'false');
    this.profilesDir = options?.profilesDir ??
      process.env.MCP_PROFILES_DIR ??
      join(homedir(), '.stratai', 'commerce-profiles');

    // Ensure profiles directory exists
    if (!existsSync(this.profilesDir)) {
      mkdirSync(this.profilesDir, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    if (this.browser) return;

    this.browser = await chromium.launch({
      headless: this.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleSessions();
    }, CLEANUP_INTERVAL_MS);

    console.log(`[SessionManager] Browser launched (headless: ${this.headless})`);
  }

  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all sessions
    for (const [id, session] of this.sessions) {
      try {
        await session.context.close();
        console.log(`[SessionManager] Closed session ${id}`);
      } catch (e) {
        // Ignore close errors
      }
    }
    this.sessions.clear();

    // Close browser
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('[SessionManager] Browser closed');
    }
  }

  /**
   * Get or create a session for a specific site
   */
  async getSession(site: SiteId, sessionId?: string): Promise<BrowserSession> {
    if (!this.browser) {
      await this.initialize();
    }

    // Try to find existing session
    if (sessionId) {
      const existing = this.sessions.get(sessionId);
      if (existing && existing.site === site) {
        existing.lastAccessedAt = new Date();
        return existing;
      }
    }

    // Create new session with persistent context
    const id = sessionId || `${site}-${randomUUID().slice(0, 8)}`;
    const profilePath = join(this.profilesDir, site);

    // Ensure site profile directory exists
    if (!existsSync(profilePath)) {
      mkdirSync(profilePath, { recursive: true });
    }

    const context = await chromium.launchPersistentContext(profilePath, {
      headless: this.headless,
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox'
      ]
    });

    const page = await context.newPage();

    const session: BrowserSession = {
      id,
      site,
      context,
      page,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      isAuthenticated: false
    };

    this.sessions.set(id, session);
    console.log(`[SessionManager] Created session ${id} for ${site}`);

    return session;
  }

  /**
   * Get session info without creating
   */
  getSessionInfo(sessionId: string): SessionInfo | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      site: session.site,
      createdAt: session.createdAt.toISOString(),
      lastAccessedAt: session.lastAccessedAt.toISOString(),
      isAuthenticated: session.isAuthenticated
    };
  }

  /**
   * List all active sessions
   */
  listSessions(): SessionInfo[] {
    return Array.from(this.sessions.values()).map(session => ({
      id: session.id,
      site: session.site,
      createdAt: session.createdAt.toISOString(),
      lastAccessedAt: session.lastAccessedAt.toISOString(),
      isAuthenticated: session.isAuthenticated
    }));
  }

  /**
   * Mark session as authenticated
   */
  setAuthenticated(sessionId: string, authenticated: boolean): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isAuthenticated = authenticated;
    }
  }

  /**
   * Close a specific session
   */
  async closeSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    try {
      await session.context.close();
      this.sessions.delete(sessionId);
      console.log(`[SessionManager] Closed session ${sessionId}`);
      return true;
    } catch (e) {
      console.error(`[SessionManager] Error closing session ${sessionId}:`, e);
      return false;
    }
  }

  /**
   * Cleanup idle sessions past TTL
   */
  private async cleanupIdleSessions(): Promise<void> {
    const now = Date.now();
    const ttl = Number(process.env.MCP_SESSION_TTL) || SESSION_TTL_MS;

    for (const [id, session] of this.sessions) {
      const idleTime = now - session.lastAccessedAt.getTime();
      if (idleTime > ttl) {
        console.log(`[SessionManager] Cleaning up idle session ${id} (idle: ${Math.round(idleTime / 1000)}s)`);
        await this.closeSession(id);
      }
    }
  }

  /**
   * Get count of active sessions
   */
  get activeSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Take a screenshot of the current page
   */
  async takeScreenshot(sessionId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    try {
      const buffer = await session.page.screenshot({ type: 'png' });
      return buffer.toString('base64');
    } catch (e) {
      console.error(`[SessionManager] Screenshot error for ${sessionId}:`, e);
      return null;
    }
  }
}

// Singleton instance
let sessionManager: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!sessionManager) {
    sessionManager = new SessionManager();
  }
  return sessionManager;
}
