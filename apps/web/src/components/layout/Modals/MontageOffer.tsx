'use client';

// Lastik sepete eklendikten sonra ortada açılan montaj teklifi popup'ı (LJA)
// 'openMontageOffer' özel olayı ile tetiklenir (hooks/Cart/montageRedirect.ts)
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from 'react-bootstrap';
import { ROUTES } from '@/src/config/routes';
import { MONTAGE_OFFER_EVENT, markMontageOfferAnswered } from '@/src/hooks/Cart/montageRedirect';

export default function MontageOfferModal() {
    const [show, setShow] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const open = () => setShow(true);
        window.addEventListener(MONTAGE_OFFER_EVENT, open);
        return () => window.removeEventListener(MONTAGE_OFFER_EVENT, open);
    }, []);

    // Her iki yanıt da (ve kapatma) kaydedilir; müşteriye bir daha sorulmaz
    const answer = (goMontage: boolean) => {
        markMontageOfferAnswered();
        setShow(false);
        if (goMontage) router.push(ROUTES.MONTAGE);
    };

    return (
        <Modal show={show} onHide={() => answer(false)} centered>
            <Modal.Body className="text-center p-4">
                <i className="ri-tools-line d-block mb-2" style={{ fontSize: 44, color: '#e4cc15' }} />
                <h4 className="fw-bold mb-2">Montaj hizmeti ister misiniz?</h4>
                <p className="text-muted mb-4">
                    Lastiğiniz sepete eklendi. Size en yakın anlaşmalı montaj noktasını seçip
                    lastiğinizin montajını da online satın alabilirsiniz.
                </p>
                <div className="d-grid gap-2">
                    <button type="button" className="btn fw-semibold" style={{ background: '#e4cc15', color: '#000' }} onClick={() => answer(true)}>
                        Montaj Noktalarını Gör
                    </button>
                    <button type="button" className="btn btn-outline-secondary fw-semibold" onClick={() => answer(false)}>
                        Hayır, Alışverişe Devam Et
                    </button>
                </div>
            </Modal.Body>
        </Modal>
    );
}
