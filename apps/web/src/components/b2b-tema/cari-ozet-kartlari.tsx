'use client';
// Anasayfa cari özet kartları — GERÇEK DIA verisiyle (bakiye, limit, kalan limit).
// Vadesi geçen borç, DIA ekstre servisine bağlanana kadar "—" gösterilir.
import { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '@src/config/api';
import { formatKurus } from '@components/b2b-tema/lib/format';
import { CARI_OZET, KALAN_LIMIT_KURUS, BEKLEYEN_SIPARIS_KURUS, BAYI } from '@components/b2b-tema/lib/ornek-veri';

// STİL SEÇİM MODU: true iken kartlar örnek verinin dolu senaryosuyla çizilir
// (kırmızı borç, yeşil kalan limit, gecikmiş ödeme) — tasarım seçimi bitince
// false yapılır ve kartlar oturumdaki bayinin GERÇEK DIA verisine döner.
const ORNEK_GORUNUM = false;

interface CariOzet {
    bakiyeKurus: number;
    toplamLimitKurus: number;
    kalanLimitKurus: number;
    bekleyenSiparisKurus: number;
    vadesiGecenKurus: number | null;
}

export function CariOzetKartlari() {
    const [ozet, setOzet] = useState<CariOzet | null>(null);
    const [hata, setHata] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        fetch(API_ENDPOINTS.b2b.cariOzet(), { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { if (d?.success) setOzet(d.data); else setHata(true); })
            .catch(() => setHata(true));
    }, []);

    if (hata) {
        return <p className="note">Cari bilgileriniz şu an yüklenemedi.</p>;
    }

    const bakiye = ORNEK_GORUNUM ? CARI_OZET.bakiyeKurus : (ozet?.bakiyeKurus ?? 0);
    const vadesiGecen = ORNEK_GORUNUM ? CARI_OZET.vadesiGecenKurus : (ozet?.vadesiGecenKurus ?? null);
    const kalan = ORNEK_GORUNUM ? KALAN_LIMIT_KURUS : (ozet?.kalanLimitKurus ?? 0);
    const bekleyen = ORNEK_GORUNUM ? BEKLEYEN_SIPARIS_KURUS : (ozet?.bekleyenSiparisKurus ?? 0);
    const toplamLimit = ORNEK_GORUNUM ? BAYI.krediLimitiKurus : (ozet?.toplamLimitKurus ?? 0);
    const yukleniyor = !ORNEK_GORUNUM && ozet === null;
    // Vade tarihi: DIA ekstre servisine bağlanınca gerçek vadeden gelecek
    const vadeTarihi = '30.09.2026';
    const deger = (kurus: number) => (yukleniyor ? '…' : formatKurus(kurus));

    return (
        <div className="cards">
            <div className="card">
                <div className="label">Bakiye</div>
                <div className={`value${bakiye < 0 ? ' danger' : ''}`}>{deger(bakiye)}</div>
                <div className="note">Vade: {vadeTarihi}</div>
            </div>
            <div className="card">
                <div className="label">Toplam Limit</div>
                <div className={`value${toplamLimit < 0 ? ' danger' : ''}`}>{deger(toplamLimit)}</div>
                <div className="note">Cari limitiniz — bu tutara kadar sipariş verebilirsiniz.</div>
            </div>
            <div className="card">
                <div className="label">Kalan Limit</div>
                <div className={`value${kalan < 0 ? ' danger' : ''}`}>{deger(kalan)}</div>
                <div className="note">
                    {bekleyen > 0
                        ? `${formatKurus(bekleyen)} bekleyen sipariş dahil`
                        : 'Yeni siparişleriniz için kullanılabilir tutar.'}
                </div>
            </div>
            <div className="card">
                <div className="label">Vadesi Geçen Borç</div>
                <div className={`value${(vadesiGecen ?? 0) < 0 ? ' danger' : ''}`}>
                    {yukleniyor ? '…' : vadesiGecen === null ? '—' : formatKurus(vadesiGecen)}
                </div>
                <div className="note">
                    {(vadesiGecen ?? 0) > 0 ? 'Gecikmiş ödemeniz var.' : 'Gecikmiş ödemeniz bulunmuyor.'}
                </div>
            </div>
        </div>
    );
}
