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
import { fetchMenus, deleteMenu, createMenu, type MenuType } from '@/utils/api/menus'

const AREA_LABELS: Record<MenuType['displayArea'], string> = {
    header: 'Üst Menü (Header)',
    footer: 'Alt Menü (Footer)',
    mobile: 'Mobil Menü',
    general: 'Genel (Serbest)'
}

const MenuTable = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const menuParam = searchParams.get('menu')
    const [data, setData] = useState<MenuType[]>([])
    const [loading, setLoading] = useState(true)
    // Seçili menü (ana kayıt) — null ise menü listesi gösterilir
    const [selectedMenu, setSelectedMenu] = useState<MenuType | null>(null)
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [menuToDelete, setMenuToDelete] = useState<MenuType | null>(null)
    // Yeni menü oluşturma dialogu
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const [newMenuName, setNewMenuName] = useState('')
    const [newMenuArea, setNewMenuArea] = useState<MenuType['displayArea']>('header')
    const [saving, setSaving] = useState(false)

    // silent: yenilemede "Yükleniyor" ekranına geçilmez — açık dialog aniden
    // kaldırılırsa MUI'nin sayfa kilidi çözülmez ve ekran donar
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

    // ?menu=<id> ile gelindiğinde ilgili menünün detayını doğrudan aç
    // (öğe id'si verildiyse kök menüsüne kadar çıkılır)
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

    // Menüler: ana seviye kayıtlar (alan + sıra ile)
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

        // Dialog istekten ÖNCE kapatılır; açıkken ağaç yeniden çizilirse sayfa kilitli kalır
        const target = menuToDelete
        setDeleteConfirmOpen(false)
        setMenuToDelete(null)

        try {
            const result = await deleteMenu(target._id)
            if (result.success) {
                toast.success('Menü başarıyla silindi')
                // Liste yerinde güncellenir: yeniden yükleme/yönlendirme yok
                setData(prev => prev.filter(m => m._id !== target._id))
                if (selectedMenu && target._id === selectedMenu._id) setSelectedMenu(null)
            }
        } catch (error: any) {
            // Kullanımdaysa backend mesajı gösterilir (örn. "Bu menüye bağlı alt menüler var")
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

    // Üst bar öğeleri + hemen altında girintili açılır menü öğeleri
    const detailData = useMemo(
        () => selectedMenu
            ? childrenOf(selectedMenu._id).flatMap(item => [
                item,
                ...childrenOf(item._id).map(c => ({ ...c, __sub: true }) as MenuType)
            ])
            : [],
        [selectedMenu, childrenOf]
    )

    // Öğenin nereye yönlendirdiğini metne çevirir
    const linkTargetOf = (menu: MenuType) => {
        if (menu.menuType === 'link') return { label: 'Bağlantı', text: menu.linkData?.url || '-' }
        if (menu.menuType === 'category') {
            return { label: 'Kategori', text: (menu.linkData as any)?.categoryName || `Kategori ID: ${menu.linkData?.categoryId || '-'}` }
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
        return { label: 'Başlık', text: 'Sadece Başlık (Link Yok)' }
    }

    // Yalnızca ilk yüklemede tam ekran bekleme gösterilir
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

    // ÖN SAYFA: menü listesi
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

                {/* Yeni menü: sadece ad + alan; öğeler detaydan eklenir */}
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

    // DETAY: seçili menünün öğeleri
    return (
        <>
            <Card>
                <CardHeader
                    title={selectedMenu.name}
                    subheader={AREA_LABELS[selectedMenu.displayArea]}
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
                                <th>ID</th>
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
                                        <tr key={item._id}>
                                            <td><Typography variant='body2'>{index + 1}</Typography></td>
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
