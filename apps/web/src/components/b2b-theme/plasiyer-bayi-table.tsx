'use client';
// Benim Bayilerim tablosu — Bayi Adı / Satın Aldığı Ürün Adeti / Toplam Ciro (hepsi sıralanabilir) + sayfalama.
// MUI (Materio benzeri tema) — Card + Table + TableSortLabel + numaralı Pagination.
// ŞİMDİLİK DEMO veri (frontend); sonra canlı bağlanacak.
import { useMemo, useState } from 'react';
import { Card, CardHeader, Divider, Typography, Box, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TableSortLabel, Pagination, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';

type Bayi = { id: number; ad: string; adet: number; ciro: number };
type SiraAlan = 'ad' | 'adet' | 'ciro';
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
    id: i,
    ad: `${ad} ${['Tic.', 'San.', 'Ltd. Şti.', 'A.Ş.'][i % 4]}`,
    adet: 40 + ((i * 37) % 460),
    ciro: 25000 + ((i * 91317) % 480000),
}));

const SAYFA_ADET = 8;
const tl = (n: number) => n.toLocaleString('tr-TR') + ' ₺';

// Dönem katsayıları (demo): aylık taban, haftalık ~1/4, günlük ~1/30
type Donem = 'gunluk' | 'haftalik' | 'aylik';
const DONEM_KATSAYI: Record<Donem, number> = { gunluk: 1 / 30, haftalik: 0.25, aylik: 1 };

// ── Popover demo verileri (satır bazında, id'den deterministik) ──
const MARKALAR = ['Pirelli', 'Lassa', 'Michelin', 'Goodyear', 'Bridgestone', 'Petlas'];

function iletisim(ad: string, id: number): { email: string; tel: string } {
    const slug = ad.toLocaleLowerCase('tr-TR').replace(/[^a-z0-9]+/g, '').slice(0, 14) || 'bayi';
    const tel = `0532 ${100 + (id * 37) % 900} ${10 + (id * 13) % 90} ${10 + (id * 29) % 90}`;
    return { email: `${slug}@bayi.com`, tel };
}

function markaDagilim(id: number, toplamAdet: number): { marka: string; adet: number }[] {
    const n = 2 + (id % 2); // 2 veya 3 marka
    const secili = Array.from({ length: n }, (_, i) => MARKALAR[(id + i * 2) % MARKALAR.length]);
    const agir = secili.map((_, i) => ((id + i * 7) % 5) + 2);
    const toplamAgir = agir.reduce((a, b) => a + b, 0);
    let kalan = toplamAdet;
    return secili.map((m, i) => {
        const adet = i === n - 1 ? kalan : Math.round(toplamAdet * agir[i] / toplamAgir);
        kalan -= adet;
        return { marka: m, adet };
    }).filter(x => x.adet > 0);
}

function vadeDagilim(ciro: number): { odenen: number; gelen: number; gecen: number } {
    const odenen = Math.round(ciro * 0.6);
    const gelen = Math.round(ciro * 0.25);
    return { odenen, gelen, gecen: Math.max(0, ciro - odenen - gelen) };
}

// Tooltip içeriği: etiket/değer satırları
function IpucuKutu({ satirlar }: { satirlar: [string, string][] }) {
    return (
        <Box sx={{ py: 0.25 }}>
            {satirlar.map(([k, v], i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.25 }}>
                    <Typography variant="caption" sx={{ opacity: 0.85 }}>{k}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{v}</Typography>
                </Box>
            ))}
        </Box>
    );
}

function karsilastir(a: Bayi, b: Bayi, alan: SiraAlan): number {
    if (alan === 'ad') return a.ad.localeCompare(b.ad, 'tr');
    return (a[alan] as number) - (b[alan] as number);
}

export function PlasiyerBayiTable() {
    const [sayfa, setSayfa] = useState(1);
    const [siraAlan, setSiraAlan] = useState<SiraAlan>('ciro');
    const [siraYon, setSiraYon] = useState<SiraYon>('desc');
    const [donem, setDonem] = useState<Donem>('aylik');
    const kat = DONEM_KATSAYI[donem];

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
            <CardHeader
                title="Bayilerim"
                titleTypographyProps={{ variant: 'h6', sx: { color: '#000' } }}
                action={
                    <ToggleButtonGroup size="small" exclusive value={donem} onChange={(_, v) => { if (v) setDonem(v); }} sx={{ mr: 1 }}>
                        <ToggleButton value="gunluk">Günlük</ToggleButton>
                        <ToggleButton value="haftalik">Haftalık</ToggleButton>
                        <ToggleButton value="aylik">Aylık</ToggleButton>
                    </ToggleButtonGroup>
                }
                sx={{ '& .MuiCardHeader-action': { m: 0, alignSelf: 'center' } }}
            />
            <Divider />

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
                        {dilim.map((b) => {
                            const adetG = Math.round(b.adet * kat);
                            const ciroG = Math.round(b.ciro * kat);
                            const ilet = iletisim(b.ad, b.id);
                            const markalar = markaDagilim(b.id, adetG);
                            const vade = vadeDagilim(ciroG);
                            return (
                                <TableRow key={b.id} hover>
                                    <TableCell>
                                        <Tooltip arrow placement="top" title={<IpucuKutu satirlar={[['E-posta', ilet.email], ['Telefon', ilet.tel]]} />}>
                                            <Typography variant="body2" component="span" sx={{ fontWeight: 600, cursor: 'pointer' }}>{b.ad}</Typography>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                        <Tooltip arrow placement="top" title={<IpucuKutu satirlar={markalar.map(m => [m.marka, `${m.adet} adet`])} />}>
                                            <Box component="span" sx={{ cursor: 'pointer' }}>{adetG.toLocaleString('tr-TR')}</Box>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#000', fontVariantNumeric: 'tabular-nums' }}>
                                        <Tooltip arrow placement="top" title={<IpucuKutu satirlar={[['Ödenen', tl(vade.odenen)], ['Vadesi Gelen', tl(vade.gelen)], ['Vadesi Geçen', tl(vade.gecen)]]} />}>
                                            <Box component="span" sx={{ cursor: 'pointer' }}>{tl(ciroG)}</Box>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
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
