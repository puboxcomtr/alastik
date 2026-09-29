'use client';
// Mini CRM — plasiyerin bayi takip alanı (saha satışı için).
//  - Hatırlatma tarihine göre filtre: Bugün / Bu Hafta / Tümü
//  - MUI (Materio benzeri tema): Card + Table + Chip + inline not düzenleme
//  ŞİMDİLİK SADECE FRONTEND (demo, local state) — sonra canlıya bağlanacak.
import { useMemo, useState } from 'react';
import {
    Card, CardContent, Typography, Box, Stack, Avatar, Chip, TextField, Button,
    Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
    ToggleButton, ToggleButtonGroup,
} from '@mui/material';

type Durum = 'aranacak' | 'teklif' | 'ilgileniyor' | 'takip';
type Kayit = {
    ad: string;
    durum: Durum;
    sonGorusme: Date | null;
    hatirlatma: Date;
    not: string;
};

type ChipRenk = 'error' | 'info' | 'success' | 'warning';
const DURUM_ETIKET: Record<Durum, { label: string; renk: ChipRenk }> = {
    aranacak: { label: 'Aranacak', renk: 'error' },
    teklif: { label: 'Teklif Verildi', renk: 'info' },
    ilgileniyor: { label: 'İlgileniyor', renk: 'success' },
    takip: { label: 'Takipte', renk: 'warning' },
};

// Bugüne göre demo tarih üretimi
function gun(offset: number): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return d;
}

const DEMO: Kayit[] = [
    { ad: 'Akif Ece Oto Lastik Tic.', durum: 'aranacak', sonGorusme: gun(-9), hatirlatma: gun(-2), not: 'Kış lastiği stoğu soracaktı, teklif bekliyor.' },
    { ad: 'Limanyolu Lastik Paz.', durum: 'teklif', sonGorusme: gun(-3), hatirlatma: gun(0), not: '4 adet 205/55 R16 teklifi iletildi, dönüş bekleniyor.' },
    { ad: 'Modül Lastik Otomotiv', durum: 'ilgileniyor', sonGorusme: gun(-1), hatirlatma: gun(1), not: 'Jant kampanyasıyla ilgilendi, fiyat gönderilecek.' },
    { ad: 'Bayram Oto Lastik', durum: 'takip', sonGorusme: gun(-6), hatirlatma: gun(3), not: 'Ödeme vadesi yaklaşıyor, hatırlatma yapılacak.' },
    { ad: 'Kartal Jant & Lastik', durum: 'aranacak', sonGorusme: null, hatirlatma: gun(-1), not: 'Yeni bayi, ilk ziyaret planlanacak.' },
    { ad: 'Deniz Otomotiv San.', durum: 'ilgileniyor', sonGorusme: gun(-2), hatirlatma: gun(5), not: 'Filo lastiği talebi var, ölçüler netleşecek.' },
    { ad: 'Yıldız Lastik Servis', durum: 'takip', sonGorusme: gun(-12), hatirlatma: gun(8), not: '2 aydır sipariş yok, tekrar temas kurulacak.' },
];

const fmt = (d: Date) => d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });

// Hatırlatma tarihine göre okunur ifade
function hatirlatmaMetni(d: Date): { metin: string; gecikmis: boolean } {
    const bugun = gun(0).getTime();
    const fark = Math.round((d.getTime() - bugun) / 86400000);
    if (fark < 0) return { metin: `${-fark} gün gecikti`, gecikmis: true };
    if (fark === 0) return { metin: 'Bugün', gecikmis: true };
    if (fark === 1) return { metin: 'Yarın', gecikmis: false };
    return { metin: `${fark} gün sonra`, gecikmis: false };
}

function basHarfler(ad: string): string {
    return ad.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toLocaleUpperCase('tr') || '').join('') || 'B';
}

