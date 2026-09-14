'use client';
// Anasayfa cari özet kartları — GERÇEK DIA verisiyle (bakiye, limit, kalan limit).
// Vadesi geçen borç, DIA ekstre servisine bağlanana kadar "—" gösterilir.
import { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '@src/config/api';
import { formatKurus } from '@components/b2b-theme/lib/format';
import { ACCOUNT_SUMMARY, REMAINING_LIMIT_KURUS, PENDING_ORDER_KURUS, DEALER } from '@components/b2b-theme/lib/sample-data';

// STİL SEÇİM MODU: true iken kartlar örnek verinin dolu senaryosuyla çizilir
// (kırmızı borç, yeşil kalan limit, gecikmiş ödeme) — tasarım seçimi bitince
// false yapılır ve kartlar oturumdaki bayinin GERÇEK DIA verisine döner.
const SAMPLE_MODE = false;

interface AccountSummary {
    balanceKurus: number;
    totalLimitKurus: number;
    remainingLimitKurus: number;
    pendingOrderKurus: number;
    overdueKurus: number | null;
}

export function AccountSummaryCards() {
    const [ozet, setOzet] = useState<AccountSummary | null>(null);
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

    const bakiye = SAMPLE_MODE ? ACCOUNT_SUMMARY.balanceKurus : (ozet?.balanceKurus ?? 0);
    const overdue = SAMPLE_MODE ? ACCOUNT_SUMMARY.overdueKurus : (ozet?.overdueKurus ?? null);
    const kalan = SAMPLE_MODE ? REMAINING_LIMIT_KURUS : (ozet?.remainingLimitKurus ?? 0);
    const bekleyen = SAMPLE_MODE ? PENDING_ORDER_KURUS : (ozet?.pendingOrderKurus ?? 0);
    const totalLimit = SAMPLE_MODE ? DEALER.creditLimitKurus : (ozet?.totalLimitKurus ?? 0);
    const loading = !SAMPLE_MODE && ozet === null;
    // Vade tarihi: DIA ekstre servisine bağlanınca gerçek vadeden gelecek
    const vadeTarihi = '30.09.2026';
    const value = (kurus: number) => (loading ? '…' : formatKurus(kurus));

    return (
        <div className="cards">
            <div className="card">
                <div className="label">Bakiye</div>
                <div className={`value${bakiye < 0 ? ' danger' : ''}`}>{value(bakiye)}</div>
                <div className="note">Vade: {vadeTarihi}</div>
            </div>
            <div className="card">
                <div className="label">Toplam Limit</div>
                <div className={`value${totalLimit < 0 ? ' danger' : ''}`}>{value(totalLimit)}</div>
                <div className="note">Cari limitiniz — bu tutara kadar sipariş verebilirsiniz.</div>
            </div>
            <div className="card">
                <div className="label">Kalan Limit</div>
                <div className={`value${kalan < 0 ? ' danger' : ''}`}>{value(kalan)}</div>
                <div className="note">
                    {bekleyen > 0
                        ? `${formatKurus(bekleyen)} bekleyen sipariş dahil`
                        : 'Yeni siparişleriniz için kullanılabilir tutar.'}
                </div>
            </div>
            <div className="card">
                <div className="label">Vadesi Geçen Borç</div>
                <div className={`value${(overdue ?? 0) < 0 ? ' danger' : ''}`}>
                    {loading ? '…' : overdue === null ? '—' : formatKurus(overdue)}
                </div>
                <div className="note">
                    {(overdue ?? 0) > 0 ? 'Gecikmiş ödemeniz var.' : 'Gecikmiş ödemeniz bulunmuyor.'}
                </div>
            </div>
        </div>
    );
}
