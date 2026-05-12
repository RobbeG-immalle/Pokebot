import axios from 'axios';
import { StockResult, DiscordEmbed, DiscordWebhookPayload } from '../types/product.js';
import logger from './logger.js';

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL ?? '';

const STATUS_COLORS: Record<string, number> = {
  in_stock: 0x00b300,   // green
  preorder: 0xffa500,   // orange
  out_of_stock: 0xff0000, // red
  unknown: 0x808080,    // grey
};

const STATUS_LABELS: Record<string, string> = {
  in_stock: '✅ In Stock',
  preorder: '⏳ Pre-order',
  out_of_stock: '❌ Out of Stock',
  unknown: '❓ Unknown',
};

export async function sendStockNotification(result: StockResult): Promise<void> {
  if (!WEBHOOK_URL) {
    logger.warn('DISCORD_WEBHOOK_URL is not set — skipping notification');
    return;
  }

  const embed: DiscordEmbed = {
    title: `🎴 ${result.product.name}`,
    url: result.product.url,
    color: STATUS_COLORS[result.status] ?? STATUS_COLORS.unknown,
    fields: [
      { name: 'Store', value: result.product.store.toUpperCase(), inline: true },
      { name: 'Status', value: STATUS_LABELS[result.status] ?? STATUS_LABELS.unknown, inline: true },
      ...(result.price ? [{ name: 'Price', value: result.price, inline: true }] : []),
      { name: 'Link', value: `[Open product page](${result.product.url})`, inline: false },
    ],
    footer: { text: 'PokéBot — Stock Monitor' },
    timestamp: result.checkedAt.toISOString(),
  };

  const payload: DiscordWebhookPayload = {
    username: 'PokéBot',
    avatar_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    embeds: [embed],
  };

  try {
    await axios.post(WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10_000,
    });
    logger.info({ product: result.product.name, status: result.status }, 'Discord notification sent');
  } catch (err) {
    logger.error({ err, product: result.product.name }, 'Failed to send Discord notification');
  }
}
