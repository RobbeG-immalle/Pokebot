import { chromium, Browser, BrowserContext } from 'playwright';
import logger from './logger.js';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
];

let browser: Browser | null = null;
let context: BrowserContext | null = null;

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export async function getBrowserContext(): Promise<BrowserContext> {
  if (!browser || !browser.isConnected()) {
    logger.info('Launching Chromium browser');
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--disable-extensions',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--lang=nl-BE,nl,en-US,en',
      ],
    });
  }

  if (!context) {
    logger.debug('Creating new browser context');
    context = await browser.newContext({
      userAgent: randomUserAgent(),
      viewport: { width: 1920, height: 1080 },
      locale: 'nl-BE',
      timezoneId: 'Europe/Brussels',
      extraHTTPHeaders: {
        'Accept-Language': 'nl-BE,nl;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Upgrade-Insecure-Requests': '1',
      },
      javaScriptEnabled: true,
    });

    // Hide automation fingerprints (runs inside the browser page context)
    await context.addInitScript(() => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const g = globalThis as any;
      Object.defineProperty(g.navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(g.navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(g.navigator, 'languages', { get: () => ['nl-BE', 'nl', 'en-US'] });
      g.chrome = { runtime: {} };
      /* eslint-enable @typescript-eslint/no-explicit-any */
    });
  }

  return context;
}

export async function closeBrowser(): Promise<void> {
  if (context) {
    await context.close();
    context = null;
  }
  if (browser) {
    await browser.close();
    browser = null;
  }
  logger.info('Browser closed');
}

/** Reset context (e.g. after detecting a block/captcha) */
export async function resetContext(): Promise<void> {
  if (context) {
    await context.close();
    context = null;
  }
  logger.warn('Browser context reset');
}
