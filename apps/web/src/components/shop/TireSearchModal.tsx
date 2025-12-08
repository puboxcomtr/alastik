'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback } from 'react';
import { backendApi } from '../../src/lib/backend-api';

interface TireSearchModalProps {
  onSearchComplete?: (searchData: any) => void;
}

export default function TireSearchModal({ onSearchComplete }: TireSearchModalProps) {
  const [selectedMarka, setSelectedMarka] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedYil, setSelectedYil] = useState<string>('');
  const [selectedModifikasyon, setSelectedModifikasyon] = useState<string>('');
  
  const [markalar, setMarkalar] = useState<any[]>([]);
  const [modeller, setModeller] = useState<any[]>([]);
  const [yillar, setYillar] = useState<any[]>([]);
  const [modifikasyonlar, setModifikasyonlar] = useState<any[]>([]);
  
  const [loading, setLoading] = useState({
    markalar: false,
    modeller: false,
    yillar: false,
    modifikasyonlar: false
  });

  // Markaları yükle
  useEffect(() => {
    loadMarkalar();
  }, []);

  const loadMarkalar = async () => {
    setLoading(prev => ({ ...prev, markalar: true }));
    console.log('🔍 [TIRE SEARCH] Markalar yükleniyor...', {
      timestamp: new Date().toISOString()
    });
    
    try {
      const response = await backendApi.arac.markalar({ bolgeler: ['eudm'] });
      
      console.log('📊 [TIRE SEARCH] Markalar yüklendi:', {
        success: response.basarili,
        markaCount: response.veri ? response.veri.length : 0,
        sampleMarkalar: response.veri ? response.veri.slice(0, 5).map(m => ({ slug: m.slug, name: m.name })) : null,
        timestamp: new Date().toISOString()
      });
      
      if (response.basarili && response.veri) {
        setMarkalar(response.veri);
      }
    } catch (error) {
      console.error('❌ [TIRE SEARCH] Markalar yüklenemedi:', error);
    } finally {
      setLoading(prev => ({ ...prev, markalar: false }));
    }
  };

  // Marka seçildiğinde modelleri yükle
  const loadModellerCallback = useCallback(async (marka: string) => {
    setLoading(prev => ({ ...prev, modeller: true }));
    console.log('🔍 [TIRE SEARCH] Modeller yükleniyor...', {
      marka,
      timestamp: new Date().toISOString()
    });
    
    try {
      const response = await backendApi.arac.modeller(marka, { bolgeler: ['eudm'] });
      
      console.log('📊 [TIRE SEARCH] Modeller yüklendi:', {
        marka,
        success: response.basarili,
        modelCount: response.veri ? response.veri.length : 0,
        sampleModeller: response.veri ? response.veri.slice(0, 5).map(m => ({ slug: m.slug, name: m.name })) : null,
        timestamp: new Date().toISOString()
      });
      
      if (response.basarili && response.veri) {
        setModeller(response.veri);
      }
    } catch (error) {
      console.error('❌ [TIRE SEARCH] Modeller yüklenemedi:', error);
    } finally {
      setLoading(prev => ({ ...prev, modeller: false }));
    }
  }, []);

  useEffect(() => {
    if (selectedMarka) {
      loadModellerCallback(selectedMarka);
      // Diğer seçimleri sıfırla
      setSelectedModel('');
      setSelectedYil('');
      setSelectedModifikasyon('');
      setYillar([]);
      setModifikasyonlar([]);
    }
  }, [selectedMarka, loadModellerCallback]);

  // Model seçildiğinde yılları yükle
  const loadYillarCallback = useCallback(async (marka: string, model: string) => {
    setLoading(prev => ({ ...prev, yillar: true }));
    console.log('🔍 [TIRE SEARCH] Yıllar yükleniyor...', {
      marka,
      model,
      timestamp: new Date().toISOString()
    });
    
    try {
      const response = await backendApi.arac.yillar(marka, model);
      
      console.log('📊 [TIRE SEARCH] Yıllar yüklendi:', {
        marka,
        model,
        success: response.basarili,
        yilCount: response.veri ? response.veri.length : 0,
        yillar: response.veri ? response.veri.slice(0, 10).map(y => y.name) : null,
        timestamp: new Date().toISOString()
      });
      
      if (response.basarili && response.veri) {
        setYillar(response.veri);
      }
    } catch (error) {
      console.error('❌ [TIRE SEARCH] Yıllar yüklenemedi:', error);
    } finally {
      setLoading(prev => ({ ...prev, yillar: false }));
    }
  }, []);

  useEffect(() => {
    if (selectedMarka && selectedModel) {
      loadYillarCallback(selectedMarka, selectedModel);
      // Sonraki seçimleri sıfırla
      setSelectedYil('');
      setSelectedModifikasyon('');
      setModifikasyonlar([]);
    }
  }, [selectedMarka, selectedModel, loadYillarCallback]);

  const loadModifikasyonlar = useCallback(async (marka: string, model: string, yil: number) => {
    setLoading(prev => ({ ...prev, modifikasyonlar: true }));
    console.log('🔍 [TIRE SEARCH] Modifikasyonlar yükleniyor...', {
      marka,
      model,
      yil,
      timestamp: new Date().toISOString()
    });
    
    try {
      const response = await backendApi.arac.modifikasyonlar(marka, model, yil);
      
      console.log('📊 [TIRE SEARCH] Modifikasyonlar yüklendi:', {
        marka,
        model,
        yil,
        success: response.basarili,
        modifikasyonCount: response.veri ? response.veri.length : 0,
        sampleModifikasyonlar: response.veri ? response.veri.slice(0, 3).map(m => ({ id: m.id, name: m.name })) : null,
        timestamp: new Date().toISOString()
      });
      
      if (response.basarili && response.veri) {
        setModifikasyonlar(response.veri);
      } else {
        console.warn('⚠️ [TIRE SEARCH] Modifikasyonlar yüklenemedi:', {
          success: response.basarili,
          hata: response.hata,
          mesaj: response.mesaj
        });
        // Kullanıcıya hata mesajı göster
        if (response.hata || response.mesaj) {
          alert(`Modifikasyonlar yüklenirken hata: ${response.hata || response.mesaj}`);
        }
      }
    } catch (error) {
      console.error('❌ [TIRE SEARCH] Modifikasyonlar yüklenemedi:', error);
      alert(`Modifikasyonlar yüklenirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setLoading(prev => ({ ...prev, modifikasyonlar: false }));
    }
  }, []);

  // Yıl seçildiğinde modifikasyonları yükle
  useEffect(() => {
    if (selectedMarka && selectedModel && selectedYil) {
      loadModifikasyonlar(selectedMarka, selectedModel, parseInt(selectedYil));
      setSelectedModifikasyon('');
    }
  }, [selectedMarka, selectedModel, selectedYil, loadModifikasyonlar]);

  const handleSearch = async () => {
    if (!selectedMarka || !selectedModel || !selectedYil) {
      alert('Lütfen tüm alanları doldurunuz');
      return;
    }

    console.log('🎯 [TIRE SEARCH] Final arama başlatılıyor...', {
      marka: selectedMarka,
      model: selectedModel,
      yil: selectedYil,
      modifikasyon: selectedModifikasyon,
      timestamp: new Date().toISOString()
    });

    const navigateToCategory = (url: string) => {
      console.log('🧭 [TIRE SEARCH][NAVIGATE_START]', { url, ts: new Date().toISOString() });
      try {
        // Bootstrap modal / offcanvas kalıntılarını temizle
        const body = document.body;
        body.classList.remove('modal-open');
        body.classList.remove('offcanvas-backdrop');
        body.style.removeProperty('paddingRight');
        document.querySelectorAll('.modal-backdrop, .offcanvas-backdrop').forEach(el => el.parentElement?.removeChild(el));
        const modalEl = document.getElementById('tireSearch');
        if (modalEl) modalEl.classList.remove('show');
      } catch (e) {
        console.warn('Modal temizliği sırasında uyarı:', e);
      }
      try {
        // Log stoğu çok büyüdüyse engel olmasın diye temizle
        localStorage.removeItem('web_logs');
      } catch {}

      // Navigasyon için sağlamlaştırılmış yönlendirme
      const attemptUrl = url;
      try { sessionStorage.setItem('force_category_url', attemptUrl); } catch {}
      setTimeout(() => {
        console.log('🧭 [TIRE SEARCH][NAVIGATE_ATTEMPT_1]', { attemptUrl });
        window.location.replace(attemptUrl);
        setTimeout(() => {
          if (!window.location.pathname.includes('/category')) {
            console.warn('🧭 [TIRE SEARCH][NAVIGATE_RETRY]', { attemptUrl });
            window.location.href = attemptUrl;
          }
        }, 600);
      }, 100);
    };

    try {
      const response = await backendApi.arac.modelArama({
        marka: selectedMarka,
        model: selectedModel,
        yil: parseInt(selectedYil),
        modifikasyon: selectedModifikasyon,
        bolge: 'eudm'
      });

      console.log('🎉 [TIRE SEARCH] Final arama tamamlandı:', {
        marka: selectedMarka,
        model: selectedModel,
        yil: selectedYil,
        modifikasyon: selectedModifikasyon,
        success: response.basarili,
        hasLastikler: response.veri?.lastikler ? response.veri.lastikler.length : 0,
        hasJantlar: response.veri?.jantlar ? response.veri.jantlar.length : 0,
        sampleLastikler: response.veri?.lastikler ? response.veri.lastikler.slice(0, 3) : null,
        timestamp: new Date().toISOString()
      });

      if (response.basarili && response.veri) {
        console.log('✅ [TIRE SEARCH] Modal kapatılıyor ve callback çağrılıyor...', {
          hasLastikler: response.veri.lastikler ? response.veri.lastikler.length : 0,
          hasJantlar: response.veri.jantlar ? response.veri.jantlar.length : 0,
          timestamp: new Date().toISOString()
        });

        // Modal'ı kapat
        const modal = document.getElementById('tireSearch') as HTMLElement | null;
        if (modal) {
          console.log('🔧 [TIRE SEARCH] Modal element bulundu, kapatılıyor...');
          try {
            const bs = (window as any).bootstrap;
            if (bs && bs.Modal) {
              const instance = bs.Modal.getInstance(modal) || bs.Modal.getOrCreateInstance(modal);
              instance.hide();
            } else {
              // Bootstrap yoksa manuel olarak gizle/temizle
              modal.classList.remove('show');
              modal.setAttribute('aria-hidden', 'true');
              if ((modal as any).style) {
                (modal as any).style.display = 'none';
              }
              document.querySelectorAll('.modal-backdrop').forEach(el => el.parentElement?.removeChild(el));
              document.body.classList.remove('modal-open');
              if (document.body && (document.body as any).style) {
                document.body.style.removeProperty('paddingRight');
              }
            }
            console.log('✅ [TIRE SEARCH] Modal kapatıldı');
          } catch (e) {
            console.warn('⚠️ [TIRE SEARCH] Modal kapatma sırasında uyarı:', e);
          }
        } else {
          console.error('❌ [TIRE SEARCH] Modal element bulunamadı!');
        }

        // Arama sonuçlarını gönder
        if (onSearchComplete) {
          console.log('📞 [TIRE SEARCH] onSearchComplete callback çağrılıyor...', {
            callbackData: {
              marka: selectedMarka,
              model: selectedModel,
              yil: selectedYil,
              modifikasyon: selectedModifikasyon,
              sonuclar: response.veri
            },
            timestamp: new Date().toISOString()
          });
          
          const callbackResult = onSearchComplete({
            marka: selectedMarka,
            model: selectedModel,
            yil: selectedYil,
            modifikasyon: selectedModifikasyon,
            sonuclar: response.veri
          });
          
          console.log('🎉 [TIRE SEARCH] onSearchComplete callback tamamlandı:', {
            callbackResult,
            timestamp: new Date().toISOString()
          });
        }

        // Her durumda kategori sayfasına yönlendir
        const params = new URLSearchParams({
          tip: 'arac',
          marka: selectedMarka,
          model: selectedModel,
          yil: selectedYil
        });
        if (selectedModifikasyon) params.append('modifikasyon', selectedModifikasyon);
        const categoryUrl = `/category?${params.toString()}`;
        console.log('🎯 [TIRE SEARCH] Başarılı arama sonrası kategoriye gidiliyor:', { categoryUrl });
        navigateToCategory(categoryUrl);
      } else {
        console.warn('⚠️ [TIRE SEARCH] Arama başarısız:', {
          success: response.basarili,
          hata: response.hata,
          mesaj: response.mesaj
        });
        // Kullanıcıya hata mesajı göster
        if (response.hata || response.mesaj) {
          alert(`Arama sırasında hata: ${response.hata || response.mesaj}`);
        } else {
          alert('Arama sonucu bulunamadı');
        }

        // Başarısız olsa dahi kategori sayfasına yönlendir (sonuç yok ekranı göstereceğiz)
        const params = new URLSearchParams({
          tip: 'arac',
          marka: selectedMarka,
          model: selectedModel,
          yil: selectedYil
        });
        if (selectedModifikasyon) params.append('modifikasyon', selectedModifikasyon);
        const categoryUrl = `/category?${params.toString()}`;
        console.log('➡️ [TIRE SEARCH] Başarısız arama sonrası yine de kategoriye gidiliyor:', { categoryUrl });
        navigateToCategory(categoryUrl);
      }
    } catch (error) {
      console.error('❌ [TIRE SEARCH] Final arama hatası:', error);
      alert(`Arama sırasında hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);

      // Hata olsa bile kategori sayfasına yönlendir (kategori sayfası hata mesajını gösterecek)
      const params = new URLSearchParams({
        tip: 'arac',
        marka: selectedMarka,
        model: selectedModel,
        yil: selectedYil
      });
      if (selectedModifikasyon) params.append('modifikasyon', selectedModifikasyon);
      const categoryUrl = `/category?${params.toString()}`;
      console.log('➡️ [TIRE SEARCH] Hata sonrası kategoriye gidiliyor:', { categoryUrl });
      navigateToCategory(categoryUrl);
    }
  };

  return (
    <div 
      className="modal fade" 
      id="tireSearch" 
      tabIndex={-1} 
      role="dialog" 
      aria-labelledby="tireSearchLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="tireSearchLabel">Araca Göre Lastik Arama</h5>
            <button 
              type="button" 
              className="btn-close" 
              data-bs-dismiss="modal" 
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <form>
              {/* Marka Seçimi */}
              <div className="mb-3">
                <label htmlFor="marka" className="form-label">Marka</label>
                <select 
                  className="form-select" 
                  id="marka"
                  value={selectedMarka}
                  onChange={(e) => setSelectedMarka(e.target.value)}
                  disabled={loading.markalar}
                >
                  <option value="">Marka Seçiniz</option>
                  {markalar.map((marka) => (
                    <option key={marka.slug} value={marka.slug}>
                      {marka.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model Seçimi */}
              <div className="mb-3">
                <label htmlFor="model" className="form-label">Model</label>
                <select 
                  className="form-select" 
                  id="model"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={!selectedMarka || loading.modeller}
                >
                  <option value="">Model Seçiniz</option>
                  {modeller.map((model) => (
                    <option key={model.slug} value={model.slug}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Yıl Seçimi */}
              <div className="mb-3">
                <label htmlFor="yil" className="form-label">Yıl</label>
                <select 
                  className="form-select" 
                  id="yil"
                  value={selectedYil}
                  onChange={(e) => setSelectedYil(e.target.value)}
                  disabled={!selectedModel || loading.yillar}
                >
                  <option value="">Yıl Seçiniz</option>
                  {yillar.map((yil) => (
                    <option key={yil.slug} value={yil.slug}>
                      {yil.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Modifikasyon Seçimi (Opsiyonel) */}
              <div className="mb-3">
                <label htmlFor="modifikasyon" className="form-label">
                  Modifikasyon <small className="text-muted">(Opsiyonel)</small>
                </label>
                <select 
                  className="form-select" 
                  id="modifikasyon"
                  value={selectedModifikasyon}
                  onChange={(e) => setSelectedModifikasyon(e.target.value)}
                  disabled={!selectedYil || loading.modifikasyonlar}
                >
                  <option value="">Tüm Modifikasyonlar</option>
                  {modifikasyonlar.map((mod, index) => (
                    <option key={mod.id || index} value={mod.slug || mod.id}>
                      {mod.name || mod.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Araç Resmi Preview */}
              {modifikasyonlar.length > 0 && modifikasyonlar[0].generation?.bodies?.[0]?.image && (
                <div className="mb-3">
                  <label className="form-label">Araç Görünümü</label>
                  <div className="text-center">
                    <img 
                      src={modifikasyonlar[0].generation.bodies[0].image}
                      alt={`${selectedMarka} ${selectedModel} ${selectedYil}`}
                      className="img-fluid rounded"
                      style={{ maxHeight: '200px', objectFit: 'contain' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="small text-muted mt-2">
                      {modifikasyonlar[0].generation?.bodies?.[0]?.name}
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              data-bs-dismiss="modal"
            >
              Kapat
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleSearch}
              disabled={!selectedMarka || !selectedModel || !selectedYil}
            >
              Lastik Ara
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}