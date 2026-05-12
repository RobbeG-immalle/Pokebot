export type StoreKey = 'amazon' | 'bol' | 'mediamarkt' | 'intertoys' | 'dreamland';

export interface ProductConfig {
  name: string;
  url: string;
  store: StoreKey;
  /** Optional selector to target the specific element for price/stock check */
  selector?: string;
}

export type StockStatus = 'in_stock' | 'out_of_stock' | 'preorder' | 'unknown';

export interface StockResult {
  product: ProductConfig;
  status: StockStatus;
  price?: string;
  checkedAt: Date;
}

export interface StoreMonitor {
  name: string;
  checkStock(product: ProductConfig): Promise<StockResult>;
}

export interface DiscordEmbed {
  title: string;
  url: string;
  color: number;
  fields: Array<{ name: string; value: string; inline?: boolean }>;
  footer: { text: string };
  timestamp: string;
}

export interface DiscordWebhookPayload {
  username: string;
  avatar_url?: string;
  embeds: DiscordEmbed[];
}
