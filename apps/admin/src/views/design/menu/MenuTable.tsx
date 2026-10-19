'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import CardHeader from '@mui/material/CardHeader'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

import tableStyles from '@core/styles/table.module.css'
import { toast } from 'react-toastify'
import Autocomplete from '@mui/material/Autocomplete'

import {
    fetchMenus,
    deleteMenu,
    createMenu,
    updateMenu,
    updateMenuOrder,
    fetchCategories,
    fetchTags,
    fetchBrands,
    type MenuType,
    type CategoryOptionType,
    type TagOptionType,
    type BrandOptionType
} from '@/utils/api/menus'

const TITLE_LINK_TYPES: { value: MenuType['menuType']; label: string }[] = [
    { value: 'heading', label: 'Bağlantı yok (sadece başlık)' },
    { value: 'link', label: 'Bağlantı (URL)' },
    { value: 'category', label: 'Ürün Kategori' },
    { value: 'blogCategory', label: 'Blog Kategori' },
    { value: 'tag', label: 'Etiket' },
    { value: 'brand', label: 'Marka' }
]

const AREA_LABELS: Record<MenuType['displayArea'], string> = {
    header: 'Üst Menü (Header)',
    footer: 'Alt Menü (Footer)',
    mobile: 'Mobil Menü',
    general: 'Genel (Serbest)',
    blog: 'Blog Menü',
    ustlink: 'Üst Linkler'
}

