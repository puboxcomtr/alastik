import { TireBNBReason } from '../../../lib/tires-api';

interface UIReason {
  text: string;
  prooflink?: string;
  upvotes?: number;
}

interface TireBNBProps {
  reasons: TireBNBReason[];
}

export function TireBNB({ reasons }: TireBNBProps) {
  const buyReasons: UIReason[] = Array.isArray(reasons)
    ? reasons
        .filter(r => r.type === 'buy')
        .map(r => ({ text: r.title || r.description, upvotes: Math.round((r as any).weight || r.weight || 0) }))
    : [];
  const notBuyReasons: UIReason[] = Array.isArray(reasons)
    ? reasons
        .filter(r => r.type === 'not_buy')
        .map(r => ({ text: r.title || r.description, upvotes: Math.round((r as any).weight || r.weight || 0) }))
    : [];

  return (
    <div className="bg-white rounded-lg shadow-sm border p-5">
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900">Kullanıcı Yorumları</h3>
      </div>

      <div className="space-y-6">
        {/* Satın Alma Nedenleri */}
        {buyReasons.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="font-semibold text-green-800">👍 Kullanıcıların Beğendiği Özellikler</h4>
              <span className="text-sm text-gray-500">({buyReasons.length} yorum)</span>
            </div>
            <div className="space-y-3">
              {buyReasons.map((reason, index) => (
                <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-4">
                      <p className="text-green-800 text-sm leading-relaxed mb-2">{reason.text}</p>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                          </svg>
                          <span className="text-green-700 font-medium text-sm">{reason.upvotes}</span>
                        </div>
                        {reason.prooflink && (
                          <a 
                            href={reason.prooflink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800 text-xs flex items-center space-x-1 transition-colors"
                          >
                            <span>Kaynak</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Satın Almama Nedenleri */}
        {notBuyReasons.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="font-semibold text-red-800">⚠️ Dikkat Edilmesi Gerekenler</h4>
              <span className="text-sm text-gray-500">({notBuyReasons.length} yorum)</span>
            </div>
            <div className="space-y-3">
              {notBuyReasons.map((reason, index) => (
                <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-4">
                      <p className="text-red-800 text-sm leading-relaxed mb-2">{reason.text}</p>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 113 0v6zM14 9.667v5.43a2 2 0 01-1.106 1.79l-.05.025A4 4 0 0111.057 18H5.64a2 2 0 01-1.962-1.608l-1.2-6A2 2 0 014.44 8H8V4a2 2 0 012-2 1 1 0 011 1v.667a4 4 0 01.8 2.4L13.2 7.933a4 4 0 01.8 2.4z" />
                          </svg>
                          <span className="text-red-700 font-medium text-sm">{reason.upvotes}</span>
                        </div>
                        {reason.prooflink && (
                          <a 
                            href={reason.prooflink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-red-600 hover:text-red-800 text-xs flex items-center space-x-1 transition-colors"
                          >
                            <span>Kaynak</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Eğer hiç yorum yoksa */}
        {buyReasons.length === 0 && notBuyReasons.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="font-medium">Henüz kullanıcı yorumu bulunmamaktadır</p>
            <p className="text-sm mt-1">Bu lastik için kullanıcı deneyimleri yakında eklenecektir.</p>
          </div>
        )}
      </div>

      {/* İstatistikler */}
      {(buyReasons.length > 0 || notBuyReasons.length > 0) && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{buyReasons.length}</div>
              <div className="text-sm text-green-700">Pozitif Yorum</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-600">{notBuyReasons.length}</div>
              <div className="text-sm text-red-700">Dikkat Noktası</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}