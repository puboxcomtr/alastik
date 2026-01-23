'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import classnames from 'classnames'

// API Imports
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'

import type { TextFieldProps } from '@mui/material/TextField'

import { toast } from 'react-toastify'

// Tanstack Imports
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
    getSortedRowModel
} from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

// Component Imports
import EditFeatureDrawer from '@/views/features/EditFeatureDrawer'

// Style Imports
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
    const { lang: locale } = useParams()
    const [rowSelection, setRowSelection] = useState({})
    const [data, setData] = useState<FeatureType[]>([])
    const [globalFilter, setGlobalFilter] = useState('')
    const [loading, setLoading] = useState(true)

    // Pagination state
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(50)
    const [totalCount, setTotalCount] = useState(0)

    useEffect(() => {
        loadFeatures()
    }, [page, limit])

    const loadFeatures = async () => {
        setLoading(true)
        try {
            const response = await fetchAPI(
                `${API_ENDPOINTS.features.list()}?page=${page}&limit=${limit}`,
                { cache: 'no-store' }
            )

            const features = (response.data || []).map((feature: any) => ({
                _id: feature._id || feature.id,
                name: feature.name || '',
                valueCount: feature.valueCount || 0,
                productCount: feature.productCount || 0,
                isActive: feature.isActive !== false,
                order: feature.order || 0,
                displayLocation: feature.displayLocation || ''
            }))

            setData(features)
            setTotalCount(response.pagination?.total || features.length)
        } catch (error) {
            console.error('Features fetch error:', error)
            toast.error('Özellikler yüklenirken hata oluştu')
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
                cell: ({ row }) => <Typography>{row.original.productCount.toLocaleString()}</Typography>
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
        pageCount: Math.ceil(totalCount / limit),
        manualPagination: true,
        enableRowSelection: true,
        globalFilterFn: fuzzyFilter,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getFacetedMinMaxValues: getFacetedMinMaxValues()
    })

    return (
        <>
            <Card>
                <CardHeader title='Özellik Listesi' className='pbe-4' />
                <Divider />
                <div className='flex items-start justify-between max-sm:flex-col sm:items-center gap-y-4 p-5'>
                    <div className='flex flex-col gap-2'>
                        <DebouncedInput
                            value={globalFilter ?? ''}
                            onChange={value => setGlobalFilter(String(value))}
                            placeholder='Özellik adı ile arama'
                            className='max-sm:is-full'
                        />
                        <Typography variant='body2' color='text.secondary'>
                            Toplam <strong>{totalCount} Özellik</strong> bulundu
                        </Typography>
                    </div>
                </div>

                <div style={{ position: 'relative' }}>
                    {loading && (
                        <div style={{
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
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <CircularProgress size={24} />
                                <Typography>Özellikler yükleniyor...</Typography>
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
                                        <td colSpan={table.getVisibleFlatColumns().length} className='text-center py-4'>
                                            <Typography variant='body1' color='text.secondary'>
                                                {globalFilter ? 'Arama kriterlerinize uygun özellik bulunamadı' : 'Özellik bulunamadı'}
                                            </Typography>
                                        </td>
                                    </tr>
                                </tbody>
                            ) : (
                                <tbody>
                                    {table.getRowModel().rows.map(row => (
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
            </Card>

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