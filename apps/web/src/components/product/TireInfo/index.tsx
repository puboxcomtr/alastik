'use client';

import { useState, useEffect } from 'react';
import { tiresApi, TireDataResult, TireMaterial } from '../../../lib/tires-api';
import { TireDetails } from './TireDetails';
import { TireRating } from './TireRating';
import { TireBNB } from './TireBNB';
import { TireMaterials } from './TireMaterials';
import { TireSpecs } from './TireSpecs';
import { LoadingSpinner } from './LoadingSpinner';

interface TireInfoProps {
  productName: string;
  className?: string;
}

export function TireInfo({ productName, className = '' }: TireInfoProps) {
  const [tireData, setTireData] = useState<TireDataResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTireData = async () => {
      if (!productName) return;

      try {
        setLoading(true);
        setError(null);
        
        const response = await tiresApi.getTireDataByProductName(productName);
        
        if (response.success && response.data) {
          setTireData(response.data);
        } else {
          setError('Lastik bilgileri bulunamadı');
        }
      } catch (err) {
        console.error('Lastik verileri yüklenirken hata:', err);
        setError('Lastik bilgileri yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchTireData();
  }, [productName]);

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-xl p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="font-semibold text-red-800">Lastik Bilgileri Yüklenemedi</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tireData) {
    return null;
  }

  // API response yapısına göre verileri parse et
  const details = tireData.details?.data || null;
  const bnbReasons = tireData.bnb?.data || null;
  const materials = tireData.materials?.data || null;
  const modes = tireData.modes?.data || null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Kompakt Başlık */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-4 text-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold">Detaylı Lastik Analizi</h2>
            <p className="text-white/80 text-sm">Performans ve teknik özellikler</p>
          </div>
        </div>
      </div>

      {/* Kompakt Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Lastik Detayları */}
        {details && <TireDetails details={details} />}
        
        {/* Lastik Özellikleri/Modes */}
        {modes && Array.isArray(modes) && <TireSpecs modes={modes} />}

        {/* Buy/Not Buy Nedenleri */}
        {bnbReasons && <TireBNB reasons={bnbReasons} />}
      </div>

      {/* Rating Bölümü (eğer varsa) */}
      {details?.rating && (
        <TireRating rating={details.rating} />
      )}

      {/* Materyaller - Tam Genişlik */}
      {materials && materials.length > 0 && (
        <TireMaterials materials={materials} />
      )}
    </div>
  );
}
