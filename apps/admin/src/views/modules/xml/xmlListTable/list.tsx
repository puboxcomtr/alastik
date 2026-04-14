'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import classnames from 'classnames'

// API Imports
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// MUI Imports
import type { TextFieldProps } from '@mui/material/TextField'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'
import Switch from '@mui/material/Switch'

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

// Style Imports
import tableStyles from '@core/styles/table.module.css'

// Component Imports
import XmlEditModal from './XmlEditModal'
import XmlAddModal from './XmlAddModal'

declare module '@tanstack/table-core' {
    interface FilterFns {
        fuzzy: FilterFn<unknown>
    }
    interface FilterMeta {
        itemRank: RankingInfo
    }
}

type XmlIntegrationType = {
    id: string
    name: string
    code: string
    format: string
    description: string
    isActive: boolean
    syncInterval: number
    lastSyncAt: string | null
    lastSyncStatus: string | null
    lastSyncType: 'auto' | 'manual' | null
    lastSyncMessage: string
    productCount: number
}

type XmlIntegrationWithActionsType = XmlIntegrationType & {
    actions?: string
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
    }, [value, debounce])

    return <TextField {...props} value={value} onChange={e => setValue(e.target.value)} size='small' />
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
    const itemRank = rankItem(row.getValue(columnId), value)
    addMeta({ itemRank })
    return itemRank.passed
}

const getFormatColor = (format: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
        json: 'primary',
        xml: 'info',
        csv: 'warning'
    }
    return colors[format.toLowerCase()] || 'default'
}

const getSyncStatusColor = (status: string | null): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    if (!status) return 'default'
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
        success: 'success',
        error: 'error',
        pending: 'warning'
    }
    return colors[status] || 'default'
}

const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

const columnHelper = createColumnHelper<XmlIntegrationWithActionsType>()

