'use client'

import { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'

import { toast } from 'react-toastify'

import tableStyles from '@core/styles/table.module.css'

import {
    fetchBlogCategories,
    deleteBlogCategory,
    type BlogCategoryType
} from '@/utils/api/blogCategories'

const CategoryList = () => {
    const router = useRouter()
    const [rows, setRows] = useState<BlogCategoryType[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toDelete, setToDelete] = useState<BlogCategoryType | null>(null)

    const load = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetchBlogCategories()
            if (res?.success) {
                setRows(res.data || [])
            } else {
                setError(res?.message || 'Kategoriler alınamadı.')
            }
        } catch (e: any) {
            setError(e?.message || 'Kategoriler alınamadı.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const openAdd = () => {
        router.push('/tr/apps/blogs/categories/add')
    }

    const openEdit = (row: BlogCategoryType) => {
        router.push(`/tr/apps/blogs/categories/edit/${row._id}`)
    }

    const confirmDelete = async () => {
        if (!toDelete) return
        try {
            const res = await deleteBlogCategory(toDelete._id)
            if (res?.success) {
                toast.success('Kategori silindi.')
                setToDelete(null)
                load()
            } else {
                toast.error(res?.message || 'Kategori silinemedi.')
            }
        } catch (e: any) {
            toast.error(e?.message || 'Kategori silinemedi.')
        }
    }

    return (
        <>
            <Card>
                <div className='flex items-center justify-between flex-wrap gap-4 p-5'>
                    <Typography variant='h5'>Blog Kategorileri</Typography>
                    <div className='flex items-center gap-3'>
                        <Button
                            variant='outlined'
                            color='secondary'
                            startIcon={<i className='ri-arrow-left-line' />}
                            onClick={() => router.push('/tr/apps/blogs/list')}
                        >
                            Geri Dön
                        </Button>
                        <Button
                            variant='contained'
                            startIcon={<i className='ri-add-line' />}
                            onClick={openAdd}
                        >
                            Yeni Kategori Ekle
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className='flex justify-center p-10'>
                        <CircularProgress />
                    </div>
                ) : error ? (
                    <div className='p-5 text-center'>
                        <Typography color='error'>{error}</Typography>
                        <Button onClick={load} sx={{ mt: 2 }}>Tekrar Dene</Button>
                    </div>
                ) : (
                    <div className='overflow-x-auto'>
                        <table className={tableStyles.table}>
                            <thead>
                                <tr>
                                    <th>Sıra</th>
                                    <th>Ad</th>
                                    <th>URL (slug)</th>
                                    <th>Açıklama</th>
                                    <th>Durum</th>
                                    <th>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className='text-center p-6'>
                                            <Typography color='text.secondary'>Henüz kategori eklenmemiş.</Typography>
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map(row => (
                                        <tr key={row._id}>
                                            <td>{row.order}</td>
                                            <td>
                                                <Typography variant='body2' className='font-medium'>{row.name}</Typography>
                                            </td>
                                            <td>
                                                <Typography variant='body2' color='text.secondary'>{row.slug}</Typography>
                                            </td>
                                            <td>
                                                <Typography variant='body2' color='text.secondary'>
                                                    {row.description
                                                        ? row.description.length > 60
                                                            ? row.description.slice(0, 60) + '…'
                                                            : row.description
                                                        : '—'}
                                                </Typography>
                                            </td>
                                            <td>
                                                <Chip
                                                    size='small'
                                                    variant='tonal'
                                                    color={row.status === 'active' ? 'success' : 'secondary'}
                                                    label={row.status === 'active' ? 'Aktif' : 'Pasif'}
                                                />
                                            </td>
                                            <td>
                                                <div className='flex items-center'>
                                                    <Tooltip title='Düzenle'>
                                                        <IconButton size='small' onClick={() => openEdit(row)}>
                                                            <i className='ri-edit-box-line text-textSecondary' />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title='Sil'>
                                                        <IconButton size='small' onClick={() => setToDelete(row)}>
                                                            <i className='ri-delete-bin-7-line text-textSecondary' />
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
                )}
            </Card>

            <Dialog open={Boolean(toDelete)} onClose={() => setToDelete(null)}>
                <DialogTitle>Kategoriyi sil</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <strong>{toDelete?.name}</strong> kategorisini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setToDelete(null)} color='secondary'>Vazgeç</Button>
                    <Button onClick={confirmDelete} color='error' variant='contained'>Sil</Button>
                </DialogActions>
            </Dialog>
        </>
    )
}

export default CategoryList
