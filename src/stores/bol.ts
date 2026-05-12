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

async function checkBol(product: ProductConfig): Promise<StockResult> {
  const ctx = await getBrowserContext();
  const page: Page = await ctx.newPage();

  try {
    logger.debug({ url: product.url }, '[Bol] Navigating');
    await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await randomDelay(1200, 3000);

    if (await detectBlockPage(page)) {
      logger.warn({ url: product.url }, '[Bol] Block/captcha detected — resetting context');
      await resetContext();
      return { product, status: 'unknown', checkedAt: new Date() };
    }

    // Dismiss cookie banner if present
    const cookieBtn = page.locator('[data-test="accept-all-cookies"], #js-first-screen-accept-all-button');
    if (await cookieBtn.count() > 0) {
      await cookieBtn.first().click().catch(() => undefined);
      await randomDelay(500, 1000);
    }

    // Price
    const priceEl = await page.$('[data-test="price"], .promo-price, .buy-block__price');
    const priceText = priceEl ? await priceEl.innerText().catch(() => '') : '';

    // Stock/CTA area
    const ctaEl = await page.$('[data-test="add-to-basket"], .buy-block, .add-to-basket');
    const ctaText = ctaEl ? await ctaEl.innerText().catch(() => '') : '';

    const bodyText = await page.locator('[data-test="buy-block"], .pdp-buyblock, .product-page-cta').innerText().catch(() => '');
    const combinedText = `${ctaText} ${bodyText}`;

    const status = detectStockStatus(combinedText);
    const price = extractPrice(priceText) ?? extractPrice(bodyText);

    logger.info({ product: product.name, status, price }, '[Bol] Check complete');
    return { product, status, price, checkedAt: new Date() };
  } finally {
    await page.close();
  }
}

const bolMonitor: StoreMonitor = {
  name: 'Bol.com',
  checkStock: (product: ProductConfig) =>
    withRetry(() => checkBol(product), 3, 2000, `Bol:${product.name}`),
};

export default bolMonitor;
