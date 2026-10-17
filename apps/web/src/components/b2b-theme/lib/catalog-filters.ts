// Katalog üst filtre alanları ile tablo sütunlarının ürün türüne göre görünürlüğü.
// Arama kutusu her zaman görünür; filtre anahtarları onun yanındaki alanlardır.

export type CatalogFilterKey =
  | "season" | "brand" | "dot" | "oem" | "depot" | "features"
  // Jant alanları
  | "rimDiameter" | "boltPattern";

/** Türü tanımsız kategorilerde (lastik vb.) gösterilen alanlar. */
export const DEFAULT_CATALOG_FILTERS: CatalogFilterKey[] = ["season", "brand", "dot", "oem", "depot", "features"];

// Ürün türü (DIA ozelkod7kodu) → gösterilecek filtre alanları (sıra ekrandaki sıradır).
// Burada tanımı olmayan tür varsayılan alanları gösterir.
const FILTERS_BY_PRODUCT_TYPE: Record<string, CatalogFilterKey[]> = {
  // Jantta mevsim, marka, DOT, OEM ve lastik özellikleri (RFT / C Serisi / XL / EV) yoktur
  JANT: ["rimDiameter", "boltPattern", "depot"],
  "2.EL JANT": ["rimDiameter", "boltPattern", "depot"],
};

/** Kategorideki ürün türlerine göre gösterilecek filtre alanları.
 *  Türlerden biri tanımsızsa (ya da tür bilgisi yoksa) varsayılan alanlar; hepsi tanımlıysa alanların birleşimi. */
export function filtersForProductTypes(productTypes: string[]): CatalogFilterKey[] {
  const types = productTypes.map((t) => String(t).trim().toLocaleUpperCase("tr")).filter(Boolean);
  if (types.length === 0) return DEFAULT_CATALOG_FILTERS;
  const visible: CatalogFilterKey[] = [];
  for (const type of types) {
    const keys = FILTERS_BY_PRODUCT_TYPE[type];
    if (!keys) return DEFAULT_CATALOG_FILTERS;
    for (const k of keys) if (!visible.includes(k)) visible.push(k);
  }
  return visible;
}

// Panel "Kategori Düzenle → Gizlenecek Filtreler" anahtarı (api config/categoryFilters) → bu temadaki filtre alanı.
// Karşılığı olmayan panel anahtarları (fiyat, ebat, yük / hız endeksi) bu temada zaten yoktur.
const PANEL_FILTER_KEYS: Record<string, CatalogFilterKey> = {
  brand: "brand",
  season: "season",
  oem: "oem",
  productionYear: "dot",
  properties: "features",
};

/** Panelde kategori için gizlenen filtreleri görünen alanlardan çıkarır. */
export function withoutHiddenFilters(visible: CatalogFilterKey[], hiddenPanelKeys: string[]): CatalogFilterKey[] {
  const hidden = new Set(hiddenPanelKeys.map((key) => PANEL_FILTER_KEYS[key]).filter(Boolean));
  return visible.filter((key) => !hidden.has(key));
}

/** Ürün türüne göre gizlenebilen tablo sütunları */
export type CatalogColumnKey = "brand" | "season" | "dot";

// Ürün türü (DIA ozelkod7kodu) → gizlenecek tablo sütunları. Burada tanımı olmayan türde tüm sütunlar görünür.
const HIDDEN_COLUMNS_BY_PRODUCT_TYPE: Record<string, CatalogColumnKey[]> = {
  JANT: ["brand", "season", "dot"],
  "2.EL JANT": ["brand", "season", "dot"],
};

/** Kategorideki ürün türlerine göre gizlenecek sütunlar: yalnız kategorideki TÜM türlerde gizli olan sütunlar gizlenir. */
export function hiddenColumnsForProductTypes(productTypes: string[]): CatalogColumnKey[] {
  const types = productTypes.map((t) => String(t).trim().toLocaleUpperCase("tr")).filter(Boolean);
  if (types.length === 0) return [];
  const lists = types.map((type) => HIDDEN_COLUMNS_BY_PRODUCT_TYPE[type] || []);
  return lists[0].filter((column) => lists.every((list) => list.includes(column)));
}

// Panelde gizlenen filtrenin tablodaki karşılığı: filtre gizlenince aynı bilginin sütunu da gizlenir
// (ör. Kar Zinciri'nde Mevsim ve Üretim Yılı gizli → Mevsim ve DOT sütunları da yok).
const PANEL_FILTER_COLUMNS: Record<string, CatalogColumnKey> = {
  brand: "brand",
  season: "season",
  productionYear: "dot",
};

/** Ürün türünden gelen gizli sütunlara, panelde gizlenen filtrelerin sütunlarını ekler. */
export function withHiddenFilterColumns(hiddenColumns: CatalogColumnKey[], hiddenPanelKeys: string[]): CatalogColumnKey[] {
  const result = [...hiddenColumns];
  for (const key of hiddenPanelKeys) {
    const column = PANEL_FILTER_COLUMNS[key];
    if (column && !result.includes(column)) result.push(column);
  }
  return result;
}

// Sıfır lastik ürün türü (DIA ozelkod7kodu)
const NEW_TIRE_PRODUCT_TYPE = "LASTİK";

/** Ürün türü lastik mi? (sıfır ve ikinci el lastik kartlarının türü aynıdır) */
export function isTireProductType(productType: string | undefined | null): boolean {
  return String(productType || "").trim().toLocaleUpperCase("tr") === NEW_TIRE_PRODUCT_TYPE;
}

/** Kategori lastik içeriyor mu? (perakende plasiyer fiyat notu yalnız lastiklerde gösterilir) */
export function hasNewTireProductType(productTypes: string[]): boolean {
  return productTypes.some((t) => isTireProductType(t));
}
