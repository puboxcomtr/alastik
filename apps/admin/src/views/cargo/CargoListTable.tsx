'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

// API Imports
import { API_ENDPOINTS, fetchAPI, getImageUrl } from '@libs/api'
import { siteHasCargoEdit } from '@/utils/activeSite'

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
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Switch from '@mui/material/Switch'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'

import type { TextFieldProps } from '@mui/material/TextField'

// Component Imports
import AddCargoModal from './AddCargoModal'
import type { CargoProductType } from './cargoOptions'
import EditCargoModal from './EditCargoModal'
import ConfirmDialog from '@components/dialogs/ConfirmDialog'

// Third-party Imports
import classnames from 'classnames'
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

type CargoType = {
    id: string
    // Site bazlı sıra numarası — kurallar sayfasının adresinde kullanılır
    cargoNo?: number
    name: string
    code: string
    logo?: string
    description?: string
    isActive: boolean
    webOrder: number
    memberGroups?: string[]
    productType?: CargoProductType
    paymentType?: 'sender' | 'receiver'
    fixedPrice?: number
    freeShippingThreshold?: number
    freeShippingDesiLimit?: number
    desiPricing?: {
        ranges?: { min: number; max: number; price: number }[]
        extraPerDesi?: number
    }
    trackingUrl?: string
    apiEnabled?: boolean
    createdAt?: string
    updatedAt?: string
}

