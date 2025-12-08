'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

/* MUI */
import Autocomplete from '@mui/material/Autocomplete'
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
import CircularProgress from '@mui/material/CircularProgress'

/* Toast */
import { toast } from 'react-toastify'

import {
    fetchMenu,
    updateMenu,
    fetchCategories,
    fetchPages,
    fetchParentMenus,
    type CategoryOptionType,
    type PageOptionType,
    type ParentMenuOptionType
} from '@/utils/api/menus'

type EditMenuFormProps = {
    menuId: string
}

const EditMenuForm = ({ menuId }: EditMenuFormProps) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)

    // Form state
    const [name, setName] = useState('')
    const [menuType, setMenuType] = useState<'link' | 'category' | 'page' | 'heading'>('link')
    const [linkUrl, setLinkUrl] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [categoryLevel, setCategoryLevel] = useState<1 | 2>(1)
    const [pageId, setPageId] = useState('')
    const [headingText, setHeadingText] = useState('')
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
                setParentMenus(result.data.filter(menu => menu._id !== menuId))
            }
        } catch (error: any) {
            console.error('Ana menü yükleme hatası:', error)
        } finally {
            setLoadingOptions(false)
        }
    }

    const loadMenu = async () => {
        try {
            setInitialLoading(true)
            const result = await fetchMenu(menuId)

            if (result.success && result.data) {
                const menu = result.data

                setName(menu.name)
                setMenuType(menu.menuType)
                setOpenNewTab(menu.openNewTab)
                setDisplayArea(menu.displayArea)
                setRowLevel(menu.rowLevel)
                setOrder(menu.order)
                setIsActive(menu.isActive)

                if (menu.menuType === 'link') {
                    setLinkUrl(menu.linkData?.url || '')
                } else if (menu.menuType === 'category') {
                    setCategoryLevel(menu.linkData?.categoryLevel || 1)
                    setCategoryId(menu.linkData?.categoryId || '')
                    await loadCategories(menu.linkData?.categoryLevel || 1)
                } else if (menu.menuType === 'page') {
                    setPageId(menu.linkData?.pageId || '')
                    await loadPages()
                } else if (menu.menuType === 'heading') {
                    setHeadingText(menu.linkData?.heading || '')
                }

                if (menu.rowLevel === 2) {
                    await loadParentMenus(menu.displayArea)

                    if (menu.parentId) {
                        const parentIdValue = typeof menu.parentId === 'string'
                            ? menu.parentId
                            : menu.parentId._id

                        setParentId(parentIdValue)
                    }
                }
            } else {
                toast.error('Menü bulunamadı')
                router.push('/tr/apps/design/menu')
            }
        } catch (error: any) {
            toast.error(error.message || 'Menü yüklenemedi')
            router.push('/tr/apps/design/menu')
        } finally {
            setInitialLoading(false)
        }
    }

    // İlk yükleme
    useEffect(() => {
        loadMenu()
    }, [menuId])

    // MenuType değiştiğinde
    useEffect(() => {
        if (initialLoading) return

        if (menuType === 'category') {
            setCategories([])
            setCategoryId('')
            loadCategories(categoryLevel)
        } else if (menuType === 'page') {
            setPages([])
            setPageId('')
            loadPages()
        }
    }, [menuType])

    // CategoryLevel değiştiğinde
    useEffect(() => {
        if (initialLoading) return

        if (menuType === 'category') {
            setCategories([])
            setCategoryId('')
            loadCategories(categoryLevel)
        }
    }, [categoryLevel])

    // DisplayArea veya RowLevel değiştiğinde
    useEffect(() => {
        if (initialLoading) return

        if (rowLevel === 2) {
            setParentMenus([])
            setParentId('')
            loadParentMenus(displayArea)
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
                openNewTab: menuType === 'heading' ? false : openNewTab,
                displayArea,
                rowLevel,
                ...(rowLevel === 2 && { parentId }),
                order,
                isActive
            }

            const result = await updateMenu(menuId, menuData)

            if (result.success) {
                toast.success('Menü başarıyla güncellendi')
                router.push('/tr/apps/design/menu')
            } else {
                throw new Error(result.message || 'Menü güncellenemedi')
            }
        } catch (error: any) {
            toast.error(error.message || 'Menü güncellenirken hata oluştu')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (initialLoading) {
        return (
            <Card>
                <CardContent className='flex justify-center items-center' style={{ minHeight: '400px' }}>
                    <CircularProgress />
                </CardContent>
            </Card>
        )
    }

    return (
        <form onSubmit={handleSubmit}>
            <Grid container spacing={6} justifyContent={'center'}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <Grid container spacing={6} >
                        <Grid size={{ xs: 12 }}>
                            <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col gap-3'>
                                <Typography variant='h4'>Menü Düzenle</Typography>
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
                                        {loading ? 'Güncelleniyor...' : 'Güncelle'}
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
                                                        <MenuItem key="link" value='link'>Bağlantı</MenuItem>
                                                        <MenuItem key="category" value='category'>Kategori</MenuItem>
                                                        <MenuItem key="page" value='page'>Sayfa</MenuItem>
                                                        {rowLevel === 2 && (
                                                            <MenuItem key="heading" value='heading'>Başlık</MenuItem>
                                                        )}
                                                    </Select>
                                                </FormControl>
                                            </Grid>

                                            {/* Link URL */}
                                            {menuType === 'link' && (
                                                <Grid size={{ xs: 12 }}>
                                                    <TextField
                                                        fullWidth
                                                        label='Bağlantı URL'
                                                        value={linkUrl}
                                                        onChange={(e) => setLinkUrl(e.target.value)}
                                                        required
                                                    />
                                                </Grid>
                                            )}

                                            {/* Kategori Seçimi */}
                                            {menuType === 'category' && (
                                                <>
                                                    <Grid size={{ xs: 12, sm: 6 }}>
                                                        <FormControl fullWidth>
                                                            <InputLabel>Kategori Seviyesi</InputLabel>
                                                            <Select
                                                                value={categoryLevel}
                                                                label='Kategori Seviyesi'
                                                                onChange={(e) => setCategoryLevel(parseInt(e.target.value) as 1 | 2)}
                                                            >
                                                                <MenuItem key="level-1" value={1}>1. Seviye Kategori</MenuItem>
                                                                <MenuItem key="level-2" value={2}>2. Seviye Kategori</MenuItem>
                                                            </Select>
                                                        </FormControl>
                                                    </Grid>

                                                    <Grid size={{ xs: 12, sm: 6 }}>
                                                        <FormControl fullWidth>
                                                            <Autocomplete
                                                                value={categories.find(cat => cat._id === categoryId) || null}
                                                                onChange={(event, newValue) => {
                                                                    setCategoryId(newValue?._id || '')
                                                                }}
                                                                options={categories}
                                                                getOptionLabel={(option) => option.name}
                                                                loading={loadingOptions}
                                                                loadingText="Yükleniyor..."
                                                                noOptionsText="Kategori bulunamadı"
                                                                renderInput={(params) => (
                                                                    <TextField
                                                                        {...params}
                                                                        label="Kategori Seç"
                                                                        required
                                                                    />
                                                                )}
                                                                disabled={loadingOptions}
                                                            />
                                                        </FormControl>
                                                    </Grid>
                                                </>
                                            )}

                                            {/* Sayfa Seçimi */}
                                            {menuType === 'page' && (
                                                <Grid size={{ xs: 12 }}>
                                                    <FormControl fullWidth>
                                                        <InputLabel>Sayfa Seç</InputLabel>
                                                        <Select
                                                            value={pageId || ''}
                                                            label='Sayfa Seç'
                                                            onChange={(e) => setPageId(e.target.value)}
                                                            disabled={loadingOptions}
                                                            required
                                                        >
                                                            <MenuItem key="empty-page" value="">
                                                                <em>{pages.length === 0 ? 'Yükleniyor...' : 'Seçiniz'}</em>
                                                            </MenuItem>
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

                                            {/* Yeni Sekmede Aç - Başlık tipinde gösterme */}
                                            {menuType !== 'heading' && (
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
                                            )}
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
                                                        <MenuItem key="header" value='header'>Header</MenuItem>
                                                        <MenuItem key="footer" value='footer'>Footer</MenuItem>
                                                        <MenuItem key="mobile" value='mobile'>Mobil</MenuItem>
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
                                                    <FormControlLabel key="row-1" value={1} control={<Radio />} label='Ana Menü' />
                                                    <FormControlLabel key="row-2" value={2} control={<Radio />} label='Alt Menü' />
                                                </RadioGroup>

                                                {/* Parent Menü Seçimi */}
                                                {rowLevel === 2 && (
                                                    <FormControl fullWidth className='mt-4'>
                                                        <InputLabel>Ana Menü Seç</InputLabel>
                                                        <Select
                                                            value={parentId || ''}
                                                            label='Ana Menü Seç'
                                                            onChange={(e) => setParentId(e.target.value)}
                                                            disabled={loadingOptions}
                                                            required
                                                        >
                                                            <MenuItem key="empty-parent" value="">
                                                                <em>{parentMenus.length === 0 ? 'Yükleniyor...' : 'Seçiniz'}</em>
                                                            </MenuItem>
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

export default EditMenuForm