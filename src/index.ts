import 'dotenv/config';
import cron from 'node-cron';
import { StockStatus, StoreMonitor } from './types/product.js';
import products from './config/products.js';
import { sendStockNotification } from './services/discord.js';
import { closeBrowser } from './services/browser.js';
import logger from './services/logger.js';
import { sleep, randomDelay } from './stores/helpers.js';

// Store monitors
import amazonMonitor from './stores/amazon.js';
import bolMonitor from './stores/bol.js';
import mediamarktMonitor from './stores/mediamarkt.js';
import intertoysMonitor from './stores/intertoys.js';
import dreamlandMonitor from './stores/dreamland.js';

// ── Store registry ────────────────────────────────────────────────────────────

const storeMonitors: Record<string, StoreMonitor> = {
  amazon: amazonMonitor,
  bol: bolMonitor,
  mediamarkt: mediamarktMonitor,
  intertoys: intertoysMonitor,
  dreamland: dreamlandMonitor,
};

// ── Deduplication cache ───────────────────────────────────────────────────────

/**
 * Key: "<store>:<url>" → last notified status.
 * We only alert when the status transitions *into* in_stock / preorder.
 */
const lastKnownStatus = new Map<string, StockStatus>();

function dedupeKey(store: string, url: string): string {
  return `${store}:${url}`;
}

function shouldNotify(key: string, newStatus: StockStatus): boolean {
  if (newStatus !== 'in_stock' && newStatus !== 'preorder') return false;
  const previous = lastKnownStatus.get(key);
  return previous !== newStatus;
}

// ── Main poll loop ────────────────────────────────────────────────────────────

async function runChecks(): Promise<void> {
  logger.info(`Starting stock check cycle for ${products.length} product(s)`);

  for (const product of products) {
    const monitor = storeMonitors[product.store];
    if (!monitor) {
      logger.warn({ store: product.store }, 'No monitor registered for store — skipping');
      continue;
    }

    try {
      const result = await monitor.checkStock(product);
      const key = dedupeKey(product.store, product.url);

      logger.info(
        { product: product.name, store: product.store, status: result.status, price: result.price },
        'Stock check result',
      );

      if (shouldNotify(key, result.status)) {
        logger.info({ product: product.name, status: result.status }, 'Status changed — sending notification');
        await sendStockNotification(result);
      }

      lastKnownStatus.set(key, result.status);
    } catch (err) {
      logger.error({ err, product: product.name, store: product.store }, 'Unhandled error checking product');
    }

    // Anti-ban: random delay between individual product checks
    await randomDelay(2000, 5000);
  }

  logger.info('Stock check cycle complete');
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

const CHECK_INTERVAL_SECONDS = parseInt(process.env.CHECK_INTERVAL ?? '45', 10);

function buildCronExpression(seconds: number): string {
  // For intervals < 60s, use a sub-minute cron pattern via cron "every N seconds"
  // node-cron supports 6-field cron with seconds as first field
  if (seconds < 60) {
    return `*/${seconds} * * * * *`;
  }
  const minutes = Math.floor(seconds / 60);
  return `0 */${minutes} * * * *`;
}

const cronExpr = buildCronExpression(CHECK_INTERVAL_SECONDS);
logger.info({ cronExpr, intervalSeconds: CHECK_INTERVAL_SECONDS }, 'Scheduler configured');

// ── Startup ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  logger.info('🎴 PokéBot starting up');

  if (!process.env.DISCORD_WEBHOOK_URL) {
    logger.warn('DISCORD_WEBHOOK_URL is not set — notifications will be suppressed');
  }

  // Run immediately on startup
  await runChecks();

  // Then schedule
  cron.schedule(cronExpr, async () => {
    await runChecks().catch((err) =>
      logger.error({ err }, 'Unexpected error in scheduled run'),
    );
  });

  logger.info(`✅ PokéBot running — polling every ~${CHECK_INTERVAL_SECONDS}s`);
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down PokéBot');
  await closeBrowser();
  await sleep(500);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch((err) => {
  logger.fatal({ err }, 'Fatal startup error');
  process.exit(1);
});
