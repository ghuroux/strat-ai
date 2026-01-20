/**
 * Commerce Tools - Tool definitions for LLM integration
 */

import type { ToolDefinition } from '$lib/types/api';
import type { CommerceSiteId, CommerceProductWithBadges, ProductBadge } from '$lib/types/commerce';
import * as adapter from './adapter';

/**
 * Commerce tool definitions for the LLM
 */
export const commerceTools: ToolDefinition[] = [
  {
    name: 'commerce_search',
    description: 'Search for products across South African e-commerce sites (Takealot and Amazon.co.za). Returns product listings with prices, ratings, and images. Use this when the user wants to find or compare products.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query (e.g., "wireless earbuds", "laptop bag")'
        },
        sites: {
          type: 'string',
          description: 'Comma-separated list of sites to search. Options: takealot, amazon. Default: both'
        },
        max_price: {
          type: 'number',
          description: 'Maximum price in South African Rands as a number. Examples: 500 for R500, 5000 for R5000, 10000 for R10000. Pass the exact number the user mentions.'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'commerce_get_product',
    description: 'Get detailed information about a specific product. Use this when the user wants more details about a product from search results.',
    input_schema: {
      type: 'object',
      properties: {
        product_url: {
          type: 'string',
          description: 'The full URL of the product page'
        },
        site: {
          type: 'string',
          description: 'The site the product is from (takealot or amazon)'
        }
      },
      required: ['product_url', 'site']
    }
  },
  {
    name: 'commerce_add_to_cart',
    description: 'Add a product to the shopping cart. Requires user to be logged in to the site. Use this when the user explicitly wants to add something to their cart.',
    input_schema: {
      type: 'object',
      properties: {
        product_url: {
          type: 'string',
          description: 'The full URL of the product to add'
        },
        site: {
          type: 'string',
          description: 'The site the product is from (takealot or amazon)'
        },
        quantity: {
          type: 'string',
          description: 'Quantity to add (default: 1)'
        }
      },
      required: ['product_url', 'site']
    }
  },
  {
    name: 'commerce_checkout',
    description: 'Preview the checkout with current cart contents. Shows items, subtotal, shipping, and total. Does NOT complete the purchase. Use this before confirming a purchase.',
    input_schema: {
      type: 'object',
      properties: {
        site: {
          type: 'string',
          description: 'The site to checkout from (takealot or amazon)'
        }
      },
      required: ['site']
    }
  }
];

/**
 * Session storage for commerce operations
 */
let currentSessionId: string | null = null;

/**
 * Add badges to products based on comparison
 */
function addBadgesToProducts(products: CommerceProductWithBadges[]): CommerceProductWithBadges[] {
  if (products.length === 0) return products;

  // Find best values
  const cheapest = products.reduce((min, p) => p.price < min.price ? p : min, products[0]);
  const highestRated = products.filter(p => p.rating).reduce((max, p) =>
    (p.rating || 0) > (max.rating || 0) ? p : max, products[0]);
  const mostReviews = products.filter(p => p.reviewCount).reduce((max, p) =>
    (p.reviewCount || 0) > (max.reviewCount || 0) ? p : max, products[0]);

  // Calculate value score (rating / price * 100)
  const withScores = products.map(p => ({
    product: p,
    valueScore: p.rating ? (p.rating / p.price) * 1000 : 0
  }));
  const bestValue = withScores.reduce((best, curr) =>
    curr.valueScore > best.valueScore ? curr : best, withScores[0])?.product;

  // Assign badges
  return products.map(p => {
    const badges: ProductBadge[] = [];
    if (p.id === cheapest.id) badges.push('cheapest');
    if (p.id === bestValue?.id && bestValue.rating) badges.push('best_value');
    if (p.id === highestRated?.id && highestRated.rating) badges.push('highest_rated');
    if (p.id === mostReviews?.id && mostReviews.reviewCount && mostReviews.reviewCount > 10) {
      badges.push('most_reviews');
    }
    return { ...p, badges };
  });
}

/**
 * Execute a commerce tool call
 */
