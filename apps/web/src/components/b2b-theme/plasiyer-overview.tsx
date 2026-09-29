'use client';
// Plasiyer anasayfası (bayi seçmeden devam).
//  - Üstte 3 özet kartı (Erişilebilen Bayi gerçek; Ciro/Sipariş şimdilik STATİK demo)
//  - Altta iki sütun: SOL = atanan bayiler tablosu, SAĞ = plasiyer profil + satış grafiği
//  - Altta tam genişlik: Bayi Takip (mini CRM)
//  MUI (Materio benzeri tema) ile; yalnız bu alan ThemeProvider ile sarılır.
//  ŞİMDİLİK SADECE FRONTEND — canlı değil, sonra bağlanacak.
import { useEffect, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Box, Card, CardContent, Typography, Avatar, Stack, Divider } from '@mui/material';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { API_ENDPOINTS } from '@src/config/api';
import { plasiyerTheme } from '@components/b2b-theme/plasiyer-mui-theme';
import { PlasiyerSalesChart } from '@components/b2b-theme/plasiyer-sales-chart';
import { PlasiyerBayiTable } from '@components/b2b-theme/plasiyer-bayi-table';
import { PlasiyerMiniCrm } from '@components/b2b-theme/plasiyer-mini-crm';

const STATIK_CIRO = '1.284.750 ₺';
const STATIK_SIPARIS = '312';

function basHarfler(ad: string): string {
    return ad.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toLocaleUpperCase('tr') || '').join('') || 'PL';
}

type OzetProps = { etiket: string; deger: React.ReactNode; ipucu: string; icon: React.ReactNode };
function OzetKart({ etiket, deger, ipucu, icon }: OzetProps) {
    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                    <Box>
                        <Typography variant="body2" color="text.secondary">{etiket}</Typography>
                        <Typography variant="h4" sx={{ mt: 0.5 }}>{deger}</Typography>
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
            <Box sx={{ bgcolor: 'background.default', borderRadius: 2, p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Özet kartları */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3 }}>
                    <OzetKart etiket="Erişilebilen Bayi" deger={bayiSayisi === null ? '…' : bayiSayisi} ipucu="Adına işlem yapabileceğiniz cari" icon={<GroupsOutlinedIcon />} />
                    <OzetKart etiket="Bu Ay Ciro" deger={STATIK_CIRO} ipucu="Carilerinizin toplam siparişleri (demo)" icon={<TrendingUpOutlinedIcon />} />
                    <OzetKart etiket="Bu Ay Sipariş" deger={STATIK_SIPARIS} ipucu="Carilerinizin toplam sipariş adedi (demo)" icon={<ReceiptLongOutlinedIcon />} />
                </Box>

                {/* İçerik: sol atanan bayiler + sağ profil/grafik */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 340px' }, gap: 3, alignItems: 'start' }}>
                    <PlasiyerBayiTable />

                    <Stack spacing={3}>
                        {/* Profil kartı */}
                        <Card>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <Avatar sx={{ width: 72, height: 72, mx: 'auto', mb: 1.5, bgcolor: 'primary.main', color: '#000', fontSize: 26, fontWeight: 700 }}>{basHarfler(plasiyerAd)}</Avatar>
                                <Typography variant="h6">{plasiyerAd}</Typography>
                                <Typography variant="body2" color="text.secondary">Plasiyer{kullaniciKodu ? ` · ${kullaniciKodu}` : ''}</Typography>
                                <Divider sx={{ my: 2 }} />
                                <Stack spacing={1.25} sx={{ textAlign: 'left' }}>
                                    <SatirBilgi etiket="Telefon" deger="0532 000 00 00" />
                                    <SatirBilgi etiket="E-posta" deger={`${kullaniciKodu || 'plasiyer'}@artlastik.com`} />
                                    <SatirBilgi etiket="Bölge" deger="Marmara" />
                                </Stack>
                            </CardContent>
                        </Card>

                        <PlasiyerSalesChart />
                    </Stack>
                </Box>

                {/* Mini CRM: bayi takip / görüşme notları */}
                <PlasiyerMiniCrm />
            </Box>
        </ThemeProvider>
    );
}

function SatirBilgi({ etiket, deger }: { etiket: string; deger: string }) {
    return (
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Typography variant="body2" color="text.secondary">{etiket}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deger}</Typography>
        </Stack>
    );
}
