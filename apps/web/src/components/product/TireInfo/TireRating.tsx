interface TireRatingProps {
  rating: {
    score: number;
    popularity: number;
    tags: Array<{
      slug: string;
      display: string;
      connotation: string;
    }>;
  };
}

export function TireRating({ rating }: TireRatingProps) {
  const getConnotationColor = (connotation: string) => {
    switch (connotation) {
      case 'excellent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'good':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'average':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Performans Değerlendirmesi</h3>
      </div>

      <div className="space-y-6">
        {/* Genel Puan ve Popülerlik */}
        <div className="grid grid-cols-2 gap-4">
          {/* Genel Puan */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className={`text-3xl font-bold ${getScoreColor(rating.score)}`}>
              {rating.score}
            </div>
            <div className="text-sm text-gray-600 mt-1">Genel Puan</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${
                  rating.score >= 85 ? 'bg-green-500' :
                  rating.score >= 70 ? 'bg-blue-500' :
                  rating.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${rating.score}%` }}
              ></div>
            </div>
          </div>

          {/* Popülerlik */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className={`text-3xl font-bold ${getScoreColor(rating.popularity)}`}>
              {rating.popularity}
            </div>
            <div className="text-sm text-gray-600 mt-1">Popülerlik</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${
                  rating.popularity >= 85 ? 'bg-green-500' :
                  rating.popularity >= 70 ? 'bg-blue-500' :
                  rating.popularity >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${rating.popularity}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Performans Etiketleri */}
        {rating.tags && rating.tags.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Performans Özellikleri</h4>
            <div className="grid grid-cols-1 gap-2">
              {rating.tags.map((tag, index) => (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${getConnotationColor(tag.connotation)}`}
                >
                  <span className="font-medium">{tag.display}</span>
                  <div className="flex items-center space-x-2">
                    {tag.connotation === 'excellent' && (
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {tag.connotation === 'good' && (
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {tag.connotation === 'average' && (
                      <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                    {tag.connotation === 'poor' && (
                      <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="text-xs font-medium capitalize">{tag.connotation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
