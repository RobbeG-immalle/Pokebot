import { Page } from 'playwright';
import { StockStatus } from '../types/product.js';
import logger from '../services/logger.js';

// ── Stock keyword sets ───────────────────────────────────────────────────────

const IN_STOCK_KEYWORDS = [
  'in stock',
  'op voorraad',
  'add to cart',
  'in winkelmand',
  'bestel',
  'beschikbaar',
  'nu kopen',
  'koop nu',
  'buy now',
  'add to basket',
  'in den warenkorb',
];

const PREORDER_KEYWORDS = [
  'pre-order',
  'preorder',
  'pre order',
  'vooruitbestellen',
  'coming soon',
  'binnenkort beschikbaar',
];

const OUT_OF_STOCK_KEYWORDS = [
  'uitverkocht',
  'sold out',
  'niet beschikbaar',
  'not available',
  'out of stock',
  'tijdelijk niet leverbaar',
  'momenteel niet leverbaar',
  'tijdelijk uitverkocht',
  'niet op voorraad',
];

// ── Keyword helpers ──────────────────────────────────────────────────────────

export function containsKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

export function detectStockStatus(text: string): StockStatus {
  if (containsKeyword(text, OUT_OF_STOCK_KEYWORDS)) return 'out_of_stock';
  if (containsKeyword(text, IN_STOCK_KEYWORDS)) return 'in_stock';
  if (containsKeyword(text, PREORDER_KEYWORDS)) return 'preorder';
  return 'unknown';
}

// ── Price extraction ─────────────────────────────────────────────────────────

const PRICE_REGEX = /[€$£]?\s*\d{1,4}[.,]\d{2}\s*[€$£]?/;

export function extractPrice(text: string): string | undefined {
  const match = text.match(PRICE_REGEX);
  return match ? match[0].trim() : undefined;
}

// ── Retry logic ──────────────────────────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelayMs = 2000,
  label = 'operation',
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = baseDelayMs * attempt + Math.random() * 1000;
      logger.warn({ attempt, retries, label, err }, `Retry ${attempt}/${retries} failed — waiting ${Math.round(delay)}ms`);
      await sleep(delay);
    }
  }
  throw lastError;
}

// ── Timing helpers ───────────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Random jitter delay between minMs and maxMs */
export function randomDelay(minMs = 1500, maxMs = 4000): Promise<void> {
  return sleep(minMs + Math.random() * (maxMs - minMs));
}

// ── Block / captcha detection ────────────────────────────────────────────────

const BLOCK_SIGNALS = [
  'captcha',
  'robot',
  'not a robot',
  'access denied',
  'forbidden',
  'rate limit',
  'too many requests',
  'cloudflare',
  'ddos protection',
  'waf',
];

export function isBlocked(text: string): boolean {
  return containsKeyword(text, BLOCK_SIGNALS);
}

export async function detectBlockPage(page: Page): Promise<boolean> {
  const title = await page.title().catch(() => '');
  const body = await page.locator('body').innerText().catch(() => '');
  return isBlocked(title) || isBlocked(body.slice(0, 500));
}
