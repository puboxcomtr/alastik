// Kategori sayfası sol filtre bölümleri. Admin "Kategori Düzenle → Gizlenecek Filtreler" seçenekleri
// buradan gelir; vitrin sidebar'ı aynı anahtarlarla ilgili bölümü gizler (siteContent.<site>.hiddenFilters).
const CATEGORY_FILTERS = [
  { key: 'brand', label: 'Marka' },
  { key: 'price', label: 'Fiyat' },
  { key: 'season', label: 'Mevsim' },
  { key: 'properties', label: 'Özellikler' },
  { key: 'tireSize', label: 'Ebat (Genişlik / Yanak / Jant)' },
  { key: 'loadIndex', label: 'Yük Endeksi' },
  { key: 'speedIndex', label: 'Hız Endeksi' },
  { key: 'oem', label: 'OEM' },
  { key: 'productionYear', label: 'Üretim Yılı' }
];
const CATEGORY_FILTER_KEYS = new Set(CATEGORY_FILTERS.map(f => f.key));
module.exports = { CATEGORY_FILTERS, CATEGORY_FILTER_KEYS };
