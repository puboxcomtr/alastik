'use client';

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useCart } from '@/src/context/CartContext';
import TermsModal from '@/src/components/layout/Modals/terms/TermsModal';

interface PaymentSidebarProps {
    onSubmit: () => void;
    loading?: boolean;
    disabled?: boolean;
}

export default function PaymentSidebar({ onSubmit, loading, disabled }: PaymentSidebarProps) {
    const { totals } = useCart();
    const [termsAccepted, setTermsAccepted] = useState(true);
    const [termsModal, setTermsModal] = useState<{ open: boolean; type: TermsType }>({
        open: false,
        type: 'mesafeli-satis'
    });

    const openTermsModal = (type: TermsType) => {
        setTermsModal({ open: true, type });
    };

    const closeTermsModal = () => {
        setTermsModal(prev => ({ ...prev, open: false }));
    };

    const formatPrice = (price: number) => {
        return price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleSubmit = () => {
        if (!termsAccepted) {
            toast.error('Lütfen Mesafeli Satış Sözleşmesini okuyup onaylayın');
            return;
        }
        onSubmit();
    };

    return (
        <>
            {/* Masaüstü Sidebar */}
            <div className="d-none d-lg-block">
                <div className="card bg-white rounded sticky-top" style={{ top: '20px' }}>
                    <div className="card-body">
                        <h5 className="card-title">Sipariş Özeti</h5>
                        <hr />
                        <div className="d-flex justify-content-between mb-2">
                            <span className="fw-semibold text-black fs-sm">Ara Toplam</span>
                            <span>{formatPrice(totals.subtotal)} TL</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                            <span className="fw-semibold text-black fs-sm">Kargo</span>
                            {(totals.shipping ?? 0) > 0 ? <span>{formatPrice(totals.shipping as number)} TL</span> : <span className="text-success">Ücretsiz</span>}
                        </div>
                        {totals.subtotal > 0 && (
                            <div className="d-flex justify-content-between mb-2 text-danger">
                                <span className="fw-semibold fs-sm">İndirim</span>
                                <span>0 TL</span>
                            </div>
                        )}
                        <hr />
                        <div className="d-flex justify-content-between mb-4">
                            <span className="fw-bold">Toplam</span>
                            <span className="fw-bold fs-5 text-primary">{formatPrice(totals.total)} TL</span>
                        </div>
                        <button
                            className="btn btn-primary w-100 fw-semibold fs-6 py-3"
                            onClick={handleSubmit}
                            disabled={loading || disabled}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    İşleniyor...
                                </>
                            ) : (
                                'Ödemeyi Tamamla'
                            )}
                        </button>
                        <div className="form-check mt-3">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="terms"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                            />
                            <label className="form-check-label d-inline small cursor-pointer" htmlFor="terms">
                                <span
                                    role="button"
                                    onClick={() => openTermsModal('mesafeli-satis')}
                                    className="btn-link p-0 text-decoration-none align-baseline text-muted">
                                    Mesafeli Satış Sözleşmesi'ni okudum onaylıyorum.
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobil Bottom Bar */}
            <div className="d-lg-none">
                <div className="cart-mobile-bar">
                    <button
                        className="btn btn-primary w-100 fw-semibold fs-6 py-3"
                        onClick={handleSubmit}
                        disabled={loading || disabled}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                İşleniyor...
                            </>
                        ) : (
                            'Ödemeyi Tamamla'
                        )}
                    </button>
                    <div className="form-check mt-2">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="terms-mobile"
                            checked={termsAccepted}
                            onChange={(e) => setTermsAccepted(e.target.checked)}
                        />
                        <label className="form-check-label d-inline small cursor-pointer" htmlFor="terms-mobile">
                            <span
                                role="button"
                                onClick={() => openTermsModal('mesafeli-satis')}
                                className="btn-link p-0 text-decoration-none align-baseline text-muted">
                                Mesafeli Satış Sözleşmesi'ni okudum onaylıyorum.
                            </span>
                        </label>
                    </div>
                </div>
            </div>
            <TermsModal
                open={termsModal.open}
                onClose={closeTermsModal}
                type={termsModal.type}
            />
        </>
    );
}