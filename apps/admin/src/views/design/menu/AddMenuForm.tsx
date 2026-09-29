'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/* MUI */
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
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

/* Toast */
import { toast } from 'react-toastify'

import {
    createMenu,
    fetchCategories,
    fetchPages,
    fetchBlogs,
    fetchProducts,
    fetchTags,
    fetchBrands,
    fetchParentMenus,
    type CategoryOptionType,
    type PageOptionType,
    type BlogOptionType,
    type ProductOptionType,
    type TagOptionType,
    type BrandOptionType,
    type ParentMenuOptionType
} from '@/utils/api/menus'
import { fetchBlogCategories, type BlogCategoryType } from '@/utils/api/blogCategories'

// 2000'den fazla blog kaydı var; listede aynı anda en fazla 50 seçenek çizilir
const blogFilterOptions = createFilterOptions<BlogOptionType>({ limit: 50 })

const AddMenuForm = () => {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Menü detayından "Öğe Ekle" ile gelindiyse ana menü ve alan hazır seçili gelir
    const presetParentId = searchParams.get('parentId') || ''
    const presetArea = searchParams.get('displayArea') as 'header' | 'footer' | 'mobile' | 'general' | 'blog' | 'ustlink' | null

    const [loading, setLoading] = useState(false)

    // Form state
    const [name, setName] = useState('')
    const [menuType, setMenuType] = useState<'link' | 'category' | 'page' | 'blog' | 'product' | 'tag' | 'brand' | 'heading'>('link')
    const [linkUrl, setLinkUrl] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [categoryLevel, setCategoryLevel] = useState<1 | 2>(1)
    const [blogCategoryId, setBlogCategoryId] = useState('')
    const [blogCategories, setBlogCategories] = useState<BlogCategoryType[]>([])
    const [pageId, setPageId] = useState('')
    const [blogId, setBlogId] = useState('')
    const [productId, setProductId] = useState('')
    const [productQuery, setProductQuery] = useState('')
    const [headingText, setHeadingText] = useState('')
    const [openNewTab, setOpenNewTab] = useState(false)
    const [icon, setIcon] = useState('')
    const [displayArea, setDisplayArea] = useState<'header' | 'footer' | 'mobile' | 'general' | 'blog' | 'ustlink'>(
        presetArea && ['header', 'footer', 'mobile', 'general', 'blog', 'ustlink'].includes(presetArea) ? presetArea : 'header'
    )
    // Grup bağlamında "Ana Menü" seçimi = üst bar öğesi (grup gizli üst olur);
    // "Alt Menü" = seçilen üst bar öğesinin açılır menüsüne girer
    const [rowLevel, setRowLevel] = useState<1 | 2>(1)
    const [parentId, setParentId] = useState('')
    const [order, setOrder] = useState(999)
    const [isActive, setIsActive] = useState(true)

    // Options state
    const [categories, setCategories] = useState<CategoryOptionType[]>([])
    const [pages, setPages] = useState<PageOptionType[]>([])
    const [blogs, setBlogs] = useState<BlogOptionType[]>([])
    const [products, setProducts] = useState<ProductOptionType[]>([])
    const [tags, setTags] = useState<TagOptionType[]>([])
    const [tagQuery, setTagQuery] = useState('')
    const [tagId, setTagId] = useState('')
    const [loadingTags, setLoadingTags] = useState(false)
    const [brands, setBrands] = useState<BrandOptionType[]>([])
    const [brandQuery, setBrandQuery] = useState('')
    const [brandId, setBrandId] = useState('')
    const [loadingBrands, setLoadingBrands] = useState(false)
    const [loadingProducts, setLoadingProducts] = useState(false)
    const [parentMenus, setParentMenus] = useState<ParentMenuOptionType[]>([])
    const [loadingOptions, setLoadingOptions] = useState(false)

    // Blog kategorilerini yükle (menü hedefi seçimi için)
    useEffect(() => {
        fetchBlogCategories()
            .then((r: any) => { if (r?.success) setBlogCategories(r.data || []) })
            .catch(() => {})
    }, [])

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

    // Blog yazılarını yükle
    const loadBlogs = async () => {
        try {
            setLoadingOptions(true)
            const result = await fetchBlogs()
            if (result.success) {
                setBlogs(result.data)
            }
        } catch (error: any) {
            console.error('Blog yükleme hatası:', error)
        } finally {
            setLoadingOptions(false)
        }
    }

    // Ürün araması: yazarken sunucuda aranır (katalog büyük)
    useEffect(() => {
        if (menuType !== 'product') return

        const timer = setTimeout(async () => {
            try {
                setLoadingProducts(true)
                const result = await fetchProducts(productQuery)
                if (result.success) setProducts(result.data)
            } catch (error: any) {
                console.error('Ürün arama hatası:', error)
            } finally {
                setLoadingProducts(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [menuType, productQuery])

    // Etiket araması: yazarken sunucuda aranır (etiket sayısı yüksek)
    useEffect(() => {
        if (menuType !== 'tag') return

        const timer = setTimeout(async () => {
            try {
                setLoadingTags(true)
                const result = await fetchTags(tagQuery)

                if (result.success) setTags(result.data)
            } catch (error: any) {
                console.error('Etiket arama hatası:', error)
            } finally {
                setLoadingTags(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [menuType, tagQuery])

    // Marka araması
    useEffect(() => {
        if (menuType !== 'brand') return

        const timer = setTimeout(async () => {
            try {
                setLoadingBrands(true)
                const result = await fetchBrands(brandQuery)

                if (result.success) setBrands(result.data)
            } catch (error: any) {
                console.error('Marka arama hatası:', error)
            } finally {
                setLoadingBrands(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [menuType, brandQuery])

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
            setCategories([])
            setCategoryId('')
            loadCategories(categoryLevel)
        } else if (menuType === 'page') {
            setPages([])
            setPageId('')
            loadPages()
        } else if (menuType === 'blog') {
            setBlogs([])
            setBlogId('')
            loadBlogs()
        }
    }, [menuType])

    // CategoryLevel değiştiğinde kategorileri yeniden yükle
    useEffect(() => {
        if (menuType === 'category') {
            setCategories([])
            setCategoryId('')
            loadCategories(categoryLevel)
        }
    }, [categoryLevel])

    // DisplayArea veya RowLevel değiştiğinde parent menüleri yükle
    useEffect(() => {
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

        if (menuType === 'blogCategory' && !blogCategoryId) {
            toast.error('Blog kategori seçimi zorunludur')
            return
        }
        if (menuType === 'category' && !categoryId) {
            toast.error('Kategori seçimi zorunludur')
            return false
        }

        if (menuType === 'page' && !pageId) {
            toast.error('Sayfa seçimi zorunludur')
            return false
        }

        if (menuType === 'blog' && !blogId) {
            toast.error('Blog yazısı seçimi zorunludur')
            return false
        }

        if (menuType === 'product' && !productId) {
            toast.error('Ürün seçimi zorunludur')
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
                    ...(menuType === 'blogCategory' && { blogCategoryId }),
                    ...(menuType === 'page' && { pageId }),
                    ...(menuType === 'blog' && { blogId }),
                    ...(menuType === 'product' && { productId }),
                    ...(menuType === 'tag' && { tagId }),
                    ...(menuType === 'brand' && { brandId })
                },
                openNewTab: menuType === 'heading' ? false : openNewTab,
                displayArea,
                icon: icon.trim(),
                rowLevel,
                // Alt menüde seçilen üst öğe; "Ana Menü"de grup bağlamı varsa görünmez üst olarak grup gönderilir
                ...(rowLevel === 2 ? { parentId } : (presetParentId ? { parentId: presetParentId } : {})),
                order,
                isActive
            }

            const result = await createMenu(menuData)

            if (result.success) {
                toast.success('Menü başarıyla oluşturuldu')
                // Eklenen öğenin ait olduğu menünün detayına dön
                const groupId = presetParentId || (rowLevel === 2 ? parentId : '')
                router.push(groupId ? `/tr/apps/design/menu?menu=${groupId}` : '/tr/apps/design/menu')
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
                                                        <MenuItem key="link" value='link'>Bağlantı</MenuItem>
                                                        <MenuItem key="category" value='category'>Ürün Kategori</MenuItem>
                                                        <MenuItem key="blogCategory" value='blogCategory'>Blog Kategori</MenuItem>
                                                        <MenuItem key="page" value='page'>Sayfa</MenuItem>
                                                        <MenuItem key="blog" value='blog'>Blog</MenuItem>
                                                        <MenuItem key="product" value='product'>Ürün</MenuItem>
                                                        <MenuItem key="tag" value='tag'>Etiket</MenuItem>
                                                        <MenuItem key="brand" value='brand'>Marka</MenuItem>
                                                        {rowLevel === 2 && (
                                                            <MenuItem key="heading" value='heading'>Başlık</MenuItem>
                                                        )}
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

                                            {/* Blog Kategori Seçimi - Sadece menuType: blogCategory ise */}
                                            {menuType === 'blogCategory' && (
                                                <Grid size={{ xs: 12 }}>
                                                    <FormControl fullWidth>
                                                        <Autocomplete
                                                            value={blogCategories.find(bc => bc._id === blogCategoryId) || null}
                                                            onChange={(event, newValue) => {
                                                                setBlogCategoryId(newValue?._id || '')
                                                            }}
                                                            options={blogCategories}
                                                            getOptionLabel={(option) => option.name}
                                                            noOptionsText="Blog kategorisi bulunamadı"
                                                            renderInput={(params) => (
                                                                <TextField
                                                                    {...params}
                                                                    label="Blog Kategori Seç"
                                                                    required
                                                                />
                                                            )}
                                                        />
                                                    </FormControl>
                                                </Grid>
                                            )}

                                            {/* Sayfa Seçimi - Sadece menuType: page ise */}
                                            {menuType === 'page' && (
                                                <Grid size={{ xs: 12 }}>
                                                    <FormControl fullWidth>
                                                        <Autocomplete
                                                            value={pages.find(p => p._id === pageId) || null}
                                                            onChange={(event, newValue) => {
                                                                setPageId(newValue?._id || '')
                                                            }}
                                                            options={pages}
                                                            getOptionLabel={(option) => option.title}
                                                            loading={loadingOptions}
                                                            loadingText="Yükleniyor..."
                                                            noOptionsText="Bu sitede yayında sayfa yok"
                                                            renderInput={(params) => (
                                                                <TextField
                                                                    {...params}
                                                                    label="Sayfa Seç"
                                                                    required
                                                                />
                                                            )}
                                                            disabled={loadingOptions}
                                                        />
                                                    </FormControl>
                                                </Grid>
                                            )}
                                            {/* Blog Seçimi - Sadece menuType: blog ise */}
                                            {menuType === 'blog' && (
                                                <Grid size={{ xs: 12 }}>
                                                    <FormControl fullWidth>
                                                        <Autocomplete
                                                            value={blogs.find(b => b._id === blogId) || null}
                                                            onChange={(event, newValue) => {
                                                                setBlogId(newValue?._id || '')
                                                            }}
                                                            options={blogs}
                                                            filterOptions={blogFilterOptions}
                                                            getOptionLabel={(option) => option.title}
                                                            loading={loadingOptions}
                                                            loadingText="Yükleniyor..."
                                                            noOptionsText="Yayında blog yazısı yok"
                                                            renderInput={(params) => (
                                                                <TextField
                                                                    {...params}
                                                                    label="Blog Yazısı Seç"
                                                                    required
                                                                />
                                                            )}
                                                            disabled={loadingOptions}
                                                        />
                                                    </FormControl>
                                                </Grid>
                                            )}
                                            {/* Ürün Seçimi - Sadece menuType: product ise */}
                                            {menuType === 'product' && (
                                                <Grid size={{ xs: 12 }}>
                                                    <FormControl fullWidth>
                                                        <Autocomplete
                                                            value={products.find(p => p._id === productId) || null}
                                                            onChange={(event, newValue) => {
                                                                setProductId(newValue?._id || '')
                                                            }}
                                                            onInputChange={(event, newInput, reason) => {
                                                                if (reason === 'input') setProductQuery(newInput)
                                                            }}
                                                            options={products}
                                                            getOptionLabel={(option) => `${option.title}${option.sku ? ` (${option.sku})` : ''}`}
                                                            isOptionEqualToValue={(option, value) => option._id === value._id}
                                                            filterOptions={(x) => x}
                                                            loading={loadingProducts}
                                                            loadingText="Aranıyor..."
                                                            noOptionsText="Ürün adı veya stok kodu yazın"
                                                            renderInput={(params) => (
                                                                <TextField
                                                                    {...params}
                                                                    label="Ürün Seç"
                                                                    placeholder="Ürün adı veya stok kodu"
                                                                    required
                                                                />
                                                            )}
                                                        />
                                                    </FormControl>
                                                </Grid>
                                            )}
                                            {/* Etiket Seçimi - Sadece menuType: tag ise */}
                                            {menuType === 'tag' && (
                                                <Grid size={{ xs: 12 }}>
                                                    <FormControl fullWidth>
                                                        <Autocomplete
                                                            value={tags.find(t => t._id === tagId) || null}
                                                            onChange={(event, newValue) => {
                                                                setTagId(newValue?._id || '')
                                                            }}
                                                            onInputChange={(event, newInput, reason) => {
                                                                if (reason === 'input') setTagQuery(newInput)
                                                            }}
                                                            options={tags}
                                                            getOptionLabel={(option) => `${option.title}${option.productCount ? ` (${option.productCount} ürün)` : ''}`}
                                                            isOptionEqualToValue={(option, value) => option._id === value._id}
                                                            filterOptions={(x) => x}
                                                            loading={loadingTags}
                                                            loadingText="Aranıyor..."
                                                            noOptionsText="Etiket adı yazın"
                                                            renderInput={(params) => (
                                                                <TextField
                                                                    {...params}
                                                                    label="Etiket Seç"
                                                                    placeholder="Örn. 205-55-r16"
                                                                    required
                                                                />
                                                            )}
                                                        />
                                                    </FormControl>
                                                </Grid>
                                            )}
                                            {/* Marka Seçimi - Sadece menuType: brand ise */}
                                            {menuType === 'brand' && (
                                                <Grid size={{ xs: 12 }}>
                                                    <FormControl fullWidth>
                                                        <Autocomplete
                                                            value={brands.find(b => b._id === brandId) || null}
                                                            onChange={(event, newValue) => {
                                                                setBrandId(newValue?._id || '')
                                                            }}
                                                            onInputChange={(event, newInput, reason) => {
                                                                if (reason === 'input') setBrandQuery(newInput)
                                                            }}
                                                            options={brands}
                                                            getOptionLabel={(option) => option.title}
                                                            isOptionEqualToValue={(option, value) => option._id === value._id}
                                                            filterOptions={(x) => x}
                                                            loading={loadingBrands}
                                                            loadingText="Aranıyor..."
                                                            noOptionsText="Marka adı yazın"
                                                            renderInput={(params) => (
                                                                <TextField
                                                                    {...params}
                                                                    label="Marka Seç"
                                                                    placeholder="Örn. Michelin"
                                                                    required
                                                                />
                                                            )}
                                                        />
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
                                                        <MenuItem key="general" value='general'>Genel (Serbest)</MenuItem>
                                                        <MenuItem key="blog" value='blog'>Blog Menü</MenuItem>
                                                        <MenuItem key="ustlink" value='ustlink'>Üst Linkler</MenuItem>
                                                    </Select>
                                                </FormControl>
                                                {displayArea === 'ustlink' && (
                                                    <TextField
                                                        fullWidth
                                                        className='mt-4'
                                                        label='İkon (Remixicon)'
                                                        placeholder='ör. ri-truck-line'
                                                        value={icon}
                                                        onChange={(e) => setIcon(e.target.value)}
                                                    />
                                                )}
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

                                                {/* Parent Menü Seçimi - Sadece rowLevel: 2 ise */}
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
                                                                <em>{loadingOptions ? 'Yükleniyor...' : (parentMenus.length === 0 ? 'Üst menü bulunamadı' : 'Seçiniz')}</em>
                                                            </MenuItem>
                                                            {/* Menü grupları (gruplama kayıtları) üst öğe olarak listelenmez */}
                                                            {parentMenus
                                                                .filter(menu => !(menu.rowLevel === 1 && menu.menuType === 'heading'))
                                                                .map((menu) => (
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