export function PlasiyerMiniCrm() {
    const [tab, setTab] = useState('bugun');
    const [kayitlar, setKayitlar] = useState<Kayit[]>(DEMO);
    const [acikNot, setAcikNot] = useState<number | null>(null);
    const [notMetni, setNotMetni] = useState('');

    const filtreli = useMemo(() => {
        const bugun = gun(0).getTime();
        const haftaSonu = gun(7).getTime();
        const liste = kayitlar
            .map((k, i) => ({ k, i }))
            .filter(({ k }) => {
                if (tab === 'tumu') return true;
                if (tab === 'bugun') return k.hatirlatma.getTime() <= bugun; // bugün + gecikmiş
                return k.hatirlatma.getTime() <= haftaSonu; // bu hafta
            });
        liste.sort((a, b) => a.k.hatirlatma.getTime() - b.k.hatirlatma.getTime());
        return liste;
    }, [tab, kayitlar]);

    function notKaydet(index: number) {
        const metin = notMetni.trim();
        if (!metin) { setAcikNot(null); return; }
        setKayitlar(prev => prev.map((k, i) => i === index ? { ...k, not: metin, sonGorusme: gun(0) } : k));
        setAcikNot(null);
        setNotMetni('');
    }

    return (
        <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', pb: 1.5 }}>
                <Box>
                    <Typography variant="h6">Bayi Takip</Typography>
                    <Typography variant="body2" color="text.secondary">Görüşme ve hatırlatma notları (demo)</Typography>
                </Box>
                <ToggleButtonGroup size="small" exclusive value={tab} onChange={(_, v) => { if (v) setTab(v); }}>
                    <ToggleButton value="bugun">Bugün</ToggleButton>
                    <ToggleButton value="hafta">Bu Hafta</ToggleButton>
                    <ToggleButton value="tumu">Tümü</ToggleButton>
                </ToggleButtonGroup>
            </CardContent>

            {filtreli.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Bu aralıkta hatırlatma yok.</Typography>
                </Box>
            ) : (
                <TableContainer>
                    <Table size="medium">
                        <TableHead>
                            <TableRow>
                                <TableCell>Bayi</TableCell>
                                <TableCell>Durum</TableCell>
                                <TableCell>Son Görüşme</TableCell>
                                <TableCell>Hatırlatma</TableCell>
                                <TableCell sx={{ minWidth: 240 }}>Not</TableCell>
                                <TableCell align="right">İşlem</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtreli.map(({ k, i }) => {
                                const d = DURUM_ETIKET[k.durum];
                                const h = hatirlatmaMetni(k.hatirlatma);
                                return (
                                    <TableRow key={i} hover>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                                <Avatar sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 700, bgcolor: 'rgba(230,207,23,0.22)', color: '#000' }}>{basHarfler(k.ad)}</Avatar>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{k.ad}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell><Chip size="small" variant="outlined" color={d.renk} label={d.label} /></TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">{k.sonGorusme ? fmt(k.sonGorusme) : '—'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }} color={h.gecikmis ? 'error.main' : 'success.main'}>{h.metin}</Typography>
                                            <Typography variant="caption" color="text.secondary">{fmt(k.hatirlatma)}</Typography>
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 340 }}>
                                            {acikNot === i ? (
                                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                    <TextField
                                                        autoFocus size="small" value={notMetni} onChange={e => setNotMetni(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') notKaydet(i); if (e.key === 'Escape') { setAcikNot(null); setNotMetni(''); } }}
                                                        placeholder="Görüşme notu yazın…" sx={{ flex: 1, minWidth: 180 }}
                                                    />
                                                    <Button variant="contained" size="small" onClick={() => notKaydet(i)}>Kaydet</Button>
                                                    <Button variant="text" size="small" color="secondary" onClick={() => { setAcikNot(null); setNotMetni(''); }}>Vazgeç</Button>
                                                </Stack>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">{k.not}</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            {acikNot === i ? null : (
                                                <Button variant="outlined" size="small" onClick={() => { setAcikNot(i); setNotMetni(''); }}>Not Ekle</Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Card>
    );
}
