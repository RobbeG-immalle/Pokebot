# 🎴 PokéBot — Pokémon TCG Stock Monitor

PokéBot monitors Pokémon TCG product pages on multiple Belgian/Dutch webshops and sends instant Discord notifications when products come back in stock or become available for pre-order.

## Supported Stores

| Store | Domain |
|-------|--------|
| Amazon | amazon.com.be |
| Bol.com | bol.com |
| MediaMarkt | mediamarkt.be |
| Intertoys | intertoys.be |
| DreamLand | dreamland.be |

---

## Requirements

- **Node.js** 20+
- **npm** 10+
- A **Discord Webhook URL** (see [Discord docs](https://support.discord.com/hc/en-us/articles/228383668))

---

## Installation

```bash
git clone https://github.com/RobbeG-immalle/Pokebot.git
cd Pokebot
npm install
npx playwright install chromium
```

---

## Setup

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and fill in your values:

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN
CHECK_INTERVAL=45
LOG_LEVEL=info
HEADLESS=true
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DISCORD_WEBHOOK_URL` | *(required)* | Discord webhook URL for notifications |
| `CHECK_INTERVAL` | `45` | Polling interval in seconds |
| `LOG_LEVEL` | `info` | Pino log level (`trace`, `debug`, `info`, `warn`, `error`) |
| `HEADLESS` | `true` | Run Chromium headlessly (`true`/`false`) |

---

## Configure Products

Edit `src/config/products.ts` to add or remove products:

```typescript
const products: ProductConfig[] = [
  {
    name: 'Pokémon 151 Elite Trainer Box',
    url: 'https://www.bol.com/nl/nl/p/...',
    store: 'bol',  // amazon | bol | mediamarkt | intertoys | dreamland
  },
];
```

---

## Running Locally

### Development (with hot reload via ts-node)

```bash
npm run dev
```

### Production build

```bash
npm run build
npm start
```

---

## Running with Docker

### Build & start

```bash
cp .env.example .env
# Edit .env with your Discord webhook

docker-compose up -d
```

### View logs

```bash
docker-compose logs -f pokebot
```

### Stop

```bash
docker-compose down
```

---

## Adding New Stores

1. Create `src/stores/yourstore.ts` — implement the `StoreMonitor` interface:

```typescript
import { ProductConfig, StockResult, StoreMonitor } from '../types/product.js';
import { getBrowserContext } from '../services/browser.js';
import { detectStockStatus, extractPrice, withRetry, randomDelay } from './helpers.js';
import logger from '../services/logger.js';

async function checkYourStore(product: ProductConfig): Promise<StockResult> {
  const ctx = await getBrowserContext();
  const page = await ctx.newPage();
  try {
    await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await randomDelay();

    const ctaText = await page.$eval('.add-to-cart', el => el.textContent ?? '').catch(() => '');
    const status = detectStockStatus(ctaText);
    const price = extractPrice(ctaText);

    logger.info({ product: product.name, status }, '[YourStore] Check complete');
    return { product, status, price, checkedAt: new Date() };
  } finally {
    await page.close();
  }
}

const yourStoreMonitor: StoreMonitor = {
  name: 'YourStore',
  checkStock: (product) => withRetry(() => checkYourStore(product), 3, 2000, `YourStore:${product.name}`),
};

export default yourStoreMonitor;
```

2. Register it in `src/index.ts`:

```typescript
import yourStoreMonitor from './stores/yourstore.js';

const storeMonitors = {
  // ...existing stores...
  yourstore: yourStoreMonitor,
};
```

3. Add the store key to `StoreKey` in `src/types/product.ts`:

```typescript
export type StoreKey = 'amazon' | 'bol' | 'mediamarkt' | 'intertoys' | 'dreamland' | 'yourstore';
```

4. Add products to `src/config/products.ts` using `store: 'yourstore'`.

---

## How It Works

1. **Startup** — launches a Chromium browser with stealth settings (no automation flags, realistic user-agent, Belgian locale).
2. **Poll cycle** — iterates through all configured products, checks each page, extracts stock status and price.
3. **Deduplication** — tracks the last notified status per product. A Discord notification is sent only when status changes *into* `in_stock` or `preorder`.
4. **Anti-ban** — random jitter delays between requests; detects block/captcha pages and resets the browser context.
5. **Retry logic** — retries failed checks up to 3× with exponential backoff.

## Discord Notification Example

```
🎴 Pokémon 151 Elite Trainer Box
Store: BOL    Status: ✅ In Stock    Price: €59,99
[Open product page]  •  PokéBot — 2024-07-10 14:32:00
```
