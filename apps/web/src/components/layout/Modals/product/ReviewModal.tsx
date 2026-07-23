'use client';

import { useState, useEffect } from 'react';
import { Modal, Box, Rating } from '@mui/material';
import { toast } from 'react-toastify';
import { useAuth, getToken } from '@/src/hooks/Theme/useAuth';
import { API_ENDPOINTS } from '@/src/config/api';

interface ReviewModalData {
    productKey: string;
    productType: string;
    tireSize: string;
    productName: string;
}

const lastikRatingCategories = [
    { key: 'drivingComfort', label: 'Sürüş Konforu' },
    { key: 'noise', label: 'Gürültü' },
    { key: 'braking', label: 'Frenleme' },
    { key: 'quality', label: 'Kalite' },
    { key: 'fuelEfficiency', label: 'Yakıt Verimliliği' },
    { key: 'wetGrip', label: 'Islak Yol Tutuşu' }
];
const zincirRatingCategories = [
    { key: 'snowGrip', label: 'Karda Yol Tutuşu' },
    { key: 'iceGrip', label: 'Buzda Yol Tutuşu' },
    { key: 'easyMount', label: 'Kolay Montaj' },
    { key: 'hillPerformance', label: 'Yokuş İniş ve Çıkış' },
    { key: 'chainComfort', label: 'Sürüş Konforu' },
    { key: 'chainQuality', label: 'Kalite' }
];

