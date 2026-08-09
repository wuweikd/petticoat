import { CUT_LABEL, type Brand, type Item, type Variant } from '@/domain/types';

export type CatalogHit = {
  brand: Brand;
  item: Item;
  variant: Variant;
  score: number;
  label: string;
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}

/** Simple fuzzy score: exact > prefix > includes > char overlap */
function scoreMatch(query: string, haystack: string): number {
  const q = normalize(query);
  const h = normalize(haystack);
  if (!q || !h) return 0;
  if (h === q) return 100;
  if (h.startsWith(q)) return 80;
  if (h.includes(q)) return 60;
  let hits = 0;
  let from = 0;
  for (const ch of q) {
    const idx = h.indexOf(ch, from);
    if (idx < 0) return 0;
    hits += 1;
    from = idx + 1;
  }
  return Math.min(50, Math.round((hits / q.length) * 40));
}

export function searchCatalog(
  query: string,
  brands: Brand[],
  items: Item[],
  variants: Variant[],
  limit = 8,
): CatalogHit[] {
  const q = query.trim();
  if (q.length < 1) return [];

  const brandMap = new Map(brands.map((b) => [b.id, b]));
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const hits: CatalogHit[] = [];

  for (const variant of variants) {
    const item = itemMap.get(variant.itemId);
    if (!item) continue;
    const brand = brandMap.get(item.brandId);
    if (!brand) continue;

    const score = Math.max(
      scoreMatch(q, item.name),
      scoreMatch(q, brand.name) * 0.7,
      scoreMatch(q, variant.colorName) * 0.8,
      scoreMatch(q, `${brand.name}${item.name}${variant.colorName}${variant.cut}`),
    );
    if (score < 30) continue;

    hits.push({
      brand,
      item,
      variant,
      score,
      label: `${brand.name} · ${item.name} · ${CUT_LABEL[variant.cut]} · ${variant.colorName}`,
    });
  }

  // Also surface items with no variants yet (rare) via synthetic — skip for MVP

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
