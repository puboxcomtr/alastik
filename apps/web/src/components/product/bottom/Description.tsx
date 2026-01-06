'use client';

import { useState, useEffect } from 'react';

/* ========================================
   MUI Components
   ======================================== */
import { Grid, Tooltip } from '@mui/material';
import { getAllLastikFeatures, getAllJantFeatures, isLastik, isJant, isZincir, getLastikEbatDisplay, getProductType } from '@/src/hooks/Products/productHelpers';

/* ========================================
   Routes Helper
   ======================================== */
import { buildBlogUrl } from '@/src/config/routes';

/* ========================================
   Modals
   ======================================== */
import ReviewModal from '@/src/components/layout/Modals/product/ReviewModal';

const getMenuItems = (product: any) => {
    const items = [
        { id: 'description', label: 'Açıklama' },
        { id: 'feature', label: 'Ürün Özellikleri' },
        { id: 'reviews', label: 'Müşteri Yorumları' },
        { id: 'compatible', label: 'Uyumlu Araçlar', onlyLastik: true },
        { id: 'change', label: 'İade ve Değişim' }
    ];

    return items.filter(item => !item.onlyLastik || isLastik(product));
};

interface DescriptionProps {
    product: any;
    wheelSize?: any;
    definition?: any;
    reviews?: any;
    compatibleVehicles?: any;
    relatedBlogs?: any[];
}
export default function ProductDescription({ product, wheelSize, definition, reviews, compatibleVehicles, relatedBlogs }: DescriptionProps) {
    const [activeSection, setActiveSection] = useState('description');
    const menuItems = getMenuItems(product);
    useEffect(() => {
        const observers = menuItems.map((item) => {
            const element = document.getElementById(item.id);
            if (!element) return null;

            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setActiveSection(item.id);
                    }
                },
                { threshold: 0.3, rootMargin: '-20% 0px -50% 0px' }
            );

            observer.observe(element);
            return observer;
        });

        return () => {
            observers.forEach((observer) => observer?.disconnect());
        };
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const offset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
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
                                        <span className={activeSection === item.id ? 'ml-4' : ''}>
                                            {item.label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Grid>
                <Grid className="product__description" size={9}>
                    <section id="description" className="mb-12 min-h-[400px]">
                        <h2 className="fs-5 font-bold text-gray-900 mb-4">
                            Ürün Açıklaması
                        </h2>
                        {isLastik(product) && wheelSize?.ratings?.tags && wheelSize.ratings.tags.length > 0 && (
                            <div className='d-flex flex-wrap mb-3'>
                                {wheelSize.ratings.tags.map((tag: any, idx: number) => {
                                    const isHarika = tag.connotation === 'harika';
                                    const isIyi = tag.connotation === 'iyi';

                                    return (
                                        <Tooltip key={idx} title={tag.connotation === 'harika' ? 'Harika' : tag.connotation === 'iyi' ? 'İyi' : 'Normal'}>
                                            <div className={`d-flex align-items-center gap-1 badge mb-2 me-2 cursor-pointer ${isHarika ? 'text-bg-success' :
                                                isIyi ? 'border border-success text-success' :
                                                    'text-bg-warning'
                                                }`}>
                                                {tag.display}
                                                <i className={
                                                    isHarika ? 'ri-thumb-up-fill' :
                                                        isIyi ? 'ri-emotion-happy-line' :
                                                            'ri-emotion-unhappy-line'
                                                }></i>
                                            </div>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        )}
                        {product?.customData?.customDescription && (
                            <div
                                className="text-gray-700"
                                dangerouslySetInnerHTML={{ __html: product.customData.customDescription }}
                            />
                        )}
                        <div id="tire_test">
                            {isLastik(product) && relatedBlogs && relatedBlogs.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="fs-6 font-bold text-gray-900 mb-3">
                                        İlgili Test ve İncelemeler
                                    </h3>
                                    <div className="row g-3">
                                        {relatedBlogs.slice(0, 4).map((blog: any, idx: number) => (
                                            <div key={idx} className="col-md-6">
                                                <a href={buildBlogUrl(blog.slug)} className="text-black text-decoration-none">
                                                    <div className="border rounded p-3 h-100 bg-white">
                                                        <p className="mb-2 fw-semibold text-dark">{blog.title}</p>
                                                        {blog.excerpt && (
                                                            <p className="text-muted fs-7 mb-2" style={{
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden'
                                                            }}>
                                                                {blog.excerpt}
                                                            </p>
                                                        )}
                                                        <small className="text-primary">
                                                            Devamını Oku
                                                        </small>
                                                    </div>
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {isLastik(product) && wheelSize?.materials && wheelSize.materials.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="fs-6 font-bold text-gray-900 mb-3">
                                        Lastik Test Sonuçları
                                    </h3>
                                    <div className="row g-3">
                                        {wheelSize.materials.map((material: any, idx: number) => {
                                            const videoId = material.url.includes('youtube.com/watch?v=')
                                                ? material.url.split('v=')[1]?.split('&')[0]
                                                : null;

                                            if (!videoId) return null;

                                            return (
                                                <div key={idx} className="col-md-6">
                                                    <div className="border rounded p-2">
                                                        <div className="ratio ratio-16x9 mb-2">
                                                            <iframe
                                                                src={`https://www.youtube.com/embed/${videoId}`}
                                                                title={material.title}
                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                allowFullScreen
                                                                className="rounded"
                                                            ></iframe>
                                                        </div>
                                                        <p className="mb-1 fw-semibold fs-7">{material.title}</p>
                                                        <p className="text-muted fs-xs mb-0">
                                                            Yüklenme Tarihi: {new Date(material.publishedAt).toLocaleDateString('tr-TR')}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <section id="feature" className="mb-12 min-h-[400px]">
                        <h2 className="fs-5 font-bold text-gray-900 mb-4">
                            Ürün Özellikleri
                        </h2>
                        <div className="table-responsive">
                            <table className="table custom-striped cursor-pointer fs-7">
                                <tbody>
                                    {isLastik(product) && getAllLastikFeatures(product).map((feature, index) => (
                                        <tr key={index}>
                                            <td className="text-black">{feature.label}</td>
                                            <td className='text-black'>{feature.value}</td>
                                        </tr>
                                    ))}
                                    {isJant(product) && getAllJantFeatures(product).map((feature, index) => (
                                        <tr key={index}>
                                            <td className='text-black'>{feature.label}</td>
                                            <td className='text-black'>{feature.value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section id="reviews" className="mb-12 min-h-[400px]">
                        <div className='d-flex align-items-center mb-2'>
                            <h2 className="fs-5 font-bold text-gray-900 mb-0">
                                Müşteri Yorumları
                            </h2>
                            <button
                                type="button"
                                className="btn btn-secondary ms-auto"
                                onClick={handleOpenReviewModal}
                            >
                                <i className="ci-edit-3 fs-base ms-n1 me-2"></i>
                                Yorum Yap
                            </button>
                        </div>

                        <ReviewList reviews={reviews} product={product} />
                    </section>

                    {isLastik(product) && (
                        <section id="compatible" className="mb-12 min-h-[400px]">
                            <h2 className="fs-5 font-bold text-gray-900 mb-4">
                                Uyumlu Araçlar
                            </h2>
                            <CompatibleVehiclesSection data={compatibleVehicles} />
                        </section>
                    )}

                    <section id="change" className="mb-12 min-h-[400px]">
                        <h2 className="fs-5 font-bold text-gray-900 mb-4">
                            İade ve Değişim Politikası
                        </h2>
                        <div className="text-gray-700">
                            {definition?.legalContracts?.returnPolicy ? (
                                <div
                                    dangerouslySetInnerHTML={{
                                        __html: definition.legalContracts.returnPolicy
                                    }}
                                />
                            ) : (
                                <p>İade politikası bilgisi bulunamadı.</p>
                            )}
                        </div>
                    </section>
                </Grid>
            </Grid>

            {/* Review Modal */}
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
                        {review.user?.firstName} {review.user?.lastName}
                    </span>
                    <Tooltip title="Doğrulanmış Kullanıcı">
                        <i className="ci-check-circle text-success align-middle ms-1 cursor-pointer"></i>
                    </Tooltip>
                </div>
                {review.orderDate && (
                    <span className="text-black fs-sm ms-auto">
                        <strong>Sipariş Tarihi:</strong> {new Date(review.orderDate).toLocaleDateString('tr-TR')}
                    </span>
                )}
            </div>

            {/* Genel Değerlendirme */}
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
                        <i
                            key={star}
                            className={`ci-star${star <= review.overallRating ? '-filled text-danger' : ' text-body-tertiary opacity-60'}`}
                        ></i>
                    ))}
                </div>
            </div>

            {/* Detaylı Puanlar */}
            {showDetails && (
                <div className="d-flex justify-content-between bg-dotted pt-2 pb-2 mb-2 gap-5">
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
                                        <i
                                            key={star}
                                            className={`ci-star${star <= item.value ? '-filled text-danger' : ' text-body-tertiary opacity-60'}`}
                                        ></i>
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
                                        <i
                                            key={star}
                                            className={`ci-star${star <= item.value ? '-filled text-danger' : ' text-body-tertiary opacity-60'}`}
                                        ></i>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Yorum */}
            <p className="fs-sm text-body-tertiary">{review.comment}</p>

            {/* Ek Bilgiler */}
            <ul className="d-flex flex-row list-unstyled fs-sm pb-2 mb-1 gap-5">
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
            {/* Marka Grid */}
            <div className="row g-3 mb-3">
                {displayMakes.map((make: any) => (
                    <div key={make.slug} className="col-6 col-md-4 col-lg-3">
                        <div
                            className="p-3 border rounded cursor-pointer h-100"
                            onClick={() => setSelectedMake(make)}
                            style={{ transition: 'all 0.2s' }}
                        >
                            <h6 className="mb-1 text-muted fw-semibold fs-7">{make.name}</h6>
                            <p className="text-muted text-decoration-underline fs-medium fs-8 m-0" style={{ cursor: 'pointer' }}>
                                Detaylı Bilgi
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Daha fazla göster */}
            {data.makes.length > 24 && !showAll && (
                <button
                    className="btn btn-outline-secondary w-100 mt-3"
                    onClick={() => setShowAll(true)}
                >
                    Tüm markaları göster (+{data.makes.length - 24})
                </button>
            )}

            {/* Modal */}
            {selectedMake && (
                <div
                    className="modal fade show d-block"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setSelectedMake(null);
                    }}
                >
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <strong>{selectedMake.name}</strong> Uyumlu Modeller
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setSelectedMake(null)}
                                ></button>
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
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setSelectedMake(null)}
                                >
                                    Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}