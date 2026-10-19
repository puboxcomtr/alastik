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

export const translateFuelType = (fuelType: string): string => {
    if (!fuelType) return '';
    return FUEL_TYPE_MAP[fuelType.toLowerCase()] || fuelType;
};

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

const DOOR_MAP: Record<string, string> = {
    '2d': '2 Kapı',
    '3d': '3 Kapı',
    '4d': '4 Kapı',
    '5d': '5 Kapı'
};

export const translateBodyType = (bodyType: string): string => {
    if (!bodyType) return '';

    let result = bodyType;

    const modelCodeMatch = result.match(/\(([^)]+)\)/);
    const modelCode = modelCodeMatch ? modelCodeMatch[0] : '';

    if (modelCode) {
        result = result.replace(modelCode, '').trim();
    }

    Object.entries(DOOR_MAP).forEach(([en, tr]) => {
        const regex = new RegExp(`\\b${en}\\b`, 'gi');
        result = result.replace(regex, tr);
    });

    Object.entries(BODY_TYPE_MAP).forEach(([en, tr]) => {
        const regex = new RegExp(`\\b${en}\\b`, 'gi');
        result = result.replace(regex, tr);
    });

    if (modelCode) {
        result = `${result.trim()} ${modelCode}`;
    }

    return result.trim();
};

export const translateVehicleInfo = (info: {
    fuelType?: string;
    bodyType?: string;
}) => ({
    fuelType: info.fuelType ? translateFuelType(info.fuelType) : '',
    bodyType: info.bodyType ? translateBodyType(info.bodyType) : ''
});