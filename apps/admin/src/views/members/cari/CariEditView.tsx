'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useParams, useRouter } from 'next/navigation'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid2'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import Switch from '@mui/material/Switch'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'

import TimeBarChart from '@views/analytics/reports/TimeBarChart'

import { fullName, formatDate, formatTRY } from '../types'

type DiaAdres = {
    id?: string
    baslik?: string
    teslimat?: boolean
    ana?: boolean
    adres?: string
    il?: string
    ilce?: string
    telefon?: string
}

type DiaCari = {
    premium?: boolean
    bakiyeKurus?: number
    riskLimitiKurus?: number
    segment?: string
    addresses?: DiaAdres[]
    diaCreatedAt?: string
    diaUpdatedAt?: string
    salespersonName?: string
    invoiceCount12m?: number
    purchaseStats?: { revenue?: Record<string, number[]> }
    firmaTuru?: string
    vergiNo?: string
    vergiDairesi?: string
    tcKimlikNo?: string
}

type DueItem = {
    invoiceNo: string
    issueDate: string
    dueDate: string
    totalKurus: number
    paidKurus: number
    remainingKurus: number
    daysOverdue?: number
    daysLeft?: number
}

type OnTimePayment = {
    paymentDate: string
    paymentType: string
    invoiceNo: string
    invoiceDate: string
    dueDate: string
    amountKurus: number
}

type PaymentSummary = {
    sinceDate?: string
    overdueKurus?: number
    upcomingKurus?: number
    onTimeKurus?: number | null
    lateKurus?: number | null
    onTimeRatio?: number | null
    overdueItems?: DueItem[]
    upcomingItems?: DueItem[]
    onTimePayments?: OnTimePayment[]
}

type CariMember = {
    _id: string
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    status?: string
    marketingConsent?: boolean
    diaCustomerCode?: string
    createdAt?: string
    lastLoginAt?: string | null
    diaCari?: DiaCari
}

function sifreGucu(sifre: string): { puan: number; etiket: string; renk: 'error' | 'warning' | 'info' | 'success' } {
    if (!sifre) return { puan: 0, etiket: '', renk: 'error' }
    let p = 0
    if (sifre.length >= 8) p++
    if (/[a-zçğıöşü]/.test(sifre) && /[A-ZÇĞİÖŞÜ]/.test(sifre)) p++
    if (/\d/.test(sifre)) p++
    if (/[^A-Za-z0-9çğıöşüÇĞİÖŞÜ]/.test(sifre) || sifre.length >= 12) p++
    const tablo = [
        { etiket: 'Çok zayıf', renk: 'error' as const },
        { etiket: 'Zayıf', renk: 'error' as const },
        { etiket: 'Orta', renk: 'warning' as const },
        { etiket: 'İyi', renk: 'info' as const },
        { etiket: 'Güçlü', renk: 'success' as const }
    ]

    return { puan: p, ...tablo[p] }
}

function sifreUret(uzunluk = 10): string {
    const harfler = 'ABCDEFGHJKLMNPRSTUVYZabcdefghjkmnprstuvyz23456789'
    const dizi = new Uint32Array(uzunluk)

    crypto.getRandomValues(dizi)

    return Array.from(dizi, n => harfler[n % harfler.length]).join('')
}

const AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

function son12AyCiro(revenue?: Record<string, number[]>): { etiketler: string[]; degerler: number[] } {
    const simdi = new Date()
    const etiketler: string[] = []
    const degerler: number[] = []

    for (let i = 11; i >= 0; i--) {
        const d = new Date(simdi.getFullYear(), simdi.getMonth() - i, 1)
        const y = d.getFullYear()
        const m = d.getMonth()

        etiketler.push(`${AY_KISA[m]} ${String(y).slice(2)}`)
        degerler.push(Math.round((revenue?.[String(y)]?.[m] || 0) * 100) / 100)
    }

    return { etiketler, degerler }
}

const ciroKisa = (v: number) => {
    if (!v) return ''
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')}M ₺`
    if (v >= 1000) return `${Math.round(v / 1000)}B ₺`

    return `${Math.round(v)} ₺`
}

const tl = (kurus?: number | null) => (typeof kurus === 'number' ? `${formatTRY(kurus / 100)} TL` : '—')

