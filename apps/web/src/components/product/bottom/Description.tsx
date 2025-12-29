'use client';

import { useState, useEffect } from 'react';

/* ========================================
   MUI Components
   ======================================== */
import { Grid, Typography, Rating, Link, Divider, Tooltip } from '@mui/material';
import { getAllLastikFeatures, getAllJantFeatures, isLastik, isJant } from '@/src/hooks/Products/productHelpers';

const menuItems = [
    { id: 'description', label: 'Açıklama' },
    { id: 'feature', label: 'Ürün Özellikleri' },
    { id: 'installment', label: 'Taksit Seçenekleri' },
    { id: 'reviews', label: 'Müşteri Yorumları' },
    { id: 'change', label: 'İade ve Değişim' },
    { id: 'compatible', label: 'Uyumlu Araçlar' }
];
interface DescriptionProps {
    product: any;
    wheelSize?: any;
}
export default function ProductDescription({ product, wheelSize }: DescriptionProps) {
    const [activeSection, setActiveSection] = useState('description');

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

    return (
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
                <section id="installment" className="mb-12 min-h-[400px]">
                    <h2 className="fs-5 font-bold text-gray-900 mb-4">
                        Taksit Seçenekleri
                    </h2>
                    <div className="text-gray-700">
                        <div className="text-gray-700">
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                        </div>
                    </div>
                </section>
                <section id="reviews" className="mb-12 min-h-[400px]">
                    <h2 className="fs-5 font-bold text-gray-900 mb-4">
                        Müşteri Yorumları
                    </h2>
                    <div className="text-gray-700">
                        <div className="text-gray-700">
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                        </div>
                    </div>
                </section>
                <section id="change" className="mb-12 min-h-[400px]">
                    <h2 className="fs-5 font-bold text-gray-900 mb-4">
                        İade ve Değişim
                    </h2>
                    <div className="text-gray-700">
                        <div className="text-gray-700">
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                        </div>
                    </div>
                </section>
                <section id="compatible" className="mb-12 min-h-[400px]">
                    <h2 className="fs-5 font-bold text-gray-900 mb-4">
                        Uyumlu Araçlar
                    </h2>
                    <div className="text-gray-700">
                        <div className="text-gray-700">
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                        </div>
                    </div>
                </section>
            </Grid>
        </Grid>
    );
}