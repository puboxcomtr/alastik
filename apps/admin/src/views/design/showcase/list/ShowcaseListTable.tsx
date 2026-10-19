'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { API_ENDPOINTS, fetchAPI } from '@libs/api'
import classnames from 'classnames'

import type { TextFieldProps } from '@mui/material/TextField'
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

import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

import { toast } from 'react-toastify'

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

type ShowcaseType = {
    id: string
    title: string
    order: number
    itemsPerRow: number
    isActive: boolean
    productCount: number
    createdAt: string
    updatedAt: string
}

type ShowcaseWithActionsType = ShowcaseType & {
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

const columnHelper = createColumnHelper<ShowcaseWithActionsType>()

type Props = {
    showcaseData?: ShowcaseType[]
}

const ShowcaseListTable = ({ showcaseData }: Props) => {
    const router = useRouter()
    const [rowSelection, setRowSelection] = useState({})
    const [data, setData] = useState<ShowcaseType[]>(showcaseData || [])
    const [globalFilter, setGlobalFilter] = useState('')
    const [loading, setLoading] = useState(false)
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [showcaseToDelete, setShowcaseToDelete] = useState<ShowcaseType | null>(null)

    useEffect(() => {
        const fetchShowcases = async () => {
            try {
                setLoading(true)
                const json = await fetchAPI(API_ENDPOINTS.showcases.list(), {
                    cache: 'no-store'
                })
                const list = (json.data || []).map((s: any) => ({
                    id: s.id,
                    title: s.title,
                    order: s.order,
                    itemsPerRow: s.itemsPerRow,
                    isActive: s.isActive,
                    productCount: s.productCount,
                    createdAt: s.createdAt,
                    updatedAt: s.updatedAt
                }))
                setData(list)
            } catch (err) {
                console.error('Vitrin listesi yüklenemedi:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchShowcases()
    }, [])

    const handleDeleteClick = (showcase: ShowcaseType) => {
        setShowcaseToDelete(showcase)
        setDeleteConfirmOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!showcaseToDelete) return

        try {
            await fetchAPI(API_ENDPOINTS.showcases.detail(showcaseToDelete.id), {
                method: 'DELETE'
            })

            toast.success(`"${showcaseToDelete.title}" vitrini silindi`)
            setData(prev => prev.filter(s => s.id !== showcaseToDelete.id))
            setDeleteConfirmOpen(false)
            setShowcaseToDelete(null)
        } catch {
            toast.error('Vitrin silinemedi')
        }
    }

    const handleDeleteCancel = () => {
        setDeleteConfirmOpen(false)
        setShowcaseToDelete(null)
    }

    const handleToggleStatus = async (showcase: ShowcaseType) => {
        try {
            const result = await fetchAPI(API_ENDPOINTS.showcases.toggle(showcase.id), {
                method: 'PATCH'
            })

            setData(prev => prev.map(s =>
                s.id === showcase.id ? { ...s, isActive: result.data.isActive } : s
            ))

            toast.success(result.message)
        } catch (error) {
            toast.error('Durum değiştirilirken hata oluştu')
        }
    }

    const columns = useMemo<ColumnDef<ShowcaseWithActionsType, any>[]>(
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
                header: 'Vitrin Adı',
                cell: ({ row }) => (
                    <div className='flex items-center gap-3'>
                        <div className='flex flex-col items-start'>
                            <Typography className='font-medium' color='text.primary'>
                                {row.original.title}
                            </Typography>
                            <Typography variant='body2'>
                                {row.original.productCount} ürün eklendi
                            </Typography>
                        </div>
                    </div>
                )
            }),
            columnHelper.accessor('itemsPerRow', {
                header: 'Satır Başına',
                cell: ({ row }) => (
                    <Chip
                        label={`${row.original.itemsPerRow} ürün`}
                        size='small'
                        variant='outlined'
                    />
                )
            }),
            columnHelper.accessor('order', {
                header: 'Öncelik',
                cell: ({ row }) => (
                    <Typography variant='body2' fontWeight={500}>
                        {row.original.order}
                    </Typography>
                )
            }),
            columnHelper.accessor('isActive', {
                header: 'Durum',
                cell: ({ row }) => (
                    <Typography color={row.original.isActive ? 'success.main' : 'error.main'}>
                        {row.original.isActive ? 'Aktif' : 'Pasif'}
                    </Typography>
                )
            }),
            columnHelper.accessor('actions', {
                header: 'İşlemler',
                cell: ({ row }) => (
                    <div className='flex items-center'>
                        <Tooltip title='Düzenle'>
                            <IconButton
                                size='small'
                                onClick={() => router.push(`/tr/apps/design/showcase/edit/${row.original.id}`)}
                            >
                                <i className='ri-edit-box-line text-[22px] text-textSecondary' />
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

    return (
        <>
            <Card>
                <div className='flex items-start justify-between max-sm:flex-col sm:items-center gap-y-4 p-5'>
                    <DebouncedInput
                        value={globalFilter ?? ''}
                        onChange={value => setGlobalFilter(String(value))}
                        placeholder='Vitrin adı ile arama'
                        className='max-sm:is-full'
                    />
                    <div className='flex items-center max-sm:flex-col gap-4 max-sm:is-full is-auto'>
                        <Button
                            color='primary'
                            fullWidth
                            variant='contained'
                            className='max-sm:is-full is-auto'
                            startIcon={<i className='ri-add-line' />}
                            onClick={() => router.push('/tr/apps/design/showcase/add')}
                        >
                            Yeni Vitrin Ekle
                        </Button>
                    </div>
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
                                        Vitrin Bulunamadı
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
                <DialogTitle>Vitrini Sil</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <strong>"{showcaseToDelete?.title}"</strong> vitrinini silmek istediğinizden emin misiniz?
                        {showcaseToDelete && showcaseToDelete.productCount > 0 && (
                            <span style={{ display: 'block', marginTop: '8px', color: '#f44336' }}>
                                Bu vitrinde {showcaseToDelete.productCount} ürün bulunuyor.
                            </span>
                        )}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel} color='secondary'>
                        Iptal
                    </Button>
                    <Button onClick={handleDeleteConfirm} color='error' variant='contained'>
                        Sil
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}

export default ShowcaseListTable