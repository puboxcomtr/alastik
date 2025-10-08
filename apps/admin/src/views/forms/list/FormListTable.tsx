'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import classnames from 'classnames'

/* API */
import { fetchForms, deleteForm, type FormType } from '@/utils/api/forms'

/* MUI */
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'
import type { TextFieldProps } from '@mui/material/TextField'

/* Dialog */
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

/* Toast */
import { toast } from 'react-toastify'

/* Tanstack */
import { rankItem } from '@tanstack/match-sorter-utils'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getFilteredRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFacetedMinMaxValues,
    getPaginationRowModel,
    getSortedRowModel
} from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

import tableStyles from '@core/styles/table.module.css'

declare module '@tanstack/table-core' {
    interface FilterFns {
        fuzzy: FilterFn<unknown>
    }
    interface FilterMeta {
        itemRank: RankingInfo
    }
}

type FormWithActionsType = FormType & {
    actions?: string
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
    const itemRank = rankItem(row.getValue(columnId), value)
    addMeta({ itemRank })
    return itemRank.passed
}

const DebouncedInput = ({
    value: initialValue,
    onChange,
    debounce = 500,
    ...props
}: {
    value: string | number
    onChange: (value: string | number) => void
    debounce?: number
} & Omit<TextFieldProps, 'onChange'>) => {
    const [value, setValue] = useState(initialValue)

    useEffect(() => {
        setValue(initialValue)
    }, [initialValue])

    useEffect(() => {
        const timeout = setTimeout(() => {
            onChange(value)
        }, debounce)
        return () => clearTimeout(timeout)
    }, [value, onChange, debounce])

    return <TextField {...props} value={value} onChange={e => setValue(e.target.value)} size='small' />
}

const columnHelper = createColumnHelper<FormWithActionsType>()

