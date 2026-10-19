'use client';

import Link from 'next/link';
import { Container } from 'react-bootstrap';
import { ROUTES } from '@/src/config/routes';

export default function NotFoundContent({ site, primaryColor }: { site: string; primaryColor: string }) {
    const isLja = site === 'lastikjantavm';
    const buttonTextColor = isLja ? '#000' : '#fff';

    return (
        <section className="d-flex align-items-center justify-content-center text-center py-5" style={{ minHeight: '55vh' }}>
            <Container style={{ maxWidth: 640 }}>
                <div className="fw-bold lh-1 mb-2" style={{ fontSize: 'clamp(96px, 20vw, 160px)', color: primaryColor }}>
                    404
                </div>
                <h1 className="fs-2 fw-bold mb-2">Sayfa Bulunamadı</h1>
                <p className="text-muted mb-4">
                    Aradığınız sayfa taşınmış, adı değişmiş veya hiç var olmamış olabilir.
                    Aşağıdaki bağlantılardan devam edebilirsiniz.
                </p>
                <div className="d-flex flex-wrap justify-content-center gap-2">
                    <Link href={ROUTES.HOME} className="btn fw-semibold px-4" style={{ background: primaryColor, color: buttonTextColor }}>
                        Anasayfaya Dön
                    </Link>
                    {isLja && (
                        <Link href={ROUTES.MONTAGE} className="btn btn-dark fw-semibold px-4">
                            Montaj Noktaları
                        </Link>
                    )}
                    <Link href={ROUTES.CONTACT} className="btn btn-outline-secondary fw-semibold px-4">
                        İletişim
                    </Link>
                </div>
            </Container>
        </section>
    );
}