const MenuTable = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const menuParam = searchParams.get('menu')
    const [data, setData] = useState<MenuType[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedMenu, setSelectedMenu] = useState<MenuType | null>(null)
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [menuToDelete, setMenuToDelete] = useState<MenuType | null>(null)
    const [suruklenen, setSuruklenen] = useState<string | null>(null)
    const [uzerinde, setUzerinde] = useState<string | null>(null)
    const [siraKaydediliyor, setSiraKaydediliyor] = useState(false)

    const [addDialogOpen, setAddDialogOpen] = useState(false)

    const [titleMenu, setTitleMenu] = useState<MenuType | null>(null)
    const [titleName, setTitleName] = useState('')
    const [titleArea, setTitleArea] = useState<MenuType['displayArea']>('header')
    const [titleType, setTitleType] = useState<MenuType['menuType']>('heading')
    const [titleUrl, setTitleUrl] = useState('')
    const [titleTargetId, setTitleTargetId] = useState('')
    const [titleCategories, setTitleCategories] = useState<CategoryOptionType[]>([])
    const [titleTags, setTitleTags] = useState<TagOptionType[]>([])
    const [titleBrands, setTitleBrands] = useState<BrandOptionType[]>([])
    const [titleQuery, setTitleQuery] = useState('')
    const [titleSaving, setTitleSaving] = useState(false)
    const [newMenuName, setNewMenuName] = useState('')
    const [newMenuArea, setNewMenuArea] = useState<MenuType['displayArea']>('header')
    const [saving, setSaving] = useState(false)

    const loadMenus = async (silent = false) => {
        try {
            if (!silent) setLoading(true)
            const result = await fetchMenus()
            if (result.success) {
                setData(result.flatData || [])
            }
        } catch (error: any) {
            toast.error(error.message || 'Menüler yüklenemedi')
        } finally {
            if (!silent) setLoading(false)
        }
    }

    useEffect(() => {
        loadMenus()
    }, [])

    useEffect(() => {
        if (loading || !menuParam || data.length === 0) return
        let node = data.find(m => m._id === menuParam)
        let guard = 0
        while (node && node.rowLevel > 1 && guard < 5) {
            const pid = typeof node.parentId === 'string' ? node.parentId : (node.parentId as any)?._id
            node = data.find(m => m._id === pid)
            guard++
        }
        if (node) setSelectedMenu(node)
    }, [loading, data, menuParam])

    const parentMenus = useMemo(
        () => data
            .filter(m => m.rowLevel === 1)
            .sort((a, b) => a.displayArea.localeCompare(b.displayArea) || a.order - b.order),
        [data]
    )

    const childrenOf = useCallback(
        (parentMenuId: string) =>
            data
                .filter(m => {
                    const parentId = typeof m.parentId === 'string' ? m.parentId : (m.parentId as any)?._id
                    return parentId === parentMenuId
                })
                .sort((a, b) => a.order - b.order),
        [data]
    )

    const handleDeleteClick = useCallback((menu: MenuType) => {
        setMenuToDelete(menu)
        setDeleteConfirmOpen(true)
    }, [])

    const handleDeleteCancel = () => {
        setDeleteConfirmOpen(false)
        setMenuToDelete(null)
    }

    const handleDeleteConfirm = async () => {
        if (!menuToDelete) return

        const target = menuToDelete
        setDeleteConfirmOpen(false)
        setMenuToDelete(null)

        try {
            const result = await deleteMenu(target._id)
            if (result.success) {
                toast.success('Menü başarıyla silindi')
                setData(prev => prev.filter(m => m._id !== target._id))
                if (selectedMenu && target._id === selectedMenu._id) setSelectedMenu(null)
            }
        } catch (error: any) {
            toast.error(error.message || 'Menü silinemedi')
        }
    }

    const handleCreateMenu = async () => {
        if (!newMenuName.trim()) {
            toast.error('Menü adı zorunludur')
            return
        }

        try {
            setSaving(true)
            const areaParents = data.filter(m => m.rowLevel === 1 && m.displayArea === newMenuArea)
            const nextOrder = areaParents.length > 0 ? Math.max(...areaParents.map(m => m.order)) + 1 : 1

            const result = await createMenu({
                name: newMenuName.trim(),
                menuType: 'heading',
                linkData: {},
                openNewTab: false,
                displayArea: newMenuArea,
                rowLevel: 1,
                order: nextOrder,
                isActive: true
            })

            if (result.success) {
                toast.success('Menü oluşturuldu. Detayına girip öğe ekleyebilirsiniz.')
                setAddDialogOpen(false)
                setNewMenuName('')
                await loadMenus(true)
            }
        } catch (error: any) {
            toast.error(error.message || 'Menü oluşturulamadı')
        } finally {
            setSaving(false)
        }
    }

    const detailData = useMemo(
        () => selectedMenu
            ? childrenOf(selectedMenu._id).flatMap(item => [
                item,
                ...childrenOf(item._id).map(c => ({ ...c, __sub: true }) as MenuType)
            ])
            : [],
        [selectedMenu, childrenOf]
    )

    const birakildi = async (hedefId: string) => {
        const kaynakId = suruklenen
        setSuruklenen(null)
        setUzerinde(null)
        if (!kaynakId || kaynakId === hedefId || !selectedMenu) return

        const ustId = (m: MenuType) => (typeof m.parentId === 'string' ? m.parentId : (m.parentId as any)?._id)
        const kaynak = data.find(m => m._id === kaynakId)
        const hedef = data.find(m => m._id === hedefId)
        if (!kaynak || !hedef || ustId(kaynak) !== ustId(hedef)) {
            toast.info('Öğeler yalnızca kendi menüsü içinde sıralanabilir')
            return
        }

        const kardesler = childrenOf(ustId(kaynak) as string)
        const yeni = kardesler.filter(m => m._id !== kaynakId)
        const hedefIndex = yeni.findIndex(m => m._id === hedefId)
        yeni.splice(hedefIndex, 0, kaynak)

        const guncel = yeni.map((m, i) => ({ id: m._id, order: i + 1 }))

        setData(prev => prev.map(m => {
            const bulunan = guncel.find(g => g.id === m._id)
            return bulunan ? { ...m, order: bulunan.order } : m
        }))

        try {
            setSiraKaydediliyor(true)
            await updateMenuOrder(guncel)
            toast.success('Sıralama kaydedildi')
        } catch (error: any) {
            toast.error(error.message || 'Sıralama kaydedilemedi')
            loadMenus(true)
        } finally {
            setSiraKaydediliyor(false)
        }
    }

    const openTitleDialog = (menu: MenuType) => {
        setTitleMenu(menu)
        setTitleName(menu.name)
        setTitleArea(menu.displayArea)
        setTitleType(menu.menuType || 'heading')
        setTitleUrl(menu.linkData?.url || '')
        setTitleTargetId(
            menu.linkData?.categoryId || menu.linkData?.tagId || menu.linkData?.brandId || ''
        )
        setTitleQuery('')

        const link = menu.linkData as any

        if (menu.menuType === 'category' && link?.categoryId) {
            setTitleCategories([{ _id: link.categoryId, name: link.categoryName || link.categoryId, categoryLevel: 1 }])
        }

        if (menu.menuType === 'tag' && link?.tagId) {
            setTitleTags([{ _id: link.tagId, title: link.tagTitle || link.tagId, slug: link.tagUrl || '', productCount: 0 }])
        }

        if (menu.menuType === 'brand' && link?.brandId) {
            setTitleBrands([{ _id: link.brandId, title: link.brandTitle || link.brandId, slug: link.brandUrl || '', productCount: 0 }])
        }
    }

    useEffect(() => {
        if (!titleMenu) return

        const timer = setTimeout(async () => {
            try {
                if (titleType === 'category') {
                    const result = await fetchCategories()

                    if (result.success) setTitleCategories(result.data)
                } else if (titleType === 'tag') {
                    const result = await fetchTags(titleQuery)

                    if (result.success) setTitleTags(result.data)
                } else if (titleType === 'brand') {
                    const result = await fetchBrands(titleQuery)

                    if (result.success) setTitleBrands(result.data)
                }
            } catch (error: any) {
                console.error('Seçenek yükleme hatası:', error)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [titleMenu, titleType, titleQuery])

    const handleTitleSave = async () => {
        if (!titleMenu) return

        if (!titleName.trim()) {
            toast.error('Menü adı boş olamaz')

            return
        }

        const linkData: Record<string, string> = {}

        if (titleType === 'link') linkData.url = titleUrl.trim()
        if (titleType === 'category') linkData.categoryId = titleTargetId
        if (titleType === 'tag') linkData.tagId = titleTargetId
        if (titleType === 'brand') linkData.brandId = titleTargetId

        if (titleType !== 'heading' && !Object.values(linkData).some(Boolean)) {
            toast.error('Bağlantı hedefi seçilmedi')

            return
        }

        try {
            setTitleSaving(true)

            await updateMenu(titleMenu._id, {
                name: titleName.trim(),
                menuType: titleType,
                linkData,
                displayArea: titleArea,
                rowLevel: titleMenu.rowLevel,
                parentId: titleMenu.parentId || null,
                order: titleMenu.order,
                isActive: titleMenu.isActive
            } as any)

            toast.success('Ana başlık güncellendi')
            setTitleMenu(null)
            await loadMenus()
        } catch (error: any) {
            toast.error(error.message || 'Güncellenemedi')
        } finally {
            setTitleSaving(false)
        }
    }

    const linkTargetOf = (menu: MenuType) => {
        if (menu.menuType === 'link') return { label: 'Bağlantı', text: menu.linkData?.url || '-' }
        if (menu.menuType === 'category') {
            return { label: 'Ürün Kategori', text: (menu.linkData as any)?.categoryName || `Kategori ID: ${menu.linkData?.categoryId || '-'}` }
        }
        if (menu.menuType === 'blogCategory') {
            return { label: 'Blog Kategori', text: (menu.linkData as any)?.blogCategoryName || `Blog Kategori ID: ${(menu.linkData as any)?.blogCategoryId || '-'}` }
        }
        if (menu.menuType === 'page') {
            return { label: 'Sayfa', text: (menu.linkData as any)?.pageTitle || `Sayfa ID: ${menu.linkData?.pageId || '-'}` }
        }
        if (menu.menuType === 'product') {
            return { label: 'Ürün', text: (menu.linkData as any)?.productTitle || `Ürün: ${(menu.linkData as any)?.productId || '-'}` }
        }
        if (menu.menuType === 'blog') {
            return { label: 'Blog', text: (menu.linkData as any)?.blogTitle || `Blog ID: ${(menu.linkData as any)?.blogId || '-'}` }
        }
        if (menu.menuType === 'tag') {
            return { label: 'Etiket', text: (menu.linkData as any)?.tagTitle || `Etiket ID: ${(menu.linkData as any)?.tagId || '-'}` }
        }
        if (menu.menuType === 'brand') {
            return { label: 'Marka', text: (menu.linkData as any)?.brandTitle || `Marka ID: ${(menu.linkData as any)?.brandId || '-'}` }
        }

        return { label: 'Başlık', text: 'Sadece Başlık (Link Yok)' }
    }

    if (loading && data.length === 0) {
        return (
            <Card>
                <CardHeader title='Menü Listesi' />
                <div className='p-6 text-center'>
                    <Typography>Yükleniyor...</Typography>
                </div>
            </Card>
        )
    }

    if (!selectedMenu) {
        return (
            <>
                <Card>
                    <CardHeader
                        title='Menü Listesi'
                        className='pbe-4'
                        action={
                            <Button
                                color='primary'
                                variant='contained'
                                startIcon={<i className='ri-add-line' />}
                                onClick={() => setAddDialogOpen(true)}
                            >
                                Yeni Menü Ekle
                            </Button>
                        }
                    />
                    <div className='overflow-x-auto'>
                        <table className={tableStyles.table}>
                            <thead>
                                <tr>
                                    <th>Menü Adı</th>
                                    <th>Görüntüleme Alanı</th>
                                    <th>Öğe Sayısı</th>
                                    <th>Durum</th>
                                    <th>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parentMenus.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className='text-center p-6'>
                                            <Typography>Henüz menü eklenmemiş</Typography>
                                        </td>
                                    </tr>
                                ) : (
                                    parentMenus.map(menu => (
                                        <tr
                                            key={menu._id}
                                            onClick={() => setSelectedMenu(menu)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td>
                                                <Typography variant='body2' fontWeight='bold'>{menu.name}</Typography>
                                            </td>
                                            <td>
                                                <Typography variant='body2'>{AREA_LABELS[menu.displayArea]}</Typography>
                                            </td>
                                            <td>
                                                <Typography variant='body2'>{childrenOf(menu._id).length} Adet</Typography>
                                            </td>
                                            <td>
                                                <Chip
                                                    label={menu.isActive ? 'Aktif' : 'Pasif'}
                                                    color={menu.isActive ? 'success' : 'default'}
                                                    size='small'
                                                />
                                            </td>
                                            <td>
                                                <div className='flex gap-2'>
                                                    <Tooltip title='Menü Detayı'>
                                                        <IconButton
                                                            size='small'
                                                            onClick={e => {
                                                                e.stopPropagation()
                                                                setSelectedMenu(menu)
                                                            }}
                                                        >
                                                            <i className='ri-edit-box-line text-textSecondary' />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title='Ana Başlığı Düzenle'>
                                                        <IconButton
                                                            size='small'
                                                            onClick={e => {
                                                                e.stopPropagation()
                                                                openTitleDialog(menu)
                                                            }}
                                                        >
                                                            <i className='ri-links-line text-textSecondary' />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title='Sil'>
                                                        <IconButton
                                                            size='small'
                                                            onClick={e => {
                                                                e.stopPropagation()
                                                                handleDeleteClick(menu)
                                                            }}
                                                        >
                                                            <i className='ri-delete-bin-line text-textSecondary' />
                                                        </IconButton>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Dialog open={Boolean(titleMenu)} onClose={() => setTitleMenu(null)} fullWidth maxWidth='sm'>
                    <DialogTitle>Ana Başlığı Düzenle</DialogTitle>
                    <DialogContent>
                        <div className='flex flex-col gap-4 pt-2'>
                            <TextField
                                fullWidth
                                label='Menü Adı'
                                value={titleName}
                                onChange={e => setTitleName(e.target.value)}
                                autoFocus
                            />

                            <FormControl fullWidth>
                                <InputLabel>Görüntülenme Alanı</InputLabel>
                                <Select
                                    label='Görüntülenme Alanı'
                                    value={titleArea}
                                    onChange={e => setTitleArea(e.target.value as MenuType['displayArea'])}
                                >
                                    {Object.entries(AREA_LABELS).map(([key, label]) => (
                                        <MenuItem key={key} value={key}>{label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth>
                                <InputLabel>Başlık Bağlantısı</InputLabel>
                                <Select
                                    label='Başlık Bağlantısı'
                                    value={titleType}
                                    onChange={e => {
                                        setTitleType(e.target.value as MenuType['menuType'])
                                        setTitleTargetId('')
                                        setTitleUrl('')
                                    }}
                                >
                                    {TITLE_LINK_TYPES.map(t => (
                                        <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {titleType === 'link' && (
                                <TextField
                                    fullWidth
                                    label='Bağlantı Adresi'
                                    placeholder='/kategori/lastik-tamir-hizmetleri'
                                    value={titleUrl}
                                    onChange={e => setTitleUrl(e.target.value)}
                                />
                            )}

                            {titleType === 'category' && (
                                <Autocomplete
                                    value={titleCategories.find(c => c._id === titleTargetId) || null}
                                    onChange={(event, newValue) => setTitleTargetId(newValue?._id || '')}
                                    options={titleCategories}
                                    getOptionLabel={option => option.name}
                                    isOptionEqualToValue={(option, value) => option._id === value._id}
                                    noOptionsText='Kategori bulunamadı'
                                    renderInput={params => <TextField {...params} label='Kategori Seç' />}
                                />
                            )}

                            {titleType === 'tag' && (
                                <Autocomplete
                                    value={titleTags.find(t => t._id === titleTargetId) || null}
                                    onChange={(event, newValue) => setTitleTargetId(newValue?._id || '')}
                                    onInputChange={(event, newInput, reason) => {
                                        if (reason === 'input') setTitleQuery(newInput)
                                    }}
                                    options={titleTags}
                                    getOptionLabel={option => option.title}
                                    isOptionEqualToValue={(option, value) => option._id === value._id}
                                    filterOptions={x => x}
                                    noOptionsText='Etiket adı yazın'
                                    renderInput={params => <TextField {...params} label='Etiket Seç' />}
                                />
                            )}

                            {titleType === 'brand' && (
                                <Autocomplete
                                    value={titleBrands.find(b => b._id === titleTargetId) || null}
                                    onChange={(event, newValue) => setTitleTargetId(newValue?._id || '')}
                                    onInputChange={(event, newInput, reason) => {
                                        if (reason === 'input') setTitleQuery(newInput)
                                    }}
                                    options={titleBrands}
                                    getOptionLabel={option => option.title}
                                    isOptionEqualToValue={(option, value) => option._id === value._id}
                                    filterOptions={x => x}
                                    noOptionsText='Marka adı yazın'
                                    renderInput={params => <TextField {...params} label='Marka Seç' />}
                                />
                            )}
                        </div>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setTitleMenu(null)} color='secondary'>İptal</Button>
                        <Button onClick={handleTitleSave} variant='contained' disabled={titleSaving}>
                            {titleSaving ? 'Kaydediliyor...' : 'Kaydet'}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} fullWidth maxWidth='xs'>
                    <DialogTitle>Yeni Menü Ekle</DialogTitle>
                    <DialogContent>
                        <div className='flex flex-col gap-4 pt-2'>
                            <TextField
                                fullWidth
                                label='Menü Adı'
                                value={newMenuName}
                                onChange={e => setNewMenuName(e.target.value)}
                                autoFocus
                            />
                            <FormControl fullWidth>
                                <InputLabel>Görüntüleme Alanı</InputLabel>
                                <Select
                                    label='Görüntüleme Alanı'
                                    value={newMenuArea}
                                    onChange={e => setNewMenuArea(e.target.value as MenuType['displayArea'])}
                                >
                                    {Object.entries(AREA_LABELS).map(([key, label]) => (
                                        <MenuItem key={key} value={key}>{label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </div>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setAddDialogOpen(false)} color='secondary'>
                            İptal
                        </Button>
                        <Button onClick={handleCreateMenu} variant='contained' disabled={saving}>
                            {saving ? 'Kaydediliyor...' : 'Oluştur'}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
                    <DialogTitle>Menüyü Sil</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            <strong>&quot;{menuToDelete?.name}&quot;</strong> menüsünü silmek istediğinizden emin misiniz?
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleDeleteCancel} color='secondary'>
                            İptal
                        </Button>
                        <Button onClick={handleDeleteConfirm} color='error' variant='contained'>
                            Sil
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        )
    }

    return (
        <>
            <Card>
                <CardHeader
                    title={selectedMenu.name}
                    subheader={siraKaydediliyor ? 'Sıralama kaydediliyor...' : `${AREA_LABELS[selectedMenu.displayArea]} — satırları sürükleyerek sıralayabilirsiniz`}
                    className='pbe-4'
                    action={
                        <div className='flex gap-2'>
                            <Button
                                color='secondary'
                                variant='outlined'
                                startIcon={<i className='ri-arrow-left-line' />}
                                onClick={() => {
                                    setSelectedMenu(null)
                                    router.replace('/tr/apps/design/menu')
                                }}
                            >
                                Menülere Dön
                            </Button>
                            <Button
                                color='primary'
                                variant='contained'
                                startIcon={<i className='ri-add-line' />}
                                onClick={() => router.push(`/tr/apps/design/menu/add?parentId=${selectedMenu._id}&displayArea=${selectedMenu.displayArea}`)}
                            >
                                Öğe Ekle
                            </Button>
                        </div>
                    }
                />
                <div className='overflow-x-auto'>
                    <table className={tableStyles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: 48 }}></th>
                                <th>Öğe Adı</th>
                                <th>Yönlendirilecek Yer</th>
                                <th>Sıra</th>
                                <th>Durum</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detailData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className='text-center p-6'>
                                        <Typography>Bu menüye henüz öğe eklenmemiş</Typography>
                                    </td>
                                </tr>
                            ) : (
                                detailData.map((item, index) => {
                                    const target = linkTargetOf(item)
                                    const isSub = (item as any).__sub

                                    return (
                                        <tr
                                            key={item._id}
                                            draggable
                                            onDragStart={() => setSuruklenen(item._id)}
                                            onDragOver={e => { e.preventDefault(); if (uzerinde !== item._id) setUzerinde(item._id) }}
                                            onDragLeave={() => setUzerinde(prev => (prev === item._id ? null : prev))}
                                            onDrop={() => birakildi(item._id)}
                                            onDragEnd={() => { setSuruklenen(null); setUzerinde(null) }}
                                            style={{
                                                opacity: suruklenen === item._id ? 0.35 : 1,
                                                cursor: suruklenen ? 'grabbing' : 'grab',
                                                backgroundColor: uzerinde === item._id && suruklenen && suruklenen !== item._id
                                                    ? 'var(--mui-palette-action-hover)'
                                                    : undefined,
                                                boxShadow: uzerinde === item._id && suruklenen && suruklenen !== item._id
                                                    ? 'inset 0 3px 0 0 var(--mui-palette-primary-main)'
                                                    : undefined,
                                                transition: 'background-color .15s ease, opacity .15s ease'
                                            }}
                                        >
                                            <td>
                                                <Tooltip title='Sıralamak için sürükleyin'>
                                                    <i className='ri-drag-move-2-line text-textSecondary' style={{ fontSize: '1.15rem' }} />
                                                </Tooltip>
                                            </td>
                                            <td>
                                                <div className='flex items-center gap-2'>
                                                    {isSub && <i className='ri-arrow-right-s-line text-gray-400' />}
                                                    <Typography className={isSub ? '' : 'font-medium'}>{item.name}</Typography>
                                                </div>
                                            </td>
                                            <td>
                                                <div className='flex flex-col'>
                                                    <Typography className='font-medium'>{target.label}</Typography>
                                                    <Typography variant='body2' color='text.disabled'>{target.text}</Typography>
                                                </div>
                                            </td>
                                            <td><Typography variant='body2'>{item.order}</Typography></td>
                                            <td>
                                                <Chip
                                                    label={item.isActive ? 'Aktif' : 'Pasif'}
                                                    color={item.isActive ? 'success' : 'default'}
                                                    size='small'
                                                />
                                            </td>
                                            <td>
                                                <div className='flex gap-2'>
                                                    <Tooltip title='Düzenle'>
                                                        <IconButton
                                                            size='small'
                                                            onClick={() => router.push(`/tr/apps/design/menu/edit/${item._id}`)}
                                                        >
                                                            <i className='ri-edit-box-line text-textSecondary' />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title='Sil'>
                                                        <IconButton
                                                            size='small'
                                                            onClick={() => handleDeleteClick(item)}
                                                        >
                                                            <i className='ri-delete-bin-line text-textSecondary' />
                                                        </IconButton>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
                <DialogTitle>Öğeyi Sil</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <strong>&quot;{menuToDelete?.name}&quot;</strong> öğesini silmek istediğinizden emin misiniz?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel} color='secondary'>
                        İptal
                    </Button>
                    <Button onClick={handleDeleteConfirm} color='error' variant='contained'>
                        Sil
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}

export default MenuTable
