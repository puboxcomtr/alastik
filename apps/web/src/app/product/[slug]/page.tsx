
<<<<<<< HEAD
/* Library */
import React from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { Grid, TextField, MenuItem, Tooltip, Typography, FormControl } from "@mui/material";

/* @Import Page */
import ProductBreadcrumb from "@/src/components/product/top/Breadcrumb";
import Garage from '@components/product/top/Garage';
import Gallery from '@/src/components/product/left/Gallery';
import Middle from '@/src/components/product/middle/Middle';


interface CategoryPageProps {
=======
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Container, Row, Col } from 'react-bootstrap';
import authService from '@/src/lib/auth';
import toast from '@/src/lib/toast';
import Swal from 'sweetalert2';

interface ProductDetailPageProps {
>>>>>>> 8cb892cd3cd6e5f9003894aa9c8da785c0c212dd
    params: {
        slug: string;
    };
}

<<<<<<< HEAD
export default async function ProductDetailPage(
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    return (
        <Container style={{ background: "#f6f6f6" }}>
            <Grid className="row-fluid" container>
                <Grid size={12}>
                    <ProductBreadcrumb productName="Pirelli SottoZero Serie 3 RFT BMW(*) Mercedes (MO) 245/45R18 100V XL" />
                </Grid>
                <Grid size={12}>
                    <Garage />
                </Grid>
            </Grid>
            <Grid className="row-fluid" container>
                <Grid size={4}>
                    <Grid size={10}>
                        <Gallery />
                    </Grid>
                </Grid>
                <Grid size={4}>
                    <Middle />
                </Grid>
                <Grid size={4}>
                    Sepete Ekle
                </Grid>
            </Grid>
=======
interface ProductDetail {
  _id: string;
  name: string;
  brand: string;
  images: Array<{ url: string; isPrimary: boolean }>;
  specifications: {
    size: string;
    loadIndex: string;
    speedIndex: string;
    season: string;
    runflat?: boolean;
    reinforced?: boolean;
    fuelEfficiency?: string;
    wetGrip?: string;
    noiseLevel?: number;
  };
  price: number;
  stock: number;
  description?: string;
  features?: string[];
  technicalSpecs?: Record<string, any>;
  diaStock?: any;
  stockStatus?: string;
  // Wheelsize Catalog bilgileri
  catalogInfo?: {
    data?: {
      display?: string;
      brand?: { display?: string; slug?: string; price_segment?: string };
      season?: { display?: string; slug?: string };
      automobile_type?: { display?: string; slug?: string };
      performance_category?: { display?: string; slug?: string };
      year?: number;
      discontinued?: boolean;
      almost_discontinued?: boolean;
      tags?: string[];
      rating?: {
        score?: number;
        popularity?: number;
        tags?: Array<{
          display?: string;
          slug?: string;
          connotation?: string;
        }>;
      };
      counters?: {
        benchmarks?: number;
        videos?: number;
        modes?: number;
      };
      description?: string;
      canonical_link?: string;
      manufacturer_page_link?: string;
      regions?: Array<{ display?: string; slug?: string }>;
    };
  };
  modes?: {
    data?: Array<{
      text?: string;
      tire_width?: number;
      aspect_ratio?: number;
      rim_diameter?: number;
      load_index?: number;
      speed_index?: string;
      extra_load?: boolean;
      mud_and_snow?: boolean;
      rim_protection?: boolean;
      sizing_system?: string;
      dual_load_index?: number | null;
    }>;
    meta?: { count?: number };
  };
  buyNotBuy?: {
    data?: {
      buy?: Array<{
        text?: string;
        upvotes?: number;
        prooflink?: string;
      }>;
      not_buy?: Array<{
        text?: string;
        upvotes?: number;
        prooflink?: string;
      }>;
    };
  };
  rating?: {
    overall?: number;
    reviews_count?: number;
  };
  performance?: Record<string, number>;
}

export default function ProductDetailPage({ params }: { params: Promise<ProductDetailPageProps['params']> }) {
  const [resolvedParams, setResolvedParams] = useState<ProductDetailPageProps['params'] | null>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const wheelsizeId = searchParams.get('wheelsize_id');
  const debugEnabled = searchParams.get('debug') === '1' || process.env.NODE_ENV === 'development';

  // Params'ı resolve et
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Ürün detaylarını getir
  useEffect(() => {
    if (!resolvedParams) return;

    const fetchProductDetail = async () => {
      try {
        console.log('🔍 Ürün detayı yükleniyor...', { resolvedParams, wheelsizeId });
        setLoading(true);
        setError(null);

        // Wheelsize ID varsa onu kullan
        if (wheelsizeId) {
          const brandParam = searchParams.get('brand') || '';
          const nameParam = searchParams.get('name') || '';
          const endpoint = `/tires/wheelsize/${wheelsizeId}?brand=${encodeURIComponent(brandParam)}&name=${encodeURIComponent(nameParam)}`;
          
          if (debugEnabled) {
            console.log('🛰️ [PRODUCT][REQUEST]', { endpoint, wheelsizeId, brandParam, nameParam });
          }

          const response = await authService.authenticatedRequest(endpoint, { method: 'GET' });

          if (debugEnabled) {
            console.log('🛰️ [PRODUCT][RESPONSE]', { status: response.status, ok: response.ok });
          }

          if (!response.ok) {
            let errBody = '';
            try { errBody = await response.text(); } catch {}
            console.error('❌ [PRODUCT][HTTP_ERROR]', { status: response.status, body: errBody });
            throw new Error('Ürün detayları alınamadı');
          }

          const data = await response.json();
          if (debugEnabled) {
            console.log('📦 [PRODUCT][JSON]', data);
          }
          
          if (data.success && data.data) {
            if (debugEnabled) {
              console.log('🟩 [PRODUCT][PARSED]', {
                hasImages: Array.isArray(data.data.images) && data.data.images.length > 0,
                brand: data.data.brand,
                name: data.data.name,
                hasCatalogInfo: !!data.data.catalogInfo,
                hasModes: !!data.data.modes,
                hasBNB: !!data.data.buyNotBuy
              });
            }
            setProduct(data.data);
          } else {
            throw new Error(data.message || 'Ürün bulunamadı');
          }
        } else {
          // Wheelsize ID yoksa slug'dan mock data oluştur
          setProduct({
            _id: resolvedParams.slug,
            name: resolvedParams.slug.replace(/-/g, ' ').toUpperCase(),
            brand: 'Bilinmeyen Marka',
            images: [{ url: '/assets/img/shop/tire-placeholder.jpg', isPrimary: true }],
            specifications: {
              size: '215/55R18',
              loadIndex: '99',
              speedIndex: 'V',
              season: 'yaz'
            },
            price: 0,
            stock: 0,
            stockStatus: 'unknown'
          });
        }
      } catch (err: any) {
        console.error('❌ Product detail fetch error:', err);
        setError(err.message || 'Ürün detayları yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetail();
  }, [resolvedParams, wheelsizeId]);

  // Sepete ekleme
  const handleAddToCart = async () => {
    if (!product) return;

    try {
      setAddingToCart(true);
      
      // Başarılı mesaj
      await Swal.fire({
        icon: 'success',
        title: 'Sepete Eklendi!',
        text: `${product.name} sepetinize başarıyla eklendi.`,
        confirmButtonText: 'Tamam',
        confirmButtonColor: '#28a745'
      });

      toast.success('Ürün sepete eklendi');
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Sepete Eklenemedi',
        text: 'Ürün sepete eklenirken bir hata oluştu. Lütfen tekrar deneyin.',
        confirmButtonText: 'Tamam',
        confirmButtonColor: '#dc3545'
      });
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Yükleniyor...</span>
          </div>
          <p className="mt-3">Ürün detayları yükleniyor...</p>
        </div>
      </Container>
    );
  }

  if (error || !product) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <div className="alert alert-danger">
            <h5>Hata</h5>
            <p>{error || 'Ürün bulunamadı'}</p>
            <button className="btn btn-primary" onClick={() => router.back()}>
              Geri Dön
            </button>
            {debugEnabled && (
              <div className="text-start mt-3">
                <pre className="bg-light p-3 rounded" style={{ maxHeight: 300, overflow: 'auto' }}>
{JSON.stringify({ wheelsizeId, query: Object.fromEntries(Array.from(searchParams.entries())) }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <a href="/" className="text-decoration-none">Ana Sayfa</a>
          </li>
          <li className="breadcrumb-item">
            <a href="/category" className="text-decoration-none">Lastikler</a>
          </li>
          <li className="breadcrumb-item">
            <span className="text-muted">{product.brand}</span>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {product.name}
          </li>
        </ol>
      </nav>

      <Row>
        {/* Ürün Görseli */}
        <Col lg={6} className="mb-4">
          <div className="product-gallery">
            <div className="main-image mb-3">
              <img
                src={product.images.find(img => img.isPrimary)?.url || '/assets/img/shop/tire-placeholder.jpg'}
                alt={product.name}
                className="img-fluid rounded shadow"
                style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }}
                onError={(e) => {
                  e.currentTarget.src = '/assets/img/shop/tire-placeholder.jpg';
                }}
              />
            </div>
            
            {/* Thumbnail'lar */}
            {product.images.length > 1 && (
              <div className="d-flex gap-2 flex-wrap">
                {product.images.map((image, index) => (
                  <img
                    key={index}
                    src={image.url}
                    alt={`${product.name} ${index + 1}`}
                    className="img-thumbnail"
                    style={{ width: '80px', height: '80px', objectFit: 'cover', cursor: 'pointer' }}
                    onError={(e) => {
                      e.currentTarget.src = '/assets/img/shop/tire-placeholder.jpg';
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </Col>

        {/* Ürün Bilgileri */}
        <Col lg={6}>
          <div className="product-info">
            {/* Marka ve Model */}
            <div className="mb-3">
              <span className="badge bg-primary mb-2">{product.brand}</span>
              <h1 className="h3 mb-0">{product.name}</h1>
            </div>

            {/* Ebat ve Özellikler */}
            <div className="mb-3">
              <h5 className="text-primary">{product.specifications.size}</h5>
              <div className="d-flex gap-2 flex-wrap mb-2">
                <span className="badge bg-secondary">
                  {product.specifications.loadIndex} {product.specifications.speedIndex}
                </span>
                <span className={`badge ${
                  product.specifications.season === 'yaz' ? 'bg-warning' :
                  product.specifications.season === 'kis' ? 'bg-info' : 'bg-success'
                }`}>
                  {product.specifications.season === 'yaz' ? '☀️ YAZ' :
                   product.specifications.season === 'kis' ? '❄️ KIŞ' : '🌦️ 4 MEVSİM'}
                </span>
                {product.specifications.runflat && (
                  <span className="badge bg-dark">RunFlat</span>
                )}
                {product.specifications.reinforced && (
                  <span className="badge bg-dark">XL</span>
                )}
              </div>
            </div>

            {/* EU Label */}
            {(product.specifications.fuelEfficiency || product.specifications.wetGrip) && (
              <div className="mb-3">
                <h6>EU Etiket Değerleri</h6>
                <div className="d-flex gap-2">
                  {product.specifications.fuelEfficiency && (
                    <div className="text-center">
                      <div className="badge bg-success">{product.specifications.fuelEfficiency}</div>
                      <small className="d-block text-muted">Yakıt</small>
                    </div>
                  )}
                  {product.specifications.wetGrip && (
                    <div className="text-center">
                      <div className="badge bg-primary">{product.specifications.wetGrip}</div>
                      <small className="d-block text-muted">Islak Zemin</small>
                    </div>
                  )}
                  {product.specifications.noiseLevel && (
                    <div className="text-center">
                      <div className="badge bg-warning text-dark">{product.specifications.noiseLevel}dB</div>
                      <small className="d-block text-muted">Gürültü</small>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Wheelsize Catalog Bilgileri */}
            {product.catalogInfo?.data && (
              <>
                {/* Rating & Popularity */}
                {product.catalogInfo.data.rating && (
                  <div className="mb-3">
                    <h6>Wheelsize Puanı</h6>
                    <div className="d-flex align-items-center gap-3">
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-primary fs-6">
                          {product.catalogInfo.data.rating.score || 0}/100
                        </span>
                        <small className="text-muted">Puan</small>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-info fs-6">
                          {product.catalogInfo.data.rating.popularity || 0}
                        </span>
                        <small className="text-muted">Popülerlik</small>
                      </div>
                    </div>
                  </div>
                )}

                {/* Performance Tags */}
                {product.catalogInfo.data.rating?.tags && product.catalogInfo.data.rating.tags.length > 0 && (
                  <div className="mb-3">
                    <h6>Performans Özellikleri</h6>
                    <div className="d-flex flex-wrap gap-2">
                      {product.catalogInfo.data.rating.tags.map((tag: any, idx: number) => (
                        <div key={idx} className={`badge ${
                          tag.connotation === 'excellent' ? 'bg-success' :
                          tag.connotation === 'good' ? 'bg-primary' :
                          tag.connotation === 'acceptable' ? 'bg-warning text-dark' :
                          tag.connotation === 'bad' ? 'bg-danger' : 'bg-secondary'
                        }`}>
                          {tag.display}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {product.catalogInfo.data.tags && product.catalogInfo.data.tags.length > 0 && (
                  <div className="mb-3">
                    <h6>Özellikler</h6>
                    <div className="d-flex flex-wrap gap-2">
                      {product.catalogInfo.data.tags.map((tag: string, idx: number) => (
                        <span key={idx} className="badge bg-light text-dark border">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Counters */}
                {product.catalogInfo.data.counters && (
                  <div className="mb-3">
                    <div className="d-flex gap-3">
                      {product.catalogInfo.data.counters.benchmarks > 0 && (
                        <div className="text-center">
                          <strong className="d-block">{product.catalogInfo.data.counters.benchmarks}</strong>
                          <small className="text-muted">Test</small>
                        </div>
                      )}
                      {product.catalogInfo.data.counters.videos > 0 && (
                        <div className="text-center">
                          <strong className="d-block">{product.catalogInfo.data.counters.videos}</strong>
                          <small className="text-muted">Video</small>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Performance Scores */}
            {product.performance && (
              <div className="mb-3">
                <h6>Performans Skorları</h6>
                <div className="row g-2">
                  {Object.entries(product.performance).map(([key, value]) => (
                    <div key={key} className="col-6">
                      <div className="d-flex justify-content-between">
                        <small className="text-capitalize">{key.replace('_', ' ')}</small>
                        <span className="badge bg-secondary">{value}/10</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fiyat */}
            <div className="mb-4">
              <h3 className="text-success mb-0">
                {product.price > 0 ? `${product.price.toLocaleString('tr-TR')} ₺` : 'Fiyat Bilgisi Yok'}
              </h3>
              <small className="text-muted">KDV Dahil</small>
            </div>

            {/* Stok Durumu */}
            <div className="mb-4">
              {product.stock > 0 ? (
                <div className="alert alert-success">
                  <i className="fas fa-check-circle me-2"></i>
                  <strong>Stokta Var</strong> - {product.stock} adet mevcut
                </div>
              ) : product.stockStatus === 'in_stock' ? (
                <div className="alert alert-success">
                  <i className="fas fa-check-circle me-2"></i>
                  <strong>Stokta Var</strong>
                </div>
              ) : product.stockStatus === 'out_of_stock' ? (
                <div className="alert alert-danger">
                  <i className="fas fa-times-circle me-2"></i>
                  <strong>Stokta Yok</strong>
                </div>
              ) : (
                <div className="alert alert-warning">
                  <i className="fas fa-question-circle me-2"></i>
                  <strong>Stok Bilgisi Yok</strong>
                </div>
              )}
            </div>

            {/* Dia Stok Bilgisi */}
            {product.diaStock && (
              <div className="mb-4">
                <div className="card">
                  <div className="card-body">
                    <h6 className="card-title">Dia Stok Bilgisi</h6>
                    <p className="card-text">
                      <strong>Fiili Stok:</strong> {product.diaStock.fiili_stok} adet<br/>
                      <strong>Açıklama:</strong> {product.diaStock.aciklama}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sepete Ekleme */}
            <div className="d-grid gap-2">
              <button
                className="btn btn-primary btn-lg"
                disabled={product.stockStatus === 'out_of_stock' || addingToCart}
                onClick={handleAddToCart}
              >
                {addingToCart ? (
                  <>
                    <i className="fas fa-spinner fa-spin me-2"></i>
                    Sepete Ekleniyor...
                  </>
                ) : product.stockStatus !== 'out_of_stock' ? (
                  <>
                    <i className="fas fa-shopping-cart me-2"></i>
                    Sepete Ekle
                  </>
                ) : (
                  'Stokta Yok'
                )}
              </button>
              
              <button
                className="btn btn-outline-secondary"
                onClick={() => router.back()}
              >
                <i className="fas fa-arrow-left me-2"></i>
                Geri Dön
              </button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Buy/Not-Buy Bilgileri */}
      {product.buyNotBuy?.data && (
        <Row className="mt-5">
          <Col>
            <div className="card shadow-sm">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">
                  <i className="fas fa-star me-2"></i>
                  Kullanıcı Yorumları & Değerlendirmeler
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  {product.buyNotBuy.data.buy && product.buyNotBuy.data.buy.length > 0 && (
                    <div className="col-lg-6 mb-4 mb-lg-0">
                      <h6 className="text-success mb-3">
                        <i className="fas fa-thumbs-up me-2"></i>
                        Olumlu Görüşler
                      </h6>
                      <div className="list-group list-group-flush">
                        {product.buyNotBuy.data.buy.map((reason: any, index: number) => (
                          <div key={index} className="list-group-item px-0 border-0">
                            <div className="d-flex align-items-start">
                              <i className="fas fa-check-circle text-success me-3 mt-1"></i>
                              <div className="flex-grow-1">
                                <p className="mb-2">{reason.text}</p>
                                <div className="d-flex align-items-center gap-3">
                                  {reason.upvotes > 0 && (
                                    <small className="text-muted">
                                      <i className="fas fa-thumbs-up me-1"></i>
                                      {reason.upvotes} kişi faydalı buldu
                                    </small>
                                  )}
                                  {reason.prooflink && (
                                    <a href={reason.prooflink} target="_blank" rel="noopener noreferrer" 
                                       className="text-decoration-none small">
                                      <i className="fas fa-external-link-alt me-1"></i>
                                      Kaynak
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
                  
                  {product.buyNotBuy.data.not_buy && product.buyNotBuy.data.not_buy.length > 0 && (
                    <div className="col-lg-6">
                      <h6 className="text-danger mb-3">
                        <i className="fas fa-thumbs-down me-2"></i>
                        Olumsuz Görüşler
                      </h6>
                      <div className="list-group list-group-flush">
                        {product.buyNotBuy.data.not_buy.map((reason: any, index: number) => (
                          <div key={index} className="list-group-item px-0 border-0">
                            <div className="d-flex align-items-start">
                              <i className="fas fa-exclamation-circle text-danger me-3 mt-1"></i>
                              <div className="flex-grow-1">
                                <p className="mb-2">{reason.text}</p>
                                <div className="d-flex align-items-center gap-3">
                                  {reason.upvotes > 0 && (
                                    <small className="text-muted">
                                      <i className="fas fa-thumbs-up me-1"></i>
                                      {reason.upvotes} kişi faydalı buldu
                                    </small>
                                  )}
                                  {reason.prooflink && (
                                    <a href={reason.prooflink} target="_blank" rel="noopener noreferrer" 
                                       className="text-decoration-none small">
                                      <i className="fas fa-external-link-alt me-1"></i>
                                      Kaynak
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
                </div>
              </div>
            </div>
          </Col>
        </Row>
      )}

      {/* Ürün Modları */}
      {product.modes?.data && product.modes.data.length > 0 && (
        <Row className="mt-4">
          <Col>
            <div className="card shadow-sm">
              <div className="card-header bg-secondary text-white">
                <h5 className="mb-0">
                  <i className="fas fa-ruler me-2"></i>
                  Mevcut Ebatlar ({product.modes.meta?.count || product.modes.data.length} adet)
                </h5>
              </div>
              <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <div className="row g-2">
                  {product.modes.data.map((mode: any, index: number) => (
                    <div key={index} className="col-md-3 col-sm-6">
                      <div className="border rounded p-2 h-100 d-flex flex-column justify-content-center">
                        <strong className="text-primary small">{mode.text}</strong>
                        <div className="d-flex flex-wrap gap-1 mt-1">
                          {mode.extra_load && (
                            <span className="badge bg-dark" style={{ fontSize: '0.65rem' }}>XL</span>
                          )}
                          {mode.mud_and_snow && (
                            <span className="badge bg-info" style={{ fontSize: '0.65rem' }}>M+S</span>
                          )}
                          {mode.rim_protection && (
                            <span className="badge bg-warning text-dark" style={{ fontSize: '0.65rem' }}>RIM</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Col>
        </Row>
      )}

      {/* Ürün Açıklaması */}
      {(product.catalogInfo?.data?.description || product.description) && (
        <Row className="mt-4">
          <Col>
            <div className="card shadow-sm">
              <div className="card-header bg-info text-white">
                <h5 className="mb-0">
                  <i className="fas fa-info-circle me-2"></i>
                  Ürün Detayları
                </h5>
              </div>
              <div className="card-body">
                {product.catalogInfo?.data?.description ? (
                  <div dangerouslySetInnerHTML={{ 
                    __html: product.catalogInfo.data.description.replace(/\n/g, '<br/>').replace(/###\s*(.*?)\n/g, '<h6 class="mt-3 mb-2 text-primary">$1</h6>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  }} />
                ) : (
                  <p>{product.description}</p>
                )}
                
                {/* Ek Bilgiler */}
                {product.catalogInfo?.data && (
                  <div className="mt-4 pt-3 border-top">
                    <div className="row g-3">
                      {product.catalogInfo.data.year && (
                        <div className="col-md-4">
                          <small className="text-muted d-block">Üretim Yılı</small>
                          <strong>{product.catalogInfo.data.year}</strong>
                        </div>
                      )}
                      {product.catalogInfo.data.performance_category && (
                        <div className="col-md-4">
                          <small className="text-muted d-block">Performans Kategorisi</small>
                          <strong>{product.catalogInfo.data.performance_category.display}</strong>
                        </div>
                      )}
                      {product.catalogInfo.data.automobile_type && (
                        <div className="col-md-4">
                          <small className="text-muted d-block">Araç Tipi</small>
                          <strong>{product.catalogInfo.data.automobile_type.display}</strong>
                        </div>
                      )}
                      {product.catalogInfo.data.season && (
                        <div className="col-md-4">
                          <small className="text-muted d-block">Mevsim</small>
                          <strong>{product.catalogInfo.data.season.display}</strong>
                        </div>
                      )}
                      {product.catalogInfo.data.brand?.price_segment && (
                        <div className="col-md-4">
                          <small className="text-muted d-block">Segment</small>
                          <strong>{product.catalogInfo.data.brand.price_segment}</strong>
                        </div>
                      )}
                      {product.catalogInfo.data.regions && product.catalogInfo.data.regions.length > 0 && (
                        <div className="col-md-4">
                          <small className="text-muted d-block">Bölgeler</small>
                          <strong>{product.catalogInfo.data.regions.map(r => r.display).join(', ')}</strong>
                        </div>
                      )}
                    </div>
                    
                    {/* Uyarılar */}
                    <div className="mt-3">
                      {product.catalogInfo.data.discontinued && (
                        <div className="alert alert-danger py-2 mb-2">
                          <i className="fas fa-exclamation-triangle me-2"></i>
                          Bu model üretimi durdurulmuştur
                        </div>
                      )}
                      {product.catalogInfo.data.almost_discontinued && (
                        <div className="alert alert-warning py-2 mb-2">
                          <i className="fas fa-exclamation-circle me-2"></i>
                          Bu modelin üretimi yakında durabilir
                        </div>
                      )}
                    </div>
                    
                    {/* Linkler */}
                    <div className="mt-3 d-flex gap-3 flex-wrap">
                      {product.catalogInfo.data.manufacturer_page_link && (
                        <a href={product.catalogInfo.data.manufacturer_page_link} 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           className="btn btn-sm btn-outline-primary">
                          <i className="fas fa-external-link-alt me-1"></i>
                          Üretici Sayfası
                        </a>
                      )}
                      {product.catalogInfo.data.canonical_link && (
                        <a href={product.catalogInfo.data.canonical_link} 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           className="btn btn-sm btn-outline-secondary">
                          <i className="fas fa-link me-1"></i>
                          Wheelsize Sayfası
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Col>
        </Row>
      )}

      {debugEnabled && (
        <Row className="mt-4">
          <Col>
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Debug Bilgileri</h6>
                <small className="text-muted">Sadece geliştirme/debug</small>
              </div>
              <div className="card-body">
                <pre className="bg-light p-3 rounded" style={{ maxHeight: 400, overflow: 'auto' }}>
{JSON.stringify({
  wheelsizeId,
  query: Object.fromEntries(Array.from(searchParams.entries())),
  productSummary: product ? {
    name: product.name,
    brand: product.brand,
    hasImages: Array.isArray(product.images) && product.images.length > 0,
    price: product.price,
    stock: product.stock,
    stockStatus: product.stockStatus,
    hasCatalogInfo: !!(product as any).catalogInfo,
    hasModes: !!(product as any).modes,
    hasBNB: !!(product as any).buyNotBuy
  } : null
}, null, 2)}
                </pre>
              </div>
            </div>
          </Col>
        </Row>
      )}
>>>>>>> 8cb892cd3cd6e5f9003894aa9c8da785c0c212dd
        </Container>
    );
}
