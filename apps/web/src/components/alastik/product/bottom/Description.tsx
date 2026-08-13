'use client';

import { useState, useEffect } from 'react';

/* ========================================
   MUI Components
   ======================================== */
import { Grid, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import { getProductSpecRows, isLastik, isZincir, getLastikEbatDisplay, getProductType } from '@/src/hooks/Products/productHelpers';

/* ========================================
   Routes Helper
   ======================================== */
import { buildBlogUrl } from '@/src/config/routes';

/* ========================================
   Modals
   ======================================== */
import ReviewModal from '@/src/components/layout/Modals/product/ReviewModal';

const getMenuItems = (product: any) => {
    const hasFeatures = getProductSpecRows(product).length > 0;

    const items = [
        { id: 'description', label: 'Açıklama' },
        { id: 'feature', label: 'Ürün Özellikleri', onlyWithFeatures: true },
        { id: 'reviews', label: 'Müşteri Yorumları' },
        { id: 'compatible', label: 'Uyumlu Araçlar', onlyLastik: true },
        { id: 'change', label: 'İade ve Değişim' }
    ];

    return items.filter(item =>
        (!item.onlyLastik || isLastik(product)) &&
        (!item.onlyWithFeatures || hasFeatures)
    );
};

interface DescriptionProps {
    product: any;
    wheelSize?: any;
    definition?: any;
    reviews?: any;
    compatibleVehicles?: any;
    relatedBlogs?: any[];
}

/* ========================================
   Section İçerikleri
   ======================================== */
function DescriptionContent({ product, wheelSize, relatedBlogs }: { product: any; wheelSize?: any; relatedBlogs?: any[] }) {
    return (
        <>
            {isLastik(product) && wheelSize?.ratings?.tags && wheelSize.ratings.tags.length > 0 && (
                <div className='d-flex flex-wrap mb-3'>
                    {wheelSize.ratings.tags.map((tag: any, idx: number) => {
                        const isHarika = tag.connotation === 'harika';
                        const isIyi = tag.connotation === 'iyi';
                        return (
                            <Tooltip key={idx} title={tag.connotation === 'harika' ? 'Harika' : tag.connotation === 'iyi' ? 'İyi' : 'Normal'}>
                                <div className={`d-flex align-items-center gap-1 badge mb-2 me-2 cursor-pointer ${isHarika ? 'text-bg-success' : isIyi ? 'border border-success text-success' : 'text-bg-warning'}`}>
                                    {tag.display}
                                    <i className={isHarika ? 'ri-thumb-up-fill' : isIyi ? 'ri-emotion-happy-line' : 'ri-emotion-unhappy-line'}></i>
                                </div>
                            </Tooltip>
                        );
                    })}
                </div>
            )}
            {(product?.customData?.siteDescriptions?.alastik || product?.customData?.customDescription) && (
                <div className="text-gray-700" dangerouslySetInnerHTML={{ __html: product.customData.siteDescriptions?.alastik || product.customData.customDescription }} />
            )}
            {/* Ürüne özel videolar — admin panelinden eklenen YouTube video ve shortları */}
            {product?.customData?.videos?.length > 0 && (
                <div className="mt-4" id="urun_videolari">
                    <h3 className="fs-6 font-bold text-gray-900 mb-3">Ürün Videoları</h3>
                    <div className="row g-3">
                        {product.customData.videos.map((video: any, idx: number) => (
                            <div key={idx} className="col-md-6">
                                <div className="border rounded p-2">
                                    <div className="ratio ratio-16x9 mb-2">
                                        <iframe
                                            src={`https://www.youtube.com/embed/${video.videoId}`}
                                            title={video.title || product.diaData?.aciklama}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="rounded"
                                        ></iframe>
                                    </div>
                                    {video.title && <p className="mb-0 fw-semibold fs-7">{video.title}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div id="tire_test">
                {isLastik(product) && relatedBlogs && relatedBlogs.length > 0 && (
                    <div className="mt-4">
                        <h3 className="fs-6 font-bold text-gray-900 mb-3">İlgili Test ve İncelemeler</h3>
                        <div className="row g-3">
                            {relatedBlogs.slice(0, 4).map((blog: any, idx: number) => (
                                <div key={idx} className="col-md-6">
                                    <a href={buildBlogUrl(blog.slug)} className="text-black text-decoration-none">
                                        <div className="border rounded p-3 h-100 bg-white">
                                            <p className="mb-2 fw-semibold text-dark">{blog.title}</p>
                                            {blog.excerpt && (
                                                <p className="text-muted fs-7 mb-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {blog.excerpt}
                                                </p>
                                            )}
                                            <small className="text-primary">Devamını Oku</small>
                                        </div>
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {isLastik(product) && wheelSize?.materials && wheelSize.materials.length > 0 && (
                    <div className="mt-4">
                        <h3 className="fs-6 font-bold text-gray-900 mb-3">Lastik Test Sonuçları</h3>
                        <div className="row g-3">
                            {wheelSize.materials.map((material: any, idx: number) => {
                                const videoId = material.url.includes('youtube.com/watch?v=') ? material.url.split('v=')[1]?.split('&')[0] : null;
                                if (!videoId) return null;
                                return (
                                    <div key={idx} className="col-md-6">
                                        <div className="border rounded p-2">
                                            <div className="ratio ratio-16x9 mb-2">
                                                <iframe src={`https://www.youtube.com/embed/${videoId}`} title={material.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="rounded"></iframe>
                                            </div>
                                            <p className="mb-1 fw-semibold fs-7">{material.title}</p>
                                            <p className="text-muted fs-xs mb-0">Yüklenme Tarihi: {new Date(material.publishedAt).toLocaleDateString('tr-TR')}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

function FeatureContent({ product }: { product: any }) {
    const features = getProductSpecRows(product);

    if (features.length === 0) return null;

    return (
        <div className="table-responsive">
            <table className="table custom-striped cursor-pointer fs-7">
                <tbody>
                    {features.map((feature, index) => (
                        <tr key={index}>
                            <td className="text-black fw-semibold">{feature.label}</td>
                            <td className='text-body'>{feature.value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ReviewsContent({ reviews, product, onOpenModal }: { reviews: any; product: any; onOpenModal: () => void }) {
    return (
        <>
            <div className='d-flex align-items-center mb-2'>
                <h2 className="d-none d-md-block fs-5 font-bold text-gray-900 mb-0">Müşteri Yorumları</h2>
                <button type="button" className="btn btn-secondary ms-auto" onClick={onOpenModal}>
                    <i className="ci-edit-3 fs-base ms-n1 me-2"></i>Yorum Yap
                </button>
            </div>
            <ReviewList reviews={reviews} product={product} />
        </>
    );
}

function CompatibleContent({ compatibleVehicles }: { compatibleVehicles: any }) {
    return <CompatibleVehiclesSection data={compatibleVehicles} />;
}

function ChangeContent({ definition }: { definition: any }) {
    return (
        <div className="text-gray-700">
            {definition?.legalContracts?.returnPolicy ? (
                <div dangerouslySetInnerHTML={{ __html: definition.legalContracts.returnPolicy }} />
            ) : (
                <p>İade politikası bilgisi bulunamadı.</p>
            )}
        </div>
    );
}

/* ========================================
   Section içeriğini id'ye göre render et
   ======================================== */
function SectionContent({ id, product, wheelSize, definition, reviews, compatibleVehicles, relatedBlogs, onOpenModal }: {
    id: string; product: any; wheelSize?: any; definition?: any; reviews?: any; compatibleVehicles?: any; relatedBlogs?: any[]; onOpenModal: () => void;
}) {
    switch (id) {
        case 'description':
            return <DescriptionContent product={product} wheelSize={wheelSize} relatedBlogs={relatedBlogs} />;
        case 'feature':
            return <FeatureContent product={product} />;
        case 'reviews':
            return <ReviewsContent reviews={reviews} product={product} onOpenModal={onOpenModal} />;
        case 'compatible':
            return <CompatibleContent compatibleVehicles={compatibleVehicles} />;
        case 'change':
            return <ChangeContent definition={definition} />;
        default:
            return null;
    }
}

/* ========================================
   Ana Bileşen
   ======================================== */
export default function ProductDescription({ product, wheelSize, definition, reviews, compatibleVehicles, relatedBlogs }: DescriptionProps) {
    const [activeSection, setActiveSection] = useState('description');
    const menuItems = getMenuItems(product);
    const hasFeatures = getProductSpecRows(product).length > 0;
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    useEffect(() => {
        if (isMobile) return;

        const observers = menuItems.map((item) => {
            const element = document.getElementById(item.id);
            if (!element) return null;
            const observer = new IntersectionObserver(
                ([entry]) => { if (entry.isIntersecting) setActiveSection(item.id); },
                { threshold: 0.3, rootMargin: '-20% 0px -50% 0px' }
            );
            observer.observe(element);
            return observer;
        });

        return () => { observers.forEach((observer) => observer?.disconnect()); };
    }, [isMobile]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const offset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
    };

    const handleOpenReviewModal = () => {
        const event = new CustomEvent('openReviewModal', {
            detail: {
                productKey: product._key,
                productType: getProductType(product),
                tireSize: getLastikEbatDisplay(product) || product.diaData?.ozelkod3kodu || '-',
                productName: product.diaData?.aciklama || product.customData?.seoTitle
            }
        });
        window.dispatchEvent(event);
    };

    const handleAccordionToggle = (id: string) => {
        setActiveSection(prev => prev === id ? '' : id);
    };

    /* ========================================
       Mobil Accordion Görünümü
       ======================================== */
    if (isMobile) {
        return (
            <>
                <div className="product-accordion mt-4">
                    {menuItems.map((item) => (
                        <div key={item.id} className="product-accordion__item border-bottom">
                            <button
                                className={`product-accordion__header d-flex align-items-center justify-content-between w-100 py-3 px-2 bg-transparent border-0 fw-semibold fs-6 text-start ${activeSection === item.id ? 'active' : ''}`}
                                onClick={() => handleAccordionToggle(item.id)}
                            >
                                {item.label}
                                <i className={`ri-arrow-${activeSection === item.id ? 'up' : 'down'}-s-line fs-5`}></i>
                            </button>
                            {activeSection === item.id && (
                                <div className="product-accordion__body px-2 pb-3">
                                    <SectionContent
                                        id={item.id}
                                        product={product}
                                        wheelSize={wheelSize}
                                        definition={definition}
                                        reviews={reviews}
                                        compatibleVehicles={compatibleVehicles}
                                        relatedBlogs={relatedBlogs}
                                        onOpenModal={handleOpenReviewModal}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <ReviewModal />
            </>
        );
    }

    /* ========================================
       Masaüstü Görünümü (Mevcut)
       ======================================== */
    return (
        <>
            <Grid container className="row-fluid mt-5">
                <Grid size={3}>
                    <div className="product__control position-sticky top-1">
                        <div className="flex flex-col space-y-2">
                            <ul className='list-unstyled pr-4'>
                                {menuItems.map((item) => (
                                    <li
                                        key={item.id}
                                        onClick={() => scrollToSection(item.id)}
                                        className={`cursor-pointer border-bottom py-2 fw-semibold fs-6 ${activeSection === item.id ? 'active' : ''}`}
                                    >
                                        <span className={activeSection === item.id ? 'ml-4' : ''}>{item.label}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Grid>
                <Grid className="product__description" size={9}>
                    <section id="description" className="mb-12 min-h-[400px]">
                        <h2 className="fs-5 font-bold text-gray-900 mb-4">Ürün Açıklaması</h2>
                        <DescriptionContent product={product} wheelSize={wheelSize} relatedBlogs={relatedBlogs} />
                    </section>

                    {hasFeatures && (
                        <section id="feature" className="mb-12 min-h-[400px]">
                            <h2 className="fs-5 font-bold text-gray-900 mb-4">Ürün Özellikleri</h2>
                            <FeatureContent product={product} />
                        </section>
                    )}

                    <section id="reviews" className="mb-12 min-h-[400px]">
                        <ReviewsContent reviews={reviews} product={product} onOpenModal={handleOpenReviewModal} />
                    </section>

                    {isLastik(product) && (
                        <section id="compatible" className="mb-12 min-h-[400px]">
                            <h2 className="fs-5 font-bold text-gray-900 mb-4">Uyumlu Araçlar</h2>
                            <CompatibleContent compatibleVehicles={compatibleVehicles} />
                        </section>
                    )}

                    <section id="change" className="mb-12 min-h-[400px]">
                        <h2 className="fs-5 font-bold text-gray-900 mb-4">İade ve Değişim Politikası</h2>
                        <ChangeContent definition={definition} />
                    </section>
                </Grid>
            </Grid>
            <ReviewModal />
        </>
    );
}

/* ========================================
   Review List Component
   ======================================== */
function ReviewList({ reviews, product }: { reviews: any; product: any }) {
    if (!reviews?.reviews || reviews.reviews.length === 0) {
        return <p className="text-center py-5">Henüz yorum yapılmamış.</p>;
    }
    return (
        <>
            {reviews.reviews.map((review: any, idx: number) => (
                <ReviewItem key={idx} review={review} product={product} />
            ))}
        </>
    );
}

function ReviewItem({ review, product }: { review: any; product: any }) {
    const [showDetails, setShowDetails] = useState(false);
    const isLastikProduct = isLastik(product);
    const isZincirProduct = isZincir(product);

    return (
        <div className="border-top py-3">
            <div className="d-flex align-items-center mb-3">
                <div className="text-nowrap me-3">
                    <span className="h6 mb-0">
                        {review.displayName
                            ? `${review.user?.firstName?.charAt(0)}${review.user?.firstName?.slice(1).replace(/./g, '*')} ${review.user?.lastName?.charAt(0)}${review.user?.lastName?.slice(1).replace(/./g, '*')}`
                            : `${review.user?.firstName} ${review.user?.lastName}`
                        }
                    </span>
                    <Tooltip title="Doğrulanmış Kullanıcı">
                        <i className="ci-check-circle text-success align-middle ms-1 cursor-pointer"></i>
                    </Tooltip>
                </div>
                {review.orderDate && (
                    <span className="text-black fs-sm ms-auto">
                        <strong>Sipariş Tarihi:</strong> {new Date(review.orderDate).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                )}
            </div>
            <div className="d-flex flex-column gap-1 pb-2 mb-1">
                <div
                    className={`d-flex align-items-center gap-2 ${(isLastikProduct || isZincirProduct) ? 'cursor-pointer' : ''}`}
                    onClick={() => (isLastikProduct || isZincirProduct) && setShowDetails(!showDetails)}
                >
                    <label className='fs-xs text-muted mb-0'>Genel Değerlendirme</label>
                    {(isLastikProduct || isZincirProduct) && (
                        <i className={`ri-arrow-${showDetails ? 'up' : 'down'}-s-line`}></i>
                    )}
                </div>
                <div>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <i key={star} className={`ci-star${star <= review.overallRating ? '-filled text-danger' : ' text-body-tertiary opacity-60'}`}></i>
                    ))}
                </div>
            </div>
            {showDetails && (
                <div className="d-flex justify-content-between bg-dotted pt-2 pb-2 mb-2 gap-5 flex-wrap">
                    {isLastikProduct && [
                        { label: 'Sürüş konforu', value: review.drivingComfort },
                        { label: 'Gürültü', value: review.noise },
                        { label: 'Frenleme', value: review.braking },
                        { label: 'Kalite', value: review.quality },
                        { label: 'Yakıt Verimliliği', value: review.fuelEfficiency },
                        { label: 'Islak Yol Tutuşu', value: review.wetGrip }
                    ].map((item, i) => (
                        <div key={i}>
                            <div className="d-flex flex-column gap-1 pb-2 mb-1">
                                <label className='fs-xs text-muted text-center'>{item.label}</label>
                                <div>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <i key={star} className={`ci-star${star <= item.value ? '-filled text-danger' : ' text-body-tertiary opacity-60'}`}></i>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isZincirProduct && [
                        { label: 'Karda Yol Tutuşu', value: review.snowGrip },
                        { label: 'Buzda Yol Tutuşu', value: review.iceGrip },
                        { label: 'Kolay Montaj', value: review.easyMount },
                        { label: 'Yokuş İniş/Çıkış', value: review.hillPerformance },
                        { label: 'Sürüş Konforu', value: review.chainComfort },
                        { label: 'Kalite', value: review.chainQuality }
                    ].map((item, i) => (
                        <div key={i}>
                            <div className="d-flex flex-column gap-1 pb-2 mb-1">
                                <label className='fs-xs text-muted text-center'>{item.label}</label>
                                <div>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <i key={star} className={`ci-star${star <= item.value ? '-filled text-danger' : ' text-body-tertiary opacity-60'}`}></i>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {!review.displayName && (
                <p className="fs-sm text-body-tertiary">{review.comment}</p>
            )}
            <ul className="d-flex flex-row list-unstyled fs-sm pb-2 mb-1 gap-5 flex-wrap">
                <li className='text-body-tertiary'>
                    <span className="fw-semibold">Kaynak:</span> {review.source || 'ALastik'}
                </li>
                {review.tireSize && (
                    <li className='text-body-tertiary'>
                        <span className="fw-semibold">Ölçü:</span> <span className="text-muted">{review.tireSize}</span>
                    </li>
                )}
                {review.mileage && (
                    <li className='text-body-tertiary'>
                        <span className="fw-semibold">Ortalama kilometre:</span> {review.mileage.toLocaleString('tr-TR')}
                    </li>
                )}
            </ul>
        </div>
    );
}

function CompatibleVehiclesSection({ data }: { data: any }) {
    const [selectedMake, setSelectedMake] = useState<any>(null);
    const [showAll, setShowAll] = useState(false);

    if (!data || data.total === 0) {
        return (
            <div className="text-center py-4 text-muted">
                <i className="ri-car-line fs-1 d-block mb-2"></i>
                <p>Bu lastik ebadı için uyumlu araç bilgisi bulunamadı.</p>
            </div>
        );
    }

    const displayMakes = showAll ? data.makes : data.makes.slice(0, 24);

    return (
        <div>
            <div className="row g-3 mb-3">
                {displayMakes.map((make: any) => (
                    <div key={make.slug} className="col-6 col-md-4 col-lg-3">
                        <div className="p-3 border rounded cursor-pointer h-100 d-flex flex-column align-items-center text-center" onClick={() => setSelectedMake(make)} style={{ transition: 'all 0.2s' }}>
                            {make.logo && (
                                <img
                                    src={make.logo}
                                    alt={make.name}
                                    width={48}
                                    height={48}
                                    style={{ objectFit: 'contain', marginBottom: '8px' }}
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            )}
                            <h6 className="mb-1 text-muted fw-semibold fs-7">{make.name}</h6>
                            <p className="text-muted text-decoration-underline fs-medium fs-8 m-0" style={{ cursor: 'pointer' }}>Detaylı Bilgi</p>
                        </div>
                    </div>
                ))}
            </div>
            {data.makes.length > 24 && !showAll && (
                <button className="btn btn-outline-secondary w-100 mt-3" onClick={() => setShowAll(true)}>
                    Tüm markaları göster (+{data.makes.length - 24})
                </button>
            )}
            {selectedMake && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={(e) => { if (e.target === e.currentTarget) setSelectedMake(null); }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title"><strong>{selectedMake.name}</strong> Uyumlu Modeller</h5>
                                <button type="button" className="btn-close" onClick={() => setSelectedMake(null)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="row g-2">
                                    {selectedMake.models.map((model: any) => (
                                        <div key={model.slug} className="col-6 col-md-3">
                                            <div className="border rounded p-3 text-center h-100 bg-light">
                                                <p className="mb-1 fw-semibold">{model.name}</p>
                                                {model.years.length > 0 && (
                                                    <small className="text-muted">
                                                        {model.years[0]}{model.years.length > 1 ? ` - ${model.years[model.years.length - 1]}` : ''}
                                                    </small>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setSelectedMake(null)}>Kapat</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}