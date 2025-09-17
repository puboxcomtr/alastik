'use client';
/* Global */
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/* Next Js*/
import Link from 'next/link';
import Image from 'next/image';

/* API & Data */
import { backendApi } from '@lib/backend-api';

/* @Import Page */
import Breadcrumb from "@/src/components/category/Header/Breadcrumb";
import Title from "@/src/components/category/Header/Title";

/* Cart */
import cartService from '@lib/cartService';

/* Library */
import toast from '@lib/toast';
import { logger } from '@lib/logger';
import authService from '@lib/auth';

/* Page Import */
import { cartUtils } from '@components/cart/ShoppingCart';

/* Lazy Image  */
import LazyImage from '@components/ui/LazyImage';

/* CSS */
import styles from './category.module.css';
import TireLoadingAnimation from './TireLoadingAnimation';

interface Product {
  _id: string;
  name: string;
  brand: string;
  sku: string;
  price: number;
  originalPrice?: number;
  stock: number;
  specifications: {
    size: string;
    width: number;
    aspectRatio: number;
    rimDiameter: number;
    season: string;
    loadIndex: string;
    speedIndex: string;
    vehicleType: string;
    fuelEfficiency?: string;
    wetGrip?: string;
    noiseLevel?: number;
    runflat: boolean;
    reinforced: boolean;
  };
  images: Array<{
    url: string;
    alt?: string;
    isPrimary: boolean;
  }>;
  rating: {
    average: number;
    count: number;
  };
  stockStatus: string;
  isActive: boolean;
}
interface VehicleInfo {
  marka: string;
  model: string;
  yil: string;
  modifikasyon?: string | null;
  name?: string;
  engine?: {
    fuel: string;
    capacity: string;
    power: string | number;
  };
  availableSizes: string[];
  image?: string;
  bodyType?: string;
  combinations?: WheelCombination[];
}

