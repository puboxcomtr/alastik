'use client'

// Kargo firması kural sayfası: ürün tipi, kural kapsamı (genel / kategori / marka / ürün), genel kurallar,
// kapsam başına "Tümü" (desi tablosu) ya da "Ebat Bazlı" (DB'den gelen ebatlara ücret) fiyatlandırma.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid2'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Autocomplete from '@mui/material/Autocomplete'

import { toast } from 'react-toastify'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'
import { getActiveSite, getSiteLabel } from '@/utils/activeSite'
import tableStyles from '@core/styles/table.module.css'

import FreeDeliveryRules, { type ServiceArea } from './FreeDeliveryRules'
import {
    CARGO_SCOPE_OPTIONS,
    CARGO_SHIPPING_PRICE_MODE_OPTIONS,
    CARGO_PRICING_MODE_OPTIONS,
    scopeFromApi,
    scopeToApi,
    type CargoProductType,
    type CargoScopeType,
    type CargoShippingPriceMode,
    type CargoPricingMode
} from './cargoOptions'

// Desi aralıklarının üst sınırı. Son aralık "ve üstü" anlamında 999 ile kapatılabiliyor (ALastik XML tablosu 46–999);
// sınır 100 iken o tabloyla sayfa hiç kaydedilemiyordu.
const MAX_DESI = 999
// Ücretsiz teslimat tanımı (api Cargo.CARGO_PRICING_TYPES)
const FREE_PRICING_TYPE = 'free'

type Num = number | ''
type DesiRange = { min: Num; max: Num; price: Num }
type DesiPricing = { ranges: DesiRange[]; extraPerDesi: Num }
type SizeRule = { size: string; price: Num }
type SizeOption = { size: string; count: number }

/** Kategori ve marka kuralları aynı yapıyı paylaşır */
type ScopedRule = {
    refId: string
    refName: string
    diaBrand?: string
    fixedPrice: Num
    pricingMode: CargoPricingMode
    sizeRules: SizeRule[]
    desiPricing: DesiPricing
}
type ScopedOption = { id: string; name: string; diaBrand?: string; productCount?: number }

type ProductRule = { productKey: string; stockCode: string; productName: string; price: Num }
type ProductOption = { productKey: string; stockCode: string; productName: string; brand?: string }

type RawRange = { min: number; max: number; price: number }
type RawPricing = { ranges?: RawRange[]; extraPerDesi?: number }
type RawScopedRule = {
    categoryId?: string; categoryName?: string; brandId?: string; brandName?: string; diaBrand?: string
    fixedPrice?: number; pricingMode?: CargoPricingMode
    sizeRules?: { size: string; price: number }[]
    desiPricing?: RawPricing
}
type CargoDetail = {
    _id: string
    name: string
    productType: CargoProductType
    scopeType?: string
    paymentType: 'sender' | 'receiver'
    isActive: boolean
    fixedPrice?: number
    freeShippingThreshold?: number
    freeShippingDesiLimit?: number
    // Stoktaki (DIA) ürünlerin ayrı genel ayarları
    stockFixedPrice?: number
    stockFreeShippingThreshold?: number
    stockFreeShippingDesiLimit?: number
    stockShippingPriceMode?: CargoShippingPriceMode
    desiPricing?: RawPricing
    // Stoktaki (DIA) ürünlerin ayrı desi tablosu
    stockDesiPricing?: RawPricing
    categoryRules?: RawScopedRule[]
    brandRules?: RawScopedRule[]
    productRules?: { productKey: string; stockCode?: string; productName?: string; price: number }[]
    sizeRules?: { size: string; price: number }[]
    // Ücretlendirme tipi: 'free' tanımda (ör. Standart Sevkiyat) desi / kural yok, yalnız hizmet bölgesi
    pricingType?: string
    serviceAreas?: ServiceArea[]
}


const toNumber = (v: Num) => (v === '' ? 0 : Number(v))
const toPricing = (p?: RawPricing): DesiPricing => ({
    ranges: (p?.ranges || []).map(r => ({ min: r.min, max: r.max, price: r.price })),
    extraPerDesi: p?.extraPerDesi ?? 0
})
const sortRanges = (ranges: DesiRange[]) => [...ranges].sort((a, b) => toNumber(a.min) - toNumber(b.min))
const serializePricing = (p: DesiPricing) => ({
    ranges: sortRanges(p.ranges).map(r => ({ min: toNumber(r.min), max: toNumber(r.max), price: toNumber(r.price) })),
    extraPerDesi: toNumber(p.extraPerDesi)
})
const serializeSizes = (rules: SizeRule[]) =>
    rules.filter(r => r.price !== '').map(r => ({ size: r.size, price: toNumber(r.price) }))

const rawToScoped = (r: RawScopedRule, idField: 'categoryId' | 'brandId', nameField: 'categoryName' | 'brandName'): ScopedRule => ({
    refId: String(r[idField]),
    refName: r[nameField] || '',
    diaBrand: r.diaBrand,
    fixedPrice: r.fixedPrice ?? 0,
    pricingMode: r.pricingMode === 'size' ? 'size' : 'all',
    sizeRules: (r.sizeRules || []).map(sr => ({ size: sr.size, price: sr.price })),
    desiPricing: toPricing(r.desiPricing)
})