type CargoWithActionsType = CargoType & {
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

const columnHelper = createColumnHelper<CargoWithActionsType>()

const CargoListTable = () => {
    const [selectedCargo, setSelectedCargo] = useState<CargoType | null>(null)
    const [editCargoOpen, setEditCargoOpen] = useState(false)
    const router = useRouter()
    const { lang: locale } = useParams()
    const [addCargoOpen, setAddCargoOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [rowSelection, setRowSelection] = useState({})
    const [data, setData] = useState<CargoType[]>([])
    const [globalFilter, setGlobalFilter] = useState('')
    const [loading, setLoading] = useState(true)

    // Pagination state
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(50)
    const [totalCount, setTotalCount] = useState(0)

    useEffect(() => {
        const fetchCargos = async () => {
            setLoading(true)
            try {
                const response = await fetchAPI(
                    `${API_ENDPOINTS.cargo.list()}?page=${page}&limit=${limit}`,
                    { cache: 'no-store' }
                )

                const cargos = (response.data || []).map((cargo: any) => ({
                    id: cargo._id || cargo.id,
                    cargoNo: cargo.cargoNo,
                    name: cargo.name || '',
                    code: cargo.code || '',
                    logo: cargo.logo || '',
                    description: cargo.description || '',
                    isActive: cargo.isActive !== false,
                    webOrder: cargo.webOrder || 0,
                    memberGroups: cargo.memberGroups || [],
                    productType: cargo.productType || 'dia_api',
                    paymentType: cargo.paymentType || 'sender',
                    fixedPrice: cargo.fixedPrice ?? 0,
                    freeShippingThreshold: cargo.freeShippingThreshold ?? 0,
                    freeShippingDesiLimit: cargo.freeShippingDesiLimit ?? 0,
                    desiPricing: cargo.desiPricing || { ranges: [], extraPerDesi: 0 },
                    apiEnabled: cargo.apiEnabled || false,
                    createdAt: cargo.createdAt,
                    updatedAt: cargo.updatedAt
                }))

                setData(cargos)
                setTotalCount(response.meta?.total || cargos.length)
            } catch (error) {
                console.error('Cargos fetch error:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchCargos()
    }, [page, limit])

    const handleStatusToggle = async (cargoId: string, currentStatus: boolean) => {
        try {
            const response = await fetchAPI(API_ENDPOINTS.cargo.toggleStatus(cargoId), {
                method: 'PATCH'
            })

            if (response?.success) {
                setData(prev =>
                    prev.map(cargo =>
                        cargo.id === cargoId ? { ...cargo, isActive: !currentStatus } : cargo
                    )
                )
                toast.success(response.message || 'Durum güncellendi')
            } else {
                toast.error(response?.message || 'Durum güncellenemedi')
            }
        } catch (error: any) {
            console.error('Status toggle error:', error)
            toast.error('Durum güncellenirken hata oluştu')
        }
    }
    const handleDeleteClick = (cargoId: string, cargoName: string) => {
        setDeleteTarget({ id: cargoId, name: cargoName })
    }

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return

        setDeleteLoading(true)
        try {
            const response = await fetchAPI(API_ENDPOINTS.cargo.delete(deleteTarget.id), {
                method: 'DELETE'
            })

            if (response?.success) {
                setData(prev => prev.filter(cargo => cargo.id !== deleteTarget.id))
                setTotalCount(prev => prev - 1)
                toast.success(response.message || 'Kargo firması silindi')
                setDeleteTarget(null)
            } else {
                toast.error(response?.message || 'Kargo firması silinemedi')
            }
        } catch (error: any) {
            console.error('Cargo delete error:', error)
            toast.error('Kargo firması silinirken hata oluştu')
        } finally {
            setDeleteLoading(false)
        }
    }

    const columns = useMemo<ColumnDef<CargoWithActionsType, any>[]>(
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
                header: 'Kargo Firması',
                cell: ({ row }) => {
                    const cargo = row.original
                    return (
                        <div className='flex items-center gap-3'>
                            <Avatar
                                src={cargo.logo ? getImageUrl(cargo.logo) : ''}
                                alt={cargo.name}
                                variant='rounded'
                                sx={{ width: 40, height: 40, bgcolor: 'action.hover' }}
                            >
                                <i className='ri-truck-line text-textSecondary' />
                            </Avatar>
                            <div className='flex flex-col items-start'>
                                <Typography className='font-medium' color='text.primary'>
                                    {cargo.name}
                                </Typography>
                            </div>
                        </div>
                    )
                }
            }),
            columnHelper.accessor('apiEnabled', {
                header: 'API Entegrasyon',
                cell: ({ row }) => (
                    <Chip
                        label={row.original.apiEnabled ? 'Aktif' : 'Pasif'}
                        size='small'
                        variant='tonal'
                        color={row.original.apiEnabled ? 'success' : 'default'}
                    />
                )
            }),
            columnHelper.accessor('webOrder', {
                header: 'Öncelik',
                cell: ({ row }) => <Typography>{row.original.webOrder}</Typography>
            }),
            columnHelper.accessor('isActive', {
                header: 'Durum',
                cell: ({ row }) => (
                    <Switch
                        checked={row.original.isActive}
                        onChange={() => handleStatusToggle(row.original.id, row.original.isActive)}
                        size='small'
                    />
                )
            }),
            columnHelper.accessor('actions', {
                header: 'İşlemler',
                cell: ({ row }) => (
                    <div className='flex items-center'>
                        <Tooltip title='Kargo Kuralları ve Desi Fiyatlandırma'>
                            <IconButton
                                size='small'
                                onClick={() => router.push(`/${locale}/apps/cargo/desi/${row.original.cargoNo ?? row.original.id}`)}
                            >
                                <i className="ri-price-tag-3-fill text-[22px] text-textSecondary"></i>
                            </IconButton>
                        </Tooltip>
                        {siteHasCargoEdit() && (
                            <Tooltip title='Kargo Firmasını Düzenle'>
                                <IconButton
                                    size='small'
                                    onClick={() => {
                                        setSelectedCargo(row.original)
                                        setEditCargoOpen(true)
                                    }}
                                >
                                    <i className='ri-edit-box-line text-[22px] text-textSecondary' />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip title='Sil'>
                            <IconButton
                                size='small'
                                onClick={() => handleDeleteClick(row.original.id, row.original.name)}
                            >
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
        filterFns: {
            fuzzy: fuzzyFilter
        },
        state: {
            rowSelection,
            globalFilter
        },
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
                <CardHeader title='Kargo Firmaları' className='pbe-4' />
                <Divider />
                <div className='flex items-start justify-between max-sm:flex-col sm:items-center gap-y-4 p-5'>
                    <div className='flex flex-col gap-2'>
                        <DebouncedInput
                            value={globalFilter ?? ''}
                            onChange={value => setGlobalFilter(String(value))}
                            placeholder='Kargo firması ile arama'
                            className='max-sm:is-full'
                        />
                        <Typography variant='body2' color='text.secondary'>
                            Toplam <strong>{totalCount} Kargo Firması</strong> bulundu
                        </Typography>
                    </div>
                    <div className='flex items-center max-sm:flex-col gap-4 max-sm:is-full is-auto'>
                        <Button
                            variant='contained'
                            className='max-sm:is-full is-auto'
                            startIcon={<i className='ri-add-line' />}
                            onClick={() => setAddCargoOpen(true)}
                        >
                            Kargo Firması Ekle
                        </Button>
                    </div>
                </div>

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
                                <Typography>Kargo firmaları yükleniyor...</Typography>
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
                                                {globalFilter
                                                    ? 'Arama kriterlerinize uygun kargo firması bulunamadı'
                                                    : 'Kargo firması bulunamadı'}
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
            <AddCargoModal
                open={addCargoOpen}
                handleClose={() => setAddCargoOpen(false)}
                existingCodes={data.map(c => c.code)}
                onSuccess={() => {
                    if (page !== 1) {
                        setPage(1)
                    } else {
                        // Tetiklemek için manuel refetch
                        setLoading(true)
                        fetchAPI(`${API_ENDPOINTS.cargo.list()}?page=1&limit=${limit}`, { cache: 'no-store' })
                            .then(response => {
                                const cargos = (response.data || []).map((cargo: any) => ({
                                    id: cargo._id || cargo.id,
                                    cargoNo: cargo.cargoNo,
                                    name: cargo.name || '',
                                    code: cargo.code || '',
                                    logo: cargo.logo || '',
                                    description: cargo.description || '',
                                    isActive: cargo.isActive !== false,
                                    webOrder: cargo.webOrder || 0,
                                    memberGroups: cargo.memberGroups || [],
                                    productType: cargo.productType || 'dia_api',
                                    paymentType: cargo.paymentType || 'sender',
                                    fixedPrice: cargo.fixedPrice ?? 0,
                                    freeShippingThreshold: cargo.freeShippingThreshold ?? 0,
                                    freeShippingDesiLimit: cargo.freeShippingDesiLimit ?? 0,
                                    apiEnabled: cargo.apiEnabled || false,
                                    createdAt: cargo.createdAt,
                                    updatedAt: cargo.updatedAt
                                }))
                                setData(cargos)
                                setTotalCount(response.meta?.total || cargos.length)
                            })
                            .finally(() => setLoading(false))
                    }
                }}
            />
            <EditCargoModal
                open={editCargoOpen}
                cargo={selectedCargo}
                handleClose={() => {
                    setEditCargoOpen(false)
                    setSelectedCargo(null)
                }}
                onSuccess={() => {
                    setLoading(true)
                    fetchAPI(`${API_ENDPOINTS.cargo.list()}?page=${page}&limit=${limit}`, { cache: 'no-store' })
                        .then(response => {
                            const cargos = (response.data || []).map((cargo: any) => ({
                                id: cargo._id || cargo.id,
                                cargoNo: cargo.cargoNo,
                                name: cargo.name || '',
                                code: cargo.code || '',
                                logo: cargo.logo || '',
                                description: cargo.description || '',
                                isActive: cargo.isActive !== false,
                                webOrder: cargo.webOrder || 0,
                                memberGroups: cargo.memberGroups || [],
                                productType: cargo.productType || 'dia_api',
                                paymentType: cargo.paymentType || 'sender',
                                fixedPrice: cargo.fixedPrice ?? 0,
                                freeShippingThreshold: cargo.freeShippingThreshold ?? 0,
                                freeShippingDesiLimit: cargo.freeShippingDesiLimit ?? 0,
                                apiEnabled: cargo.apiEnabled || false,
                                createdAt: cargo.createdAt,
                                updatedAt: cargo.updatedAt
                            }))
                            setData(cargos)
                            setTotalCount(response.meta?.total || cargos.length)
                        })
                        .finally(() => setLoading(false))
                }}
            />
            <ConfirmDialog
                open={!!deleteTarget}
                title='Kargo Firmasını Sil'
                message={`"${deleteTarget?.name}" kargo firmasını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
                confirmText='Evet, Sil'
                cancelText='İptal'
                severity='error'
                loading={deleteLoading}
                onConfirm={handleDeleteConfirm}
                onClose={() => !deleteLoading && setDeleteTarget(null)}
            />
        </>
    )
}

export default CargoListTable