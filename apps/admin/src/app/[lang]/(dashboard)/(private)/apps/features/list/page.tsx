'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import classnames from 'classnames'

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
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

import type { TextFieldProps } from '@mui/material/TextField'

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

/* Components */
import EditFeatureDrawer from '@/views/features/EditFeatureDrawer'

import tableStyles from '@core/styles/table.module.css'

declare module '@tanstack/table-core' {
    interface FilterFns {
        fuzzy: FilterFn<unknown>
    }
    interface FilterMeta {
        itemRank: RankingInfo
    }
}

type FeatureType = {
    _id: string
    name: string
    valueCount: number
    productCount: number
    isActive: boolean
    order: number
    displayLocation?: string
}

type FeatureWithActionsType = FeatureType & {
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

const columnHelper = createColumnHelper<FeatureWithActionsType>()

const FeatureListTable = () => {
    const [selectedFeature, setSelectedFeature] = useState<FeatureType | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const router = useRouter()
    const [rowSelection, setRowSelection] = useState({})
    const [data, setData] = useState<FeatureType[]>([])
    const [globalFilter, setGlobalFilter] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadFeatures()
    }, [])

    const loadFeatures = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch('http://localhost:3082/api/features')

            if (!response.ok) {
                throw new Error('Özellikler yüklenirken hata oluştu')
            }

            const result = await response.json()
            setData(result.data || [])

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Özellikler yüklenirken hata oluştu')
            toast.error('Özellikler yüklenemedi')
        } finally {
            setLoading(false)
        }
    }


    const handleEditClick = (feature: FeatureType) => {
        setSelectedFeature(feature)
        setDrawerOpen(true)
    }

    const columns = useMemo<ColumnDef<FeatureWithActionsType, any>[]>(
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
                header: 'Özellik Adı',
                cell: ({ row }) => (
                    <div className='flex items-center gap-3'>
                        <div className='flex flex-col items-start'>
                            <Typography className='font-medium' color='text.primary'>
                                {row.original.name}
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                                {row.original.valueCount} farklı değer
                            </Typography>
                        </div>
                    </div>
                )
            }),
            columnHelper.accessor('productCount', {
                header: 'Ürün Sayısı',
                cell: ({ row }) => <Typography>{row.original.productCount}</Typography>
            }),
            columnHelper.accessor('order', {
                header: 'Öncelik',
                cell: ({ row }) => <Typography>{row.original.order}</Typography>
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
                        <Tooltip title="Düzenle">
                            <IconButton
                                size='small'
                                onClick={() => handleEditClick(row.original)}
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

    if (error) {
        return (
            <Card>
                <div className='p-5 text-center'>
                    <Typography color='error'>Hata: {error}</Typography>
                    <Button onClick={loadFeatures} sx={{ mt: 2 }}>Tekrar Dene</Button>
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
                        placeholder='Özellik adı ile arama'
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
                                        Özellik Bulunamadı
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

            {/* Drawer */}
            <EditFeatureDrawer
                open={drawerOpen}
                handleClose={() => setDrawerOpen(false)}
                selectedFeature={selectedFeature}
                onUpdate={loadFeatures}
            />
        </>
    )
}

export default FeatureListTable