export async function executeCommerceTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<{
  result: string;
  commerceData?: {
    type: 'search_results' | 'product_details' | 'checkout_preview' | 'order_confirmation';
    searchResults?: { query: string; products: CommerceProductWithBadges[] };
    productDetails?: CommerceProductWithBadges;
    checkoutPreview?: Awaited<ReturnType<typeof adapter.getCheckoutPreview>>;
    orderConfirmation?: Awaited<ReturnType<typeof adapter.confirmPurchase>>;
  };
}> {
  try {
    switch (toolName) {
      case 'commerce_search': {
        const query = input.query as string;
        const sitesStr = (input.sites as string) || 'takealot,amazon';
        const sites = sitesStr.split(',').map(s => s.trim()).filter(s =>
          s === 'takealot' || s === 'amazon'
        ) as CommerceSiteId[];
        const maxPrice = input.max_price
          ? (typeof input.max_price === 'number' ? input.max_price : parseInt(input.max_price as string, 10))
          : undefined;

        const response = await adapter.searchProducts(query, sites, {
          maxPrice,
          sessionId: currentSessionId || undefined
        });

        // Store session for subsequent operations
        currentSessionId = response.sessionId;

        // Flatten and dedupe products, add badges
        const allProducts = response.results.flatMap(r => r.products);
        const productsWithBadges = addBadgesToProducts(
          allProducts.map(p => ({ ...p, badges: [] as ProductBadge[] }))
        );

        // Build result text for the LLM
        const resultText = productsWithBadges.length > 0
          ? `Found ${productsWithBadges.length} products for "${query}":\n\n` +
            productsWithBadges.slice(0, 10).map((p, i) =>
              `${i + 1}. ${p.name}\n` +
              `   Price: R${p.price.toLocaleString()}\n` +
              `   Site: ${p.site}\n` +
              `   ${p.rating ? `Rating: ${p.rating}/5` : 'No rating'}` +
              `${p.reviewCount ? ` (${p.reviewCount} reviews)` : ''}\n` +
              `   URL: ${p.productUrl}`
            ).join('\n\n')
          : `No products found for "${query}"`;

        return {
          result: resultText,
          commerceData: {
            type: 'search_results',
            searchResults: {
              query,
              products: productsWithBadges.slice(0, 10)
            }
          }
        };
      }

      case 'commerce_get_product': {
        const productUrl = input.product_url as string;
        const site = input.site as CommerceSiteId;

        const response = await adapter.getProduct(productUrl, site, currentSessionId || undefined);
        currentSessionId = response.sessionId;

        const p = response.product;
        const productWithBadges: CommerceProductWithBadges = { ...p, badges: [] };

        const resultText =
          `Product Details:\n\n` +
          `Name: ${p.name}\n` +
          `Price: R${p.price.toLocaleString()}\n` +
          `Site: ${p.site}\n` +
          `In Stock: ${p.inStock ? 'Yes' : 'No'}\n` +
          `${p.rating ? `Rating: ${p.rating}/5` : ''}\n` +
          `${p.reviewCount ? `Reviews: ${p.reviewCount}` : ''}\n` +
          `URL: ${p.productUrl}`;

        return {
          result: resultText,
          commerceData: {
            type: 'product_details',
            productDetails: productWithBadges
          }
        };
      }

      case 'commerce_add_to_cart': {
        const productUrl = input.product_url as string;
        const site = input.site as CommerceSiteId;
        const quantity = input.quantity ? parseInt(input.quantity as string, 10) : 1;

        if (!currentSessionId) {
          return {
            result: 'Error: No active session. Please search for products first to establish a session.'
          };
        }

        const response = await adapter.addToCart(productUrl, site, currentSessionId, quantity);

        if (response.success) {
          return {
            result: `Successfully added item to cart on ${site}. You can now proceed to checkout.`
          };
        } else {
          return {
            result: `Failed to add item to cart: ${response.error || 'Unknown error'}. This may require logging in to ${site}.`
          };
        }
      }

      case 'commerce_checkout': {
        const site = input.site as CommerceSiteId;

        if (!currentSessionId) {
          return {
            result: 'Error: No active session. Please search for products and add items to cart first.'
          };
        }

        const preview = await adapter.getCheckoutPreview(site, currentSessionId);

        const itemsList = preview.items.map(item =>
          `- ${item.name}: R${item.price.toLocaleString()} x ${item.quantity}`
        ).join('\n');

        const resultText =
          `Checkout Preview for ${site}:\n\n` +
          `Items:\n${itemsList}\n\n` +
          `Subtotal: R${preview.subtotal.toLocaleString()}\n` +
          `Shipping: R${preview.shipping.toLocaleString()}\n` +
          `Total: R${preview.total.toLocaleString()}\n\n` +
          `Saved payment method available: ${preview.savedPaymentAvailable ? 'Yes' : 'No'}\n\n` +
          `Note: This is a preview only. Ask the user to confirm before completing the purchase.`;

        return {
          result: resultText,
          commerceData: {
            type: 'checkout_preview',
            checkoutPreview: preview
          }
        };
      }

      default:
        return {
          result: `Unknown commerce tool: ${toolName}`
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      result: `Commerce operation failed: ${errorMessage}`
    };
  }
}

/**
 * Check if a tool name is a commerce tool
 */
export function isCommerceTool(toolName: string): boolean {
  return toolName.startsWith('commerce_');
}