const bakiyeMetni = (kurus?: number) =>
    typeof kurus === 'number' ? `${formatTRY(Math.abs(kurus) / 100)} TL${kurus > 0 ? ' (B)' : kurus < 0 ? ' (A)' : ''}` : '—'

const gun = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : '—')

const odemeTuru = (t: string) => t.replace(/\s*\(.*\)\s*$/, '') || '—'

const SAYFA_BOYUTU = 10

function OdemeTablosu<T>({ basliklar, satirlar, hucreler, bos }: {
    basliklar: { etiket: string; sag?: boolean }[]
    satirlar: T[]
    hucreler: (s: T) => React.ReactNode[]
    bos: string
}) {
    const [sayfa, setSayfa] = useState(0)

    useEffect(() => setSayfa(0), [satirlar])

    if (!satirlar.length) return <Typography variant='body2' color='text.secondary' className='plb-4'>{bos}</Typography>

    return (
        <>
            <TableContainer>
                <Table size='small' sx={{ '& th, & td': { px: 1.5, whiteSpace: 'nowrap' } }}>
                    <TableHead>
                        <TableRow>
                            {basliklar.map(b => <TableCell key={b.etiket} align={b.sag ? 'right' : 'left'}>{b.etiket}</TableCell>)}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {satirlar.slice(sayfa * SAYFA_BOYUTU, (sayfa + 1) * SAYFA_BOYUTU).map((satir, i) => (
                            <TableRow key={i} hover>
                                {hucreler(satir).map((h, j) => (
                                    <TableCell key={j} align={basliklar[j]?.sag ? 'right' : 'left'}>{h}</TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            {satirlar.length > SAYFA_BOYUTU ? (
                <TablePagination
                    component='div'
                    count={satirlar.length}
                    page={sayfa}
                    rowsPerPage={SAYFA_BOYUTU}
                    rowsPerPageOptions={[SAYFA_BOYUTU]}
                    onPageChange={(_, p) => setSayfa(p)}
                />
            ) : null}
        </>
    )
}

const BilgiSatiri = ({ etiket, deger }: { etiket: string; deger: string }) => (
    <div className='flex items-start justify-between gap-4 plb-1.5'>
        <Typography variant='body2' color='text.secondary'>{etiket}</Typography>
        <Typography variant='body2' color='text.primary' className='text-end font-medium'>{deger}</Typography>
    </div>
)

const KartBaslik = ({ children, sag }: { children: React.ReactNode; sag?: React.ReactNode }) => (
    <div className='flex items-center justify-between gap-4 mbe-6'>
        <Typography variant='h5'>{children}</Typography>
        {sag}
    </div>
)

const BOS_ADRES: DiaAdres = { baslik: '', il: '', ilce: '', adres: '', telefon: '' }

const hataMesaji = (e: unknown, varsayilan: string) => (e instanceof Error && e.message ? e.message : varsayilan)

const CariEditView = () => {
    const params = useParams<{ id: string; lang: string }>()
    const router = useRouter()
    const id = String(params?.id || '')
    const locale = String(params?.lang || 'tr')

    const [yukleniyor, setYukleniyor] = useState(true)
    const [cari, setCari] = useState<CariMember | null>(null)
    const [odeme, setOdeme] = useState<PaymentSummary | null>(null)
    const [odemeSekme, setOdemeSekme] = useState<'gecen' | 'gelecek' | 'zamaninda'>('gecen')

    const [unvan, setUnvan] = useState('')
    const [eposta, setEposta] = useState('')
    const [telefon, setTelefon] = useState('')
    const [sifre, setSifre] = useState('')
    const [sifreTekrar, setSifreTekrar] = useState('')
    const [sifreGoster, setSifreGoster] = useState(false)
    const [aktif, setAktif] = useState(true)
    const [adresler, setAdresler] = useState<DiaAdres[]>([])

    const [adresAcik, setAdresAcik] = useState(false)
    const [yeniAdres, setYeniAdres] = useState<DiaAdres>(BOS_ADRES)
    const [adresKaydediliyor, setAdresKaydediliyor] = useState(false)
    const [kaydediliyor, setKaydediliyor] = useState(false)
    const [syncing, setSyncing] = useState(false)

    const yukle = useCallback(async (silent = false) => {
        if (!id) return
        if (!silent) setYukleniyor(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.members.detail(id), { cache: 'no-store' })

            if (res.success) {
                const { member: m, paymentSummary } = res.data as { member: CariMember; paymentSummary?: PaymentSummary | null }

                setCari(m)
                setOdeme(paymentSummary || null)
                setUnvan(fullName(m as any))
                setEposta(m.email || '')
                setTelefon(m.phone && m.phone !== '-' ? m.phone : '')
                setAktif(m.status === 'active')
                setAdresler(m.diaCari?.addresses || [])
            } else {
                toast.error(res.message || 'Cari bulunamadı')
            }
        } catch {
            toast.error('Cari bilgileri yüklenemedi')
        } finally {
            setYukleniyor(false)
        }
    }, [id])

    useEffect(() => {
        yukle()
    }, [yukle])

    const guc = useMemo(() => sifreGucu(sifre), [sifre])
    const sifreUyusmuyor = sifreTekrar.length > 0 && sifre !== sifreTekrar

    const syncFromDia = async () => {
        if (!cari || syncing) return
        setSyncing(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.members.syncOne(String(cari._id)), { method: 'POST' })

            if (res?.success) {
                if (res.data?.finance === false || res.data?.statement === false) toast.warning(res.message)
                else toast.success(res.message || 'Cari DIA’dan güncellendi.')
                await yukle(true)
            } else {
                toast.error(res?.message || 'Cari güncellenemedi.')
            }
        } catch (error: any) {
            toast.error(error?.message || 'Cari güncellenemedi.')
        } finally {
            setSyncing(false)
        }
    }

    const kaydet = async () => {
        if (!cari) return
        const sifreDegisti = sifre.length > 0 || sifreTekrar.length > 0
        const durumDegisti = aktif !== (cari.status === 'active')

        if (sifreDegisti) {
            if (sifre !== sifreTekrar) {
                toast.error('Şifreler eşleşmiyor.')

                return
            }

            if (sifre.length < 4) {
                toast.error('Şifre en az 4 karakter olmalıdır.')

                return
            }
        }

        if (!sifreDegisti && !durumDegisti) {
            toast.info('Kaydedilecek değişiklik yok.')

            return
        }

        setKaydediliyor(true)

        try {
            if (sifreDegisti) {
                await fetchAPI(API_ENDPOINTS.members.password(cari._id), {
                    method: 'PUT',
                    body: JSON.stringify({ password: sifre })
                })
                setSifre('')
                setSifreTekrar('')
                setSifreGoster(false)
            }

            if (durumDegisti) {
                const status = aktif ? 'active' : 'suspended'

                await fetchAPI(API_ENDPOINTS.members.setStatus(cari._id), {
                    method: 'PUT',
                    body: JSON.stringify({ status })
                })
                setCari(c => (c ? { ...c, status } : c))
            }

            toast.success('Cari kaydedildi.')
        } catch (e) {
            toast.error(hataMesaji(e, 'Cari kaydedilemedi.'))
        } finally {
            setKaydediliyor(false)
        }
    }

    const adresEkle = async () => {
        if (!cari) return

        if (!yeniAdres.il?.trim() || !yeniAdres.ilce?.trim() || !yeniAdres.adres?.trim()) {
            toast.error('İl, ilçe ve adres zorunludur.')

            return
        }

        setAdresKaydediliyor(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.members.addAddress(cari._id), {
                method: 'POST',
                body: JSON.stringify({
                    baslik: yeniAdres.baslik,
                    il: yeniAdres.il,
                    ilce: yeniAdres.ilce,
                    adres: yeniAdres.adres,
                    telefon: yeniAdres.telefon
                })
            })

            if (Array.isArray(res.data) && res.data.length) setAdresler(res.data as DiaAdres[])
            setYeniAdres(BOS_ADRES)
            setAdresAcik(false)
            toast.success(res.message || 'Adres eklendi.')
        } catch (e) {
            toast.error(hataMesaji(e, 'Adres eklenemedi.'))
        } finally {
            setAdresKaydediliyor(false)
        }
    }

    if (yukleniyor) {
        return (
            <div className='flex items-center justify-center gap-3' style={{ minHeight: '300px' }}>
                <CircularProgress size={28} />
                <Typography>Cari bilgileri yükleniyor...</Typography>
            </div>
        )
    }

    if (!cari) {
        return <Typography>Cari bulunamadı.</Typography>
    }

    const dc = cari.diaCari || {}
    const ciro12 = son12AyCiro(dc.purchaseStats?.revenue)
    const faturaAdresi = (dc.addresses || []).find(a => a.ana) || (dc.addresses || [])[0] || null

    return (
        <Grid container spacing={8}>
            <Grid size={{ xs: 12 }}>
                <div className='flex flex-wrap items-center justify-between gap-4'>
                    <div>
                        <div className='flex items-center gap-3'>
                            <Typography variant='h4'>Cari Görüntüle</Typography>
                            <Chip
                                size='small'
                                variant='tonal'
                                color={dc.premium ? 'warning' : 'secondary'}
                                icon={dc.premium ? <i className='ri-vip-crown-fill' /> : undefined}
                                label={dc.premium ? 'Premium Cari' : 'Normal Cari'}
                            />
                        </div>
                        <Typography variant='body2' color='text.secondary'>
                            {cari.diaCustomerCode ? `Cari Kodu: ${cari.diaCustomerCode}` : ''}
                        </Typography>
                    </div>
                    <div className='flex gap-3'>
                        <Button variant='outlined' color='secondary' onClick={() => router.push(`/${locale}/apps/user/list`)}>
                            Geri Dön
                        </Button>
                        <Button
                            variant='outlined'
                            onClick={syncFromDia}
                            disabled={syncing}
                            startIcon={syncing ? <CircularProgress size={16} color='inherit' /> : <i className='ri-refresh-line' />}
                        >
                            {syncing ? 'Güncelleniyor...' : 'Cariyi Güncelle'}
                        </Button>
                        <Button
                            variant='contained'
                            onClick={kaydet}
                            disabled={kaydediliyor}
                            startIcon={kaydediliyor ? <CircularProgress size={16} color='inherit' /> : null}
                        >
                            Kaydet
                        </Button>
                    </div>
                </div>
            </Grid>

            <Grid size={{ xs: 12 }}>
                <Card>
                    <CardContent>
                        <KartBaslik
                            sag={
                                <div className='text-end'>
                                    <Typography variant='body2' color='text.secondary'>12 Ay Toplam</Typography>
                                    <Typography variant='h6'>{formatTRY(ciro12.degerler.reduce((a, b) => a + b, 0))} TL</Typography>
                                </div>
                            }
                        >
                            Son 12 Ay Sipariş Cirosu
                        </KartBaslik>
                        <div style={{ cursor: 'pointer' }}>
                            <TimeBarChart
                                categories={ciro12.etiketler}
                                values={ciro12.degerler}
                                seriesName='Ciro'
                                valueFormatter={v => `${formatTRY(v)} TL`}
                                dataLabelFormatter={ciroKisa}
                                axisFormatter={v => ciroKisa(v).replace(' ₺', '') || '0'}
                                height={300}
                            />
                        </div>
                    </CardContent>
                </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
                <div className='flex flex-col' style={{ gap: 32 }}>
                    <Card>
                        <CardContent>
                            <KartBaslik>Cari Bilgileri</KartBaslik>
                            <Grid container spacing={6}>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth
                                        label='Cari Ünvanı'
                                        value={unvan}
                                        disabled
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField fullWidth type='email' label='E-Posta' value={eposta} disabled />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField fullWidth label='Cep Telefonu' value={telefon || '—'} disabled />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        fullWidth
                                        label='Şifre'
                                        type={sifreGoster ? 'text' : 'password'}
                                        value={sifre}
                                        onChange={e => setSifre(e.target.value)}
                                        autoComplete='new-password'
                                        slotProps={{
                                            input: {
                                                endAdornment: (
                                                    <InputAdornment position='end'>
                                                        <Tooltip title={sifreGoster ? 'Gizle' : 'Göster'}>
                                                            <IconButton size='small' onClick={() => setSifreGoster(v => !v)}>
                                                                <i className={sifreGoster ? 'ri-eye-off-line' : 'ri-eye-line'} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title='Şifre üret'>
                                                            <IconButton
                                                                size='small'
                                                                onClick={() => {
                                                                    const s = sifreUret()

                                                                    setSifre(s)
                                                                    setSifreTekrar(s)
                                                                    setSifreGoster(true)
                                                                }}
                                                            >
                                                                <i className='ri-refresh-line' />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </InputAdornment>
                                                )
                                            }
                                        }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        fullWidth
                                        label='Şifre Tekrar'
                                        type={sifreGoster ? 'text' : 'password'}
                                        value={sifreTekrar}
                                        onChange={e => setSifreTekrar(e.target.value)}
                                        error={sifreUyusmuyor}
                                        autoComplete='new-password'
                                    />
                                </Grid>
                                {sifre ? (
                                    <Grid size={{ xs: 12 }}>
                                        <div className='flex items-center gap-4'>
                                            <LinearProgress
                                                variant='determinate'
                                                value={(guc.puan / 4) * 100}
                                                color={guc.renk}
                                                className='flex-1'
                                                sx={{ height: 6, borderRadius: 3 }}
                                            />
                                            <Typography variant='body2' color={`${guc.renk}.main`} sx={{ minWidth: 70 }}>
                                                {guc.etiket}
                                            </Typography>
                                        </div>
                                    </Grid>
                                ) : null}
                            </Grid>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <KartBaslik>Ödeme Durumu</KartBaslik>
                            {odeme ? (
                                <>
                                    <Tabs value={odemeSekme} onChange={(_, v) => setOdemeSekme(v)} variant='fullWidth' className='mbe-2'>
                                        {([
                                            ['gecen', 'Vadesi Geçen', odeme.overdueKurus, 'error.main'],
                                            ['gelecek', 'Vadesi Gelecek', odeme.upcomingKurus, 'text.primary'],
                                            ['zamaninda', 'Zamanında Ödenen', odeme.onTimeKurus, 'text.primary']
                                        ] as const).map(([deger, etiket, tutar, renk]) => (
                                            <Tab
                                                key={deger}
                                                value={deger}
                                                label={
                                                    <div className='flex flex-col items-center'>
                                                        <span>{etiket}</span>
                                                        <Typography component='span' variant='subtitle1' fontWeight='bold' color={renk}>{tl(tutar)}</Typography>
                                                    </div>
                                                }
                                            />
                                        ))}
                                    </Tabs>
                                    {odemeSekme === 'gecen' ? (
                                        <OdemeTablosu<DueItem>
                                            basliklar={[{ etiket: 'Fatura No' }, { etiket: 'Fatura Tarihi' }, { etiket: 'Vade Tarihi' }, { etiket: 'Gecikme', sag: true }, { etiket: 'Fatura Tutarı', sag: true }, { etiket: 'Ödenen', sag: true }, { etiket: 'Kalan', sag: true }]}
                                            satirlar={odeme.overdueItems || []}
                                            hucreler={r => [
                                                r.invoiceNo || '—',
                                                gun(r.issueDate),
                                                gun(r.dueDate),
                                                <Typography key='g' variant='body2' color='error.main'>{r.daysOverdue} gün</Typography>,
                                                tl(r.totalKurus),
                                                tl(r.paidKurus),
                                                <Typography key='k' variant='body2' fontWeight='bold' color='error.main'>{tl(r.remainingKurus)}</Typography>
                                            ]}
                                            bos='Vadesi geçmiş fatura yok.'
                                        />
                                    ) : null}
                                    {odemeSekme === 'gelecek' ? (
                                        <OdemeTablosu<DueItem>
                                            basliklar={[{ etiket: 'Fatura No' }, { etiket: 'Fatura Tarihi' }, { etiket: 'Vade Tarihi' }, { etiket: 'Kalan Gün', sag: true }, { etiket: 'Fatura Tutarı', sag: true }, { etiket: 'Ödenen', sag: true }, { etiket: 'Kalan', sag: true }]}
                                            satirlar={odeme.upcomingItems || []}
                                            hucreler={r => [
                                                r.invoiceNo || '—',
                                                gun(r.issueDate),
                                                gun(r.dueDate),
                                                r.daysLeft === 0 ? 'Bugün' : `${r.daysLeft} gün`,
                                                tl(r.totalKurus),
                                                tl(r.paidKurus),
                                                <Typography key='k' variant='body2' fontWeight='bold'>{tl(r.remainingKurus)}</Typography>
                                            ]}
                                            bos='Vadesi gelecek fatura yok.'
                                        />
                                    ) : null}
                                    {odemeSekme === 'zamaninda' ? (
                                        <>
                                            <Typography variant='body2' color='text.secondary' className='mbe-2'>
                                                {typeof odeme.onTimeRatio === 'number'
                                                    ? `Son 12 ay · borç kapatmalarının %${odeme.onTimeRatio.toLocaleString('tr-TR')}’i vadesinde`
                                                    : 'Son 12 ayda ödeme yok'}
                                            </Typography>
                                            <OdemeTablosu<OnTimePayment>
                                                basliklar={[{ etiket: 'Ödeme Tarihi' }, { etiket: 'Ödeme Türü' }, { etiket: 'Fatura No' }, { etiket: 'Fatura Tarihi' }, { etiket: 'Vade Tarihi' }, { etiket: 'Tutar', sag: true }]}
                                                satirlar={odeme.onTimePayments || []}
                                                hucreler={r => [
                                                    gun(r.paymentDate),
                                                    odemeTuru(r.paymentType),
                                                    r.invoiceNo || '—',
                                                    gun(r.invoiceDate),
                                                    gun(r.dueDate),
                                                    <Typography key='t' variant='body2' fontWeight='bold'>{tl(r.amountKurus)}</Typography>
                                                ]}
                                                bos='Son 12 ayda zamanında yapılmış ödeme yok.'
                                            />
                                        </>
                                    ) : null}
                                </>
                            ) : (
                                <Typography variant='body2' color='text.secondary'>Ödeme verisi henüz senkronlanmadı.</Typography>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <KartBaslik>Fatura Adresi</KartBaslik>
                            {faturaAdresi ? (
                                <Grid container spacing={2}>
                                    {[
                                        ['Firma Ünvanı', unvan || '—'],
                                        ['Firma Türü', dc.firmaTuru === 'bireysel' ? 'Bireysel' : 'Kurumsal'],
                                        ...(dc.firmaTuru === 'bireysel'
                                            ? [['TC Kimlik No', dc.tcKimlikNo || '—'], ...(dc.vergiDairesi ? [['Vergi Dairesi', dc.vergiDairesi]] : [])]
                                            : [['Vergi Dairesi', dc.vergiDairesi || '—'], ['Vergi No', dc.vergiNo || '—']])
                                    ].map(([etiket, deger]) => (
                                        <Grid key={etiket} size={{ xs: 12 }} container spacing={2}>
                                            <Grid size={{ xs: 12, sm: 3 }}>
                                                <Typography variant='body2' color='text.secondary'>{etiket}</Typography>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 9 }}>
                                                <Typography variant='body2'>{deger}</Typography>
                                            </Grid>
                                        </Grid>
                                    ))}
                                    <Grid size={{ xs: 12, sm: 3 }}>
                                        <Typography variant='body2' color='text.secondary'>İl / İlçe</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 9 }}>
                                        <Typography variant='body2'>{[faturaAdresi.il, faturaAdresi.ilce].filter(Boolean).join(' / ') || '—'}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 3 }}>
                                        <Typography variant='body2' color='text.secondary'>Adres</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 9 }}>
                                        <Typography variant='body2'>{faturaAdresi.adres || '—'}</Typography>
                                    </Grid>
                                </Grid>
                            ) : (
                                <Typography variant='body2' color='text.secondary'>DIA’da fatura adresi tanımlı değil.</Typography>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <KartBaslik
                                sag={
                                    <Button variant='outlined' startIcon={<i className='ri-add-line' />} onClick={() => setAdresAcik(true)}>
                                        Adres Ekle
                                    </Button>
                                }
                            >
                                Teslimat Bilgileri
                            </KartBaslik>
                            {adresler.length === 0 ? (
                                <Typography variant='body2' color='text.secondary'>Kayıtlı adres yok.</Typography>
                            ) : (
                                <div className='flex flex-col'>
                                    {adresler.map((a, i) => (
                                        <div key={a.id || i}>
                                            {i > 0 ? <Divider className='mlb-4' /> : null}
                                            <div className='flex flex-wrap items-center gap-2 mbe-2'>
                                                <Typography variant='body1' className='font-medium'>{a.baslik || 'Adres'}</Typography>
                                                {a.ana ? <Chip size='small' variant='tonal' color='primary' label='Varsayılan Adres' /> : null}
                                                {a.teslimat ? <Chip size='small' variant='tonal' color='success' label='Teslimat' /> : null}
                                            </div>
                                            <Grid container spacing={2}>
                                                <Grid size={{ xs: 12, sm: 3 }}>
                                                    <Typography variant='body2' color='text.secondary'>İl / İlçe</Typography>
                                                </Grid>
                                                <Grid size={{ xs: 12, sm: 9 }}>
                                                    <Typography variant='body2'>{[a.il, a.ilce].filter(Boolean).join(' / ') || '—'}</Typography>
                                                </Grid>
                                                <Grid size={{ xs: 12, sm: 3 }}>
                                                    <Typography variant='body2' color='text.secondary'>Adres</Typography>
                                                </Grid>
                                                <Grid size={{ xs: 12, sm: 9 }}>
                                                    <Typography variant='body2'>{a.adres || '—'}</Typography>
                                                </Grid>
                                                {a.telefon ? (
                                                    <>
                                                        <Grid size={{ xs: 12, sm: 3 }}>
                                                            <Typography variant='body2' color='text.secondary'>Telefon</Typography>
                                                        </Grid>
                                                        <Grid size={{ xs: 12, sm: 9 }}>
                                                            <Typography variant='body2'>{a.telefon}</Typography>
                                                        </Grid>
                                                    </>
                                                ) : null}
                                            </Grid>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
                <div className='flex flex-col' style={{ gap: 32 }}>
                    <Card>
                        <CardContent>
                            <KartBaslik>Durumu</KartBaslik>
                            <FormControlLabel
                                control={<Switch checked={aktif} onChange={e => setAktif(e.target.checked)} />}
                                label={aktif ? 'Aktif' : 'Pasif'}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <KartBaslik>Cari Özeti</KartBaslik>
                            <BilgiSatiri etiket='Cari Grubu' deger={dc.segment || '—'} />
                            <BilgiSatiri etiket='Plasiyer' deger={dc.salespersonName || '—'} />
                            <BilgiSatiri etiket='Sipariş (12 Ay)' deger={(dc.invoiceCount12m || 0).toLocaleString('tr-TR')} />
                            <BilgiSatiri etiket='Bakiye' deger={bakiyeMetni(dc.bakiyeKurus)} />
                            <BilgiSatiri etiket='Risk Limiti' deger={tl(dc.riskLimitiKurus)} />
                            <Divider className='mlb-2' />
                            <BilgiSatiri etiket='DIA Kayıt Tarihi' deger={dc.diaCreatedAt ? formatDate(dc.diaCreatedAt) : '—'} />
                            <BilgiSatiri etiket='DIA Son Güncelleme' deger={dc.diaUpdatedAt ? formatDate(dc.diaUpdatedAt) : '—'} />
                            <BilgiSatiri etiket='Son Giriş' deger={cari.lastLoginAt ? formatDate(cari.lastLoginAt) : '—'} />
                        </CardContent>
                    </Card>
                </div>
            </Grid>

            <Dialog open={adresAcik} onClose={() => !adresKaydediliyor && setAdresAcik(false)} maxWidth='sm' fullWidth>
                <DialogTitle>Adres Ekle</DialogTitle>
                <DialogContent>
                    <Grid container spacing={4} className='pbs-2'>
                        <Grid size={{ xs: 12 }}>
                            <TextField fullWidth label='Adres Başlığı' value={yeniAdres.baslik} onChange={e => setYeniAdres(a => ({ ...a, baslik: e.target.value }))} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth required label='İl' value={yeniAdres.il} onChange={e => setYeniAdres(a => ({ ...a, il: e.target.value }))} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth required label='İlçe' value={yeniAdres.ilce} onChange={e => setYeniAdres(a => ({ ...a, ilce: e.target.value }))} />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField fullWidth required multiline minRows={2} label='Adres' value={yeniAdres.adres} onChange={e => setYeniAdres(a => ({ ...a, adres: e.target.value }))} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth label='Telefon' value={yeniAdres.telefon} onChange={e => setYeniAdres(a => ({ ...a, telefon: e.target.value }))} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button variant='outlined' color='secondary' onClick={() => setAdresAcik(false)} disabled={adresKaydediliyor}>Vazgeç</Button>
                    <Button
                        variant='contained'
                        onClick={adresEkle}
                        disabled={adresKaydediliyor}
                        startIcon={adresKaydediliyor ? <CircularProgress size={16} color='inherit' /> : null}
                    >
                        Ekle
                    </Button>
                </DialogActions>
            </Dialog>
        </Grid>
    )
}

export default CariEditView
