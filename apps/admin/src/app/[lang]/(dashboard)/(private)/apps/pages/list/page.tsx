'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import classnames from 'classnames'

/* API */
import { fetchPages, deletePage, type PageType } from '@/utils/api/pages'

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

type PageWithActionsType = PageType & {
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

const columnHelper = createColumnHelper<PageWithActionsType>()

const PageListTable = () => {
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [pageToDelete, setPageToDelete] = useState<PageType | null>(null)
    const router = useRouter()
    const [rowSelection, setRowSelection] = useState({})
    const [data, setData] = useState<PageType[]>([])
    const [globalFilter, setGlobalFilter] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadPages()
    }, [])

    const handleDeleteClick = (page: PageType) => {
        setPageToDelete(page)
        setDeleteConfirmOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!pageToDelete) return

        try {
            await deletePage(pageToDelete._id)
            toast.success(`"${pageToDelete.title}" sayfası silindi`)
            setDeleteConfirmOpen(false)
            setPageToDelete(null)
            await loadPages()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Sayfa silinirken hata oluştu')
        }
    }

    const handleDeleteCancel = () => {
        setDeleteConfirmOpen(false)
        setPageToDelete(null)
    }

    const loadPages = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await fetchPages()
            setData(response.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Sayfalar yüklenirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published':
                return 'success'
            case 'draft':
                return 'warning'
            case 'archived':
                return 'default'
            default:
                return 'default'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'published':
                return 'Yayında'
            case 'draft':
                return 'Taslak'
            case 'archived':
                return 'Arşivlendi'
            default:
                return status
        }
    }

    const columns = useMemo<ColumnDef<PageWithActionsType, any>[]>(
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
            columnHelper.accessor('title', {
                header: 'Sayfa Başlığı',
                cell: ({ row }) => (
                    <div className='flex flex-col items-start'>
                        <Typography className='font-medium' color='text.primary'>
                            {row.original.title}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                            /{row.original.slug}
                        </Typography>
                    </div>
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
            columnHelper.accessor('template', {
                header: 'Şablon',
                cell: ({ row }) => (
                    <Typography variant='body2'>
                        {row.original.template}
                    </Typography>
                )
            }),
            columnHelper.accessor('viewCount', {
                header: 'Görüntülenme',
                cell: ({ row }) => (
                    <Typography>{row.original.viewCount}</Typography>
                )
            }),
            columnHelper.accessor('updatedAt', {
                header: 'Son Güncelleme',
                cell: ({ row }) => {
                    const date = new Date(row.original.updatedAt)
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
                        <Tooltip title='Düzenle'>
                            <IconButton
                                size='small'
                                onClick={() => router.push(`/tr/apps/pages/edit/${row.original._id}`)}
                            >
                                <i className='ri-edit-box-line text-[22px] text-textSecondary' />
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
        [router]
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
                    <Button onClick={loadPages} sx={{ mt: 2 }}>
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
                        placeholder='Sayfa başlığı ile arama'
                        className='max-sm:is-full'
                    />
                    <Button
                        color='primary'
                        variant='contained'
                        className='max-sm:is-full is-auto'
                        startIcon={<i className='ri-add-line' />}
                        onClick={() => router.push('/tr/apps/pages/add')}
                    >
                        Yeni Sayfa Ekle
                    </Button>
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
                                        Sayfa Bulunamadı
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
            <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
                <DialogTitle>Sayfayı Sil</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <strong>"{pageToDelete?.title}"</strong> sayfasını silmek istediğinizden emin misiniz?
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

export default PageListTable