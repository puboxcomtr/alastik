import { TireMaterial } from '../../../lib/tires-api';

interface TireMaterialsProps {
  materials: TireMaterial[];
}

export function TireMaterials({ materials }: TireMaterialsProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        );
      case 'article':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
      case 'test':
      case 'benchmark':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 001.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-red-100 text-red-800';
      case 'article':
        return 'bg-blue-100 text-blue-800';
      case 'test':
      case 'benchmark':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'video':
        return '🎥 Video İçerik';
      case 'article':
        return '📄 Makale';
      case 'test':
      case 'benchmark':
        return '🏆 Test Sonucu';
      default:
        return '📋 İçerik';
    }
  };

  // Materyalleri türe göre grupla
  const groupedMaterials = materials.reduce((acc, material) => {
    const type = material.type || 'link';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(material);
    return acc;
  }, {} as Record<string, TireMaterial[]>);

  return (
    <div className="bg-white rounded-lg shadow-sm border p-5">
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900">Test ve İncelemeler</h3>
          <p className="text-xs text-gray-600">Profesyonel analizler</p>
        </div>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{materials.length}</span>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedMaterials).map(([type, typeMaterials]) => (
          <div key={type}>
            <div className="flex items-center space-x-2 mb-4">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${getTypeColor(type)}`}>
                {getTypeIcon(type)}
              </div>
              <h4 className="font-semibold text-gray-900">{getTypeName(type)}</h4>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {typeMaterials.length} adet
              </span>
            </div>

            <div className="space-y-4">
              {typeMaterials.map((material, index) => {
                const materialUrl = material.url || material.link;
                const publishDate = material.published_at || material.date;
                
                return (
                  <div
                    key={index}
                    className="group p-6 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-lg transition-all duration-300 bg-white"
                  >
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Sol Taraf - Thumbnail */}
                      <div className="flex-shrink-0">
                        {material.thumbnail ? (
                          <div className="w-32 h-24 bg-gray-100 rounded-lg overflow-hidden">
                            <img 
                              src={material.thumbnail} 
                              alt={material.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = `
                                  <div class="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                                    ${getTypeIcon(material.type)}
                                  </div>
                                `;
                              }}
                            />
                          </div>
                        ) : (
                          <div className={`w-32 h-24 rounded-lg flex items-center justify-center ${getTypeColor(material.type)}`}>
                            <div className="text-2xl">
                              {getTypeIcon(material.type)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Sağ Taraf - İçerik */}
                      <div className="flex-1 min-w-0">
                        {/* Üst Kısım - Başlık ve Kaynak */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 mb-2 leading-tight">
                              {materialUrl ? (
                                <a 
                                  href={materialUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {material.title}
                                </a>
                              ) : (
                                material.title
                              )}
                            </h5>
                            
                            {/* Kaynak ve Tarih */}
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                              {material.source && (
                                <div className="flex items-center space-x-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.559-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.559.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                                  </svg>
                                  <span className="font-medium">{material.source}</span>
                                </div>
                              )}
                              
                              {publishDate && (
                                <div className="flex items-center space-x-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                  </svg>
                                  <span>{new Date(publishDate).toLocaleDateString('tr-TR')}</span>
                                </div>
                              )}

                              {material.language && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium uppercase">
                                  {material.language}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Sağ Üst - Tip Badge */}
                          <div className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(material.type)}`}>
                            {getTypeName(material.type)}
                          </div>
                        </div>

                        {/* Açıklama */}
                        {material.description && (
                          <p className="text-gray-700 mb-4 leading-relaxed line-clamp-3">
                            {material.description}
                          </p>
                        )}

                        {/* Etiketler */}
                        {material.tags_list && material.tags_list.length > 0 && (
                          <div className="mb-4">
                            <div className="flex flex-wrap gap-2">
                              {material.tags_list.slice(0, 6).map((tag, tagIndex) => (
                                <span 
                                  key={tagIndex}
                                  className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-200"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {material.tags_list.length > 6 && (
                                <span className="px-2 py-1 bg-gray-50 text-gray-600 rounded-md text-xs border border-gray-200">
                                  +{material.tags_list.length - 6} daha
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Alt Kısım - İstatistikler ve Aksiyon */}
                        <div className="flex items-center justify-between">
                          {/* Sol - İstatistikler */}
                          <div className="flex items-center space-x-6 text-sm text-gray-500">
                            {material.author && (
                              <div className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium">{material.author}</span>
                              </div>
                            )}

                            {material.duration && (
                              <div className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                <span>{material.duration}</span>
                              </div>
                            )}

                            {material.views && (
                              <div className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M10 18C4.477 18 0 14 0 10s4.477-8 10-8 10 4 10 8-4.477 8-10 8zm0-14a6 6 0 100 12 6 6 0 000-12z" clipRule="evenodd" />
                                </svg>
                                <span>{material.views.toLocaleString()} görüntülenme</span>
                              </div>
                            )}

                            {material.likes && (
                              <div className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                </svg>
                                <span>{material.likes.toLocaleString()} beğeni</span>
                              </div>
                            )}

                            {material.rating && (
                              <div className="flex items-center space-x-1">
                                <div className="flex space-x-1">
                                  {[1,2,3,4,5].map(star => (
                                    <svg 
                                      key={star}
                                      className={`w-4 h-4 ${star <= material.rating! ? 'text-yellow-400' : 'text-gray-300'}`}
                                      fill="currentColor" 
                                      viewBox="0 0 20 20"
                                    >
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                    </svg>
                                  ))}
                                </div>
                                <span className="font-medium">({material.rating}/5)</span>
                              </div>
                            )}
                          </div>

                          {/* Sağ - Link Butonu */}
                          {materialUrl && (
                            <a
                              href={materialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors group-hover:shadow-lg"
                            >
                              <span>
                                {material.type === 'video' ? '▶ İzle' : 
                                 material.type === 'article' ? '📖 Oku' : 
                                 material.type === 'test' || material.type === 'benchmark' ? '📊 Sonuçları Gör' : 
                                 '🔗 Git'}
                              </span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Boş durum */}
      {materials.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h4 className="font-medium text-gray-900 mb-2">Henüz test sonucu bulunmamaktadır</h4>
          <p className="text-sm">Bu lastik için profesyonel test sonuçları ve incelemeler yakında eklenecektir.</p>
        </div>
      )}

      {/* İstatistikler */}
      {materials.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{materials.length}</div>
              <div className="text-sm text-blue-700">Toplam İçerik</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {Object.keys(groupedMaterials).length}
              </div>
              <div className="text-sm text-green-700">Farklı Tür</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {materials.filter(m => m.type === 'test' || m.type === 'benchmark').length}
              </div>
              <div className="text-sm text-purple-700">Test Sonucu</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {materials.filter(m => m.type === 'video').length}
              </div>
              <div className="text-sm text-orange-700">Video İçerik</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}