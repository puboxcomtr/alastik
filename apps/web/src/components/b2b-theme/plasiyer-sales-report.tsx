'use client';
import { useMemo, useState } from 'react';
import { Card, CardHeader, Divider, CardContent, Box, Typography, Stack, TextField } from '@mui/material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

const PLASIYERLER = [
    { key: 'p1', ad: 'Emir Bahçecioğlu', renk: '#1F1F1F' },
    { key: 'p2', ad: 'Faruk Kuru', renk: '#E6CF17' },
    { key: 'p3', ad: 'Ertan Akman', renk: '#CBCBCB' },
];

const adet = (n: number) => n.toLocaleString('tr-TR') + ' adet';
const kisa = (n: number) => n.toLocaleString('tr-TR');

function haftaBasi(iso: string): Date {
    const x = iso ? new Date(iso) : new Date();
    const gun = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - gun);
    x.setHours(0, 0, 0, 0);
    return x;
}
const fmtGun = (d: Date) => d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });

function seedFrom(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: number) { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

function OzelIpucu({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string }[]; label?: string }) {
    if (!active || !payload?.length) return null;
    return (
        <Box sx={{ bgcolor: '#fff', border: '1px solid rgba(76,78,100,0.16)', borderRadius: 1.5, boxShadow: '0 4px 14px rgba(76,78,100,0.14)', px: 1.5, py: 1, minWidth: 170 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{label}</Typography>
            {PLASIYERLER.map(p => {
                const v = payload.find(x => x.dataKey === p.key)?.value ?? 0;
                return (
                    <Box key={p.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Box sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: p.renk, border: p.renk === '#CBCBCB' ? '1px solid #b3b3b3' : 'none' }} />
                            <Typography variant="caption" color="text.secondary">{p.ad}</Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{adet(v)}</Typography>
                    </Box>
                );
            })}
        </Box>
    );
}

function Efsane() {
    return (
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            {PLASIYERLER.map(p => (
                <Stack key={p.key} direction="row" alignItems="center" spacing={0.75}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: p.renk, border: p.renk === '#CBCBCB' ? '1px solid #b3b3b3' : 'none' }} />
                    <Typography variant="caption" color="text.secondary">{p.ad}</Typography>
                </Stack>
            ))}
        </Stack>
    );
}

export function PlasiyerSalesReport() {
    const bugun = new Date().toISOString().slice(0, 10);
    const [tarih, setTarih] = useState(bugun);

    const bas = haftaBasi(tarih);
    const son = new Date(bas); son.setDate(bas.getDate() + 5);

    const data = useMemo(() => {
        const key = bas.toISOString().slice(0, 10);
        return GUNLER.map((gun, gi) => {
            const satir: Record<string, number | string> = { gun };
            for (const p of PLASIYERLER) {
                const r = rng(seedFrom(`${key}-${p.key}-${gi}`));
                satir[p.key] = Math.round(5 + r() * 55);
            }
            return satir;
        });
    }, [bas]);

    return (
        <Card>
            <CardHeader
                title="Satış Raporu"
                subheader={`Haftalık plasiyer karşılaştırması · ${fmtGun(bas)} – ${fmtGun(son)} (demo)`}
                titleTypographyProps={{ variant: 'h6', sx: { color: '#000' } }}
                subheaderTypographyProps={{ variant: 'caption' }}
                action={
                    <TextField
                        type="date" size="small" label="Hafta" value={tarih}
                        onChange={e => setTarih(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mr: 1, width: 170 }}
                    />
                }
                sx={{ '& .MuiCardHeader-action': { m: 0, alignSelf: 'center' } }}
            />
            <Divider />
            <CardContent>
                <Box sx={{ mb: 1.5 }}><Efsane /></Box>
                <Box sx={{ width: '100%', height: 320, cursor: 'pointer', '& .recharts-wrapper, & .recharts-surface, & .recharts-bar-rectangle, & .recharts-rectangle path, & path.recharts-rectangle': { cursor: 'pointer' } }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="26%">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(76,78,100,0.10)" vertical={false} />
                            <XAxis dataKey="gun" tick={{ fontSize: 12, fill: 'rgba(76,78,100,0.6)' }} tickLine={false} axisLine={{ stroke: 'rgba(76,78,100,0.16)' }} />
                            <YAxis tickFormatter={kisa} tick={{ fontSize: 12, fill: 'rgba(76,78,100,0.6)' }} tickLine={false} axisLine={false} width={44} />
                            <Tooltip cursor={{ fill: 'rgba(76,78,100,0.06)' }} content={<OzelIpucu />} />
                            {PLASIYERLER.map(p => (
                                <Bar key={p.key} dataKey={p.key} name={p.ad} fill={p.renk} radius={[3, 3, 0, 0]} maxBarSize={13} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            </CardContent>
        </Card>
    );
}
