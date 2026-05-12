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

async function checkMediaMarkt(product: ProductConfig): Promise<StockResult> {
  const ctx = await getBrowserContext();
  const page: Page = await ctx.newPage();

  try {
    logger.debug({ url: product.url }, '[MediaMarkt] Navigating');
    await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await randomDelay(1200, 3000);

    if (await detectBlockPage(page)) {
      logger.warn({ url: product.url }, '[MediaMarkt] Block/captcha detected — resetting context');
      await resetContext();
      return { product, status: 'unknown', checkedAt: new Date() };
    }

    // Accept cookies if banner appears
    const cookieBtn = page.locator('[data-test="mms-cookie-accept-all-button"], #onetrust-accept-btn-handler');
    if (await cookieBtn.count() > 0) {
      await cookieBtn.first().click().catch(() => undefined);
      await randomDelay(500, 1000);
    }

    // Price
    const priceEl = await page.$('[data-test="mms-buybox-price"], .pdp-price__value, [data-test="product-price"]');
    const priceText = priceEl ? await priceEl.innerText().catch(() => '') : '';

    // Add to cart / availability
    const ctaEl = await page.$('[data-test="mms-buybox-cta"], .add-to-cart, [data-test="add-to-cart-button"]');
    const ctaText = ctaEl ? await ctaEl.innerText().catch(() => '') : '';

    const availEl = await page.$('[data-test="mms-buybox-availability"], .availability, .stock-status');
    const availText = availEl ? await availEl.innerText().catch(() => '') : '';

    const combinedText = `${ctaText} ${availText}`;
    const status = detectStockStatus(combinedText);
    const price = extractPrice(priceText) ?? extractPrice(availText);

    logger.info({ product: product.name, status, price }, '[MediaMarkt] Check complete');
    return { product, status, price, checkedAt: new Date() };
  } finally {
    await page.close();
  }
}

const mediamarktMonitor: StoreMonitor = {
  name: 'MediaMarkt',
  checkStock: (product: ProductConfig) =>
    withRetry(() => checkMediaMarkt(product), 3, 2000, `MediaMarkt:${product.name}`),
};

export default mediamarktMonitor;
