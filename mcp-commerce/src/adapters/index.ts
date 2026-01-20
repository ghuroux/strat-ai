/**
 * Site Adapters - Export all adapters
 */

export { SiteAdapter, type SearchOptions, type AdapterContext } from './base.js';
export { TakealotAdapter } from './takealot.js';
export { AmazonAdapter } from './amazon.js';

import type { SiteId } from '../types.js';
import type { AdapterContext } from './base.js';
import { TakealotAdapter } from './takealot.js';
import { AmazonAdapter } from './amazon.js';

/**
 * Create an adapter for the specified site
 */
export function createAdapter(site: SiteId, context: AdapterContext) {
  switch (site) {
    case 'takealot':
      return new TakealotAdapter(context);
    case 'amazon':
      return new AmazonAdapter(context);
    default:
      throw new Error(`Unknown site: ${site}`);
  }
}
