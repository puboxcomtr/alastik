// ============================================
// Yakıt Tipleri Çevirisi
// ============================================
const FUEL_TYPE_MAP: Record<string, string> = {
    'diesel': 'Dizel',
    'petrol': 'Benzin',
    'hybrid': 'Hibrit',
    'electric': 'Elektrik',
    'natural gas': 'Doğalgaz',
    'plug-in hybrid': 'Plug-in Hibrit',
    'lpg': 'LPG',
    'hydrogen': 'Hidrojen'
};

/**
 * Yakıt tipini Türkçeye çevirir
 * @example translateFuelType('Diesel') => 'Dizel'
 */
export const translateFuelType = (fuelType: string): string => {
    if (!fuelType) return '';
    return FUEL_TYPE_MAP[fuelType.toLowerCase()] || fuelType;
};

// ============================================
// Kasa Tipleri Çevirisi
// ============================================
const BODY_TYPE_MAP: Record<string, string> = {
    'saloon': 'Sedan',
    'sedan': 'Sedan',
    'convertible': 'Cabrio',
    'cabriolet': 'Cabrio',
    'coupe': 'Coupe',
    'coupé': 'Coupe',
    'estate': 'Station Wagon',
    'wagon': 'Station Wagon',
    'touring': 'Station Wagon',
    'hatchback': 'Hatchback',
    'compact': 'Kompakt',
    'suv': 'SUV',
    'crossover': 'Crossover',
    'mpv': 'MPV',
    'minivan': 'Minivan',
    'pickup': 'Pickup',
    'van': 'Van',
    'roadster': 'Roadster',
    'targa': 'Targa',
    'liftback': 'Liftback',
    'fastback': 'Fastback',
    'sportback': 'Sportback',
    'gran coupe': 'Gran Coupe',
    'gran turismo': 'Gran Turismo',
    'shooting brake': 'Shooting Brake'
};

// Kapı sayısı çevirisi
const DOOR_MAP: Record<string, string> = {
    '2d': '2 Kapı',
    '3d': '3 Kapı',
    '4d': '4 Kapı',
    '5d': '5 Kapı'
};

/**
 * Kasa tipini Türkçeye çevirir
 * @example translateBodyType('Saloon') => 'Sedan'
 * @example translateBodyType('Touring, 5d') => 'Station Wagon, 5 Kapı'
 * @example translateBodyType('Saloon (G20)') => 'Sedan (G20)'
 * @example translateBodyType('Convertible, 2d (E93)') => 'Cabrio, 2 Kapı (E93)'
 */
export const translateBodyType = (bodyType: string): string => {
    if (!bodyType) return '';

    let result = bodyType;

    // Parantez içini ayır ve sakla (model kodu)
    const modelCodeMatch = result.match(/\(([^)]+)\)/);
    const modelCode = modelCodeMatch ? modelCodeMatch[0] : '';

    // Parantezi geçici olarak kaldır
    if (modelCode) {
        result = result.replace(modelCode, '').trim();
    }

    // Kapı sayısını çevir (2d, 3d, 4d, 5d)
    Object.entries(DOOR_MAP).forEach(([en, tr]) => {
        const regex = new RegExp(`\\b${en}\\b`, 'gi');
        result = result.replace(regex, tr);
    });

    // Kasa tipini çevir
    Object.entries(BODY_TYPE_MAP).forEach(([en, tr]) => {
        const regex = new RegExp(`\\b${en}\\b`, 'gi');
        result = result.replace(regex, tr);
    });

    // Model kodunu geri ekle
    if (modelCode) {
        result = `${result.trim()} ${modelCode}`;
    }

    return result.trim();
};

// ============================================
// Toplu Çeviri (Opsiyonel)
// ============================================
export const translateVehicleInfo = (info: {
    fuelType?: string;
    bodyType?: string;
}) => ({
    fuelType: info.fuelType ? translateFuelType(info.fuelType) : '',
    bodyType: info.bodyType ? translateBodyType(info.bodyType) : ''
});