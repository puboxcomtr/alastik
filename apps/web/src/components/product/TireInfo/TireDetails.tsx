import { TireProductDetails } from '../../../lib/tires-api';

interface TireDetailsProps {
  details: TireProductDetails;
}

export function TireDetails({ details }: TireDetailsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-5">
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900">Temel Bilgiler</h3>
      </div>

      <div className="space-y-4">
        {/* Marka ve Model */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <span className="text-gray-600">Marka</span>
          <span className="font-medium text-gray-900">{details.brand.display}</span>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <span className="text-gray-600">Model</span>
          <span className="font-medium text-gray-900">{details.display}</span>
        </div>

        {/* Sezon */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <span className="text-gray-600">Sezon</span>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              details.season.slug === 'summer' ? 'bg-orange-100 text-orange-800' :
              details.season.slug === 'winter' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {details.season.display}
            </span>
          </div>
        </div>

        {/* Araç Tipi */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <span className="text-gray-600">Araç Tipi</span>
          <span className="font-medium text-gray-900">{details.automobile_type.display}</span>
        </div>

        {/* Üretim Yılı */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <span className="text-gray-600">Üretim Yılı</span>
          <span className="font-medium text-gray-900">{details.year}</span>
        </div>

        {/* Fiyat Segmenti */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <span className="text-gray-600">Fiyat Segmenti</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            details.brand.price_segment === 'Premium' ? 'bg-purple-100 text-purple-800' :
            details.brand.price_segment === 'Mid-Range' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {details.brand.price_segment}
          </span>
        </div>

        {/* Özel Özellikler */}
        {(details.is_runflat || details.studded || details.for_nordic_winter || details.is_oe_model) && (
          <div className="py-3">
            <span className="text-gray-600 block mb-2">Özel Özellikler</span>
            <div className="flex flex-wrap gap-2">
              {details.is_runflat && (
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                  Run-Flat
                </span>
              )}
              {details.studded && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  Çivili
                </span>
              )}
              {details.for_nordic_winter && (
                <span className="px-2 py-1 bg-cyan-100 text-cyan-800 rounded-full text-xs font-medium">
                  Nordic Kış
                </span>
              )}
              {details.is_oe_model && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  OE Model
                </span>
              )}
            </div>
          </div>
        )}

        {/* Performans Kategorisi */}
        {details.performance_category && (
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-600">Performans Kategorisi</span>
            <span className="font-medium text-gray-900">{details.performance_category.display}</span>
          </div>
        )}

        {/* Üretici Sayfası */}
        {details.manufacturer_page_link && (
          <div className="pt-4">
            <a
              href={details.manufacturer_page_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span>Üretici Sayfası</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
