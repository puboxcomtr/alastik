'use client';
// Plasiyer satış grafiği — Bugün / Bu Ay / Bu Yıl sekmeleri (ŞİMDİLİK DEMO veri).
// MUI (Materio benzeri tema): Card + ToggleButtonGroup + SVG bar grafik.
import { useState } from 'react';
import { Card, CardContent, Typography, Box, ToggleButton, ToggleButtonGroup, useTheme } from '@mui/material';

type Nokta = { etiket: string; deger: number };

// Demo veri setleri (sonra canlı bağlanacak)
const VERI: Record<string, { toplam: string; birim: string; noktalar: Nokta[] }> = {
    bugun: {
        toplam: '38.400 ₺', birim: 'saatlik',
        noktalar: ['09', '10', '11', '12', '13', '14', '15', '16', '17'].map((e, i) => ({ etiket: e, deger: [4, 7, 5, 9, 6, 8, 12, 7, 10][i] })),
    },
    ay: {
        toplam: '1.284.750 ₺', birim: 'günlük',
        noktalar: Array.from({ length: 12 }, (_, i) => ({ etiket: String((i * 2) + 1), deger: [30, 52, 41, 60, 48, 72, 55, 90, 63, 78, 84, 58][i] })),
    },
    yil: {
        toplam: '11.940.300 ₺', birim: 'aylık',
        noktalar: ['O', 'Ş', 'M', 'N', 'M', 'H', 'T', 'A', 'E', 'E', 'K', 'A'].map((e, i) => ({ etiket: e, deger: [620, 540, 710, 680, 760, 820, 910, 870, 1020, 960, 1100, 1180][i] })),
    },
};

export function PlasiyerSalesChart() {
    const [tab, setTab] = useState('ay');
    const theme = useTheme();
    const veri = VERI[tab];
    const maks = Math.max(...veri.noktalar.map(n => n.deger)) || 1;

    // SVG çizim ölçüleri
    const W = 284, H = 120, pb = 16;
    const n = veri.noktalar.length;
    const bw = (W / n) * 0.6;
    const gap = (W / n) * 0.4;

    return (
        <Card>
            <CardContent>
                <ToggleButtonGroup size="small" exclusive fullWidth value={tab} onChange={(_, v) => { if (v) setTab(v); }} sx={{ mb: 2 }}>
                    <ToggleButton value="bugun">Bugün</ToggleButton>
                    <ToggleButton value="ay">Bu Ay</ToggleButton>
                    <ToggleButton value="yil">Bu Yıl</ToggleButton>
                </ToggleButtonGroup>

                <Typography variant="body2" color="text.secondary">Toplam Satış</Typography>
                <Typography variant="h5" sx={{ mb: 1 }}>{veri.toplam}</Typography>

                <Box component="svg" viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Satış grafiği" sx={{ display: 'block' }}>
                    {veri.noktalar.map((p, i) => {
                        const h = Math.max(2, ((p.deger / maks) * (H - pb - 18)));
                        const x = i * (bw + gap) + gap / 2;
                        const y = (H - pb) - h;
                        return (
                            <g key={i}>
                                <rect x={x} y={y} width={bw} height={h} rx={3} fill={theme.palette.primary.main} />
                                <text x={x + bw / 2} y={H - 4} textAnchor="middle" fontSize="8" fill={theme.palette.text.secondary}>{p.etiket}</text>
                            </g>
                        );
                    })}
                </Box>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}>{veri.birim} (demo)</Typography>
            </CardContent>
        </Card>
    );
}
