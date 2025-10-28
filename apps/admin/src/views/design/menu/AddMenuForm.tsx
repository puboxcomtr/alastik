'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormLabel from '@mui/material/FormLabel'

import {
    createMenu,
    fetchCategories,
    fetchPages,
    fetchParentMenus,
    type CategoryOptionType,
    type PageOptionType,
    type ParentMenuOptionType
} from '@/utils/api/menus'

const AddMenuForm = () => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Form state
    const [name, setName] = useState('')
    const [menuType, setMenuType] = useState<'link' | 'category' | 'page'>('link')
    const [linkUrl, setLinkUrl] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [categoryLevel, setCategoryLevel] = useState<1 | 2>(1)
    const [pageId, setPageId] = useState('')
    const [openNewTab, setOpenNewTab] = useState(false)
    const [displayArea, setDisplayArea] = useState<'header' | 'footer' | 'mobile'>('header')
    const [rowLevel, setRowLevel] = useState<1 | 2>(1)
    const [parentId, setParentId] = useState('')
    const [order, setOrder] = useState(0)
    const [isActive, setIsActive] = useState(true)

    // Options state
    const [categories, setCategories] = useState<CategoryOptionType[]>([])
    const [pages, setPages] = useState<PageOptionType[]>([])
    const [parentMenus, setParentMenus] = useState<ParentMenuOptionType[]>([])
    const [loadingOptions, setLoadingOptions] = useState(false)

    // Kategorileri yükle
    const loadCategories = async (level?: 1 | 2) => {
        try {
            setLoadingOptions(true)
            const result = await fetchCategories(level)
            if (result.success) {
                setCategories(result.data)
            }
        } catch (error: any) {
            console.error('Kategori yükleme hatası:', error)
        } finally {
            setLoadingOptions(false)
        }
    }

    // Sayfaları yükle
    const loadPages = async () => {
        try {
            setLoadingOptions(true)
            const result = await fetchPages()
            if (result.success) {
                setPages(result.data)
            }
        } catch (error: any) {
            console.error('Sayfa yükleme hatası:', error)
        } finally {
            setLoadingOptions(false)
        }
    }

    // Ana menüleri yükle
    const loadParentMenus = async (area: string) => {
        try {
            setLoadingOptions(true)
            const result = await fetchParentMenus(area)
            if (result.success) {
                setParentMenus(result.data)
            }
        } catch (error: any) {
            console.error('Ana menü yükleme hatası:', error)
        } finally {
            setLoadingOptions(false)
        }
    }

    // MenuType değiştiğinde ilgili verileri yükle
    useEffect(() => {
        if (menuType === 'category') {
            loadCategories()
        } else if (menuType === 'page') {
            loadPages()
        }
    }, [menuType])

    // CategoryLevel değiştiğinde kategorileri yeniden yükle
    useEffect(() => {
        if (menuType === 'category') {
            loadCategories(categoryLevel)
            setCategoryId('') // Seçimi sıfırla
        }
    }, [categoryLevel])

    // DisplayArea veya RowLevel değiştiğinde parent menüleri yükle
    useEffect(() => {
        if (rowLevel === 2) {
            loadParentMenus(displayArea)
            setParentId('') // Seçimi sıfırla
        }
    }, [displayArea, rowLevel])

    const validateForm = () => {
        if (!name.trim()) {
            toast.error('Menü adı zorunludur')
            return false
        }

        if (menuType === 'link' && !linkUrl.trim()) {
            toast.error('Link URL adresi zorunludur')
            return false
        }

        if (menuType === 'category' && !categoryId) {
            toast.error('Kategori seçimi zorunludur')
            return false
        }

        if (menuType === 'page' && !pageId) {
            toast.error('Sayfa seçimi zorunludur')
            return false
        }

        if (rowLevel === 2 && !parentId) {
            toast.error('Alt menü için ana menü seçmelisiniz')
            return false
        }

        return true
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setLoading(true)

        try {
            const menuData = {
                name: name.trim(),
                menuType,
                linkData: {
                    ...(menuType === 'link' && { url: linkUrl }),
                    ...(menuType === 'category' && { categoryId, categoryLevel }),
                    ...(menuType === 'page' && { pageId })
                },
                openNewTab,
                displayArea,
                rowLevel,
                ...(rowLevel === 2 && { parentId }),
                order,
                isActive
            }

            const result = await createMenu(menuData)

            if (result.success) {
                toast.success('Menü başarıyla oluşturuldu')
                router.push('/tr/apps/design/menu')
            } else {
                throw new Error(result.message || 'Menü oluşturulamadı')
            }
        } catch (error: any) {
            toast.error(error.message || 'Menü oluşturulurken hata oluştu')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <Grid container spacing={6} justifyContent={'center'}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <Grid container spacing={6} >
                        <Grid size={{ xs: 12 }}>
                            <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col gap-3'>
                                <Typography variant='h4'>Yeni Menü Ekle</Typography>
                                <div className='flex gap-3'>
                                    <Button
                                        variant='outlined'
                                        color='secondary'
                                        onClick={() => router.back()}
                                        disabled={loading}
                                    >
                                        Geri Dön
                                    </Button>
                                    <Button variant='contained' type='submit' disabled={loading}>
                                        {loading ? 'Kaydediliyor...' : 'Kaydet'}
                                    </Button>
                                </div>
                            </div>
                        </Grid>
                        <Grid container spacing={6}>
                            <Grid size={{ xs: 12, md: 8 }}>
                                <Card>
                                    <CardContent>
                                        <Typography variant='h6' className='mb-4'>Menü Bilgileri</Typography>
                                        <Grid container spacing={8}>
                                            {/* Menü Adı */}
                                            <Grid size={{ xs: 12 }}>
                                                <TextField
                                                    fullWidth
                                                    label='Menü Adı'
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    required
                                                />
                                            </Grid>

                                            {/* Menü Tipi */}
                                            <Grid size={{ xs: 12 }}>
                                                <FormControl fullWidth>
                                                    <InputLabel>Menü Tipi</InputLabel>
                                                    <Select
                                                        value={menuType}
                                                        label='Menü Tipi'
                                                        onChange={(e) => setMenuType(e.target.value as any)}
                                                    >
                                                        <MenuItem value='link'>Bağlantı (Link)</MenuItem>
                                                        <MenuItem value='category'>Kategori</MenuItem>
                                                        <MenuItem value='page'>Sayfa</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Grid>

                                            {/* Link URL - Sadece menuType: link ise */}
                                            {menuType === 'link' && (
                                                <Grid size={{ xs: 12 }}>
                                                    <TextField
                                                        fullWidth
                                                        label='Bağlantı URL'
                                                        value={linkUrl}
                                                        onChange={(e) => setLinkUrl(e.target.value)}
                                                        placeholder='https://example.com'
                                                        required
                                                    />
                                                </Grid>
                                            )}

                                            {/* Kategori Seçimi - Sadece menuType: category ise */}
                                            {menuType === 'category' && (
                                                <>
                                                    <Grid size={{ xs: 12, sm: 6 }}>
                                                        <FormControl fullWidth>
                                                            <InputLabel>Kategori Seviyesi</InputLabel>
                                                            <Select
                                                                value={categoryLevel}
                                                                label='Kategori Seviyesi'
                                                                onChange={(e) => setCategoryLevel(e.target.value as 1 | 2)}
                                                            >
                                                                <MenuItem value={1}>1. Seviye Kategori</MenuItem>
                                                                <MenuItem value={2}>2. Seviye Kategori</MenuItem>
                                                            </Select>
                                                        </FormControl>
                                                    </Grid>

                                                    <Grid size={{ xs: 12, sm: 6 }}>
                                                        <FormControl fullWidth>
                                                            <InputLabel>Kategori Seç</InputLabel>
                                                            <Select
                                                                value={categoryId}
                                                                label='Kategori Seç'
                                                                onChange={(e) => setCategoryId(e.target.value)}
                                                                disabled={loadingOptions || categories.length === 0}
                                                                required
                                                            >
                                                                {categories.map((cat) => (
                                                                    <MenuItem key={cat._key} value={cat._key}>
                                                                        {cat.name}
                                                                    </MenuItem>
                                                                ))}
                                                            </Select>
                                                        </FormControl>
                                                    </Grid>
                                                </>
                                            )}

                                            {/* Sayfa Seçimi - Sadece menuType: page ise */}
                                            {menuType === 'page' && (
                                                <Grid size={{ xs: 12 }}>
                                                    <FormControl fullWidth>
                                                        <InputLabel>Sayfa Seç</InputLabel>
                                                        <Select
                                                            value={pageId}
                                                            label='Sayfa Seç'
                                                            onChange={(e) => setPageId(e.target.value)}
                                                            disabled={loadingOptions || pages.length === 0}
                                                            required
                                                        >
                                                            {pages.map((page) => (
                                                                <MenuItem key={page._id} value={page._id}>
                                                                    {page.title}
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>
                                                </Grid>
                                            )}

                                            {/* Sıralama */}
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    fullWidth
                                                    type='number'
                                                    label='Sıra No'
                                                    value={order}
                                                    onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                                                />
                                            </Grid>

                                            {/* Yeni Sekmede Aç */}
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <FormControlLabel
                                                    control={
                                                        <Switch
                                                            checked={openNewTab}
                                                            onChange={(e) => setOpenNewTab(e.target.checked)}
                                                        />
                                                    }
                                                    label='Yeni Sekmede Aç'
                                                />
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Grid container spacing={6}>
                                    <Grid size={{ xs: 12 }}>
                                        <Card>
                                            <CardContent>
                                                <Typography variant='h6' className='mb-4'>Gösterilecek Alan</Typography>
                                                <FormControl fullWidth>
                                                    <InputLabel>Alan Seç</InputLabel>
                                                    <Select
                                                        value={displayArea}
                                                        label='Alan Seç'
                                                        onChange={(e) => setDisplayArea(e.target.value as any)}
                                                    >
                                                        <MenuItem value='header'>Header</MenuItem>
                                                        <MenuItem value='footer'>Footer</MenuItem>
                                                        <MenuItem value='mobile'>Mobil</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    <Grid size={{ xs: 12 }}>
                                        <Card>
                                            <CardContent>
                                                <FormLabel component="legend" className='mb-3'>Satır Sıra No</FormLabel>
                                                <RadioGroup
                                                    value={rowLevel}
                                                    onChange={(e) => setRowLevel(parseInt(e.target.value) as 1 | 2)}
                                                >
                                                    <FormControlLabel value={1} control={<Radio />} label='Ana Menü' />
                                                    <FormControlLabel value={2} control={<Radio />} label='Alt Menü' />
                                                </RadioGroup>

                                                {/* Parent Menü Seçimi - Sadece rowLevel: 2 ise */}
                                                {rowLevel === 2 && (
                                                    <FormControl fullWidth className='mt-4'>
                                                        <InputLabel>Ana Menü Seç</InputLabel>
                                                        <Select
                                                            value={parentId}
                                                            label='Ana Menü Seç'
                                                            onChange={(e) => setParentId(e.target.value)}
                                                            disabled={loadingOptions || parentMenus.length === 0}
                                                            required
                                                        >
                                                            {parentMenus.map((menu) => (
                                                                <MenuItem key={menu._id} value={menu._id}>
                                                                    {menu.name}
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    <Grid size={{ xs: 12 }}>
                                        <Card>
                                            <CardContent>
                                                <Typography variant='h6' className='mb-4'>Durum</Typography>
                                                <FormControlLabel
                                                    control={
                                                        <Switch
                                                            checked={isActive}
                                                            onChange={(e) => setIsActive(e.target.checked)}
                                                        />
                                                    }
                                                    label={isActive ? 'Aktif' : 'Pasif'}
                                                />
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </form>
    )
}

export default AddMenuForm