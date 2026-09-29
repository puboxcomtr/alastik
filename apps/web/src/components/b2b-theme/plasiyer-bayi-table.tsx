'use client';
// Benim Bayilerim tablosu — Bayi Adı / Satın Aldığı Ürün Adeti / Toplam Ciro (hepsi sıralanabilir) + sayfalama.
// MUI (Materio benzeri tema) — Card + Table + TableSortLabel + numaralı Pagination.
// ŞİMDİLİK DEMO veri (frontend); sonra canlı bağlanacak.
import { useMemo, useState } from 'react';
import { Card, CardContent, Typography, Box, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TableSortLabel, Pagination } from '@mui/material';

type Bayi = { ad: string; adet: number; ciro: number };
type SiraAlan = keyof Bayi;
type SiraYon = 'asc' | 'desc';

// Demo bayi verisi üretimi (~40 kayıt → 8/sayfa = 5 sayfa)
const ADLAR = [
    'Akif Ece Oto Lastik', 'Limanyolu Lastik Pazarlama', 'Modül Lastik Otomotiv', 'Bayram Oto Lastik',
    'Kartal Jant & Lastik', 'Deniz Otomotiv', 'Yıldız Lastik Servis', 'Merkez Jant', 'Anadolu Lastik',
    'Ege Oto Ekipman', 'Marmara Lastik Dünyası', 'Başak Otomotiv', 'Güneş Lastik', 'Pınar Oto Servis',
    'Toros Lastik Ticaret', 'Ada Jant', 'Fırat Otomotiv', 'Karadeniz Lastik', 'Sema Oto Lastik',
    'Volkan Jant Sistemleri', 'Bereket Lastik', 'Çınar Otomotiv', 'Doğuş Lastik Servis', 'Elit Jant',
    'Ferhat Oto Lastik', 'Gökçe Otomotiv', 'Hanedan Lastik', 'İnci Jant', 'Kaya Oto Ekipman',
    'Levent Lastik', 'Mavi Otomotiv', 'Nur Lastik Servis', 'Orkun Jant', 'Poyraz Lastik',
    'Rüzgar Otomotiv', 'Selim Oto Lastik', 'Tunç Jant', 'Uğur Lastik', 'Vadi Otomotiv', 'Zafer Lastik',
];
const DEMO: Bayi[] = ADLAR.map((ad, i) => ({
    ad: `${ad} ${['Tic.', 'San.', 'Ltd. Şti.', 'A.Ş.'][i % 4]}`,
    adet: 40 + ((i * 37) % 460),
    ciro: 25000 + ((i * 91317) % 480000),
}));

const SAYFA_ADET = 8;
const tl = (n: number) => n.toLocaleString('tr-TR') + ' ₺';

function karsilastir(a: Bayi, b: Bayi, alan: SiraAlan): number {
    if (alan === 'ad') return a.ad.localeCompare(b.ad, 'tr');
    return (a[alan] as number) - (b[alan] as number);
}

export function PlasiyerBayiTable() {
    const [sayfa, setSayfa] = useState(1);
    const [siraAlan, setSiraAlan] = useState<SiraAlan>('ciro');
    const [siraYon, setSiraYon] = useState<SiraYon>('desc');

    const sirali = useMemo(() => {
        const kopya = [...DEMO];
        kopya.sort((a, b) => siraYon === 'asc' ? karsilastir(a, b, siraAlan) : -karsilastir(a, b, siraAlan));
        return kopya;
    }, [siraAlan, siraYon]);

    const toplamSayfa = Math.ceil(sirali.length / SAYFA_ADET);
    const bas = (sayfa - 1) * SAYFA_ADET;
    const dilim = sirali.slice(bas, bas + SAYFA_ADET);

    function siralamayiDegistir(alan: SiraAlan) {
        if (siraAlan === alan) {
            setSiraYon(y => (y === 'asc' ? 'desc' : 'asc'));
        } else {
            setSiraAlan(alan);
            setSiraYon(alan === 'ad' ? 'asc' : 'desc');
        }
        setSayfa(1);
    }

    const baslik = (alan: SiraAlan, etiket: string, sag?: boolean) => (
        <TableCell align={sag ? 'right' : 'left'} sortDirection={siraAlan === alan ? siraYon : false}>
            <TableSortLabel
                active={siraAlan === alan}
                direction={siraAlan === alan ? siraYon : 'asc'}
                onClick={() => siralamayiDegistir(alan)}
            >
                {etiket}
            </TableSortLabel>
        </TableCell>
    );

    return (
        <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', pb: 1.5 }}>
                <Typography variant="h6">Benim Bayilerim</Typography>
                <Typography variant="body2" color="text.secondary">{DEMO.length} bayi (demo)</Typography>
            </CardContent>

            <TableContainer>
                <Table size="medium">
                    <TableHead>
                        <TableRow>
                            {baslik('ad', 'Bayi Adı')}
                            {baslik('adet', 'Satın Aldığı Ürün Adeti', true)}
                            {baslik('ciro', 'Toplam Ciro', true)}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {dilim.map((b, i) => (
                            <TableRow key={i} hover>
                                <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{b.ad}</Typography>
                                </TableCell>
                                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{b.adet.toLocaleString('tr-TR')}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#000', fontVariantNumeric: 'tabular-nums' }}>{tl(b.ciro)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {toplamSayfa > 1 && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        {bas + 1}–{Math.min(bas + SAYFA_ADET, sirali.length)} / {sirali.length} bayi
                    </Typography>
                    <Pagination count={toplamSayfa} page={sayfa} onChange={(_, p) => setSayfa(p)} color="primary" shape="rounded" />
                </Box>
            )}
        </Card>
    );
}
