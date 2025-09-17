import { TireMode } from '../../../lib/tires-api';

interface TireModeData {
  sizing_system: string;
  text: string;
  load_index: number;
  dual_load_index?: number;
  speed_index: string;
  extra_load: boolean;
  mud_and_snow: boolean;
  rim_protection: boolean;
  tire_width: number;
  tire_height: number;
  rim_diameter: number;
  overall_diameter?: number;
  tread_width?: number;
  max_pressure?: number;
  weight?: number;
}

interface TireSpecsProps {
  modes: TireMode[];
}

export function TireSpecs({ modes }: TireSpecsProps) {
  if (!modes || modes.length === 0) {
    return null;
  }

  // API'den gelen TireMode -> UI için beklenen TireModeData'ya normalize et
  const normalizedModes: TireModeData[] = modes.map(mode => ({
    sizing_system: 'metric',
    text: mode.size,
    // load_index bazı API'lerde string olabilir; sayıya çevrilemiyorsa olduğu gibi bırak
    load_index: (typeof mode.load_index === 'string' ? parseInt(mode.load_index, 10) : (mode.load_index as unknown as number)) || (mode as unknown as any).load_index || 0,
    dual_load_index: undefined,
    speed_index: (mode as unknown as any).speed_index || mode.speed_rating,
    extra_load: (mode as unknown as any).extra_load ?? false,
    mud_and_snow: (mode as unknown as any).mud_and_snow ?? false,
    rim_protection: (mode as unknown as any).rim_protection ?? false,
    tire_width: (mode as unknown as any).tire_width ?? mode.width,
    tire_height: (mode as unknown as any).tire_height ?? mode.sidewall,
    rim_diameter: (mode as unknown as any).rim_diameter ?? mode.diameter,
    overall_diameter: (mode as unknown as any).overall_diameter,
    tread_width: (mode as unknown as any).tread_width,
    max_pressure: (mode as unknown as any).max_pressure,
    weight: (mode as unknown as any).weight,
  }));

  // İlk ebatı ana örnek olarak al
  const primaryMode = normalizedModes[0];
  
  return (
    <div className="bg-white rounded-lg shadow-sm border p-5">
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900">Teknik Özellikler</h3>
      </div>

      <div className="space-y-6">
        {/* Ana Ebat Bilgileri */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Temel Ebat: {primaryMode.text}</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{primaryMode.tire_width}</div>
              <div className="text-xs text-gray-600">Genişlik (mm)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{primaryMode.tire_height}</div>
              <div className="text-xs text-gray-600">Yükseklik (%)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">R{primaryMode.rim_diameter}</div>
              <div className="text-xs text-gray-600">Jant Çapı (inç)</div>
            </div>
          </div>
        </div>

        {/* Performans İndeksleri */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Yük İndeksi</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{primaryMode.load_index}</div>
            <div className="text-xs text-gray-500">Maksimum yük kapasitesi</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Hız İndeksi</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{primaryMode.speed_index}</div>
            <div className="text-xs text-gray-500">Maksimum hız sınırı</div>
          </div>
        </div>

        {/* Özel Özellikler */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Özel Özellikler</h4>
          <div className="flex flex-wrap gap-2">
            {primaryMode.extra_load && (
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                ⚡ Extra Load (XL)
              </span>
            )}
            {primaryMode.mud_and_snow && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                ❄️ M+S (Çamur + Kar)
              </span>
            )}
            {primaryMode.rim_protection && (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                🛡️ Jant Koruması
              </span>
            )}
          </div>
        </div>

        {/* Fiziksel Özellikler */}
        {(primaryMode.overall_diameter || primaryMode.tread_width || primaryMode.max_pressure || primaryMode.weight) && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Fiziksel Özellikler</h4>
            <div className="grid grid-cols-2 gap-3">
              {primaryMode.overall_diameter && (
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Toplam Çap:</span>
                  <span className="text-sm font-medium">{primaryMode.overall_diameter} mm</span>
                </div>
              )}
              {primaryMode.tread_width && (
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Taban Genişliği:</span>
                  <span className="text-sm font-medium">{primaryMode.tread_width} mm</span>
                </div>
              )}
              {primaryMode.max_pressure && (
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Max Basınç:</span>
                  <span className="text-sm font-medium">{primaryMode.max_pressure} bar</span>
                </div>
              )}
              {primaryMode.weight && (
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Ağırlık:</span>
                  <span className="text-sm font-medium">{primaryMode.weight} kg</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mevcut Ebatlar */}
        {modes.length > 1 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Mevcut Ebatlar ({modes.length} farklı ebat)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {modes.map((mode, index) => (
                <div 
                  key={index}
                  className={`p-2 rounded border text-sm ${
                    index === 0 
                      ? 'bg-purple-50 border-purple-200 text-purple-800 font-medium' 
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                >
                  {mode.size}
                  {/* {mode.extra_load && <span className="ml-1 text-orange-600">XL</span>} */}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}