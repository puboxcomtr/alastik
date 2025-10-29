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
import { fetchBanners, deleteBanner, type BannerType } from '@/utils/api/banners'

const columnHelper = createColumnHelper<BannerType>()

const BannerTable = () => {
    const router = useRouter()
    const [data, setData] = useState<BannerType[]>([])
    const [loading, setLoading] = useState(true)
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [bannerToDelete, setBannerToDelete] = useState<BannerType | null>(null)

    const loadBanners = async () => {
        try {
            setLoading(true)
            const result = await fetchBanners()
            if (result.success) {
                setData(result.data)
            }
        } catch (error: any) {
            toast.error(error.message || 'Bannerlar yüklenemedi')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadBanners()
    }, [])

    const handleDeleteClick = (banner: BannerType) => {
        setBannerToDelete(banner)
        setDeleteConfirmOpen(true)
    }

    const handleDeleteCancel = () => {
        setDeleteConfirmOpen(false)
        setBannerToDelete(null)
    }

    const handleDeleteConfirm = async () => {
        if (!bannerToDelete) return

        try {
            const result = await deleteBanner(bannerToDelete._id)
            if (result.success) {
                toast.success('Banner başarıyla silindi')
                loadBanners()
            }
        } catch (error: any) {
            toast.error(error.message || 'Banner silinemedi')
        } finally {
            setDeleteConfirmOpen(false)
            setBannerToDelete(null)
        }
    }

    const columns = [
        columnHelper.accessor('_id', {
            header: 'ID',
            cell: ({ row }) => <Typography variant='body2'>#{row.index + 1}</Typography>
        }),
        columnHelper.accessor('image', {
            header: 'Görsel',
            cell: ({ row }) => {
                const bannerImage = row.original.image
                const fullUrl = `http://localhost:3082${bannerImage}`
                console.log('Banner URL:', fullUrl) // ← Konsola yazdır
                return (
                    <img
                        src={fullUrl}
                        alt={row.original.altTag || row.original.description}
                        className='w-20 h-12 object-cover rounded'
                    />
                )
            }
        }),
        columnHelper.accessor('variableKey', {
            header: 'Değişken Adı',
            cell: ({ row }) => (
                <Chip
                    label={`${`{{ ${row.original.variableKey} }}`}`}
                    size='small'
                    variant='outlined'
                />
            )
        }),
        columnHelper.accessor('order', {
            header: 'Sıra',
            cell: ({ row }) => <Typography variant='body2'>{row.original.order}</Typography>
        }),
        columnHelper.accessor('createdAt', {
            header: 'Eklenme',
            cell: ({ row }) => (
                <Typography variant='body2'>
                    {new Date(row.original.createdAt).toLocaleDateString('tr-TR')}
                </Typography>
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
                            onClick={() => router.push(`/tr/apps/design/banner/edit/${row.original._id}`)}
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
                <CardHeader title='Banner Listesi' />
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
                    title='Banner Listesi'
                    className='pbe-4'
                    action={
                        <Button
                            color='primary'
                            variant='contained'
                            startIcon={<i className='ri-add-line' />}
                            onClick={() => router.push('/tr/apps/design/banner/add')}
                        >
                            Yeni Banner Ekle
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
                                        <Typography>Henüz banner eklenmemiş</Typography>
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
                <DialogTitle>Banner Sil</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <strong>"{bannerToDelete?.description}"</strong> banner'ını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
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

export default BannerTable