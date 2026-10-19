'use client';

import React from 'react';
import Link from 'next/link';
import Rating from '@mui/material/Rating';
import { buildProductUrl } from '@/src/config/routes';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    active: { label: 'Yayında', color: 'text-success' },
    pending: { label: 'Onay Bekliyor', color: 'text-warning' },
    rejected: { label: 'Reddedildi', color: 'text-danger' },
};

type ReviewItem = {
    _id: string;
    productKey: string;
    overallRating: number;
    comment: string;
    tireSize?: string;
    mileage?: number;
    status: string;
    createdAt: string;
    product?: {
        name: string;
        brand: string;
        image: string | null;
        seoUrl: string | null;
    };
};

type Props = {
    reviews: ReviewItem[];
    loading?: boolean;
};

export default function ReviewsContent({ reviews, loading }: Props) {

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    const getStatus = (status: string) => {
        return STATUS_MAP[status] || { label: status, color: 'text-secondary' };
    };

    return (
        <div className="my-3 py-4">
            <div className="nav flex-nowrap align-items-center justify-content-between pb-1 mb-3">
                <h2 className="h6 mb-0 text-primary">Yorumlarım</h2>
            </div>

            {loading ? (
                <div className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Yükleniyor...</span>
                    </div>
                </div>
            ) : !reviews || reviews.length === 0 ? (
                <div className="text-center py-4">
                    Henüz yorum yapmadınız.
                </div>
            ) : (
                <div className="d-flex flex-column gap-3">
                    {reviews.map((review) => {
                        const st = getStatus(review.status);
                        return (
                            <div className="card border" key={review._id}>
                                <div className="card-body p-3">
                                    <div className="d-flex gap-3">
                                        {review.product?.seoUrl ? (
                                            <Link href={buildProductUrl(review.product.seoUrl)} className="flex-shrink-0">
                                                {review.product.image ? (
                                                    <img src={review.product.image} width="80" height="80" alt={review.product.name} style={{ objectFit: 'contain' }} />
                                                ) : (
                                                    <div style={{ width: 80, height: 80, background: '#f5f5f5' }} className="d-flex align-items-center justify-content-center rounded">
                                                        <i className="ci-image fs-3 text-muted"></i>
                                                    </div>
                                                )}
                                            </Link>
                                        ) : (
                                            <span className="flex-shrink-0">
                                                {review.product?.image ? (
                                                    <img src={review.product.image} width="80" height="80" alt={review.product?.name || ''} style={{ objectFit: 'contain' }} />
                                                ) : (
                                                    <div style={{ width: 80, height: 80, background: '#f5f5f5' }} className="d-flex align-items-center justify-content-center rounded">
                                                        <i className="ci-image fs-3 text-muted"></i>
                                                    </div>
                                                )}
                                            </span>
                                        )}

                                        <div className="w-100 min-w-0">
                                            <div className="d-flex justify-content-between align-items-start mb-1">
                                                <div>
                                                    {review.product?.brand && (
                                                        <span className="fs-xs text-muted">{review.product.brand}</span>
                                                    )}
                                                    {review.product?.seoUrl ? (
                                                        <Link href={buildProductUrl(review.product.seoUrl)} className="d-block fs-sm fw-medium text-body-emphasis text-decoration-none text-truncate" style={{ maxWidth: 300 }}>
                                                            {review.product.name}
                                                        </Link>
                                                    ) : (
                                                        <span className="d-block fs-sm fw-medium text-truncate" style={{ maxWidth: 300 }}>
                                                            {review.product?.name || 'Ürün bulunamadı'}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={`fs-xs fw-medium ${st.color}`}>
                                                    {st.label}
                                                </span>
                                            </div>

                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <Rating value={review.overallRating} size="small" readOnly />
                                                <span className="fs-xs text-muted">{formatDate(review.createdAt)}</span>
                                            </div>

                                            <p className="fs-sm text-body mb-1">{review.comment}</p>

                                            {(review.tireSize || review.mileage) && (
                                                <div className="d-flex gap-3 fs-xs text-muted">
                                                    {review.tireSize && <span>Ebat: {review.tireSize}</span>}
                                                    {review.mileage && <span>Kilometre: {review.mileage.toLocaleString('tr-TR')} km</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}