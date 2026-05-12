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

async function checkIntertoys(product: ProductConfig): Promise<StockResult> {
  const ctx = await getBrowserContext();
  const page: Page = await ctx.newPage();

  try {
    logger.debug({ url: product.url }, '[Intertoys] Navigating');
    await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await randomDelay(1200, 3000);

    if (await detectBlockPage(page)) {
      logger.warn({ url: product.url }, '[Intertoys] Block/captcha detected — resetting context');
      await resetContext();
      return { product, status: 'unknown', checkedAt: new Date() };
    }

    // Accept cookies
    const cookieBtn = page.locator('#onetrust-accept-btn-handler, [data-testid="cookie-accept"]');
    if (await cookieBtn.count() > 0) {
      await cookieBtn.first().click().catch(() => undefined);
      await randomDelay(500, 1000);
    }

    // Price
    const priceEl = await page.$('.product-price .value, [itemprop="price"], .price-sales');
    const priceText = priceEl ? await priceEl.innerText().catch(() => '') : '';

    // CTA / availability
    const ctaEl = await page.$('.add-to-cart, [data-action="add-to-cart"], .btn-add-to-cart');
    const ctaText = ctaEl ? await ctaEl.innerText().catch(() => '') : '';

    const availEl = await page.$('.product-availability, .availability-msg, .stock-info');
    const availText = availEl ? await availEl.innerText().catch(() => '') : '';

    const combinedText = `${ctaText} ${availText}`;
    const status = detectStockStatus(combinedText);
    const price = extractPrice(priceText) ?? extractPrice(availText);

    logger.info({ product: product.name, status, price }, '[Intertoys] Check complete');
    return { product, status, price, checkedAt: new Date() };
  } finally {
    await page.close();
  }
}

const intertoysMonitor: StoreMonitor = {
  name: 'Intertoys',
  checkStock: (product: ProductConfig) =>
    withRetry(() => checkIntertoys(product), 3, 2000, `Intertoys:${product.name}`),
};

export default intertoysMonitor;