export default function ReviewModal() {
    const { user, isLoggedIn } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [modalData, setModalData] = useState<ReviewModalData | null>(null)

    const [ratings, setRatings] = useState({
        drivingComfort: 0,
        noise: 0,
        braking: 0,
        quality: 0,
        fuelEfficiency: 0,
        wetGrip: 0
    });
    const [zincirRatings, setZincirRatings] = useState({
        snowGrip: 0,
        iceGrip: 0,
        easyMount: 0,
        hillPerformance: 0,
        chainComfort: 0,
        chainQuality: 0
    });
    const [comment, setComment] = useState('');
    const [mileage, setMileage] = useState<number | ''>('');
    const [generalRating, setGeneralRating] = useState(0);
    const isLastik = modalData?.productType === 'LASTIK';
    const isZincir = modalData?.productType === 'ZINCIR';

    const overallRating = () => {
        if (isLastik) {
            const values = Object.values(ratings).filter(v => v > 0);
            if (values.length === 0) return 0;
            return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        }
        if (isZincir) {
            const values = Object.values(zincirRatings).filter(v => v > 0);
            if (values.length === 0) return 0;
            return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        }
        return generalRating;
    };

    // Event listener
    useEffect(() => {
        const handleOpen = (e: CustomEvent<ReviewModalData>) => {
            if (!isLoggedIn || !user) {
                toast.warning('Yorum yapabilmek için lütfen üye girişi yapınız.');
                return;
            }
            setModalData(e.detail);
            setOpen(true);
            fetchGarageMileage();
        };

        window.addEventListener('openReviewModal', handleOpen as EventListener);
        return () => {
            window.removeEventListener('openReviewModal', handleOpen as EventListener);
        };
    }, [isLoggedIn, user]);

    // Garajdan kilometre cek
    const fetchGarageMileage = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.user.vehicles(), {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            const data = await res.json();
            if (data.success && data.data) {
                const primaryVehicle = data.data.find((v: any) => v.isPrimary);
                if (primaryVehicle?.userInputs?.mileage) {
                    setMileage(primaryVehicle.userInputs.mileage);
                }
            }
        } catch (error) { }
    };

    // Modal kapat ve sifirla
    const handleClose = () => {
        setOpen(false);
        setModalData(null);
        setRatings({
            drivingComfort: 0,
            noise: 0,
            braking: 0,
            quality: 0,
            fuelEfficiency: 0,
            wetGrip: 0
        });
        setComment('');
        setMileage('');
        setGeneralRating(0);
        setZincirRatings({
            snowGrip: 0,
            iceGrip: 0,
            easyMount: 0,
            hillPerformance: 0,
            chainComfort: 0,
            chainQuality: 0
        });
    };
    const handleSubmit = async () => {

        if (isLastik) {
            const filledRatings = Object.values(ratings).filter(v => v > 0).length;
            if (filledRatings < 6) {
                toast.error('Lütfen tüm değerlendirme alanlarını doldurunuz.');
                return;
            }
        } else if (isZincir) {
            const filledRatings = Object.values(zincirRatings).filter(v => v > 0).length;
            if (filledRatings < 6) {
                toast.error('Lütfen tüm değerlendirme alanlarını doldurunuz.');
                return;
            }
        } else {
            if (generalRating === 0) {
                toast.error('Lütfen değerlendirme puanı veriniz.');
                return;
            }
        }
        if (comment.trim().length < 10) {
            toast.error('Yorum en az 10 karakter olmalıdır.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(API_ENDPOINTS.reviews.create(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    productKey: modalData?.productKey,
                    userId: user?.id,
                    overallRating: overallRating(),
                    ...(isLastik && {
                        ...ratings,
                        tireSize: modalData?.tireSize,
                        mileage: mileage || undefined
                    }),
                    ...(isZincir && {
                        ...zincirRatings
                    }),
                    comment: comment.trim()
                })
            });


            const data = await res.json();
            if (data.success) {
                toast.success('Yorumunuz başarıyla gonderildi. Onaylandıktan sonra yayınlanacaktır.');
                handleClose();
            } else {
                toast.error(data.message || 'Yorum gönderilirken hata oluştu.');
            }
        } catch (error) {
            toast.error('Bağlantı hatası. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} onClose={handleClose}>
            <Box className="position-absolute top-50 start-50 translate-middle bg-white rounded-3 shadow-lg p-4" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                {/* Header */}
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <h5 className="mb-0">Ürün Değerlendirme</h5>
                    <button type="button" className="btn-close" onClick={handleClose}></button>
                </div>

                {/* Puanlama Alanlari */}
                {isLastik ? (
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Değerlendirmeler</label>
                        <div className="row g-2">
                            {lastikRatingCategories.map((cat) => (
                                <div key={cat.key} className="col-md-4">
                                    <div className="border rounded p-2">
                                        <label className="form-label fs-xs text-muted mb-1">{cat.label}</label>
                                        <div>
                                            <Rating
                                                value={ratings[cat.key as keyof typeof ratings]}
                                                onChange={(_, value) => setRatings(prev => ({ ...prev, [cat.key]: value || 0 }))}
                                                size="medium"
                                                className="site-rating"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : isZincir ? (
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Değerlendirmeler</label>
                        <div className="row g-2">
                            {zincirRatingCategories.map((cat) => (
                                <div key={cat.key} className="col-md-4">
                                    <div className="border rounded p-2">
                                        <label className="form-label fs-xs text-muted mb-1">{cat.label}</label>
                                        <div>
                                            <Rating
                                                value={zincirRatings[cat.key as keyof typeof zincirRatings]}
                                                onChange={(_, value) => setZincirRatings(prev => ({ ...prev, [cat.key]: value || 0 }))}
                                                size="medium"
                                                className="site-rating"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Genel Değerlendirme</label>
                        <div className="d-flex align-items-center gap-3">
                            <Rating
                                value={generalRating}
                                onChange={(_, value) => setGeneralRating(value || 0)}
                                size="large"
                                className="site-rating"
                            />
                            <span className="fs-5 fw-semibold">{generalRating}/5</span>
                        </div>
                    </div>
                )}
                <hr />

                {/* Yorum */}
                <div className="mb-3">
                    <label className="form-label fw-semibold">Yorumunuz <span className="text-danger">*</span></label>
                    <textarea
                        className="form-control"
                        rows={4}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Siparişiniz hakkındaki düşünceleriniz paylaşınız"
                    />
                    <small className="d-flex justify-content-end fs-xs mt-1 text-muted">{comment.length}/500</small>
                </div>

                {/* Butonlar */}
                <div className="d-flex gap-2">
                    <button type="button" className="btn btn-outline-secondary flex-grow-1" onClick={handleClose}>
                        İptal
                    </button>
                    <button type="button" className="btn btn-primary flex-grow-1" onClick={handleSubmit} disabled={loading}>
                        {loading ? (
                            <span className="spinner-border spinner-border-sm me-2"></span>
                        ) : (
                            <i className="ci-check me-2"></i>
                        )}
                        Gönder
                    </button>
                </div>
            </Box>
        </Modal>
    );
}