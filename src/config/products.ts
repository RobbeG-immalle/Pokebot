import { ProductConfig } from '../types/product.js';

/**
 * Add / remove products here.
 * Supported stores: amazon | bol | mediamarkt | intertoys | dreamland
 */
const products: ProductConfig[] = [
  // ── Amazon ─────────────────────────────────────────────────────────────────
  {
    name: 'Pokémon 151 Elite Trainer Box',
    url: 'https://www.amazon.com.be/dp/B0CB36Q9KJ',
    store: 'amazon',
  },
  {
    name: 'Pokémon Scarlet & Violet Booster Bundle',
    url: 'https://www.amazon.com.be/dp/B0BW5NP4QK',
    store: 'amazon',
  },

  // ── Bol.com ────────────────────────────────────────────────────────────────
  {
    name: 'Pokémon 151 Elite Trainer Box',
    url: 'https://www.bol.com/nl/nl/p/pokemon-tcg-scarlet-violet-151-elite-trainer-box/9300000167697088/',
    store: 'bol',
  },
  {
    name: 'Pokémon Obsidian Flames Booster Box',
    url: 'https://www.bol.com/nl/nl/p/pokemon-kaarten-obsidian-flames-booster-box/9300000149781278/',
    store: 'bol',
  },

  // ── MediaMarkt ─────────────────────────────────────────────────────────────
  {
    name: 'Pokémon Scarlet & Violet 151 Binder Collection',
    url: 'https://www.mediamarkt.be/nl/product/_pokemon-tcg-scarlet-violet-151-binder-collection-1928702.html',
    store: 'mediamarkt',
  },

  // ── Intertoys ──────────────────────────────────────────────────────────────
  {
    name: 'Pokémon 151 Elite Trainer Box',
    url: 'https://www.intertoys.be/nl/pokemon/pokemon-scarlet-violet-151-elite-trainer-box/product/P-000000000010374',
    store: 'intertoys',
  },

  // ── DreamLand ──────────────────────────────────────────────────────────────
  {
    name: 'Pokémon 151 Elite Trainer Box',
    url: 'https://www.dreamland.be/e/nl/dl/pokemon-scarlet-violet-series-151-elite-trainer-box-00045557543532',
    store: 'dreamland',
  },
];

export default products;
