import { Page } from 'playwright';
import { ProductConfig, StockResult, StoreMonitor } from '../types/product.js';
import { getBrowserContext, resetContext } from '../services/browser.js';
import logger from '../services/logger.js';
import {
  detectStockStatus,
  extractPrice,
  withRetry,
  randomDelay,
  detectBlockPage,
} from './helpers.js';

async function checkAmazon(product: ProductConfig): Promise<StockResult> {
  const ctx = await getBrowserContext();
  const page: Page = await ctx.newPage();

  try {
    logger.debug({ url: product.url }, '[Amazon] Navigating');
    await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await randomDelay(1000, 2500);

    if (await detectBlockPage(page)) {
      logger.warn({ url: product.url }, '[Amazon] Block/captcha detected — resetting context');
      await resetContext();
      return { product, status: 'unknown', checkedAt: new Date() };
    }

    // Price selector
    const priceEl = await page.$('#priceblock_ourprice, #priceblock_dealprice, .a-price .a-offscreen, #price_inside_buybox');
    const priceText = priceEl ? await priceEl.innerText().catch(() => '') : '';

    // Availability selector
    const availabilityEl = await page.$('#availability, #add-to-cart-button, #submit.add-to-cart');
    const availabilityText = availabilityEl ? await availabilityEl.innerText().catch(() => '') : '';

    // Full page text as fallback
    const bodyText = await page.locator('#centerCol, #ppd').innerText().catch(() => '');
    const combinedText = `${availabilityText} ${bodyText}`;

    const status = detectStockStatus(combinedText);
    const price = extractPrice(priceText) ?? extractPrice(bodyText);

    logger.info({ product: product.name, status, price }, '[Amazon] Check complete');
    return { product, status, price, checkedAt: new Date() };
  } finally {
    await page.close();
  }
}

const amazonMonitor: StoreMonitor = {
  name: 'Amazon',
  checkStock: (product: ProductConfig) =>
    withRetry(() => checkAmazon(product), 3, 2000, `Amazon:${product.name}`),
};

export default amazonMonitor;
