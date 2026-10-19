
export type CatalogFilterKey =
  | "season" | "brand" | "dot" | "oem" | "depot" | "features"
  | "rimDiameter" | "boltPattern";

export const DEFAULT_CATALOG_FILTERS: CatalogFilterKey[] = ["season", "brand", "dot", "oem", "depot", "features"];

const FILTERS_BY_PRODUCT_TYPE: Record<string, CatalogFilterKey[]> = {
  JANT: ["rimDiameter", "boltPattern", "depot"],
  "2.EL JANT": ["rimDiameter", "boltPattern", "depot"],
};

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

const PANEL_FILTER_KEYS: Record<string, CatalogFilterKey> = {
  brand: "brand",
  season: "season",
  oem: "oem",
  productionYear: "dot",
  properties: "features",
};

export function withoutHiddenFilters(visible: CatalogFilterKey[], hiddenPanelKeys: string[]): CatalogFilterKey[] {
  const hidden = new Set(hiddenPanelKeys.map((key) => PANEL_FILTER_KEYS[key]).filter(Boolean));
  return visible.filter((key) => !hidden.has(key));
}

export type CatalogColumnKey = "brand" | "season" | "dot";

const HIDDEN_COLUMNS_BY_PRODUCT_TYPE: Record<string, CatalogColumnKey[]> = {
  JANT: ["brand", "season", "dot"],
  "2.EL JANT": ["brand", "season", "dot"],
};

export function hiddenColumnsForProductTypes(productTypes: string[]): CatalogColumnKey[] {
  const types = productTypes.map((t) => String(t).trim().toLocaleUpperCase("tr")).filter(Boolean);
  if (types.length === 0) return [];
  const lists = types.map((type) => HIDDEN_COLUMNS_BY_PRODUCT_TYPE[type] || []);
  return lists[0].filter((column) => lists.every((list) => list.includes(column)));
}

const PANEL_FILTER_COLUMNS: Record<string, CatalogColumnKey> = {
  brand: "brand",
  season: "season",
  productionYear: "dot",
};

export function withHiddenFilterColumns(hiddenColumns: CatalogColumnKey[], hiddenPanelKeys: string[]): CatalogColumnKey[] {
  const result = [...hiddenColumns];
  for (const key of hiddenPanelKeys) {
    const column = PANEL_FILTER_COLUMNS[key];
    if (column && !result.includes(column)) result.push(column);
  }
  return result;
}

const NEW_TIRE_PRODUCT_TYPE = "LASTİK";

export function isTireProductType(productType: string | undefined | null): boolean {
  return String(productType || "").trim().toLocaleUpperCase("tr") === NEW_TIRE_PRODUCT_TYPE;
}

export function hasNewTireProductType(productTypes: string[]): boolean {
  return productTypes.some((t) => isTireProductType(t));
}