/** Aralık listesini doğrular; hata varsa mesaj döner */
const validateRanges = (ranges: DesiRange[]): string | null => {
    const list = sortRanges(ranges)
    for (let i = 0; i < list.length; i++) {
        const r = list[i]
        if (r.min === '' || r.max === '' || r.price === '') return 'Tüm aralık alanları doldurulmalıdır'
        if (toNumber(r.max) < toNumber(r.min)) return 'Desi aralığı bitiş değeri başlangıçtan küçük olamaz'
        if (toNumber(r.max) > MAX_DESI) return `Desi aralığı en fazla ${MAX_DESI} olabilir`
        if (i > 0 && toNumber(r.min) <= toNumber(list[i - 1].max)) return 'Desi aralıkları birbiriyle çakışamaz'
    }
    return null
}

const priceField = (value: Num, onChange: (raw: string) => void, width = 150, label?: string) => (
    <TextField
        size='small'
        type='number'
        label={label}
        value={value}
        onChange={e => onChange(e.target.value)}
        inputProps={{ min: 0, step: 0.01 }}
        InputProps={{ endAdornment: <InputAdornment position='end'>TL</InputAdornment> }}
        sx={{ width }}
    />
)

/* ---------- Desi tablosu ---------- */
const DesiRangesEditor = ({ title, pricing, onChange }: { title: string; pricing: DesiPricing; onChange: (next: DesiPricing) => void }) => {
    const { ranges, extraPerDesi } = pricing
    const coveredMax = ranges.length > 0 ? Math.max(...ranges.map(r => toNumber(r.max))) : 0

    const addRange = () => {
        if (coveredMax >= MAX_DESI) {
            toast.error(`Desi aralıkları en fazla ${MAX_DESI}'e kadar tanımlanabilir`)
            return
        }
        onChange({ ...pricing, ranges: [...ranges, { min: coveredMax + 1, max: coveredMax + 1, price: 0 }] })
    }
    const changeRange = (index: number, field: keyof DesiRange, raw: string) => {
        const value: Num = raw === '' ? '' : Number(raw)
        onChange({ ...pricing, ranges: ranges.map((r, i) => (i === index ? { ...r, [field]: value } : r)) })
    }

    return (
        <Card>
            <CardHeader
                title={title}
                subheader={ranges.length > 0 ? `${ranges.length} aralık tanımlı (0 – ${coveredMax} desi)` : 'Aralık tanımlı değil — sabit ücret geçerli'}
                action={
                    <Button variant='outlined' size='small' startIcon={<i className='ri-add-line' />} onClick={addRange}>
                        Aralık Ekle
                    </Button>
                }
            />
            <Divider />
            <div className='overflow-x-auto'>
                <table className={tableStyles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: 60 }}>#</th>
                            <th>Başlangıç (desi)</th>
                            <th>Bitiş (desi)</th>
                            <th>Kargo Ücreti</th>
                            <th style={{ width: 70 }} />
                        </tr>
                    </thead>
                    <tbody>
                        {ranges.length === 0 ? (
                            <tr>
                                <td colSpan={5} className='text-center p-6'>
                                    <Typography color='text.secondary'>Aralık eklemek için sağ üstteki düğmeyi kullanın</Typography>
                                </td>
                            </tr>
                        ) : (
                            ranges.map((range, index) => (
                                <tr key={index}>
                                    <td><Typography variant='body2' color='text.secondary'>{index + 1}</Typography></td>
                                    <td><TextField size='small' type='number' value={range.min} onChange={e => changeRange(index, 'min', e.target.value)} inputProps={{ min: 0, max: MAX_DESI }} sx={{ width: 120 }} /></td>
                                    <td><TextField size='small' type='number' value={range.max} onChange={e => changeRange(index, 'max', e.target.value)} inputProps={{ min: 0, max: MAX_DESI }} sx={{ width: 120 }} /></td>
                                    <td>{priceField(range.price, raw => changeRange(index, 'price', raw), 170)}</td>
                                    <td>
                                        <Tooltip title='Aralığı sil'>
                                            <IconButton size='small' onClick={() => onChange({ ...pricing, ranges: ranges.filter((_, i) => i !== index) })}>
                                                <i className='ri-delete-bin-line text-[20px] text-textSecondary' />
                                            </IconButton>
                                        </Tooltip>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <Divider />
            <CardContent className='flex items-center gap-3 flex-wrap'>
                <Typography variant='body2'>Son aralığı aşan her desi için ek ücret:</Typography>
                {priceField(extraPerDesi, raw => onChange({ ...pricing, extraPerDesi: raw === '' ? '' : Number(raw) }), 160)}
            </CardContent>
        </Card>
    )
}

/* ---------- Ebat tablosu (seç → ekle) ---------- */
type SizeEditorProps = {
    title: string
    options: SizeOption[]
    loading: boolean
    rules: SizeRule[]
    onChange: (rules: SizeRule[]) => void
}
const SizeRulesEditor = ({ title, options, loading, rules, onChange }: SizeEditorProps) => {
    const [picked, setPicked] = useState<SizeOption | null>(null)
    const countOf = new Map(options.map(o => [o.size, o.count]))
    const available = options.filter(o => !rules.some(r => r.size === o.size))

    const add = () => {
        if (!picked) return
        if (rules.some(r => r.size === picked.size)) {
            toast.warning('Bu ebat zaten ekli')
            return
        }
        onChange([...rules, { size: picked.size, price: '' }])
        setPicked(null)
    }
    const change = (size: string, raw: string) => {
        const value: Num = raw === '' ? '' : Number(raw)
        onChange(rules.map(r => (r.size === size ? { ...r, price: value } : r)))
    }

    return (
        <Card>
            <CardHeader title={title} subheader={loading ? 'Ebatlar yükleniyor...' : `${options.length} ebat mevcut, ${rules.length} tanesi tanımlı`} />
            <Divider />
            <CardContent>
                <div className='flex gap-3 items-center flex-wrap'>
                    <Autocomplete
                        sx={{ minWidth: 280, flex: 1 }}
                        size='small'
                        options={available}
                        getOptionLabel={o => `${o.size} (${o.count} ürün)`}
                        value={picked}
                        onChange={(_, v) => setPicked(v)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && picked) add()
                        }}
                        loading={loading}
                        autoHighlight
                        noOptionsText={loading ? 'Yükleniyor...' : 'Ebat bulunamadı'}
                        renderInput={p => <TextField {...p} label='Ebat ara (örn. 205/55R16)' />}
                    />
                    <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={add} disabled={!picked}>
                        Ebat Ekle
                    </Button>
                </div>
            </CardContent>
            <Divider />
            <div className='overflow-x-auto'>
                <table className={tableStyles.table}>
                    <thead>
                        <tr>
                            <th>Ebat</th>
                            <th>Ürün Sayısı</th>
                            <th>Kargo Ücreti (adet)</th>
                            <th style={{ width: 70 }} />
                        </tr>
                    </thead>
                    <tbody>
                        {rules.length === 0 ? (
                            <tr><td colSpan={4} className='text-center p-6'><Typography color='text.secondary'>Yukarıdan ebat seçip ekleyin</Typography></td></tr>
                        ) : (
                            rules.map(rule => {
                                const count = countOf.get(rule.size)
                                return (
                                    <tr key={rule.size}>
                                        <td>
                                            <Typography variant='body2' className='font-medium'>{rule.size}</Typography>
                                            {!loading && count === undefined && <Typography variant='caption' color='warning.main'>Üründe kalmadı</Typography>}
                                        </td>
                                        <td><Typography variant='body2' color='text.secondary'>{count ?? 0}</Typography></td>
                                        <td>{priceField(rule.price, raw => change(rule.size, raw), 160)}</td>
                                        <td>
                                            <Tooltip title='Ebatı çıkar'>
                                                <IconButton size='small' onClick={() => onChange(rules.filter(r => r.size !== rule.size))}>
                                                    <i className='ri-delete-bin-line text-[20px] text-textSecondary' />
                                                </IconButton>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}

/* ---------- Kategori / marka kapsamı ---------- */
type ScopedSectionProps = {
    kind: 'category' | 'brand'
    title: string
    options: ScopedOption[]
    optionsLoading: boolean
    rules: ScopedRule[]
    setRules: (updater: (prev: ScopedRule[]) => ScopedRule[]) => void
    activeId: string
    setActiveId: (id: string) => void
    sizeOptions: Record<string, SizeOption[]>
    sizesLoading: boolean
}
const ScopedRulesSection = ({ kind, title, options, optionsLoading, rules, setRules, activeId, setActiveId, sizeOptions, sizesLoading }: ScopedSectionProps) => {
    const [picked, setPicked] = useState<ScopedOption | null>(null)
    const active = rules.find(r => r.refId === activeId) || null
    const noun = kind === 'category' ? 'Kategori' : 'Marka'

    const add = () => {
        if (!picked) return
        if (rules.some(r => r.refId === picked.id)) {
            toast.warning(`Bu ${noun.toLowerCase()} zaten ekli`)
            setActiveId(picked.id)
            return
        }
        setRules(prev => [...prev, { refId: picked.id, refName: picked.name, diaBrand: picked.diaBrand, fixedPrice: 0, pricingMode: 'all', sizeRules: [], desiPricing: { ranges: [], extraPerDesi: 0 } }])
        setActiveId(picked.id)
        setPicked(null)
    }
    const remove = (id: string) => {
        setRules(prev => prev.filter(r => r.refId !== id))
        if (activeId === id) setActiveId(rules.find(r => r.refId !== id)?.refId || '')
    }
    const update = (changes: Partial<ScopedRule>) => setRules(prev => prev.map(r => (r.refId === activeId ? { ...r, ...changes } : r)))

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <Card>
                    <CardHeader title={title} subheader={`${getSiteLabel(getActiveSite())} ${kind === 'category' ? 'kategorileri' : 'markaları'}`} />
                    <Divider />
                    <CardContent className='flex flex-col gap-4'>
                        <div className='flex gap-3 items-center flex-wrap'>
                            <Autocomplete
                                sx={{ minWidth: 320, flex: 1 }}
                                size='small'
                                options={options.filter(o => !rules.some(r => r.refId === o.id))}
                                getOptionLabel={o => (o.productCount ? `${o.name} (${o.productCount})` : o.name)}
                                value={picked}
                                onChange={(_, v) => setPicked(v)}
                                loading={optionsLoading}
                                noOptionsText={`${noun} bulunamadı`}
                                renderInput={p => <TextField {...p} label={noun} />}
                            />
                            <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={add} disabled={!picked}>
                                {noun} Ekle
                            </Button>
                        </div>
                        {rules.length > 0 && (
                            <div className='flex gap-2 flex-wrap'>
                                {rules.map(rule => (
                                    <Chip
                                        key={rule.refId}
                                        label={`${rule.refName} (${rule.pricingMode === 'size' ? `${rule.sizeRules.length} ebat` : `${rule.desiPricing.ranges.length} aralık`})`}
                                        color={rule.refId === activeId ? 'primary' : 'default'}
                                        variant={rule.refId === activeId ? 'filled' : 'outlined'}
                                        onClick={() => setActiveId(rule.refId)}
                                        onDelete={() => remove(rule.refId)}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </Grid>
            {active && (
                <Grid size={{ xs: 12 }}>
                    <Card>
                        <CardContent className='flex gap-4 items-center flex-wrap'>
                            <Typography variant='h6' className='flex-1'>{active.refName}</Typography>
                            <TextField select size='small' label='Fiyatlandırma' value={active.pricingMode} onChange={e => update({ pricingMode: e.target.value as CargoPricingMode })} sx={{ width: 200 }}>
                                {CARGO_PRICING_MODE_OPTIONS.map(opt => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </TextField>
                            {priceField(active.fixedPrice, raw => update({ fixedPrice: raw === '' ? '' : Number(raw) }), 170, 'Sabit Ücret')}
                        </CardContent>
                    </Card>
                </Grid>
            )}
            <Grid size={{ xs: 12 }}>
                {active && active.pricingMode === 'size' ? (
                    <SizeRulesEditor title={`Ebat Bazlı Fiyatlandırma — ${active.refName}`} options={sizeOptions[active.refId] || []} loading={sizesLoading} rules={active.sizeRules} onChange={rules => update({ sizeRules: rules })} />
                ) : active ? (
                    <DesiRangesEditor title={`Desi Bazlı Fiyatlandırma — ${active.refName}`} pricing={active.desiPricing} onChange={next => update({ desiPricing: next })} />
                ) : (
                    <Card>
                        <CardContent className='text-center p-10'>
                            <Typography color='text.secondary'>Kural girmek için yukarıdan bir {noun.toLowerCase()} seçip ekleyin</Typography>
                        </CardContent>
                    </Card>
                )}
            </Grid>
        </Grid>
    )
}

/* ---------- Ürün kapsamı ---------- */
const ProductRulesSection = ({ rules, setRules }: { rules: ProductRule[]; setRules: (updater: (prev: ProductRule[]) => ProductRule[]) => void }) => {
    const [input, setInput] = useState('')
    const [options, setOptions] = useState<ProductOption[]>([])
    const [searching, setSearching] = useState(false)
    const [picked, setPicked] = useState<ProductOption | null>(null)

    useEffect(() => {
        const q = input.trim()
        if (q.length < 2) {
            setOptions([])
            return
        }
        const timer = setTimeout(async () => {
            setSearching(true)
            try {
                const res = await fetchAPI(API_ENDPOINTS.cargo.products(q))
                setOptions(res?.data || [])
            } catch {
                setOptions([])
            } finally {
                setSearching(false)
            }
        }, 350)
        return () => clearTimeout(timer)
    }, [input])

    const add = () => {
        if (!picked) return
        if (rules.some(r => r.productKey === picked.productKey)) {
            toast.warning('Bu ürün zaten ekli')
            return
        }
        setRules(prev => [...prev, { productKey: picked.productKey, stockCode: picked.stockCode, productName: picked.productName, price: 0 }])
        setPicked(null)
        setInput('')
    }
    const change = (productKey: string, raw: string) => {
        const value: Num = raw === '' ? '' : Number(raw)
        setRules(prev => prev.map(r => (r.productKey === productKey ? { ...r, price: value } : r)))
    }

    return (
        <Card>
            <CardHeader title='Ürün Bazlı Kurallar' subheader={`${rules.length} ürün tanımlı`} />
            <Divider />
            <CardContent>
                <div className='flex gap-3 items-center flex-wrap'>
                    <Autocomplete
                        sx={{ minWidth: 360, flex: 1 }}
                        size='small'
                        options={options.filter(o => !rules.some(r => r.productKey === o.productKey))}
                        getOptionLabel={o => `${o.stockCode} — ${o.productName}`}
                        filterOptions={x => x}
                        value={picked}
                        onChange={(_, v) => setPicked(v)}
                        inputValue={input}
                        onInputChange={(_, v) => setInput(v)}
                        loading={searching}
                        noOptionsText={input.trim().length < 2 ? 'Stok kodu veya ürün adı yazın' : 'Ürün bulunamadı'}
                        renderInput={p => <TextField {...p} label='Ürün ara (stok kodu / ad)' />}
                    />
                    <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={add} disabled={!picked}>
                        Ürün Ekle
                    </Button>
                </div>
            </CardContent>
            <Divider />
            <div className='overflow-x-auto'>
                <table className={tableStyles.table}>
                    <thead>
                        <tr>
                            <th>Stok Kodu</th>
                            <th>Ürün</th>
                            <th>Kargo Ücreti (adet)</th>
                            <th style={{ width: 70 }} />
                        </tr>
                    </thead>
                    <tbody>
                        {rules.length === 0 ? (
                            <tr><td colSpan={4} className='text-center p-6'><Typography color='text.secondary'>Yukarıdan ürün arayıp ekleyin</Typography></td></tr>
                        ) : (
                            rules.map(rule => (
                                <tr key={rule.productKey}>
                                    <td><Typography variant='body2' className='font-medium'>{rule.stockCode}</Typography></td>
                                    <td><Typography variant='body2'>{rule.productName}</Typography></td>
                                    <td>{priceField(rule.price, raw => change(rule.productKey, raw), 160)}</td>
                                    <td>
                                        <Tooltip title='Ürünü çıkar'>
                                            <IconButton size='small' onClick={() => setRules(prev => prev.filter(r => r.productKey !== rule.productKey))}>
                                                <i className='ri-delete-bin-line text-[20px] text-textSecondary' />
                                            </IconButton>
                                        </Tooltip>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}

/* ---------- Sayfa ---------- */
// Sekmeler: XML (tedarikçi) ürünleri | stoktaki (DIA) ürünler
const XML_TAB = 'xml'
const STOCK_TAB = 'stok'

type RuleTab = typeof XML_TAB | typeof STOCK_TAB

const DesiPricingPage = () => {
    const params = useParams()
    const router = useRouter()
    const cargoId = params.id as string
    const locale = params.lang as string
    const listUrl = `/${locale}/apps/cargo/list`

    // Kurallar iki sekmede tutulur: XML (tedarikçi) ürünleri ve kendi stoğumuzdaki ürünler. Sekme adreste saklanır (?tab=).
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const activeTab: RuleTab = searchParams.get('tab') === STOCK_TAB ? STOCK_TAB : XML_TAB
    const changeTab = (next: RuleTab) => {
        const query = new URLSearchParams(searchParams.toString())

        query.set('tab', next)
        router.replace(`${pathname}?${query.toString()}`, { scroll: false })
    }

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [cargo, setCargo] = useState<CargoDetail | null>(null)

    const [productType, setProductType] = useState<CargoProductType>('dia_api')
    const [scopeType, setScopeType] = useState<CargoScopeType>('all')
    const [fixedPrice, setFixedPrice] = useState<Num>(0)
    const [freeShippingThreshold, setFreeShippingThreshold] = useState<Num>(0)
    const [freeShippingDesiLimit, setFreeShippingDesiLimit] = useState<Num>(0)
    // Stoktaki ürünlerin genel ayarları (XML ayarlarından bağımsız)
    const [stockFixedPrice, setStockFixedPrice] = useState<Num>(0)
    const [stockFreeShippingThreshold, setStockFreeShippingThreshold] = useState<Num>(0)
    const [stockFreeShippingDesiLimit, setStockFreeShippingDesiLimit] = useState<Num>(0)
    // Kargo ücreti ürün fiyatına dahil mi, hariç mi (stoktaki ürünler)
    const [stockShippingPriceMode, setStockShippingPriceMode] = useState<CargoShippingPriceMode>('included')
    // İki ayrı genel desi tablosu: XML (tedarikçi) ürünleri ve kendi stoğumuzdaki ürünler
    const [generalPricing, setGeneralPricing] = useState<DesiPricing>({ ranges: [], extraPerDesi: 0 })
    const [stockPricing, setStockPricing] = useState<DesiPricing>({ ranges: [], extraPerDesi: 0 })

    const [categoryRules, setCategoryRules] = useState<ScopedRule[]>([])
    const [brandRules, setBrandRules] = useState<ScopedRule[]>([])
    const [productRules, setProductRules] = useState<ProductRule[]>([])
    const [globalSizeRules, setGlobalSizeRules] = useState<SizeRule[]>([])
    const [activeCategoryId, setActiveCategoryId] = useState('')
    const [activeBrandId, setActiveBrandId] = useState('')

    const [categoryOptions, setCategoryOptions] = useState<ScopedOption[]>([])
    const [brandOptions, setBrandOptions] = useState<ScopedOption[]>([])
    const [optionsLoading, setOptionsLoading] = useState(false)
    // Ebat listeleri: "cat:<id>" / "brand:<id>" anahtarıyla önbellek
    const [sizeOptions, setSizeOptions] = useState<Record<string, SizeOption[]>>({})
    const [sizesLoading, setSizesLoading] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const data = await fetchAPI(API_ENDPOINTS.cargo.detail(cargoId))
            if (!data?.success || !data.data) throw new Error(data?.message || 'Kargo firması bulunamadı')
            const c: CargoDetail = data.data
            setCargo(c)
            setProductType(c.productType || 'dia_api')
            setScopeType(scopeFromApi(c.scopeType))
            setFixedPrice(c.fixedPrice ?? 0)
            // Ücretsiz kargo eşikleri: 0 = ayar yok → alan boş gösterilir (boş kaydedilirse 0 yazılır, eşik uygulanmaz)
            setFreeShippingThreshold(c.freeShippingThreshold || '')
            setFreeShippingDesiLimit(c.freeShippingDesiLimit || '')
            setStockFixedPrice(c.stockFixedPrice ?? 0)
            setStockFreeShippingThreshold(c.stockFreeShippingThreshold || '')
            setStockFreeShippingDesiLimit(c.stockFreeShippingDesiLimit || '')
            setStockShippingPriceMode(c.stockShippingPriceMode === 'excluded' ? 'excluded' : 'included')
            setGeneralPricing(toPricing(c.desiPricing))
            setStockPricing(toPricing(c.stockDesiPricing))
            const cats = (c.categoryRules || []).map(r => rawToScoped(r, 'categoryId', 'categoryName'))
            const brands = (c.brandRules || []).map(r => rawToScoped(r, 'brandId', 'brandName'))
            setCategoryRules(cats)
            setBrandRules(brands)
            setActiveCategoryId(cats[0]?.refId || '')
            setActiveBrandId(brands[0]?.refId || '')
            setProductRules((c.productRules || []).map(r => ({ productKey: String(r.productKey), stockCode: r.stockCode || '', productName: r.productName || '', price: r.price })))
            setGlobalSizeRules((c.sizeRules || []).map(r => ({ size: r.size, price: r.price })))
        } catch (error: any) {
            toast.error(error.message || 'Kargo firması yüklenemedi')
            router.push(listUrl)
        } finally {
            setLoading(false)
        }
    }, [cargoId, router, listUrl])

    useEffect(() => {
        load()
    }, [load])

    // Kapsam seçenekleri (aktif siteye göre) — kapsam seçilince bir kez yüklenir
    useEffect(() => {
        if (scopeType === 'category' && categoryOptions.length === 0) {
            setOptionsLoading(true)
            fetchAPI(`${API_ENDPOINTS.categories.list()}?limit=1000`)
                .then(res => setCategoryOptions((res?.data || []).map((c: any) => ({ id: String(c.id || c._id), name: c.name || 'İsimsiz' })).sort((a: ScopedOption, b: ScopedOption) => a.name.localeCompare(b.name, 'tr'))))
                .catch(() => toast.error('Kategoriler yüklenemedi'))
                .finally(() => setOptionsLoading(false))
        }
        if (scopeType === 'brand' && brandOptions.length === 0) {
            setOptionsLoading(true)
            fetchAPI(API_ENDPOINTS.cargo.brands())
                .then(res => setBrandOptions(res?.data || []))
                .catch(() => toast.error('Markalar yüklenemedi'))
                .finally(() => setOptionsLoading(false))
        }
    }, [scopeType, categoryOptions.length, brandOptions.length])

    // Aktif kural ebat bazlıysa ebatlarını çek
    const activeScoped = scopeType === 'category' ? categoryRules.find(r => r.refId === activeCategoryId) : scopeType === 'brand' ? brandRules.find(r => r.refId === activeBrandId) : null
    useEffect(() => {
        const wantsGlobal = scopeType === 'size'
        if (!wantsGlobal && (!activeScoped || activeScoped.pricingMode !== 'size')) return
        const key = wantsGlobal ? '__all__' : activeScoped!.refId
        if (sizeOptions[key]) return
        const query = wantsGlobal ? {} : scopeType === 'category' ? { categoryId: key } : { brandId: key }
        setSizesLoading(true)
        fetchAPI(API_ENDPOINTS.cargo.sizes(query))
            .then(res => {
                if (!res?.success) throw new Error(res?.message || 'Ebatlar alınamadı')
                setSizeOptions(prev => ({ ...prev, [key]: res.data || [] }))
            })
            .catch((error: any) => {
                toast.error(error.message || 'Ebatlar alınamadı')
                setSizeOptions(prev => ({ ...prev, [key]: [] }))
            })
            .finally(() => setSizesLoading(false))
    }, [activeScoped, scopeType, sizeOptions])

    const handleSave = async () => {
        const generalError = validateRanges(generalPricing.ranges)
        if (generalError) {
            toast.error(`XML ürünleri desi tablosu: ${generalError}`)
            changeTab(XML_TAB)
            return
        }
        const stockError = validateRanges(stockPricing.ranges)
        if (stockError) {
            toast.error(`Stoktaki ürünler desi tablosu: ${stockError}`)
            changeTab(STOCK_TAB)
            return
        }
        for (const [rules, setActive] of [[categoryRules, setActiveCategoryId], [brandRules, setActiveBrandId]] as const) {
            for (const rule of rules) {
                const err = validateRanges(rule.desiPricing.ranges)
                if (err) {
                    toast.error(`${rule.refName}: ${err}`)
                    setActive(rule.refId)
                    return
                }
            }
        }
        if (productRules.some(r => r.price === '')) {
            toast.error('Ürün kurallarında kargo ücreti boş bırakılamaz')
            return
        }
        setSaving(true)
        try {
            const payload = {
                productType,
                scopeType: scopeToApi(scopeType),
                fixedPrice: toNumber(fixedPrice),
                freeShippingThreshold: toNumber(freeShippingThreshold),
                freeShippingDesiLimit: toNumber(freeShippingDesiLimit),
                stockFixedPrice: toNumber(stockFixedPrice),
                stockFreeShippingThreshold: toNumber(stockFreeShippingThreshold),
                stockFreeShippingDesiLimit: toNumber(stockFreeShippingDesiLimit),
                stockShippingPriceMode,
                desiPricing: serializePricing(generalPricing),
                stockDesiPricing: serializePricing(stockPricing),
                categoryRules: categoryRules.map(r => ({ categoryId: r.refId, categoryName: r.refName, fixedPrice: toNumber(r.fixedPrice), pricingMode: r.pricingMode, sizeRules: serializeSizes(r.sizeRules), desiPricing: serializePricing(r.desiPricing) })),
                brandRules: brandRules.map(r => ({ brandId: r.refId, brandName: r.refName, diaBrand: r.diaBrand || '', fixedPrice: toNumber(r.fixedPrice), pricingMode: r.pricingMode, sizeRules: serializeSizes(r.sizeRules), desiPricing: serializePricing(r.desiPricing) })),
                productRules: productRules.map(r => ({ productKey: r.productKey, stockCode: r.stockCode, productName: r.productName, price: toNumber(r.price) })),
                sizeRules: serializeSizes(globalSizeRules)
            }
            // Adresteki değer sıra numarası olabilir; güncelleme kayıt kimliğiyle yapılır
            const data = await fetchAPI(API_ENDPOINTS.cargo.update(cargo?._id || cargoId), { method: 'PUT', body: JSON.stringify(payload) })
            if (!data?.success) throw new Error(data?.message || 'Kaydedilemedi')
            toast.success('Kargo kuralları kaydedildi')
            setCargo(prev => (prev ? { ...prev, productType, scopeType: scopeToApi(scopeType) as CargoDetail['scopeType'] } : prev))
        } catch (error: any) {
            toast.error(error.message || 'Kaydedilirken hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    if (loading || !cargo) {
        return (
            <Card>
                <CardContent className='flex justify-center p-10'>
                    <CircularProgress />
                </CardContent>
            </Card>
        )
    }

    // Ücretsiz teslimat tanımı: desi / ürün kuralları yerine yalnız hizmet bölgesi düzenlenir
    if (cargo.pricingType === FREE_PRICING_TYPE) {
        return <FreeDeliveryRules key={cargo._id} cargo={cargo} listUrl={listUrl} onSaved={load} />
    }

    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <Card>
                    <CardHeader
                        title={`Kargo Kuralları — ${cargo.name}`}
                        action={
                            <div className='flex gap-2'>
                                <Button variant='outlined' color='secondary' startIcon={<i className='ri-arrow-left-line' />} onClick={() => router.push(listUrl)}>
                                    Listeye Dön
                                </Button>
                                <Button variant='contained' startIcon={saving ? <CircularProgress size={16} color='inherit' /> : <i className='ri-save-line' />} onClick={handleSave} disabled={saving}>
                                    Kaydet
                                </Button>
                            </div>
                        }
                    />
                </Card>
            </Grid>

            <Grid size={{ xs: 12 }}>
                <Card>
                    <Tabs value={activeTab} onChange={(_, value) => changeTab(value as RuleTab)} variant='fullWidth'>
                        <Tab value={XML_TAB} icon={<i className='ri-file-code-line' />} iconPosition='start' label='XML Ürünleri' />
                        <Tab value={STOCK_TAB} icon={<i className='ri-archive-line' />} iconPosition='start' label='Stoktaki Ürünler' />
                    </Tabs>
                </Card>
            </Grid>

            {/* ── XML ürünleri: genel ayarlar + desi tablosu ── */}
            {activeTab === XML_TAB && (
                <>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Card className='h-full'>
                            <CardHeader title='Genel Kurallar' subheader='XML Ürünleri' />
                            <Divider />
                            <CardContent className='flex flex-col gap-5'>
                                <TextField fullWidth type='number' label='Sabit Kargo Ücreti' value={fixedPrice} onChange={e => setFixedPrice(e.target.value === '' ? '' : Number(e.target.value))} inputProps={{ min: 0, step: 0.01 }} InputProps={{ endAdornment: <InputAdornment position='end'>TL</InputAdornment> }} />
                                <TextField fullWidth type='number' label='Ücretsiz Kargo Tutar Eşiği' value={freeShippingThreshold} onChange={e => setFreeShippingThreshold(e.target.value === '' ? '' : Number(e.target.value))} inputProps={{ min: 0, step: 0.01 }} InputProps={{ endAdornment: <InputAdornment position='end'>TL</InputAdornment> }} />
                                <TextField fullWidth type='number' label='Ücretsiz Kargo Desi Eşiği' value={freeShippingDesiLimit} onChange={e => setFreeShippingDesiLimit(e.target.value === '' ? '' : Number(e.target.value))} inputProps={{ min: 0, step: 1 }} InputProps={{ endAdornment: <InputAdornment position='end'>desi</InputAdornment> }} />
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <DesiRangesEditor title='Desi Bazlı Fiyatlandırma' pricing={generalPricing} onChange={setGeneralPricing} />
                    </Grid>
                </>
            )}

            {/* ── Stoktaki ürünler: genel ayarlar + kapsam (desi / kategori / marka / ürün / ebat) ── */}
            {activeTab === STOCK_TAB && (
                <>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Card className='h-full'>
                            <CardHeader title='Genel Kurallar' subheader='Stoktaki Ürünler' />
                            <Divider />
                            <CardContent className='flex flex-col gap-5'>
                                <TextField select fullWidth label='Kural Kapsamı' value={scopeType} onChange={e => setScopeType(e.target.value as CargoScopeType)}>
                                    {CARGO_SCOPE_OPTIONS.map(opt => (
                                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                    ))}
                                </TextField>
                                <TextField fullWidth type='number' label='Sabit Kargo Ücreti' value={stockFixedPrice} onChange={e => setStockFixedPrice(e.target.value === '' ? '' : Number(e.target.value))} inputProps={{ min: 0, step: 0.01 }} InputProps={{ endAdornment: <InputAdornment position='end'>TL</InputAdornment> }} />
                                <TextField fullWidth type='number' label='Ücretsiz Kargo Tutar Eşiği' value={stockFreeShippingThreshold} onChange={e => setStockFreeShippingThreshold(e.target.value === '' ? '' : Number(e.target.value))} inputProps={{ min: 0, step: 0.01 }} InputProps={{ endAdornment: <InputAdornment position='end'>TL</InputAdornment> }} />
                                <TextField fullWidth type='number' label='Ücretsiz Kargo Desi Eşiği' value={stockFreeShippingDesiLimit} onChange={e => setStockFreeShippingDesiLimit(e.target.value === '' ? '' : Number(e.target.value))} inputProps={{ min: 0, step: 1 }} InputProps={{ endAdornment: <InputAdornment position='end'>desi</InputAdornment> }} />
                                <TextField select fullWidth label='Kargo Fiyatı' value={stockShippingPriceMode} onChange={e => setStockShippingPriceMode(e.target.value as CargoShippingPriceMode)}>
                                    {CARGO_SHIPPING_PRICE_MODE_OPTIONS.map(opt => (
                                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                    ))}
                                </TextField>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                        {scopeType === 'all' && <DesiRangesEditor title='Desi Bazlı Fiyatlandırma' pricing={stockPricing} onChange={setStockPricing} />}
                        {scopeType === 'category' && (
                            <ScopedRulesSection kind='category' title='Kategori Bazlı Kurallar' options={categoryOptions} optionsLoading={optionsLoading} rules={categoryRules} setRules={setCategoryRules} activeId={activeCategoryId} setActiveId={setActiveCategoryId} sizeOptions={sizeOptions} sizesLoading={sizesLoading} />
                        )}
                        {scopeType === 'brand' && (
                            <ScopedRulesSection kind='brand' title='Marka Bazlı Kurallar' options={brandOptions} optionsLoading={optionsLoading} rules={brandRules} setRules={setBrandRules} activeId={activeBrandId} setActiveId={setActiveBrandId} sizeOptions={sizeOptions} sizesLoading={sizesLoading} />
                        )}
                        {scopeType === 'product' && <ProductRulesSection rules={productRules} setRules={setProductRules} />}
                        {scopeType === 'size' && <SizeRulesEditor title='Ebat Bazlı Fiyatlandırma — Tüm Ürünler' options={sizeOptions['__all__'] || []} loading={sizesLoading} rules={globalSizeRules} onChange={setGlobalSizeRules} />}
                    </Grid>
                </>
            )}
        </Grid>
    )
}

export default DesiPricingPage
