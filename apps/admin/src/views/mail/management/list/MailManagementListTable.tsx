'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useParams } from 'next/navigation'

// MUI Imports
import Tooltip from '@mui/material/Tooltip'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

// Third-party Imports
import classnames from 'classnames'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'react-toastify'

// API Imports
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

type MailTemplateType = {
    id: string
    title: string
    lastSentAt: string | null
}

const columnHelper = createColumnHelper<MailTemplateType>()

const MailManagementListTable = () => {
    const [data, setData] = useState<MailTemplateType[]>([])
    const [loading, setLoading] = useState(true)

    // Pagination state
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(50)
    const [totalCount, setTotalCount] = useState(0)

    // Delete confirm state
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<MailTemplateType | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Hooks
    const { lang: locale } = useParams()

    useEffect(() => {
        const fetchTemplates = async () => {
            setLoading(true)
            try {
                const params = new URLSearchParams()
                params.set('page', String(page))
                params.set('limit', String(limit))

                const response = await fetchAPI(
                    `${API_ENDPOINTS.mailManagement.list()}?${params.toString()}`,
                    { cache: 'no-store' }
                )

                const templates = (response.data || []).map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    lastSentAt: item.lastSentAt
                }))

                setData(templates)
                setTotalCount(response.meta?.total || 0)
            } catch (error) {
                console.error('Mail templates fetch error:', error)
                toast.error('Mail şablonları yüklenirken hata oluştu')
            } finally {
                setLoading(false)
            }
        }

        fetchTemplates()
    }, [page, limit])

    const handleDeleteClick = (item: MailTemplateType) => {
        setItemToDelete(item)
        setDeleteConfirmOpen(true)
    }

    const handleDeleteCancel = () => {
        if (deleting) return
        setDeleteConfirmOpen(false)
        setItemToDelete(null)
    }

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return

        setDeleting(true)

        try {
            const res = await fetchAPI(API_ENDPOINTS.mailManagement.delete(itemToDelete.id), {
                method: 'DELETE'
            })

            if (res.success) {
                toast.success(`"${itemToDelete.title}" mail şablonu silindi`)
                setData(prev => prev.filter(item => item.id !== itemToDelete.id))
                setTotalCount(prev => prev - 1)
                setDeleteConfirmOpen(false)
                setItemToDelete(null)
            } else {
                toast.error(res.message || 'Silme başarısız')
            }
        } catch {
            toast.error('Silme sırasında hata oluştu')
        } finally {
            setDeleting(false)
        }
    }

    const formatDate = (date: string | null) => {
        if (!date) return 'Henüz gönderilmedi'

        return new Date(date).toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const columns = useMemo<ColumnDef<MailTemplateType, any>[]>(
        () => [
            columnHelper.accessor('title', {
                header: 'Mail Başlığı',
                cell: ({ row }) => (
                    <Typography variant='body2'>{row.original.title}</Typography>
                )
            }),
            columnHelper.accessor('lastSentAt', {
                header: 'Son Gönderim Tarihi',
                cell: ({ row }) => (
                    <Typography variant='body2' color='text.secondary'>
                        {formatDate(row.original.lastSentAt)}
                    </Typography>
                )
            }),
            {
                id: 'actions',
                header: 'İşlemler',
                cell: ({ row }) => (
                    <div className='flex items-center gap-2'>
                        <Tooltip title='Düzenle'>
                            <Link href={`/${locale}/apps/mail/management/edit/${row.original.id}`}>
                                <IconButton size='small'>
                                    <i className='ri-edit-box-line'></i>
                                </IconButton>
                            </Link>
                        </Tooltip>
                        <Tooltip title='Sil'>
                            <IconButton size='small' onClick={() => handleDeleteClick(row.original)}>
                                <i className='ri-delete-bin-line text-[22px] text-textSecondary'></i>
                            </IconButton>
                        </Tooltip>
                    </div>
                ),
                enableSorting: false
            }
        ],
        [locale]
    )

    const table = useReactTable({
        data,
        columns,
        pageCount: Math.ceil(totalCount / limit),
        manualPagination: true,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel()
    })

    return (
        <Card>
            <CardHeader
                title='Mail Yönetimi'
                action={
                    <Button
                        color='primary'
                        variant='contained'
                        component={Link}
                        href={`/${locale}/apps/mail/management/add`}
                    >
                        Yeni Mail Şablonu
                    </Button>
                }
            />
            <Divider />
            <div style={{ position: 'relative' }}>
                {loading && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(255,255,255,0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            minHeight: '200px'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <CircularProgress size={24} />
                            <Typography>Mail şablonları yükleniyor...</Typography>
                        </div>
                    </div>
                )}

                <div className='overflow-x-auto'>
                    <table className={tableStyles.table}>
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id}>
                                            {header.isPlaceholder ? null : (
                                                <div
                                                    className={classnames({
                                                        'flex items-center': header.column.getIsSorted(),
                                                        'cursor-pointer select-none': header.column.getCanSort()
                                                    })}
                                                    onClick={header.column.getToggleSortingHandler()}
                                                >
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {{
                                                        asc: <i className='ri-arrow-up-s-line text-xl' />,
                                                        desc: <i className='ri-arrow-down-s-line text-xl' />
                                                    }[header.column.getIsSorted() as 'asc' | 'desc'] ?? null}
                                                </div>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        {table.getFilteredRowModel().rows.length === 0 ? (
                            <tbody>
                                <tr>
                                    <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                                        Mail şablonu bulunamadı
                                    </td>
                                </tr>
                            </tbody>
                        ) : (
                            <tbody>
                                {table.getRowModel().rows.map(row => (
                                    <tr key={row.id}>
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        )}
                    </table>
                </div>
            </div>

            <TablePagination
                rowsPerPageOptions={[25, 50, 100, 200]}
                component='div'
                className='border-bs'
                count={totalCount}
                rowsPerPage={limit}
                page={page - 1}
                onPageChange={(_, newPage) => {
                    setPage(newPage + 1)
                }}
                onRowsPerPageChange={e => {
                    setLimit(Number(e.target.value))
                    setPage(1)
                }}
            />
            <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
                <DialogTitle>Mail Şablonunu Sil</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <strong>"{itemToDelete?.title}"</strong> mail şablonunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel} color='secondary' disabled={deleting}>
                        İptal
                    </Button>
                    <Button onClick={handleDeleteConfirm} color='error' variant='contained' disabled={deleting}>
                        {deleting ? 'Siliniyor...' : 'Sil'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    )
}

export default MailManagementListTable