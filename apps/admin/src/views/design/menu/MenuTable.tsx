'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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

import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import tableStyles from '@core/styles/table.module.css'
import { toast } from 'react-toastify'
import { fetchMenus, deleteMenu, type MenuType } from '@/utils/api/menus'

const columnHelper = createColumnHelper<MenuType>()

const MenuTable = () => {
    const router = useRouter()
    const [data, setData] = useState<MenuType[]>([])
    const [loading, setLoading] = useState(true)
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [menuToDelete, setMenuToDelete] = useState<MenuType | null>(null)

    const loadMenus = async () => {
        try {
            setLoading(true)
            const result = await fetchMenus()
            if (result.success) {
                const sortedData = sortMenusHierarchically(result.flatData || [])
                setData(sortedData)
            }
        } catch (error: any) {
            toast.error(error.message || 'Menüler yüklenemedi')
        } finally {
            setLoading(false)
        }
    }

    const sortMenusHierarchically = (menus: MenuType[]) => {
        const parentMenus = menus
            .filter(m => m.rowLevel === 1)
            .sort((a, b) => a.order - b.order)

        const result: MenuType[] = []
        parentMenus.forEach(parent => {
            result.push(parent)
            const children = menus
                .filter(m => {
                    const parentId = typeof m.parentId === 'string' ? m.parentId : m.parentId?._id
                    return m.rowLevel === 2 && parentId === parent._id
                })
                .sort((a, b) => a.order - b.order)

            result.push(...children)
        })
        const orphans = menus.filter(m => {
            if (m.rowLevel !== 2) return false
            const parentId = typeof m.parentId === 'string' ? m.parentId : m.parentId?._id
            return !parentMenus.find(p => p._id === parentId)
        })
        result.push(...orphans)

        return result
    }

    useEffect(() => {
        loadMenus()
    }, [])

    const handleDeleteClick = (menu: MenuType) => {
        setMenuToDelete(menu)
        setDeleteConfirmOpen(true)
    }

    const handleDeleteCancel = () => {
        setDeleteConfirmOpen(false)
        setMenuToDelete(null)
    }

    const handleDeleteConfirm = async () => {
        if (!menuToDelete) return

        try {
            const result = await deleteMenu(menuToDelete._id)
            if (result.success) {
                toast.success('Menü başarıyla silindi')
                loadMenus()
            }
        } catch (error: any) {
            toast.error(error.message || 'Menü silinemedi')
        } finally {
            setDeleteConfirmOpen(false)
            setMenuToDelete(null)
        }
    }
    const columns = [
        columnHelper.accessor('_id', {
            header: 'ID',
            cell: ({ row }) => <Typography variant='body2'>{row.index + 1}</Typography>
        }),
        columnHelper.accessor('name', {
            header: 'Menü Adı',
            cell: ({ row }) => (
                <div className='flex items-center gap-2'>
                    {row.original.rowLevel === 2 && (
                        <i className='ri-arrow-right-s-line text-gray-400' />
                    )}
                    <Typography className={row.original.rowLevel === 1 ? 'font-medium' : ''}>
                        {row.original.name}
                    </Typography>
                </div>
            )
        }),
        columnHelper.display({
            id: 'linkTarget',
            header: 'Yönlendirilecek Yer',
            cell: ({ row }) => {
                const menu = row.original
                let displayText = '-'
                let typeLabel = ''

                if (menu.menuType === 'link') {
                    typeLabel = 'Bağlantı'
                    displayText = menu.linkData?.url || '-'
                } else if (menu.menuType === 'category') {
                    typeLabel = 'Kategori'
                    displayText = menu.linkData?.categoryName || `Kategori ID: ${menu.linkData?.categoryId || '-'}`
                } else if (menu.menuType === 'page') {
                    typeLabel = 'Sayfa'
                    displayText = menu.linkData?.pageTitle || `Sayfa ID: ${menu.linkData?.pageId || '-'}`
                } else if (menu.menuType === 'heading') {
                    typeLabel = 'Başlık'
                    displayText = 'Sadece Başlık (Link Yok)'
                }

                return (
                    <div className='flex flex-col'>
                        <Typography className='font-medium'>
                            {typeLabel}
                        </Typography>
                        <div className='flex items-center'>
                            <Typography variant='body2' color='text.disabled'>
                                {displayText}
                            </Typography>
                            {(menu.menuType === 'link' || menu.menuType === 'category' || menu.menuType === 'page') && (
                                <Tooltip title="Sitede Görüntüle">
                                    <IconButton
                                        size='small'
                                        color='primary'
                                        onClick={() => {
                                            if (menu.menuType === 'link') {
                                                window.open(menu.linkData?.url, menu.openNewTab ? '_blank' : '_self')
                                            } else if (menu.menuType === 'category') {
                                                // Kategori URL'si
                                            } else if (menu.menuType === 'page') {
                                                // Sayfa URL'si
                                            }
                                        }}
                                    >
                                        <i className='ri-external-link-line' style={{ fontSize: '1rem' }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                )
            }
        }),
        columnHelper.accessor('order', {
            header: 'Sıra',
            cell: ({ row }) => (
                <Typography variant='body2'>
                    {row.original.order}
                </Typography>
            )
        }),
        columnHelper.accessor('isActive', {
            header: 'Durum',
            cell: ({ row }) => (
                <Chip
                    label={row.original.isActive ? 'Aktif' : 'Pasif'}
                    color={row.original.isActive ? 'success' : 'default'}
                    size="small"
                />
            )
        }),
        columnHelper.display({
            id: 'actions',
            header: 'İşlemler',
            cell: ({ row }) => (
                <div className='flex gap-2'>
                    <Tooltip title="Düzenle">
                        <IconButton
                            size='small'
                            onClick={() => router.push(`/tr/apps/design/menu/edit/${row.original._id}`)}
                        >
                            <i className='ri-edit-box-line text-textSecondary' />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Sil">
                        <IconButton
                            size='small'
                            onClick={() => handleDeleteClick(row.original)}
                        >
                            <i className='ri-delete-bin-line text-textSecondary' />
                        </IconButton>
                    </Tooltip>
                </div>
            )
        })
    ]

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel()
    })

    if (loading) {
        return (
            <Card>
                <CardHeader title='Menü Listesi' />
                <div className='p-6 text-center'>
                    <Typography>Yükleniyor...</Typography>
                </div>
            </Card>
        )
    }

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
                            onClick={() => router.push('/tr/apps/design/menu/add')}
                        >
                            Yeni Menü Ekle
                        </Button>
                    }
                />
                <div className='overflow-x-auto'>
                    <table className={tableStyles.table}>
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id}>
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className='text-center p-6'>
                                        <Typography>Henüz menü eklenmemiş</Typography>
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map(row => (
                                    <tr key={row.id}>
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
                <DialogTitle>Menüyü Sil</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <strong>"{menuToDelete?.name}"</strong> menüsünü silmek istediğinizden emin misiniz?
                        {menuToDelete?.rowLevel === 1 && (
                            <span style={{ display: 'block', marginTop: '8px', color: '#f44336' }}>
                                Bu ana menüye bağlı alt menüler varsa önce onları silmelisiniz.
                            </span>
                        )}
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