const FormListTable = () => {
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [formToDelete, setFormToDelete] = useState<FormType | null>(null)
    const [detailDialogOpen, setDetailDialogOpen] = useState(false)
    const [selectedForm, setSelectedForm] = useState<FormType | null>(null)
    const router = useRouter()
    const [rowSelection, setRowSelection] = useState({})
    const [data, setData] = useState<FormType[]>([])
    const [globalFilter, setGlobalFilter] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadForms()
    }, [])

    const handleDeleteClick = (form: FormType) => {
        setFormToDelete(form)
        setDeleteConfirmOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!formToDelete) return

        try {
            await deleteForm(formToDelete._id)
            toast.success('Form mesajı silindi')
            setDeleteConfirmOpen(false)
            setFormToDelete(null)
            await loadForms()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Form silinirken hata oluştu')
        }
    }

    const handleDeleteCancel = () => {
        setDeleteConfirmOpen(false)
        setFormToDelete(null)
    }

    const handleViewDetails = (form: FormType) => {
        setSelectedForm(form)
        setDetailDialogOpen(true)
    }

    const loadForms = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await fetchForms()
            setData(response.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Formlar yüklenirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new':
                return 'error'
            case 'read':
                return 'info'
            case 'replied':
                return 'success'
            case 'archived':
                return 'default'
            default:
                return 'default'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'new':
                return 'Yeni'
            case 'read':
                return 'Okundu'
            case 'replied':
                return 'Cevaplandı'
            case 'archived':
                return 'Arşivlendi'
            default:
                return status
        }
    }

    const getFormTypeLabel = (type: string) => {
        switch (type) {
            case 'contact':
                return 'İletişim'
            case 'quote':
                return 'Teklif'
            case 'support':
                return 'Destek'
            case 'newsletter':
                return 'Bülten'
            case 'custom':
                return 'Özel'
            default:
                return type
        }
    }

    const columns = useMemo<ColumnDef<FormWithActionsType, any>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        {...{
                            checked: table.getIsAllRowsSelected(),
                            indeterminate: table.getIsSomeRowsSelected(),
                            onChange: table.getToggleAllRowsSelectedHandler()
                        }}
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        {...{
                            checked: row.getIsSelected(),
                            disabled: !row.getCanSelect(),
                            indeterminate: row.getIsSomeSelected(),
                            onChange: row.getToggleSelectedHandler()
                        }}
                    />
                )
            },
            columnHelper.accessor('name', {
                header: 'İsim & Email',
                cell: ({ row }) => (
                    <div className='flex flex-col items-start'>
                        <Typography className='font-medium' color='text.primary'>
                            {row.original.name}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                            {row.original.email}
                        </Typography>
                    </div>
                )
            }),
            columnHelper.accessor('formType', {
                header: 'Tip',
                cell: ({ row }) => (
                    <Chip
                        label={getFormTypeLabel(row.original.formType)}
                        variant='tonal'
                        size='small'
                    />
                )
            }),
            columnHelper.accessor('subject', {
                header: 'Konu',
                cell: ({ row }) => (
                    <Typography variant='body2' className='max-w-[200px] truncate'>
                        {row.original.subject || '-'}
                    </Typography>
                )
            }),
            columnHelper.accessor('sourceUrl', {
                header: 'Kaynak URL',
                cell: ({ row }) => (
                    <Typography variant='body2' className='max-w-[150px] truncate'>
                        {row.original.sourceUrl}
                    </Typography>
                )
            }),
            columnHelper.accessor('status', {
                header: 'Durum',
                cell: ({ row }) => (
                    <Chip
                        label={getStatusLabel(row.original.status)}
                        color={getStatusColor(row.original.status)}
                        variant='tonal'
                        size='small'
                    />
                )
            }),
            columnHelper.accessor('createdAt', {
                header: 'Tarih',
                cell: ({ row }) => {
                    const date = new Date(row.original.createdAt)
                    return (
                        <Typography variant='body2'>
                            {date.toLocaleDateString('tr-TR')}
                        </Typography>
                    )
                }
            }),
            columnHelper.accessor('actions', {
                header: 'İşlemler',
                cell: ({ row }) => (
                    <div className='flex items-center'>
                        <Tooltip title='Detay'>
                            <IconButton
                                size='small'
                                onClick={() => handleViewDetails(row.original)}
                            >
                                <i className='ri-eye-line text-[22px] text-textSecondary' />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title='Sil'>
                            <IconButton size='small' onClick={() => handleDeleteClick(row.original)}>
                                <i className='ri-delete-bin-line text-[22px] text-textSecondary' />
                            </IconButton>
                        </Tooltip>
                    </div>
                ),
                enableSorting: false
            })
        ],
        []
    )

    const table = useReactTable({
        data,
        columns,
        filterFns: { fuzzy: fuzzyFilter },
        state: { rowSelection, globalFilter },
        initialState: { pagination: { pageSize: 10 } },
        enableRowSelection: true,
        globalFilterFn: fuzzyFilter,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getFacetedMinMaxValues: getFacetedMinMaxValues()
    })

    if (loading) {
        return (
            <Card>
                <div className='flex justify-center items-center p-10'>
                    <CircularProgress />
                </div>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <div className='p-5 text-center'>
                    <Typography color='error'>Hata: {error}</Typography>
                    <Button onClick={loadForms} sx={{ mt: 2 }}>
                        Tekrar Dene
                    </Button>
                </div>
            </Card>
        )
    }

    return (
        <>
            <Card>
                <div className='flex items-start justify-between max-sm:flex-col sm:items-center gap-y-4 p-5'>
                    <DebouncedInput
                        value={globalFilter ?? ''}
                        onChange={value => setGlobalFilter(String(value))}
                        placeholder='İsim, email veya mesaj ile arama'
                        className='max-sm:is-full'
                    />
                </div>
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
                                        İçerik Bulunamadı
                                    </td>
                                </tr>
                            </tbody>
                        ) : (
                            <tbody>
                                {table.getRowModel().rows.slice(0, table.getState().pagination.pageSize).map(row => (
                                    <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        )}
                    </table>
                </div>
                <TablePagination
                    rowsPerPageOptions={[10, 15, 25]}
                    component='div'
                    className='border-bs'
                    count={table.getFilteredRowModel().rows.length}
                    rowsPerPage={table.getState().pagination.pageSize}
                    page={table.getState().pagination.pageIndex}
                    onPageChange={(_, page) => table.setPageIndex(page)}
                    onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))}
                />
            </Card>

            {/* Detay Dialog */}
            <Dialog
                open={detailDialogOpen}
                onClose={() => setDetailDialogOpen(false)}
                maxWidth='md'
                fullWidth
            >
                <DialogTitle>Form Detayları</DialogTitle>
                <DialogContent>
                    {selectedForm && (
                        <div className='space-y-4 pt-2'>
                            <div>
                                <Typography variant='caption' color='text.secondary'>İsim:</Typography>
                                <Typography>{selectedForm.name}</Typography>
                            </div>
                            <div>
                                <Typography variant='caption' color='text.secondary'>Email:</Typography>
                                <Typography>{selectedForm.email}</Typography>
                            </div>
                            {selectedForm.phone && (
                                <div>
                                    <Typography variant='caption' color='text.secondary'>Telefon:</Typography>
                                    <Typography>{selectedForm.phone}</Typography>
                                </div>
                            )}
                            {selectedForm.company && (
                                <div>
                                    <Typography variant='caption' color='text.secondary'>Şirket:</Typography>
                                    <Typography>{selectedForm.company}</Typography>
                                </div>
                            )}
                            {selectedForm.subject && (
                                <div>
                                    <Typography variant='caption' color='text.secondary'>Konu:</Typography>
                                    <Typography>{selectedForm.subject}</Typography>
                                </div>
                            )}
                            <div>
                                <Typography variant='caption' color='text.secondary'>Mesaj:</Typography>
                                <Typography>{selectedForm.message}</Typography>
                            </div>
                            <div>
                                <Typography variant='caption' color='text.secondary'>Kaynak URL:</Typography>
                                <Typography className='break-all'>{selectedForm.sourceUrl}</Typography>
                            </div>
                            {selectedForm.referrerUrl && (
                                <div>
                                    <Typography variant='caption' color='text.secondary'>Referrer:</Typography>
                                    <Typography className='break-all'>{selectedForm.referrerUrl}</Typography>
                                </div>
                            )}
                            {selectedForm.ipAddress && (
                                <div>
                                    <Typography variant='caption' color='text.secondary'>IP Adresi:</Typography>
                                    <Typography>{selectedForm.ipAddress}</Typography>
                                </div>
                            )}
                            <div>
                                <Typography variant='caption' color='text.secondary'>Tarih:</Typography>
                                <Typography>{new Date(selectedForm.createdAt).toLocaleString('tr-TR')}</Typography>
                            </div>
                        </div>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailDialogOpen(false)}>
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Silme Dialog */}
            <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
                <DialogTitle>Form Mesajını Sil</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <strong>"{formToDelete?.name}"</strong> kişisinden gelen mesajı silmek istediğinizden emin misiniz?
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

export default FormListTable