interface TireSize {
  genislik: number;
  yanak: number;
  cap: number;
  ebat: string;
}
interface WheelEndInfo {
  rim?: string;
  rim_diameter?: number;
  rim_width?: number;
  rim_offset?: number;
  tire_full?: string;
  tire?: string;
  load_index?: number | string;
  speed_index?: string;
  pressure?: { bar?: number; psi?: number; kPa?: number } | null;
  tire_width?: number;
  tire_aspect_ratio?: number;
  tire_diameter_mm?: number;
  tire_weight_kg?: number;
}
interface WheelCombination {
  sira: number;
  stokta: boolean;
  kisUygun: boolean;
  runflat: boolean;
  on: WheelEndInfo | null;
  arka: WheelEndInfo | null;
}
interface ComboOption {
  label: string; // "245/40R19 - 275/35R19"
  on: { genislik: number; yanak: number; cap: number; ebat: string };
  arka: { genislik: number; yanak: number; cap: number; ebat: string };
}
interface CombinedProduct {
  brand: string;
  front: Product;
  rear: Product;
}
function CategoryPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // URL parametreleri
  const tip = searchParams.get('tip');
  const kategori = searchParams.get('kategori');
  const marka = searchParams.get('marka');
  const model = searchParams.get('model');
  const yil = searchParams.get('yil');
  const modifikasyon = searchParams.get('modifikasyon');
  const ebatQuery = searchParams.get('ebat');
  const teknolojiQuery = searchParams.get('teknoloji');
  const desenQuery = searchParams.get('desen');
  const genelArama = searchParams.get('q'); // Genel arama terimi

  // Jant araması için parametreler
  const genislik = searchParams.get('genislik');
  const yanak = searchParams.get('yanak');
  const cap = searchParams.get('cap');
  const mevsim = searchParams.get('mevsim');

  // State'ler
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
  const [availableSizes, setAvailableSizes] = useState<TireSize[]>([]);
  const [selectedSize, setSelectedSize] = useState<TireSize | null>(null);
  const [availableCombos, setAvailableCombos] = useState<ComboOption[]>([]);
  const [selectedCombo, setSelectedCombo] = useState<ComboOption | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [combinedProducts, setCombinedProducts] = useState<CombinedProduct[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);

  // Kategoriye gelince olası modal/backdrop kalıntılarını temizle
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('paddingRight');
        document.querySelectorAll('.modal-backdrop').forEach(el => el.parentElement?.removeChild(el));
        const tireSearchEl = document.getElementById('tireSearch');
        if (tireSearchEl) tireSearchEl.classList.remove('show');
      } catch (e) {
        console.warn('Modal temizliği uyarısı:', e);
      }
    }
  }, []);

  // Filtreler
  const [filters, setFilters] = useState({
    mevsim: 'tum',
    markalar: [] as string[],
    minFiyat: 0,
    maxFiyat: 10000,
    siralamaTipi: 'oneri' // oneri, fiyat-asc, fiyat-desc, rating
  });

  // Sıralama fonksiyonu
  const sortProducts = useCallback((productsToSort: Product[]) => {
    const sortedProducts = [...productsToSort];

    switch (filters.siralamaTipi) {
      case 'fiyat-asc':
        return sortedProducts.sort((a, b) => {
          const priceA = (a as any).realPrice || a.price;
          const priceB = (b as any).realPrice || b.price;
          return priceA - priceB;
        });
      case 'fiyat-desc':
        return sortedProducts.sort((a, b) => {
          const priceA = (a as any).realPrice || a.price;
          const priceB = (b as any).realPrice || b.price;
          return priceB - priceA;
        });
      case 'rating':
        return sortedProducts.sort((a, b) => b.rating.average - a.rating.average);
      case 'oneri':
      default:
        // Önerilen sıralama: Stokta olanlar önce, sonra rating, sonra fiyat
        return sortedProducts.sort((a, b) => {
          const stockA = (a as any).stockStatus === 'in_stock' ? 1 : 0;
          const stockB = (b as any).stockStatus === 'in_stock' ? 1 : 0;

          if (stockA !== stockB) return stockB - stockA;

          if (a.rating.average !== b.rating.average) {
            return b.rating.average - a.rating.average;
          }

          const priceA = (a as any).realPrice || a.price;
          const priceB = (b as any).realPrice || b.price;
          return priceA - priceB;
        });
    }
  }, [filters.siralamaTipi]);
  // Lastik detay sayfasına yönlendirme
  const handleProductClick = (product: any) => {
    // Türkçe karakterleri URL-safe hale getir
    const turkishToEnglish = (str: string) => {
      const map: { [key: string]: string } = {
        'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
        'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'
      };
      return str.replace(/[çğıöşüÇĞİÖŞÜ]/g, (match) => map[match] || match);
    };

    // Brand ve product slug'larını oluştur
    const brandSlug = turkishToEnglish(product.brand || 'lastik')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const productSlug = turkishToEnglish(product.name || 'urun')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // ASCII normalize helper (kombine işaretleri temizle)
    const normalizeAscii = (s: string) =>
      turkishToEnglish(s || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '');

    // Detay sayfasına yönlendir (tek slug + marka/model ipuçları)
    const brandParam = encodeURIComponent(normalizeAscii(product.brand || (product as any).marka || '').toLowerCase());
    const nameParam = encodeURIComponent(normalizeAscii(product.name || (product as any).model || ''));
    router.push(`/product/${productSlug}?wheelsize_id=${product._id}&brand=${brandParam}&name=${nameParam}`);
  };

  // Sepete ekleme fonksiyonu
  const handleAddToCart = useCallback(async (product: Product) => {
    try {
      // Ortak ürün objesi
      const productId = (product as any).diaProductCode || product._id;
      const name = product.name;
      const brand = (product as any).realBrand || product.brand;
      const price = (product as any).realPrice || product.price;
      const size = product.specifications.size;
      const imageUrl = product.images.find(img => img.isPrimary)?.url || '';

      if (authService.getToken && authService.getToken()) {
        // Auth kullanıcı: backend'e ekle
        const payload = {
          productId,
          name,
          brand,
          sku: productId,
          price,
          originalPrice: product.price,
          quantity: 1,
          specifications: {
            size,
            width: product.specifications.width,
            aspectRatio: product.specifications.aspectRatio,
            rimDiameter: product.specifications.rimDiameter,
            season: product.specifications.season,
            loadIndex: product.specifications.loadIndex,
            speedIndex: product.specifications.speedIndex
          },
          images: imageUrl ? [{ url: imageUrl, alt: name, isPrimary: true }] : []
        };
        const res = await authService.authenticatedRequest('/cart/add', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data?.success) throw new Error(data?.message || 'Sepete eklenemedi');
        // Event: her dinleyici kendisi taze veriyi çeksin (detail ile güvenli)
        try {
          const summary = await cartService.getCartSummary();
          const detail = summary ? { itemCount: summary.itemCount, totalPrice: summary.totalPrice } : undefined;
          window.dispatchEvent(new CustomEvent('cartUpdated', { detail }));
        } catch {
          window.dispatchEvent(new CustomEvent('cartUpdated'));
        }
      } else {
        // Misafir: local sepet
        cartUtils.addToCart({ id: productId, name, brand, size, price, image: imageUrl, stockStatus: 'in_stock', maxStock: (product as any).realStock || product.stock || 99 });
        // Local sepet için de detail gönder
        try {
          const summary = await cartService.getCartSummary();
          const detail = summary ? { itemCount: summary.itemCount, totalPrice: summary.totalPrice } : undefined;
          window.dispatchEvent(new CustomEvent('cartUpdated', { detail }));
        } catch {
          window.dispatchEvent(new CustomEvent('cartUpdated'));
        }
      }

      logger.logUserAction('ADD_TO_CART', { productId, productName: name, brand, price, size });
      toast.cart.addedToCart(name);
    } catch (error) {
      console.error('Sepete ekleme hatası:', error);
      logger.logError('ADD_TO_CART_ERROR', error);
      toast.error('Ürün sepete eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  }, []);

  // Araç bilgilerini ve uygun lastik ebatlarını yükle
  const loadVehicleInfo = useCallback(async () => {
    if (!marka || !model || !yil) return;

    try {
      setLoading(true);

      // Logger ile kullanıcı aksiyonunu logla
      logger.logUserAction('VEHICLE_INFO_LOAD_START', { marka, model, yil, modifikasyon });

      // Araç bilgileri yükleniyor...

      const response = await backendApi.arac.modelArama({
        marka,
        model,
        yil: parseInt(yil),
        modifikasyon: modifikasyon || undefined,
        bolge: 'eudm'
      });

      console.log('📊 [CATEGORY] Araç bilgileri yanıtı:', response);

      if (response.basarili && response.veri && (
        (Array.isArray(response.veri) && response.veri.length > 0) ||
        (!Array.isArray(response.veri) && response.veri)
      )) {
        const modifikasyonData = Array.isArray(response.veri) ? response.veri[0] : response.veri;

        console.log('🔍 [CATEGORY] Modifikasyon verisi:', modifikasyonData);

        // Araç bilgilerini ayarla
        const vehicleData: VehicleInfo = {
          marka,
          model,
          yil,
          modifikasyon,
          name: modifikasyonData.name || `${marka} ${model}`,
          engine: modifikasyonData.engine,
          availableSizes: [],
          image: modifikasyonData.generation?.bodies?.[0]?.image,
          bodyType: modifikasyonData.generation?.bodies?.[0]?.name,
          combinations: modifikasyonData.kombinasyonlar || []
        };

        // Lastik ebatlarını çıkar
        const sizes: TireSize[] = [];
        if (modifikasyonData.lastikler && Array.isArray(modifikasyonData.lastikler) && modifikasyonData.lastikler.length > 0) {
          console.log('🔍 [CATEGORY] Lastikler bulundu:', modifikasyonData.lastikler.length);

          modifikasyonData.lastikler.forEach((lastik: {
            kesitGenisligi: number;
            yanakOrani: number;
            jantCapi: number;
            ebat: string;
          }) => {
            const size: TireSize = {
              genislik: lastik.kesitGenisligi,
              yanak: lastik.yanakOrani,
              cap: lastik.jantCapi,
              ebat: lastik.ebat || `${lastik.kesitGenisligi}/${lastik.yanakOrani}R${lastik.jantCapi}`
            };

            // Aynı ebat varsa ekleme
            if (!sizes.find(s => s.ebat === size.ebat)) {
              sizes.push(size);
              vehicleData.availableSizes.push(size.ebat);
            }
          });
        } else {
          console.log('⚠️ [CATEGORY] Lastikler bulunamadı, standart ebatlar kullanılacak:', {
            hasLastikler: !!modifikasyonData.lastikler,
            isArray: Array.isArray(modifikasyonData.lastikler),
            modifikasyonKeys: Object.keys(modifikasyonData)
          });

          // Standart ebatlar ekle (araç tipine göre)
          const standardSizes = [
            { genislik: 205, yanak: 55, cap: 16 },
            { genislik: 215, yanak: 55, cap: 17 },
            { genislik: 225, yanak: 45, cap: 17 },
            { genislik: 235, yanak: 45, cap: 18 }
          ];

          standardSizes.forEach(size => {
            const tireSize: TireSize = {
              genislik: size.genislik,
              yanak: size.yanak,
              cap: size.cap,
              ebat: `${size.genislik}/${size.yanak}R${size.cap}`
            };
            sizes.push(tireSize);
            vehicleData.availableSizes.push(tireSize.ebat);
          });
        }

        setVehicleInfo(vehicleData);
        setAvailableSizes(sizes);

        // Kombinasyonları hazırla (ön-arka birlikte)
        const combos: ComboOption[] = [];
        if (vehicleData.combinations && vehicleData.combinations.length > 0) {
          const seen = new Set<string>();
          vehicleData.combinations.forEach((k) => {
            if (!k.on || !k.arka) return;
            const onEbat = k.on.tire || '';
            const arkaEbat = k.arka.tire || '';
            // Ebatları sayılara böl
            const onMatch = onEbat.match(/(\d+)\/(\d+)[A-Z]*R?(\d+)/i);
            const arkaMatch = arkaEbat.match(/(\d+)\/(\d+)[A-Z]*R?(\d+)/i);
            if (!onMatch || !arkaMatch) return;
            const onSize = { genislik: parseInt(onMatch[1]), yanak: parseInt(onMatch[2]), cap: parseInt(onMatch[3]), ebat: `${onMatch[1]}/${onMatch[2]}R${onMatch[3]}` };
            const arkaSize = { genislik: parseInt(arkaMatch[1]), yanak: parseInt(arkaMatch[2]), cap: parseInt(arkaMatch[3]), ebat: `${arkaMatch[1]}/${arkaMatch[2]}R${arkaMatch[3]}` };
            const label = `${onSize.ebat} - ${arkaSize.ebat}`;
            if (seen.has(label)) return;
            seen.add(label);
            combos.push({ label, on: onSize, arka: arkaSize });
          });
        }
        setAvailableCombos(combos);

        // İlk ebatı seç ve lastikleri yükle
        if (sizes.length > 0) {
          setSelectedSize(sizes[0]);
          // Direkt lastikleri yükle
          setTimeout(() => {
            loadTiresBySize();
          }, 100);
        }

        setVehicleInfo(vehicleData);
        setAvailableSizes(sizes);

        // İlk ebatı seç
        if (sizes.length > 0) {
          setSelectedSize(sizes[0]);
        }

        // Logger ile başarılı sonucu logla
        logger.logUserAction('VEHICLE_INFO_LOAD_SUCCESS', {
          vehicle: vehicleData.name,
          sizesCount: sizes.length,
          sizes: sizes.map(s => s.ebat)
        });

        console.log('✅ [CATEGORY] Araç bilgileri yüklendi:', {
          vehicle: vehicleData.name,
          sizesCount: sizes.length,
          sizes: sizes.map(s => s.ebat)
        });
      } else {
        logger.logUserAction('VEHICLE_INFO_NO_MODIFICATION', {
          marka, model, yil, modifikasyon,
          message: 'Araç için modifikasyon/lastik bilgisi bulunamadı.'
        });
        setError('Araç için modifikasyon/lastik bilgisi bulunamadı.');
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('❌ [CATEGORY] Araç bilgileri yüklenirken hata:', error);

      // Logger ile exception'ı logla
      logger.logUserAction('VEHICLE_INFO_LOAD_EXCEPTION', {
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });

      setError('Araç bilgileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [marka, model, yil, modifikasyon]);

  // Seçili ebata göre lastikleri yükle
  const loadTiresBySize = useCallback(async () => {
    if (!selectedSize) return;
    // Kombinasyon modu değilse combined ürünleri temizle
    setCombinedProducts([]);

    try {
      setLoading(true);

      // Logger ile lastik arama başlangıcını logla
      logger.logUserAction('TIRE_SEARCH_START', {
        size: selectedSize,
        filters: filters.mevsim,
        page: currentPage
      });

      console.log('🔍 [CATEGORY] Lastikler yükleniyor...', selectedSize);

      const response = await fetch(`/api/lastik/ebat-arama?genislik=${selectedSize.genislik}&yanak=${selectedSize.yanak}&cap=${selectedSize.cap}&mevsim=${filters.mevsim}&page=${currentPage}&limit=20`);
      const data = await response.json();

      console.log('📊 [CATEGORY] Lastik arama yanıtı:', data);

      if (data.basarili) {
        let enhancedProducts = data.veri || [];

        // Dia stok karşılaştırması yap
        try {
          console.log('🔄 [CATEGORY] Dia stok kontrolü başlatılıyor...');
          const diaResponse = await backendApi.lastik.diaStokKontrol(enhancedProducts);

          if (diaResponse.basarili) {
            enhancedProducts = diaResponse.veri;
            console.log('✅ [CATEGORY] Dia stok kontrolü tamamlandı:', {
              total: (diaResponse as any).meta?.totalProducts,
              stockAvailable: (diaResponse as any).meta?.stockAvailable,
              outOfStock: (diaResponse as any).meta?.outOfStock,
              notFound: (diaResponse as any).meta?.notFound
            });

            // Logger ile Dia stok sonuçlarını logla
            logger.logUserAction('DIA_STOCK_CHECK_SUCCESS', {
              meta: (diaResponse as any).meta,
              size: selectedSize.ebat
            });
          } else {
            console.warn('⚠️ [CATEGORY] Dia stok kontrolü başarısız:', diaResponse);
            logger.logUserAction('DIA_STOCK_CHECK_ERROR', {
              error: 'Dia API yanıt başarısız',
              size: selectedSize.ebat
            });
          }
        } catch (diaError) {
          console.error('❌ [CATEGORY] Dia stok kontrolü hatası:', diaError);
          logger.logUserAction('DIA_STOCK_CHECK_EXCEPTION', {
            error: diaError instanceof Error ? diaError.message : 'Bilinmeyen hata',
            size: selectedSize.ebat
          });
          // Dia hata durumunda orijinal ürünleri kullan
        }

        // Ürünleri sırala
        const sortedProducts = sortProducts(enhancedProducts);
        setProducts(sortedProducts);
        setTotalCount(data.sayfalama?.totalCount || 0);

        // Logger ile başarılı sonucu logla
        logger.logUserAction('TIRE_SEARCH_SUCCESS', {
          count: enhancedProducts.length,
          total: data.sayfalama?.totalCount || 0,
          size: selectedSize.ebat
        });

        console.log('✅ [CATEGORY] Lastikler yüklendi:', {
          count: enhancedProducts.length,
          total: data.sayfalama?.totalCount || 0
        });

        // Loading bitince scroll pozisyonunu geri yükle
        restoreScrollPosition();
      } else {
        // Logger ile hata durumunu logla
        logger.logUserAction('TIRE_SEARCH_ERROR', {
          error: data.hata || 'Bilinmeyen hata',
          data
        });

        setError(data.hata || 'Lastikler yüklenirken hata oluştu');
      }
    } catch (error) {
      console.error('❌ [CATEGORY] Lastikler yüklenirken hata:', error);

      // Logger ile exception'ı logla
      logger.logUserAction('TIRE_SEARCH_EXCEPTION', {
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });

      setError('Lastikler yüklenirken hata oluştu');
    } finally {
      setLoading(false);

      // Loading bitince scroll pozisyonunu geri yükle
      restoreScrollPosition();
    }
  }, [selectedSize, filters.mevsim, currentPage]);

  // Genel arama fonksiyonu
  const loadGeneralSearch = useCallback(async () => {
    if (!genelArama) return;
    try {
      setLoading(true);
      setError(null);
      setProducts([]);

      logger.logUserAction('GENERAL_SEARCH_START', {
        searchTerm: genelArama,
        page: currentPage
      });

      const response = await fetch(`/api/lastik/genel-arama?q=${encodeURIComponent(genelArama)}&page=${currentPage}&limit=20`);
      const data = await response.json();

      if (!data.basarili) {
        setError(data.mesaj || 'Arama sırasında hata oluştu');
        return;
      }

      setProducts(data.veri || []);
      setTotalCount(data.sayfalama?.toplamKayit || 0);

      logger.logUserAction('GENERAL_SEARCH_COMPLETE', {
        searchTerm: genelArama,
        resultCount: data.veri?.length || 0,
        totalCount: data.sayfalama?.toplamKayit || 0
      });

    } catch (error) {
      console.error('❌ [CATEGORY] Genel arama hatası:', error);
      setError('Arama sırasında hata oluştu');
    } finally {
      setLoading(false);
      restoreScrollPosition();
    }
  }, [genelArama, currentPage]);

  // Kombinasyon için lastikleri yükle (ön ve arka)
  const loadTiresByCombo = useCallback(async () => {
    if (!selectedCombo) return;
    try {
      setLoading(true);
      setError(null);
      setProducts([]);

      logger.logUserAction('TIRE_COMBO_SEARCH_START', {
        combo: selectedCombo.label,
        mevsim: filters.mevsim
      });

      const qs = (s: { genislik: number; yanak: number; cap: number }) => `genislik=${s.genislik}&yanak=${s.yanak}&cap=${s.cap}&mevsim=${filters.mevsim}&page=1&limit=100`;

      const [onRes, arkaRes] = await Promise.all([
        fetch(`/api/lastik/ebat-arama?${qs(selectedCombo.on)}`).then(r => r.json()),
        fetch(`/api/lastik/ebat-arama?${qs(selectedCombo.arka)}`).then(r => r.json())
      ]);

      if (!onRes.basarili || !arkaRes.basarili) {
        setError('Kombinasyon lastikleri yüklenirken hata oluştu');
        return;
      }

      // Dia stok kontrolü (opsiyonel) – iki liste için de uygula
      let onList = onRes.veri || [];
      let arkaList = arkaRes.veri || [];
      try {
        const [diaOn, diaArka] = await Promise.all([
          backendApi.lastik.diaStokKontrol(onList),
          backendApi.lastik.diaStokKontrol(arkaList)
        ]);
        if (diaOn.basarili) onList = diaOn.veri;
        if (diaArka.basarili) arkaList = diaArka.veri;
      } catch { }

      // Markaya göre eşleştir – aynı markası olanları çift olarak kartlayacağız
      const mapByBrand = (arr: any[]) => {
        const m = new Map<string, Product[]>();
        arr.forEach((p: any) => {
          const brand = (p.realBrand || p.brand || '').toString();
          if (!brand) return;
          const prod: Product = p as Product;
          if (!m.has(brand)) m.set(brand, []);
          m.get(brand)!.push(prod);
        });
        return m;
      };

      const onByBrand = mapByBrand(onList);
      const arkaByBrand = mapByBrand(arkaList);

      const combined: CombinedProduct[] = [];
      onByBrand.forEach((onItems, brand) => {
        const rearItems = arkaByBrand.get(brand);
        if (!rearItems || rearItems.length === 0) return;
        // Basit eşleme: ilk ürünleri al – daha sonra fiyata/stoka göre optimize edilebilir
        combined.push({ brand, front: onItems[0], rear: rearItems[0] });
      });

      setCombinedProducts(combined);
      setTotalCount(combined.length);

      logger.logUserAction('TIRE_COMBO_SEARCH_SUCCESS', {
        combo: selectedCombo.label,
        totalBrands: combined.length
      });
    } catch (error) {
      console.error('Kombinasyon yükleme hatası:', error);
      setError('Kombinasyon yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [selectedCombo, filters.mevsim]);

  // Kategori lastiklerini yükle
  const loadKategoriLastikleri = useCallback(async () => {
    if (!kategori) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 [CATEGORY] Kategori lastikleri yükleniyor...', { kategori, marka });

      // Kategori lastiklerini getir
      const response = await backendApi.lastik.kategoriLastikleri(kategori, {
        marka: marka || undefined,
        ebat: ebatQuery || undefined,
        teknoloji: teknolojiQuery || undefined,
        desen: desenQuery || undefined
      });

      console.log('📊 [CATEGORY] Kategori API yanıtı:', response);

      if (response.basarili && response.veri) {
        console.log('✅ [CATEGORY] Kategori lastikleri başarılı:', response.veri.length);

        // Dia stok verilerini Product formatına çevir
        const formattedProducts = response.veri.map((diaProduct: any) => ({
          _id: diaProduct._id,
          name: diaProduct.aciklama,
          brand: diaProduct.markaack || diaProduct.marka,
          sku: diaProduct.stokkartkodu,
          price: diaProduct.realPrice || diaProduct.fiyat1 || 0,
          originalPrice: diaProduct.fiyat1,
          stock: diaProduct.realStock || diaProduct.fiili_stok || 0,
          specifications: {
            size: diaProduct.ozelkod3 || '',
            width: parseInt(diaProduct.ozelkod3?.split('/')?.[0] || '0'),
            aspectRatio: parseInt(diaProduct.ozelkod3?.split('/')?.[1]?.split('R')?.[0] || '0'),
            rimDiameter: parseInt(diaProduct.ozelkod3?.split('R')?.[1] || '0'),
            season: diaProduct.ozelkod1?.toLowerCase().includes('yaz') ? 'yaz' :
              diaProduct.ozelkod1?.toLowerCase().includes('kış') ? 'kis' :
                diaProduct.ozelkod1?.toLowerCase().includes('4 mevsim') ? '4mevsim' : 'bilinmeyen',
            loadIndex: '',
            speedIndex: '',
            vehicleType: 'otomobil',
            fuelEfficiency: undefined,
            wetGrip: undefined,
            noiseLevel: undefined,
            runflat: diaProduct.ozelkod7?.toLowerCase().includes('runflat') || false,
            reinforced: diaProduct.ozelkod7?.toLowerCase().includes('xl') || false
          },
          images: [{
            url: diaProduct.aws_url || '/assets/img/shop/tire-placeholder.jpg',
            alt: diaProduct.aciklama,
            isPrimary: true
          }],
          rating: { average: 0, count: 0 },
          stockStatus: diaProduct.stockStatus || 'unknown',
          isActive: true
        }));

        // Ürünleri sırala
        const sortedProducts = sortProducts(formattedProducts);
        setProducts(sortedProducts);
        setTotalCount(formattedProducts.length);

        console.log('✅ [CATEGORY] Kategori lastikleri yüklendi:', {
          kategori,
          totalProducts: formattedProducts.length,
          stockAvailable: formattedProducts.filter(p => p.stockStatus === 'in_stock').length
        });

        // Logger ile başarılı sonucu logla
        logger.logUserAction('KATEGORI_LASTIKLERI_SUCCESS', {
          kategori,
          totalResults: formattedProducts.length,
          stockAvailable: formattedProducts.filter(p => p.stockStatus === 'in_stock').length
        });

      } else {
        console.error('❌ [CATEGORY] Kategori lastikleri başarısız:', response);
        setError('Kategori lastikleri yüklenirken hata oluştu');

        // Logger ile hatayı logla
        logger.logUserAction('KATEGORI_LASTIKLERI_ERROR', {
          error: response.hata,
          message: response.mesaj
        });
      }

    } catch (error) {
      console.error('❌ [CATEGORY] Kategori lastikleri sırasında hata:', error);
      setError('Kategori lastikleri yüklenirken hata oluştu');

      // Logger ile hatayı logla
      logger.logError('KATEGORI_LASTIKLERI_ERROR', error);
    } finally {
      setLoading(false);
    }
  }, [kategori, marka, ebatQuery, teknolojiQuery, desenQuery]);

  // Jant araması için lastikleri yükle
  const loadTiresByJantParams = useCallback(async () => {
    if (!genislik || !yanak || !cap) return;

    try {
      setLoading(true);

      // Logger ile jant arama başlangıcını logla
      logger.logUserAction('TIRE_SEARCH_BY_JANT_START', {
        genislik, yanak, cap, mevsim, page: currentPage
      });

      console.log('🔍 [CATEGORY] Jant parametreleriyle lastikler yükleniyor...', { genislik, yanak, cap, mevsim });

      const response = await fetch(`/api/lastik/ebat-arama?genislik=${genislik}&yanak=${yanak}&cap=${cap}&mevsim=${mevsim || 'tum'}&page=${currentPage}&limit=20`);
      const data = await response.json();

      console.log('📊 [CATEGORY] Jant arama yanıtı:', data);

      if (data.basarili) {
        let enhancedProducts = data.veri || [];

        // Dia stok karşılaştırması yap
        try {
          console.log('🔄 [CATEGORY] Jant araması için Dia stok kontrolü başlatılıyor...');
          const diaResponse = await backendApi.lastik.diaStokKontrol(enhancedProducts);

          if (diaResponse.basarili) {
            enhancedProducts = diaResponse.veri;
            console.log('✅ [CATEGORY] Jant araması Dia stok kontrolü tamamlandı:', {
              total: (diaResponse as any).meta?.totalProducts,
              stockAvailable: (diaResponse as any).meta?.stockAvailable,
              outOfStock: (diaResponse as any).meta?.outOfStock,
              notFound: (diaResponse as any).meta?.notFound
            });

            // Logger ile Dia stok sonuçlarını logla
            logger.logUserAction('DIA_STOCK_CHECK_JANT_SUCCESS', {
              meta: (diaResponse as any).meta,
              size: `${genislik}/${yanak}R${cap}`
            });
          } else {
            console.warn('⚠️ [CATEGORY] Jant araması Dia stok kontrolü başarısız:', diaResponse);
            logger.logUserAction('DIA_STOCK_CHECK_JANT_ERROR', {
              error: 'Dia API yanıt başarısız',
              size: `${genislik}/${yanak}R${cap}`
            });
          }
        } catch (diaError) {
          console.error('❌ [CATEGORY] Jant araması Dia stok kontrolü hatası:', diaError);
          logger.logUserAction('DIA_STOCK_CHECK_JANT_EXCEPTION', {
            error: diaError instanceof Error ? diaError.message : 'Bilinmeyen hata',
            size: `${genislik}/${yanak}R${cap}`
          });
          // Dia hata durumunda orijinal ürünleri kullan
        }

        // Ürünleri sırala
        const sortedProducts = sortProducts(enhancedProducts);
        setProducts(sortedProducts);
        setTotalCount(data.sayfalama?.totalCount || 0);

        // Logger ile başarılı sonucu logla
        logger.logUserAction('TIRE_SEARCH_BY_JANT_SUCCESS', {
          count: enhancedProducts.length,
          total: data.sayfalama?.totalCount || 0,
          size: `${genislik}/${yanak}R${cap}`
        });

        console.log('✅ [CATEGORY] Jant araması sonuçları yüklendi:', {
          count: enhancedProducts.length,
          total: data.sayfalama?.totalCount || 0
        });
      } else {
        // Logger ile hata durumunu logla
        logger.logUserAction('TIRE_SEARCH_BY_JANT_ERROR', {
          error: data.hata || 'Bilinmeyen hata',
          data
        });

        setError(data.hata || 'Lastikler yüklenirken hata oluştu');
      }
    } catch (error) {
      console.error('❌ [CATEGORY] Jant araması sırasında hata:', error);

      // Logger ile exception'ı logla
      logger.logUserAction('TIRE_SEARCH_BY_JANT_EXCEPTION', {
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });

      setError('Lastikler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [genislik, yanak, cap, mevsim, currentPage]);

  // Sayfa yüklenince araç bilgilerini yükle
  useEffect(() => {
    // Sayfa tepeden başlasın - agresif
    if (typeof window !== 'undefined') {
      // Hemen yukarı çık
      window.scrollTo({ top: 0, behavior: 'auto' });

      // Birkaç kez daha dene
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }, 0);

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }, 100);

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }, 500);
    }

    // useEffect tetiklendi - log kaldırıldı

    if (tip === 'kategori' && kategori) {
      // Kategori lastikleri yükleniyor...
      loadKategoriLastikleri();
    } else if (tip === 'arac' && marka && model && yil) {
      // Araç bilgileri yükleniyor...
      loadVehicleInfo();
    } else if (tip === 'jant' && genislik && yanak && cap) {
      // Jant araması için direkt lastik yükle
      // Jant araması başlatılıyor...
      loadTiresByJantParams();
    } else {
      console.log('⚠️ [CATEGORY] Gerekli parametreler eksik:', {
        tip,
        kategori,
        hasMarka: !!marka,
        hasModel: !!model,
        hasYil: !!yil,
        hasGenislik: !!genislik,
        hasYanak: !!yanak,
        hasCap: !!cap
      });
    }
  }, [tip, kategori, marka, model, yil, modifikasyon, genislik, yanak, cap]);

  // Seçili ebat değişince lastikleri yükle
  useEffect(() => {
    if (selectedSize && tip === 'arac') {
      loadTiresBySize();
    }
  }, [selectedSize, loadTiresBySize, tip]);

  // Kombinasyon seçildiğinde yükle
  useEffect(() => {
    if (selectedCombo && tip === 'arac') {
      loadTiresByCombo();
    }
  }, [selectedCombo, loadTiresByCombo, tip]);

  // Genel arama için useEffect
  useEffect(() => {
    if (tip === 'genel' && genelArama) {
      loadGeneralSearch();
    }
  }, [tip, genelArama, loadGeneralSearch]);

  // Sıralama değişince ürünleri yeniden sırala
  useEffect(() => {
    if (products.length > 0) {
      const sortedProducts = sortProducts(products);
      setProducts(sortedProducts);
    }
  }, [filters.siralamaTipi, sortProducts]);

  // Ürünler yüklendiğinde yukarı çık
  useEffect(() => {
    if (products.length > 0 && typeof window !== 'undefined') {
      // Ürünler yüklendiğinde yukarı çık
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }, 0);

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }, 100);
    }
  }, [products]);

  // Loading durumunu kontrol et - sabit pozisyon
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Her zaman yukarıda kal - loading durumuna bakmaksızın
      window.scrollTo({ top: 0, behavior: 'auto' });

      // Ek güvenlik için tek seferlik timeout
      const timeout = setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }, 50);

      return () => clearTimeout(timeout);
    }
  }, [loading]);

  // Ebat değiştir
  const handleSizeChange = (size: TireSize) => {
    // Logger ile ebat değişikliğini logla
    logger.logUserAction('SIZE_CHANGE', {
      from: selectedSize?.ebat,
      to: size.ebat
    });

    // Agresif scroll koruma - hemen yukarı çık
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    setSelectedSize(size);
    setSelectedCombo(null);
    setCurrentPage(1);

    // Render sonrası da yukarıda kal
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    }, 0);

    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }, 100);
  };

  // Kombinasyon değiştir
  const handleComboChange = (combo: ComboOption) => {
    logger.logUserAction('COMBO_CHANGE', { to: combo.label });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    setSelectedCombo(combo);
    setSelectedSize(null);
    setCurrentPage(1);
  };

  // Mevsim filtresi değiştir
  const handleSeasonFilter = (season: string) => {
    // Logger ile mevsim filtresi değişikliğini logla
    logger.logUserAction('SEASON_FILTER_CHANGE', {
      from: filters.mevsim,
      to: season
    });

    // Scroll pozisyonunu sıfırla - hiç kaydetme
    setSavedScrollPosition(0);

    // Hemen yukarı çık ve orada kal
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    setFilters(prev => ({ ...prev, mevsim: season }));
    setCurrentPage(1);
  };

  // Scroll pozisyonu koruma fonksiyonu
  const saveScrollPosition = () => {
    if (typeof window !== 'undefined') {
      const position = window.scrollY;
      setSavedScrollPosition(position);
      // Scroll pozisyonu kaydedildi
    }
  };

  // Scroll pozisyonu geri yükleme fonksiyonu - DEVRE DIŞI
  const restoreScrollPosition = () => {
    // Artık hiçbir pozisyon geri yükleme yapmıyoruz
    // Her zaman yukarıda kal
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
      setSavedScrollPosition(0);
    }
  };

  // Sıralama değiştir
  const handleSortChange = (sortType: string) => {
    // Logger ile sıralama değişikliğini logla
    logger.logUserAction('SORT_CHANGE', {
      from: filters.siralamaTipi,
      to: sortType
    });

    // Sıralama değiştiğinde yukarıda kal
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    setFilters(prev => ({ ...prev, siralamaTipi: sortType }));

    // Render sonrası da yukarıda kal
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    }, 0);
  };

  if (loading) {
    return (
      <div className={`container py-5 ${styles.loadingContainer}`}>
        <TireLoadingAnimation
          message="Lastikler yükleniyor..."
          subMessage="Dia stok bilgileri kontrol ediliyor"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Hata!</h4>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Araç bilgileri yüklenmediyse
  if (!vehicleInfo && tip === 'arac') {
    return (
      <div className="container py-5">
        <div className="alert alert-warning" role="alert">
          <h4 className="alert-heading">Araç Bulunamadı!</h4>
          <p>Araç bilgileri yüklenemedi. Lütfen tekrar deneyin.</p>
          <Link href="/" className="btn btn-primary">
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className={`container py-4 py-lg-5 ${styles.categoryContainer}`}>
      <Breadcrumb
        tip={tip}
        vehicleInfo={vehicleInfo}
        genislik={genislik}
        yanak={yanak}
        cap={cap}
        kategori={kategori}
        marka={marka}
      />
      <Title
        tip={tip}
        genelArama={genelArama}
        kategori={kategori}
        marka={marka}
        genislik={genislik}
        yanak={yanak}
        cap={cap}
        vehicleInfo={vehicleInfo}
        selectedSize={selectedSize}
        totalCount={totalCount}
      />
      <div className="row">
        {/* Sol Panel - Araç Bilgileri ve Ebat Seçimi */}
        {tip === 'arac' && (
          <div className="col-lg-3">
            <div className={styles.stickyFilters}>
              <div className={`card mb-4 ${styles.vehicleCard}`}>
                <div className="card-header">
                  <h5 className="mb-0">Aracınız</h5>
                </div>
                <div className="card-body">
                  {vehicleInfo && (
                    <>
                      {/* Araç Resmi */}
                      <div className="text-center mb-3">
                        {vehicleInfo.image ? (
                          <div className="vehicle-image-container" style={{ width: '200px', height: '120px', margin: '0 auto', position: 'relative' }}>
                            <Image
                              src={vehicleInfo.image}
                              alt={`${vehicleInfo.marka} ${vehicleInfo.model} ${vehicleInfo.yil}`}
                              width={200}
                              height={120}
                              className="rounded"
                              style={{
                                objectFit: 'contain',
                                backgroundColor: '#f8f9fa'
                              }}
                              onError={() => {
                                console.log('Araç resmi yüklenemedi:', vehicleInfo.image);
                              }}
                            />
                          </div>
                        ) : (
                          <div className="vehicle-placeholder bg-light rounded d-flex align-items-center justify-content-center" style={{ width: '200px', height: '120px', margin: '0 auto' }}>
                            <i className="fas fa-car fa-3x text-muted"></i>
                          </div>
                        )}
                      </div>

                      {/* Araç Bilgileri */}
                      <div className="text-center mb-3">
                        <h6 className="mb-1 text-uppercase" style={{ fontSize: '0.9rem' }}>{vehicleInfo.name}</h6>
                        <small className="text-muted d-block" style={{ fontSize: '0.8rem' }}>
                          {vehicleInfo.yil} • {vehicleInfo.engine?.fuel} • {vehicleInfo.engine?.capacity}L
                        </small>
                        {vehicleInfo.bodyType && (
                          <small className="text-muted d-block" style={{ fontSize: '0.8rem' }}>
                            {vehicleInfo.bodyType}
                          </small>
                        )}
                      </div>

                      {/* Ön-Arka Kombinasyonları */}
                      {vehicleInfo.combinations && vehicleInfo.combinations.length > 0 && (
                        <div className="mb-3">
                          <h6 className="text-uppercase" style={{ fontSize: '0.85rem' }}>ÖN-ARKA LASTİK KOMBİNASYONLARI</h6>
                          <div className="list-group small">
                            {vehicleInfo.combinations.slice(0, 5).map((k) => (
                              <div key={k.sira} className="list-group-item py-2 px-2">
                                <div className="d-flex flex-column gap-1">
                                  {k.on && (
                                    <div>
                                      <span className="badge bg-secondary me-1">ÖN</span>
                                      <span className="text-muted">{k.on.tire_full || k.on.tire}</span>
                                      {k.on.pressure?.bar && (
                                        <small className="text-muted ms-2">({k.on.pressure.bar} bar)</small>
                                      )}
                                    </div>
                                  )}
                                  {k.arka && (
                                    <div>
                                      <span className="badge bg-secondary me-1">ARKA</span>
                                      <span className="text-muted">{k.arka.tire_full || k.arka.tire}</span>
                                      {k.arka.pressure?.bar && (
                                        <small className="text-muted ms-2">({k.arka.pressure.bar} bar)</small>
                                      )}
                                    </div>
                                  )}
                                  <div>
                                    {k.runflat && <span className="badge bg-info me-1">Runflat</span>}
                                    {k.kisUygun && <span className="badge bg-primary">Kış Uyumlu</span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Değiştir Linki */}
                      <div className="text-center mb-4">
                        <Link href="/" className={`btn btn-outline-primary btn-sm ${styles.vehicleChangeBtn}`}>
                          ARACI DEĞİŞTİR
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Lastik Ebatları */}
              <div className={`card mb-4 ${styles.filterCard}`}>
                <div className="card-header">
                  <h6 className="mb-0 text-uppercase" style={{ fontSize: '0.9rem' }}>UYGUN LASTİK EBATLARI</h6>
                </div>
                <div className="card-body">
                  {availableSizes.map((size) => (
                    <div key={size.ebat} className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="tireSize"
                        id={`size-${size.ebat}`}
                        checked={selectedSize?.ebat === size.ebat}
                        onChange={() => handleSizeChange(size)}
                      />
                      <label className="form-check-label" htmlFor={`size-${size.ebat}`} style={{ fontSize: '0.85rem' }}>
                        <strong className="text-uppercase">{size.ebat}</strong>
                        <br />
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {size.genislik}mm genişlik, {size.yanak}% profil, {size.cap}&quot; jant
                        </small>
                      </label>
                    </div>
                  ))}
                  {/* Ön/Arka kombinasyonları */}
                  {availableCombos.length > 0 && (
                    <>
                      <hr />
                      <h6 className="mb-2 text-uppercase" style={{ fontSize: '0.8rem' }}>ÖN-ARKA KOMBİNASYONLARI</h6>
                      {availableCombos.map((c) => (
                        <div key={c.label} className="form-check mb-2">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="tireCombo"
                            id={`combo-${c.label}`}
                            checked={selectedCombo?.label === c.label}
                            onChange={() => handleComboChange(c)}
                          />
                          <label className="form-check-label" htmlFor={`combo-${c.label}`} style={{ fontSize: '0.85rem' }}>
                            <strong className="text-uppercase">{c.label}</strong>
                            <br />
                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                              Ön: {c.on.ebat} • Arka: {c.arka.ebat}
                            </small>
                          </label>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Mevsim Filtresi */}
              <div className={`card ${styles.filterCard}`}>
                <div className="card-header">
                  <h6 className="mb-0 text-uppercase" style={{ fontSize: '0.9rem' }}>MEVSİM</h6>
                </div>
                <div className="card-body">
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="season"
                      id="season-all"
                      checked={filters.mevsim === 'tum'}
                      onChange={() => handleSeasonFilter('tum')}
                    />
                    <label className="form-check-label" htmlFor="season-all" style={{ fontSize: '0.85rem' }}>
                      TÜM MEVSİMLER
                    </label>
                  </div>
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="season"
                      id="season-summer"
                      checked={filters.mevsim === 'yaz'}
                      onChange={() => handleSeasonFilter('yaz')}
                    />
                    <label className="form-check-label" htmlFor="season-summer" style={{ fontSize: '0.85rem' }}>
                      YAZ LASTİKLERİ
                    </label>
                  </div>
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="season"
                      id="season-winter"
                      checked={filters.mevsim === 'kis'}
                      onChange={() => handleSeasonFilter('kis')}
                    />
                    <label className="form-check-label" htmlFor="season-winter" style={{ fontSize: '0.85rem' }}>
                      KIŞ LASTİKLERİ
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="season"
                      id="season-all-season"
                      checked={filters.mevsim === '4mevsim'}
                      onChange={() => handleSeasonFilter('4mevsim')}
                    />
                    <label className="form-check-label" htmlFor="season-all-season">
                      4 Mevsim Lastikleri
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Sağ Panel - Lastik Sonuçları */}
        <div className={tip === 'arac' ? 'col-lg-9' : 'col-12'}>
          {/* Sıralama */}
          <div className="d-flex justify-content-end align-items-center mb-4">
            <div className="d-flex align-items-center gap-2">
              <label htmlFor="sortSelect" className="form-label mb-0 text-muted small text-uppercase">SIRALA:</label>
              <select
                id="sortSelect"
                className="form-select form-select-sm"
                style={{ width: 'auto', fontSize: '0.85rem' }}
                value={filters.siralamaTipi}
                onChange={(e) => handleSortChange(e.target.value)}
              >
                <option value="oneri">ÖNERİLEN</option>
                <option value="fiyat-asc">FİYAT (DÜŞÜK → YÜKSEK)</option>
                <option value="fiyat-desc">FİYAT (YÜKSEK → DÜŞÜK)</option>
                <option value="rating">EN ÇOK BEĞENİLEN</option>
              </select>
            </div>
          </div>

          {/* Lastik Listesi */}
          {loading ? (
            <div className="py-5" style={{ minHeight: '40vh' }}>
              <TireLoadingAnimation
                message="Yeni lastikler aranıyor..."
                subMessage="Seçilen ebata uygun lastikler getiriliyor"
              />
            </div>
          ) : (selectedCombo && combinedProducts.length >= 0) ? (
            combinedProducts.length === 0 ? (
              <div className="text-center py-5">
                <div className="alert alert-info">
                  <h5 className="text-uppercase">SONUÇ BULUNAMADI</h5>
                  <p className="mb-0" style={{ fontSize: '0.9rem' }}>
                    {selectedCombo.label} kombinasyonunda uygun marka bulunamadı.
                  </p>
                </div>
              </div>
            ) : (
              <div className={`row ${styles.productGrid}`}>
                {combinedProducts.map((cp, idx) => (
                  <div key={`${cp.brand}-${idx}`} className="col-12 mb-4">
                    <div className={`card ${styles.productCard}`} style={{ padding: '16px' }}>
                      <div className="d-flex flex-column flex-md-row gap-3">
                        <div className="flex-grow-1">
                          <h5 className="mb-2 text-uppercase">{cp.brand}</h5>
                          <div className="row g-3">
                            <div className="col-md-6">
                              <div className="border rounded p-3 h-100">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <span className="badge bg-secondary">ÖN</span>
                                  <span className="badge bg-light text-dark">{cp.front.specifications.size}</span>
                                </div>
                                <div className="mb-2 small text-muted">{cp.front.name}</div>
                                <div className="d-flex justify-content-between align-items-end">
                                  <div>
                                    <div className="fw-bold" style={{ fontSize: '1.1rem' }}>
                                      {((cp.front as any).realPrice || cp.front.price).toLocaleString('tr-TR')} ₺
                                    </div>
                                    {(cp.front as any).realStock > 0 && (
                                      <small className="text-success">Stok: {(cp.front as any).realStock}</small>
                                    )}
                                  </div>
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleAddToCart(cp.front)}
                                    disabled={(cp.front as any).stockStatus === 'out_of_stock' || cp.front.stock === 0}
                                  >
                                    Sepete Ekle
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="border rounded p-3 h-100">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <span className="badge bg-secondary">ARKA</span>
                                  <span className="badge bg-light text-dark">{cp.rear.specifications.size}</span>
                                </div>
                                <div className="mb-2 small text-muted">{cp.rear.name}</div>
                                <div className="d-flex justify-content-between align-items-end">
                                  <div>
                                    <div className="fw-bold" style={{ fontSize: '1.1rem' }}>
                                      {((cp.rear as any).realPrice || cp.rear.price).toLocaleString('tr-TR')} ₺
                                    </div>
                                    {(cp.rear as any).realStock > 0 && (
                                      <small className="text-success">Stok: {(cp.rear as any).realStock}</small>
                                    )}
                                  </div>
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleAddToCart(cp.rear)}
                                    disabled={(cp.rear as any).stockStatus === 'out_of_stock' || cp.rear.stock === 0}
                                  >
                                    Sepete Ekle
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : products.length === 0 ? (
            <div className="text-center py-5">
              <div className="alert alert-info">
                <h5 className="text-uppercase">SONUÇ BULUNAMADI</h5>
                <p className="mb-0" style={{ fontSize: '0.9rem' }}>
                  {selectedSize ? `${selectedSize.ebat} ebadında` : 'Seçilen kriterlerde'} lastik bulunamadı.
                </p>
              </div>
            </div>
          ) : (
            <div className={`row ${styles.productGrid}`}>
              {products.map((product) => (
                <div key={product._id} className="col-md-6 col-xl-4 mb-4">

                  <div
                    className={`card h-100 ${styles.productCard}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleProductClick(product)}
                  >
                    <div className="position-relative">
                      <LazyImage
                        src={product.images.find(img => img.isPrimary)?.url || ''}
                        alt={product.name}
                        width={300}
                        height={200}
                        className="card-img-top"
                        style={{ height: '200px', objectFit: 'cover' }}
                        placeholder="/assets/img/shop/tire-placeholder.jpg"
                      />

                      {/* Stok Durumu */}
                      {((product as any).stockStatus === 'out_of_stock' || product.stock === 0) && (
                        <div className="position-absolute top-0 start-0 bg-danger text-white px-2 py-1 small text-uppercase" style={{ fontSize: '0.7rem' }}>
                          STOKTA YOK
                        </div>
                      )}

                      {/* Dia Stok Durumu */}
                      {(product as any).stockStatus === 'in_stock' && (
                        <div className="position-absolute top-0 end-0 bg-success text-white px-2 py-1 small text-uppercase" style={{ fontSize: '0.7rem' }}>
                          STOKTA VAR
                        </div>
                      )}

                      {(product as any).stockStatus === 'not_found' && (
                        <div className="position-absolute top-0 end-0 bg-warning text-dark px-2 py-1 small text-uppercase" style={{ fontSize: '0.7rem' }}>
                          STOK BİLGİSİ YOK
                        </div>
                      )}

                      {/* Mevsim Badge */}
                      <div className="position-absolute top-0 end-0 m-2">
                        <span className={`badge ${styles.seasonBadge} ${product.specifications.season === 'yaz' ? 'bg-warning' :
                          product.specifications.season === 'kis' ? 'bg-info' : 'bg-success'
                          }`} style={{ fontSize: '0.7rem' }}>
                          {product.specifications.season === 'yaz' ? '☀️ YAZ' :
                            product.specifications.season === 'kis' ? '❄️ KIŞ' : '🌦️ 4 MEVSİM'}
                        </span>
                      </div>
                    </div>

                    <div className="card-body d-flex flex-column">
                      {/* Marka ve Model */}
                      <h6 className={`card-title ${styles.brandBadge}`}>{product.brand}</h6>
                      <p className="card-text text-muted small mb-2">{product.name}</p>

                      {/* Ebat */}
                      <div className="mb-2">
                        <span className={`badge ${styles.specBadge}`}>{product.specifications.size}</span>
                      </div>

                      {/* Özellikler */}
                      <div className="mb-2">
                        <small className="text-muted">
                          {product.specifications.loadIndex} {product.specifications.speedIndex}
                          {product.specifications.runflat && ' • RunFlat'}
                          {product.specifications.reinforced && ' • XL'}
                        </small>
                      </div>

                      {/* Dia Stok Bilgisi */}
                      {(product as any).diaStock && (
                        <div className="mb-2">
                          <div className="d-flex align-items-center gap-2">
                            {(product as any).diaStock.fiili_stok > 0 ? (
                              <span className="badge bg-success">
                                <i className="fas fa-check me-1"></i>
                                {(product as any).diaStock.fiili_stok} adet stokta
                              </span>
                            ) : (
                              <span className="badge bg-secondary">
                                <i className="fas fa-times me-1"></i>
                                Stokta yok
                              </span>
                            )}
                            <small className="text-muted">
                              Dia: {(product as any).diaStock.aciklama?.substring(0, 30)}...
                            </small>
                          </div>
                        </div>
                      )}

                      {/* EU Label */}
                      {(product.specifications.fuelEfficiency || product.specifications.wetGrip) && (
                        <div className="mb-2">
                          <div className="d-flex align-items-center gap-2">
                            {product.specifications.fuelEfficiency && (
                              <span className="badge bg-success">{product.specifications.fuelEfficiency}</span>
                            )}
                            {product.specifications.wetGrip && (
                              <span className="badge bg-primary">{product.specifications.wetGrip}</span>
                            )}
                            {product.specifications.noiseLevel && (
                              <small className="text-muted">{product.specifications.noiseLevel}dB</small>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Rating */}
                      {product.rating.count > 0 && (
                        <div className="d-flex align-items-center mb-2">
                          <div className={`me-2 ${styles.ratingStars}`}>
                            {'★'.repeat(Math.floor(product.rating.average))}{'☆'.repeat(5 - Math.floor(product.rating.average))}
                          </div>
                          <small className="text-muted">({product.rating.count})</small>
                        </div>
                      )}

                      {/* Fiyat ve Sepete Ekle */}
                      <div className={`mt-auto ${styles.priceSection}`}>
                        <div className="d-flex align-items-center justify-content-between">
                          <div>
                            {/* Dia gerçek fiyatı varsa onu göster */}
                            {(product as any).realPrice ? (
                              <>
                                <span className={styles.priceMain}>
                                  {(product as any).realPrice.toLocaleString('tr-TR')} ₺
                                </span>
                                <div>
                                  <small className="text-success">
                                    <i className="fas fa-check-circle me-1"></i>
                                    Dia Fiyat
                                  </small>
                                </div>
                                {product.price !== (product as any).realPrice && (
                                  <div>
                                    <small className={styles.priceOriginal}>
                                      Wheelsize: {product.price.toLocaleString('tr-TR')} ₺
                                    </small>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <span className={styles.priceMain}>{product.price.toLocaleString('tr-TR')} ₺</span>
                                {product.originalPrice && product.originalPrice > product.price && (
                                  <div>
                                    <small className={styles.priceOriginal}>
                                      {product.originalPrice.toLocaleString('tr-TR')} ₺
                                    </small>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Dia marka bilgisi */}
                            {(product as any).realBrand && (
                              <div>
                                <small className="text-muted">
                                  Marka: {(product as any).realBrand}
                                </small>
                              </div>
                            )}

                            {/* Dia stok miktarı */}
                            {(product as any).realStock > 0 && (
                              <div>
                                <small className="text-info">
                                  Stok: {(product as any).realStock} adet
                                </small>
                              </div>
                            )}
                          </div>
                          <button
                            className={`btn btn-primary btn-sm ${styles.addToCartBtn}`}
                            disabled={(product as any).stockStatus === 'out_of_stock' || product.stock === 0}

                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(product);
                            }}
                          >
                            {(product as any).stockStatus === 'in_stock' ? 'SEPETE EKLE' :
                              (product as any).stockStatus === 'out_of_stock' ? 'STOKTA YOK' :
                                'SEPETE EKLE'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
              }
            </div >
          )}
        </div >
      </div >
    </section >
  );
}

export default function CategoryPage() {
  const [cartItemCount, setCartItemCount] = useState(0);

  // Cart count'u dinle
  useEffect(() => {
    const updateCartCount = () => {
      setCartItemCount(cartUtils.getCartItemCount());
    };

    // Initial load
    updateCartCount();

    // Listen for cart updates
    const handleCartUpdate = async (event: any) => {
      try {
        // detail yoksa güvenli fallback
        if (!event?.detail || typeof event.detail.itemCount !== 'number') {
          // Auth ise backend summary, değilse local
          if (authService.getToken && authService.getToken()) {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';
            const res = await fetch(`${baseUrl}/cart/summary`, {
              headers: { 'Authorization': `Bearer ${authService.getToken()}` }
            });
            const data = await res.json();
            if (data?.success) {
              setCartItemCount(data.data.itemCount || 0);
              return;
            }
          }
          setCartItemCount(cartUtils.getCartItemCount());
          return;
        }
        setCartItemCount(event.detail.itemCount);
      } catch {
        try { setCartItemCount(cartUtils.getCartItemCount()); } catch { setCartItemCount(0); }
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  console.log('🎯 [CATEGORY PAGE] Sayfa yüklendi:', {
    url: typeof window !== 'undefined' ? window.location.href : 'SSR',
    timestamp: new Date().toISOString(),
    cartItemCount
  });

  return (
    <>
      {/* Shopping Cart Offcanvas */}
      <div className="offcanvas offcanvas-end pb-sm-2 px-sm-2" id="shoppingCart" tabIndex={-1}
        aria-labelledby="shoppingCartLabel" style={{ width: '500px' }}>
        {/* Header */}
        <div className="offcanvas-header flex-column align-items-start py-3 pt-lg-4">
          <div className="d-flex align-items-center justify-content-between w-100 mb-3 mb-lg-4">
            <h4 className="offcanvas-title" id="shoppingCartLabel">Alışveriş Sepetim</h4>
            <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
          </div>
          <div className="alert alert-success text-dark-emphasis fs-sm border-0 rounded-4 mb-0" role="alert">
            Tebrikler 🎉 Sepetinize <span className="fw-semibold">4 adet veya daha fazla lastik</span> eklediniz. Bu
            alışverişinize özel olarak, lastik montaj
            hizmetimiz <span className="fw-semibold">tamamen ücretsiz!</span>
          </div>
          <div className="progress w-100" role="progressbar" aria-label="Free shipping progress" aria-valuenow={78}
            aria-valuemin={0} aria-valuemax={100} style={{ height: '4px' }}>
            <div className="progress-bar bg-dark rounded-pill d-none-dark" style={{ width: '78%' }}></div>
            <div className="progress-bar bg-light rounded-pill d-none d-block-dark" style={{ width: '78%' }}></div>
          </div>
        </div>
        <div className="offcanvas-body d-flex flex-column gap-4 pt-2">
          {/* Sepet içeriği buraya gelecek */}
          <div className="text-center py-4">
            <p className="text-muted">Sepetiniz boş</p>
          </div>
        </div>

        {/* Footer */}
        <div className="offcanvas-header flex-column align-items-start">
          <div className="d-flex align-items-center justify-content-between w-100 mb-3 mb-md-4">
            <span className="text-light-emphasis">Toplam:</span>
            <span className="h6 mb-0">0,00 TL</span>
          </div>
          <div className="d-flex w-100 gap-3">
            <a className="btn btn-lg btn-secondary w-100" href="#!">Sepete Git</a>
            <a className="btn btn-lg btn-dark w-100" href="#!">Ödemeyi Tamamla</a>
          </div>
        </div>
      </div>

      {/* Header global layout'ta */}

      {/* Debug: Cart Count */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: '#007bff',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '5px',
          zIndex: 9999,
          fontSize: '12px'
        }}>
          🛒 Sepet: {cartItemCount} ürün
          <button
            onClick={() => {
              console.log('Sepet içeriği:', cartUtils.getCartItems());
              console.log('Sepet toplamı:', cartUtils.getCartTotal());
            }}
            style={{
              marginLeft: '10px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '2px 5px',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            📊
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="content-wrapper">
        <Suspense fallback={
          <div className="container py-5">
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Yükleniyor...</span>
              </div>
              <p className="mt-3">Sayfa yükleniyor...</p>
            </div>
          </div>
        }>
          <CategoryPageContent />
        </Suspense>
      </main>

      {/* Footer global layout'ta */}

      {/* Search Box Offcanvas */}
      <div className="offcanvas offcanvas-top" id="searchBox" tabIndex={-1} aria-labelledby="searchBoxLabel">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="searchBoxLabel">Ürün Ara</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body">
          <div className="position-relative">
            <input type="text" className="form-control form-icon-end"
              placeholder="Ürün Adı, stok kodu veya lastik ebatı ile arama yapabilirsiniz.."
              aria-label="Ürün Adı, stok kodu veya lastik ebatı ile arama yapabilirsiniz.." />
            <i className="ci-search position-absolute top-50 end-0 translate-middle-y me-3"></i>
          </div>
        </div>
      </div>

    </>
  );
}