const XmlListTable = () => {
    const router = useRouter()
    const { lang: locale } = useParams()
    const [data, setData] = useState<XmlIntegrationType[]>([])
    const [searchValue, setSearchValue] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [loading, setLoading] = useState(true)

    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(20)
    const [totalCount, setTotalCount] = useState(0)

    const [exporting, setExporting] = useState(false)
    const [diaMatchLoading, setDiaMatchLoading] = useState(false)

    const [editModalOpen, setEditModalOpen] = useState(false)
    const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null)

    const [addModalOpen, setAddModalOpen] = useState(false)

    const handleExportExcel = async () => {
        setExporting(true)
        try {
            const { getSession } = await import('next-auth/react')
            const session = await getSession()
            const token = (session as any)?.user?.accessToken

            const res = await fetch(API_ENDPOINTS.webxml.productsExport(), {
                headers: { ...(token && { Authorization: `Bearer ${token}` }) }
            })
            if (!res.ok) throw new Error('Dışa çıkartma işlemi başarısız')

            const blob = await res.blob()
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = 'xml-urunler.xlsx'
            link.click()
            toast.success('Excel indirildi')
        } catch {
            toast.error('Excel aktarımı sırasında hata oluştu')
        } finally {
            setExporting(false)
        }
    }

    const handleOpenEditModal = (id: string) => {
        setSelectedIntegrationId(id)
        setEditModalOpen(true)
    }

    const handleCloseEditModal = () => {
        setEditModalOpen(false)
        setSelectedIntegrationId(null)
    }

    const handleEditSuccess = () => {
        loadXmlIntegrations(debouncedSearch, page, limit)
    }

    const handleAddSuccess = () => {
        loadXmlIntegrations(debouncedSearch, page, limit)
    }

    const loadXmlIntegrations = async (searchTerm: string, currentPage: number, currentLimit: number) => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: currentLimit.toString()
            })
            if (searchTerm) params.append('search', searchTerm)

            const response = await fetchAPI(`${API_ENDPOINTS.webxml.list()}?${params}`, {
                cache: 'no-store'
            })

            if (response.success) {
                setData(response.data || [])
                setTotalCount(response.pagination?.total || 0)
            } else {
                toast.error(response.message || 'Veriler yüklenemedi')
            }
        } catch (error) {
            toast.error('XML entegrasyonları yüklenirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = async (id: string, isActive: boolean) => {
        try {
            const response = await fetchAPI(API_ENDPOINTS.webxml.updateStatus(id), {
                method: 'PATCH',
                body: JSON.stringify({ isActive })
            })
            if (response.success) {
                setData(prev => prev.map(item => item.id === id ? { ...item, isActive } : item))
                toast.success(response.message)
            } else {
                toast.error(response.message || 'Durum güncellenemedi')
            }
        } catch (error) {
            toast.error('Durum güncellenirken hata oluştu')
        }
    }

    const handleStartSync = async (id: string, name: string) => {
        try {
            toast.info(`${name} senkronizasyonu başlatılıyor...`)
            const response = await fetchAPI(API_ENDPOINTS.webxml.startSync(id), {
                method: 'POST'
            })
            if (response.success) {
                toast.success(`${response.data.productCount} ürün bulundu`)
            } else if (response.message?.includes('XML olarak ekleyin')) {
                toast.info('Bu entegrasyon XML olarak senkronize edilir.')
            } else {
                toast.error(response.message || 'Senkronizasyon başarısız')
            }
        } catch (error) {
            toast.error('Senkronizasyon başlatılırken hata oluştu')
        }
    }

    const handleDiaMatch = async () => {
        setDiaMatchLoading(true)
        try {
            const res = await fetchAPI(API_ENDPOINTS.webxml.syncAll(), { method: 'POST' })
            if (res.success) {
                toast.info('XML senkronizasyon başlatıldı, arka planda devam ediyor...')
            } else {
                toast.warning(res.message || 'Hata oluştu')
            }
        } catch {
            toast.error('Hata oluştu')
        } finally {
            setDiaMatchLoading(false)
        }
    }

    useEffect(() => {
        loadXmlIntegrations(debouncedSearch, page, limit)
    }, [page, limit, debouncedSearch])

    useEffect(() => {
        setPage(1)
    }, [debouncedSearch])

    const columns = useMemo<ColumnDef<XmlIntegrationWithActionsType, any>[]>(
        () => [
            columnHelper.accessor('name', {
                header: 'Adı',
                cell: ({ row }) => (
                    <div className='flex flex-col'>
                        <Typography className='font-medium' color='text.primary'>
                            {row.original.name}
                        </Typography>
                    </div>
                )
            }),
            columnHelper.accessor('format', {
                header: 'Format',
                cell: ({ row }) => (
                    <Chip
                        label={row.original.format}
                        size='small'
                        color={getFormatColor(row.original.format)}
                        variant='outlined'
                    />
                )
            }),
            columnHelper.accessor('description', {
                header: 'Açıklama',
                cell: ({ row }) => (
                    <div className='flex flex-col'>
                        <Typography variant='body2' color='text.primary'>
                            {row.original.description || '-'}
                        </Typography>
                        {row.original.lastSyncAt && (
                            <Typography variant='caption' color='text.secondary'>
                                Son sync: {formatDate(row.original.lastSyncAt)}
                                {row.original.lastSyncStatus && (
                                    <Chip
                                        label={
                                            row.original.lastSyncStatus === 'success'
                                                ? (row.original.lastSyncType === 'auto' ? 'Otomatik' : 'Başarılı')
                                                : 'Hata'
                                        }
                                        size='small'
                                        color={getSyncStatusColor(row.original.lastSyncStatus)}
                                        sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                                    />
                                )}
                            </Typography>
                        )}
                    </div>
                )
            }),
            columnHelper.accessor('isActive', {
                header: 'Durum',
                cell: ({ row }) => (
                    <div
                        className='flex items-center cursor-pointer'
                        onClick={(e) => {
                            e.stopPropagation()
                            handleStatusChange(row.original.id, !row.original.isActive)
                        }}
                    >
                        <Switch checked={row.original.isActive} size='small' />
                        <Typography variant='body2' color='text.secondary'>
                            {row.original.isActive ? 'Aktif' : 'Pasif'}
                        </Typography>
                    </div>
                )
            }),
            columnHelper.accessor('actions', {
                header: 'İşlemler',
                cell: ({ row }) => (
                    <div className='flex items-center gap-1' onClick={(e) => e.stopPropagation()}>
                        <Tooltip title='API Düzenle'>
                            <IconButton size='small' onClick={() => handleOpenEditModal(row.original.id)}>
                                <i className='ri-settings-3-line text-[20px] text-textSecondary' />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title='Kuralları Düzenle'>
                            <IconButton size='small' onClick={() => router.push(`/${locale}/apps/modules/xml/rules/${row.original.id}`)}>
                                <i className='ri-git-branch-line text-[20px] text-textSecondary' />
                            </IconButton>
                        </Tooltip>
                        {row.original.format === 'json' ? (
                            <Tooltip title='XML Görüntüle'>
                                <IconButton size='small' onClick={() => window.open(`https://api.alastik.com/api/admin/integration/xml/${row.original.code}/export.xml`, '_blank')}>
                                    <i className="ri-folder-cloud-line text-[20px] text-textSecondary"></i>
                                </IconButton>
                            </Tooltip>
                        ) : (
                            <Tooltip title='Ürün Listesi'>
                                <IconButton size='small' onClick={() => router.push(`/${locale}/apps/modules/xml/products?source=${row.original.code}`)}>
                                    <i className='ri-store-2-line text-[20px] text-textSecondary' />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip title='Senkronizasyonu Başlat'>
                            <IconButton size='small' onClick={() => handleStartSync(row.original.id, row.original.name)}>
                                <i className='ri-play-circle-line text-[20px] text-textSecondary' />
                            </IconButton>
                        </Tooltip>
                    </div>
                ),
                enableSorting: false
            })
        ],
        [locale, router]
    )

    const table = useReactTable({
        data,
        columns,
        filterFns: { fuzzy: fuzzyFilter },
        pageCount: Math.ceil(totalCount / limit),
        manualPagination: true,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getFacetedMinMaxValues: getFacetedMinMaxValues()
    })

    return (
        <>
            <Card className='mb-6'>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {[
                        { icon: 'ri-add-line', title: 'XML Ekle', description: 'Yeni XML tedarikçi ekle.', onClick: () => setAddModalOpen(true), color: '#2e263d', loading: false },
                        { icon: 'ri-refresh-line', title: 'XML Ürünleri Senkronize Et', description: 'XML kaynaklarından ürünleri çek ve güncelle.', onClick: handleDiaMatch, color: '#2e263d', loading: diaMatchLoading },
                        { icon: 'ri-file-excel-2-line', title: "XML Ürünleri Excel'e Aktar", description: 'Tüm XML ürünlerini Excel dosyası olarak indir.', onClick: handleExportExcel, color: '#2e263d', loading: exporting },
                        { icon: 'ri-links-line', title: 'XML Ürünleri Eşleşme Listesi', description: 'XML ürünlerinin DIA eşleşmelerini yönet.', onClick: () => router.push(`/${locale}/apps/modules/xml/mapping`), color: '#2e263d', loading: false }
                    ].map((menu, index) => (
                        <div key={index} style={{ width: '25%' }}>
                            <div
                                className='flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-all'
                                onClick={menu.loading ? undefined : menu.onClick}
                            >
                                <div className='flex items-center justify-center w-12 h-12 rounded-lg' style={{ backgroundColor: `${menu.color}15` }}>
                                    {menu.loading ? <CircularProgress size={24} /> : <i className={`${menu.icon} text-2xl`} style={{ color: menu.color }} />}
                                </div>
                                <div className='flex-1'>
                                    <Typography variant='h6' className='mb-1' style={{ color: menu.color }}>{menu.title}</Typography>
                                    <Typography variant='body2' color='text.secondary'>{menu.description}</Typography>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <Card>
                <CardHeader
                    title='XML Tedarikçi Listesi'
                    className='pbe-4'
                />
                <Divider />
                <div className='flex items-start justify-between max-sm:flex-col sm:items-center gap-y-4 p-5'>
                    <div className='flex flex-col gap-2'>
                        <DebouncedInput
                            value={searchValue}
                            onChange={value => {
                                setSearchValue(String(value))
                                setDebouncedSearch(String(value))
                            }}
                            placeholder='Entegrasyon adı ile ara...'
                            debounce={500}
                            sx={{ minWidth: 300 }}
                        />
                        <Typography variant='body2' color='text.secondary'>
                            Toplam <strong>{totalCount} Entegrasyon</strong> bulundu
                        </Typography>
                    </div>
                </div>

                <div style={{ position: 'relative' }}>
                    {loading && (
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(255,255,255,0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            minHeight: '200px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <CircularProgress size={24} />
                                <Typography>Entegrasyonlar yükleniyor...</Typography>
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
                            {data.length === 0 && !loading ? (
                                <tbody>
                                    <tr>
                                        <td colSpan={table.getVisibleFlatColumns().length} className='text-center py-4'>
                                            <Typography variant='body1' color='text.secondary'>
                                                {searchValue ? 'Arama kriterlerinize uygun entegrasyon bulunamadı' : 'Entegrasyon bulunamadı'}
                                            </Typography>
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
                    rowsPerPageOptions={[10, 20, 50]}
                    component='div'
                    className='border-bs'
                    count={totalCount}
                    rowsPerPage={limit}
                    page={page - 1}
                    onPageChange={(_, newPage) => setPage(newPage + 1)}
                    onRowsPerPageChange={e => {
                        setLimit(Number(e.target.value))
                        setPage(1)
                    }}
                    labelRowsPerPage='Sayfa başına:'
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                />

                <XmlEditModal
                    open={editModalOpen}
                    onClose={handleCloseEditModal}
                    integrationId={selectedIntegrationId}
                    onSuccess={handleEditSuccess}
                />

                <XmlAddModal
                    open={addModalOpen}
                    onClose={() => setAddModalOpen(false)}
                    onSuccess={handleAddSuccess}
                />
            </Card>
        </>
    )
}

export default XmlListTable