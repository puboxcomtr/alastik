'use client';
import { useEffect, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Box, Card, CardContent, Typography, Avatar, Stack, Divider } from '@mui/material';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { API_ENDPOINTS } from '@src/config/api';
import { plasiyerTheme } from '@components/b2b-theme/plasiyer-mui-theme';
import { PlasiyerBayiTable } from '@components/b2b-theme/plasiyer-bayi-table';
import { PlasiyerSalesReport } from '@components/b2b-theme/plasiyer-sales-report';

const STATIK_CIRO = '1.284.750 ₺';
const STATIK_SIPARIS = '312';

const STATIK_ATANAN_BAYI = '128';
const STATIK_HEDEF_GUNLUK = '15 adet';
const STATIK_HEDEF_AYLIK = '350 adet';
const STATIK_HEDEF_YILLIK = '4.200 adet';
const STATIK_CIRO_GUNLUK = '42.750 ₺';
const STATIK_CIRO_HAFTALIK = '318.400 ₺';
const STATIK_CIRO_AYLIK = '1.284.750 ₺';
const STATIK_CIRO_TOPLAM = '11.940.300 ₺';

function basHarfler(ad: string): string {
    return ad.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toLocaleUpperCase('tr') || '').join('') || 'PL';
}

function duzAd(ad: string): string {
    return ad
        .toLocaleLowerCase('tr-TR')
        .split(/\s+/)
        .filter(Boolean)
        .map(k => k.charAt(0).toLocaleUpperCase('tr-TR') + k.slice(1))
        .join(' ');
}

type OzetProps = { etiket: string; deger: React.ReactNode; ipucu: string; icon: React.ReactNode };
function OzetKart({ etiket, deger, ipucu, icon }: OzetProps) {
    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                    <Box>
                        <Typography variant="body2" color="text.secondary">{etiket}</Typography>
                        <Typography variant="h4" sx={{ mt: 0.5, color: '#313131' }}>{deger}</Typography>
                    </Box>
                    <Avatar variant="rounded" sx={{ bgcolor: 'primary.light', color: '#000', width: 42, height: 42 }}>{icon}</Avatar>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>{ipucu}</Typography>
            </CardContent>
        </Card>
    );
}

export function PlasiyerOverview() {
    const [bayiSayisi, setBayiSayisi] = useState<number | null>(null);
    const [plasiyerAd, setPlasiyerAd] = useState('Plasiyer');
    const [kullaniciKodu, setKullaniciKodu] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('plasiyerToken');
        if (!token) return;
        fetch(API_ENDPOINTS.b2b.plasiyerMe(), { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { if (d?.success) { setPlasiyerAd(d.data?.name || 'Plasiyer'); setKullaniciKodu(d.data?.kullaniciKodu || ''); } })
            .catch(() => { });
        fetch(API_ENDPOINTS.b2b.plasiyerCariler(''), { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { if (d?.success) setBayiSayisi(d.pagination?.total ?? (d.data?.length || 0)); })
            .catch(() => { });
    }, []);

    return (
        <ThemeProvider theme={plasiyerTheme}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3 }}>
                    <OzetKart etiket="Erişilebilen Bayi" deger={bayiSayisi === null ? '…' : bayiSayisi} ipucu="Adına işlem yapabileceğiniz cari" icon={<GroupsOutlinedIcon />} />
                    <OzetKart etiket="Bu Ay Ciro" deger={STATIK_CIRO} ipucu="Carilerinizin toplam siparişleri (demo)" icon={<TrendingUpOutlinedIcon />} />
                    <OzetKart etiket="Bu Ay Sipariş" deger={STATIK_SIPARIS} ipucu="Carilerinizin toplam sipariş adedi (demo)" icon={<ReceiptLongOutlinedIcon />} />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 340px' }, gap: 3, alignItems: 'start' }}>
                    <PlasiyerBayiTable />

                    <Stack spacing={3}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <Avatar sx={{ width: 72, height: 72, mx: 'auto', mb: 1.5, bgcolor: 'primary.main', color: '#000', fontSize: 26, fontWeight: 700 }}>{basHarfler(plasiyerAd)}</Avatar>
                                <Typography variant="h6">{duzAd(plasiyerAd)}</Typography>
                                <Divider sx={{ my: 2 }} />
                                <Stack spacing={1.25} sx={{ textAlign: 'left' }}>
                                    <SatirBilgi etiket="E-Posta" deger={`${kullaniciKodu || 'plasiyer'}@artlastik.com`} />
                                    <SatirBilgi etiket="Bana Atanan Bayi" deger={STATIK_ATANAN_BAYI} />
                                    <Divider sx={{ my: 0.5 }} />
                                    <SatirBilgi etiket="Günlük Hedef" deger={STATIK_HEDEF_GUNLUK} />
                                    <SatirBilgi etiket="Aylık Hedef" deger={STATIK_HEDEF_AYLIK} />
                                    <SatirBilgi etiket="Yıllık Hedef" deger={STATIK_HEDEF_YILLIK} />
                                    <Divider sx={{ my: 0.5 }} />
                                    <SatirBilgi etiket="Günlük Ciro" deger={STATIK_CIRO_GUNLUK} />
                                    <SatirBilgi etiket="Haftalık Ciro" deger={STATIK_CIRO_HAFTALIK} />
                                    <SatirBilgi etiket="Aylık Ciro" deger={STATIK_CIRO_AYLIK} />
                                    <Divider sx={{ my: 0.5 }} />
                                    <SatirBilgi etiket="Toplam Ciro" deger={STATIK_CIRO_TOPLAM} guclu />
                                </Stack>
                            </CardContent>
                        </Card>
                    </Stack>
                </Box>

                <PlasiyerSalesReport />
            </Box>
        </ThemeProvider>
    );
}

function SatirBilgi({ etiket, deger, guclu }: { etiket: string; deger: string; guclu?: boolean }) {
    return (
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Typography variant="body2" color="text.secondary">{etiket}</Typography>
            <Typography variant="body2" sx={{ fontWeight: guclu ? 700 : 600, color: guclu ? '#000' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deger}</Typography>
        </Stack>
    );
}
