'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'

import Link from 'next/link'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'

import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Checkbox from '@mui/material/Checkbox'
import Collapse from '@mui/material/Collapse'
import Grid from '@mui/material/Grid2'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

import classnames from 'classnames'
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
// eslint-disable-next-line import/no-duplicates
import type { ColumnDef, SortingState, Updater } from '@tanstack/react-table'
import { toast } from 'react-toastify'

import MemberTableFilters from './MemberTableFilters'
import MemberAnnotateDialog from './MemberAnnotateDialog'
import MemberDeleteDialog from './MemberDeleteDialog'
import type { MemberFilters } from './MemberTableFilters'

import { API_ENDPOINTS, fetchAPI } from '@libs/api'
import { getActiveSite, getMemberMenuLabels } from '@/utils/activeSite'

import tableStyles from '@core/styles/table.module.css'

import type { MemberRow } from './types'
import { fullName, formatTRY, formatDate, formatShortDate } from './types'

const columnHelper = createColumnHelper<MemberRow>()

const basHarfBuyuk = (s: string) =>
    s.split(/\s+/).filter(Boolean)
        .map(k => (/\d/.test(k) ? k.toLocaleUpperCase('tr-TR') : k.charAt(0).toLocaleUpperCase('tr-TR') + k.slice(1).toLocaleLowerCase('tr-TR')))
        .join(' ')

const MembersView = () => {
    const { lang: locale } = useParams()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const sort = searchParams.get('sort') || ''
    const order: 'asc' | 'desc' = searchParams.get('order') === 'asc' ? 'asc' : 'desc'
    const sorting = useMemo<SortingState>(() => (sort ? [{ id: sort, desc: order === 'desc' }] : []), [sort, order])

    const updateQuery = useCallback(
        (changes: Record<string, string | number | null>) => {
            const query = new URLSearchParams(searchParams.toString())

            Object.entries(changes).forEach(([key, value]) => {
                if (value === null || value === '') query.delete(key)
                else query.set(key, String(value))
            })
            router.push(`${pathname}?${query.toString()}`, { scroll: false })
        },
        [router, pathname, searchParams]
    )

    const setPage = useCallback((p: number) => {
        if (p !== page) updateQuery({ page: p })
    }, [updateQuery, page])

    const handleSortingChange = (updater: Updater<SortingState>) => {
        const next = typeof updater === 'function' ? updater(sorting) : updater
        const first = next[0]

        updateQuery({ sort: first ? first.id : null, order: first ? (first.desc ? 'desc' : 'asc') : null, page: 1 })
    }

    useEffect(() => {
        if (!searchParams.get('page')) {
            const query = new URLSearchParams(searchParams.toString())

            query.set('page', '1')
            router.replace(`${pathname}?${query.toString()}`, { scroll: false })
        }
    }, [searchParams, router, pathname])

    const [rowSelection, setRowSelection] = useState({})
    const [data, setData] = useState<MemberRow[]>([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState<MemberFilters & { email?: string; phone?: string; salesperson?: string; tier?: string }>({ search: '', status: '', hasOrders: '', from: '', to: '' })

    const [cariMode, setCariMode] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [cariSearch, setCariSearch] = useState('')

    const EMPTY_CARI_FILTERS = { email: '', phone: '', status: '', salesperson: '', tier: '', hasOrders: '', from: '', to: '' }
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [draft, setDraft] = useState({ ...EMPTY_CARI_FILTERS })

    const applyCariFilters = () => {
        setFilters(f => ({ ...f, ...draft }))
        setPage(1)
        setFiltersOpen(false)
    }

    const resetCariFilters = () => {
        setDraft({ ...EMPTY_CARI_FILTERS })
        setCariSearch('')
        setFilters(f => ({ ...f, ...EMPTY_CARI_FILTERS, search: '' }))
        setPage(1)
        setFiltersOpen(false)
    }

    const updateDraft = (field: keyof typeof EMPTY_CARI_FILTERS) => (e: ChangeEvent<HTMLInputElement>) =>
        setDraft(d => ({ ...d, [field]: e.target.value }))

    const activeCariFilterCount = (Object.keys(EMPTY_CARI_FILTERS) as (keyof typeof EMPTY_CARI_FILTERS)[]).filter(key => String(filters[key] || '').trim() !== '').length

    useEffect(() => {
        setCariMode(!!getMemberMenuLabels(getActiveSite()))
    }, [])

    const [salespersonOptions, setSalespersonOptions] = useState<{ name: string; count: number }[]>([])
    const [unassignedSalesperson, setUnassignedSalesperson] = useState<{ value: string; count: number } | null>(null)

    useEffect(() => {
        if (!cariMode) return
        fetchAPI(API_ENDPOINTS.members.salespersonOptions(), { cache: 'no-store' })
            .then(res => {
                setSalespersonOptions(res?.success ? res.data || [] : [])
                setUnassignedSalesperson(res?.success && res.unassigned?.value ? res.unassigned : null)
            })
            .catch(error => console.error('Salesperson options fetch error:', error))
    }, [cariMode])

    useEffect(() => {
        if (!cariMode) return

        if (cariSearch === (filters.search || '')) return

        const timer = setTimeout(() => {
            setFilters(f => ({ ...f, search: cariSearch }))
            setPage(1)
        }, 400)

        
return () => clearTimeout(timer)
    }, [cariSearch, cariMode]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleSyncDia = async () => {
        try {
            setSyncing(true)
            const res = await fetchAPI(API_ENDPOINTS.members.syncDia(), { method: 'POST' })

            if (res?.success) {
                toast.success(res.message || 'Cari senkronu tamamlandı')
                setFilters(f => ({ ...f }))
            } else {
                toast.error(res?.message || 'Cari senkronu başarısız')
            }
        } catch (error) {
            toast.error('Cari senkronu sırasında hata oluştu')
        } finally {
            setSyncing(false)
        }
    }

    const [limit, setLimit] = useState(50)
    const [totalCount, setTotalCount] = useState(0)

    const [annotateMember, setAnnotateMember] = useState<MemberRow | null>(null)
    const [deleteMember, setDeleteMember] = useState<MemberRow | null>(null)

    useEffect(() => {
        let cancelled = false

        const fetchMembers = async () => {
            setLoading(true)

            try {
                const res = await fetchAPI(
                    API_ENDPOINTS.members.list({ ...filters, page, limit, view: 'table', sort: sort || undefined, order: sort ? order : undefined }),
                    { cache: 'no-store' }
                )

                if (cancelled) return

                if (res.success) {
                    setData(res.data || [])
                    setTotalCount(res.meta?.total || 0)
                } else {
                    toast.error(res.message || 'Üyeler yüklenemedi')
                }
            } catch (error) {
                if (cancelled) return
                console.error('Members fetch error:', error)
                toast.error('Üyeler yüklenemedi')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchMembers()

        return () => {
            cancelled = true
        }
    }, [filters, page, limit, sort, order])

    const columns = useMemo<ColumnDef<MemberRow, any>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={table.getIsAllRowsSelected()}
                        indeterminate={table.getIsSomeRowsSelected()}
                        onChange={table.getToggleAllRowsSelectedHandler()}
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox checked={row.getIsSelected()} disabled={!row.getCanSelect()} onChange={row.getToggleSelectedHandler()} />
                )
            },
            columnHelper.accessor('firstName', {
                header: 'Üye',
                cell: ({ row }) => {
                    const m = row.original

                    return (
                        <div className='flex flex-col' style={{ maxWidth: 260 }}>
                            <Tooltip title={fullName(m)}>
                                <Link href={`/${locale}/apps/user/view/${m.memberNo ?? m._id}`}>
                                    <Typography variant='body2' fontWeight='bold' color='text.primary' noWrap>{fullName(m)}</Typography>
                                </Link>
                            </Tooltip>
                            {m.premium ? (
                                <div className='mbs-1'>
                                    <Chip size='small' variant='tonal' color='warning' icon={<i className='ri-vip-crown-fill' />} label='Premium' />
                                </div>
                            ) : null}
                            <Typography variant='body2' color='text.secondary' noWrap title={m.email}>{m.email}</Typography>
                            {m.adminTags?.length ? (
                                <div className='flex flex-wrap gap-1 mbs-1'>
                                    {m.adminTags.map(tag => <Chip key={tag} size='small' variant='tonal' color='primary' label={tag} />)}
                                </div>
                            ) : null}
                        </div>
                    )
                }
            }),

            ...(cariMode ? [] : [columnHelper.accessor('phone', {
                header: 'Telefon',
                cell: ({ row }) => <Typography variant='body2'>{row.original.phone || '—'}</Typography>
            })]),
            ...(cariMode
                ? [
                      columnHelper.accessor('diaCreatedAt', {
                          header: 'DIA Kayıt Tarihi',
                          cell: ({ row }) => (
                              <Typography variant='body2'>{row.original.diaCreatedAt ? formatDate(row.original.diaCreatedAt) : '—'}</Typography>
                          )
                      }),
                      columnHelper.accessor('invoiceCount12m', {
                          header: 'Sipariş (12 Ay)',
                          cell: ({ row }) => {
                              const n = row.original.invoiceCount12m || 0

                              return (
                                  <Typography variant='body2' fontWeight='bold' color={n ? 'text.primary' : 'text.secondary'}>
                                      {n.toLocaleString('tr-TR')}
                                  </Typography>
                              )
                          }
                      }),
                      columnHelper.accessor('salespersonName', {
                          header: 'Plasiyer',
                          cell: ({ row }) => (
                              <Typography variant='body2' color={row.original.salespersonName ? 'text.primary' : 'text.disabled'}>
                                  {row.original.salespersonName ? basHarfBuyuk(row.original.salespersonName) : '—'}
                              </Typography>
                          )
                      })
                  ]
                : [
                      columnHelper.accessor('createdAt', {
                          header: 'Kayıt Tarihi',
                          cell: ({ row }) => <Typography variant='body2'>{formatDate(row.original.createdAt)}</Typography>
                      }),
                      columnHelper.accessor('orderCount', {
                          header: 'Sipariş',
                          cell: ({ row }) => (
                              <Typography variant='body2' fontWeight='bold' color={row.original.orderCount ? 'text.primary' : 'text.secondary'}>
                                  {row.original.orderCount.toLocaleString('tr-TR')}
                              </Typography>
                          )
                      }),
                      columnHelper.accessor('totalSpend', {
                          header: 'Toplam Harcama',
                          cell: ({ row }) => (
                              <Typography variant='body2' fontWeight='bold' color={row.original.totalSpend ? 'text.primary' : 'text.secondary'}>
                                  {row.original.totalSpend ? `${formatTRY(row.original.totalSpend)} TL` : '—'}
                              </Typography>
                          )
                      })
                  ]),
            columnHelper.accessor('lastLoginAt', {
                header: 'Son Giriş',
                cell: ({ row }) => (
                    <Typography variant='body2' color={row.original.lastLoginAt ? 'text.primary' : 'text.disabled'} noWrap>
                        {formatShortDate(row.original.lastLoginAt)}
                    </Typography>
                )
            }),
            ...(cariMode ? [] : [columnHelper.display({
                id: 'cart',
                header: 'Sepeti',
                cell: ({ row }) => {
                    const cart = row.original.cart

                    return cart && cart.itemCount > 0 ? (
                        <Chip size='small' variant='tonal' color='success' icon={<i className='ri-shopping-cart-2-line' />} label={`${cart.itemCount} adet · ${formatTRY(cart.total)} TL`} />
                    ) : (
                        <Typography variant='body2' color='text.disabled'>—</Typography>
                    )
                }
            })]),
            columnHelper.display({
                id: 'actions',
                header: 'İşlemler',
                cell: ({ row }) => (
                    <div className='flex items-center'>
                        <Tooltip title='Üye Detayı'>
                            <Link href={`/${locale}/apps/user/view/${row.original.memberNo ?? row.original._id}`}>
                                <IconButton size='small'><i className='ri-eye-line' /></IconButton>
                            </Link>
                        </Tooltip>
                        <Tooltip title='Etiket / Not'>
                            <IconButton size='small' onClick={() => setAnnotateMember(row.original)}><i className='ri-edit-box-line' /></IconButton>
                        </Tooltip>
                        {row.original.status !== 'deleted' ? (
                            <Tooltip title='Üyeyi Sil'>
                                <IconButton size='small' onClick={() => setDeleteMember(row.original)}><i className='ri-delete-bin-line' /></IconButton>
                            </Tooltip>
                        ) : null}
                    </div>
                )
            })
        ],
        [locale, cariMode]
    )

    const table = useReactTable({
        data,
        columns,
        state: { rowSelection, sorting },
        pageCount: Math.ceil(totalCount / limit),
        manualPagination: true,
        manualSorting: true,
        onSortingChange: handleSortingChange,
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel()
    })

    return (
        <>
            <Card>
                {cariMode ? (
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', p: 4 }}>
                        <Badge badgeContent={activeCariFilterCount} color='primary'>
                            <Button
                                variant='outlined'
                                color='secondary'
                                startIcon={<i className='ri-filter-3-line' />}
                                endIcon={<i className={filtersOpen ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />}
                                onClick={() => setFiltersOpen(open => !open)}
                                sx={{ minWidth: 140 }}
                            >
                                Filtreler
                            </Button>
                        </Badge>
                        <TextField
                            size='small'
                            value={cariSearch}
                            onChange={e => setCariSearch(e.target.value)}
                            placeholder='Cari adı, cari kodu veya e-postaya göre arama yapabilirsiniz...'
                            sx={{ flex: 1, minWidth: 280 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position='start'>
                                        <i className='ri-search-line' />
                                    </InputAdornment>
                                )
                            }}
                        />
                        <Button
                            variant='contained'
                            disabled={syncing}
                            onClick={handleSyncDia}
                            startIcon={syncing ? <CircularProgress size={18} color='inherit' /> : <i className='ri-refresh-line' />}
                            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                            {syncing ? 'Senkronize Ediliyor...' : 'Carileri Senkronize Et'}
                        </Button>
                    </Box>
                ) : (
                    <MemberTableFilters onFilterChange={f => { setFilters(f); setPage(1) }} />
                )}
                {cariMode && (
                    <Collapse in={filtersOpen} timeout='auto' unmountOnExit>
                        <Divider />
                        <Box sx={{ p: 6 }}>
                            <Grid container spacing={4} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCariFilters() } }}>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField fullWidth size='small' label='E-posta' value={draft.email} onChange={updateDraft('email')} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField fullWidth size='small' label='Telefon' value={draft.phone} onChange={updateDraft('phone')} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField select fullWidth size='small' label='Durum' value={draft.status} onChange={updateDraft('status')}>
                                        <MenuItem value=''>Tümü</MenuItem>
                                        <MenuItem value='active'>Aktif</MenuItem>
                                        <MenuItem value='suspended'>Pasif</MenuItem>
                                        <MenuItem value='pending'>Onay Bekliyor</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField select fullWidth size='small' label='Plasiyer' value={draft.salesperson} onChange={updateDraft('salesperson')}>
                                        <MenuItem value=''>Tümü</MenuItem>
                                        {unassignedSalesperson && <MenuItem value={unassignedSalesperson.value}>Atanmamış</MenuItem>}
                                        {salespersonOptions.map(option => (
                                            <MenuItem key={option.name} value={option.name}>{basHarfBuyuk(option.name)}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField select fullWidth size='small' label='Cari Tipi' value={draft.tier} onChange={updateDraft('tier')}>
                                        <MenuItem value=''>Tümü</MenuItem>
                                        <MenuItem value='premium'>Premium Cari</MenuItem>
                                        <MenuItem value='normal'>Normal Cari</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField select fullWidth size='small' label='Sipariş Durumu' value={draft.hasOrders} onChange={updateDraft('hasOrders')}>
                                        <MenuItem value=''>Tümü</MenuItem>
                                        <MenuItem value='yes'>Sipariş Vermiş</MenuItem>
                                        <MenuItem value='no'>Sipariş Vermemiş</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex', gap: 2 }}>
                                    <TextField fullWidth size='small' type='date' label='Kayıt Tarihi (Başlangıç)' value={draft.from} onChange={updateDraft('from')} slotProps={{ inputLabel: { shrink: true } }} />
                                    <TextField fullWidth size='small' type='date' label='Kayıt Tarihi (Bitiş)' value={draft.to} onChange={updateDraft('to')} slotProps={{ inputLabel: { shrink: true } }} />
                                </Grid>

                                <Grid size={{ xs: 12 }} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                                    <Button variant='outlined' color='secondary' onClick={resetCariFilters}>
                                        Temizle
                                    </Button>
                                    <Button variant='contained' onClick={applyCariFilters}>
                                        Filtrele
                                    </Button>
                                </Grid>
                            </Grid>
                        </Box>
                    </Collapse>
                )}
                <Divider />
                <div style={{ position: 'relative' }}>
                    {loading && (
                        <div
                            className='flex items-center justify-center'
                            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 1000, minHeight: '200px' }}
                        >
                            <div className='flex items-center gap-3'>
                                <CircularProgress size={24} />
                                <Typography>Üyeler yükleniyor...</Typography>
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
                                                        {{ asc: <i className='ri-arrow-up-s-line text-xl' />, desc: <i className='ri-arrow-down-s-line text-xl' /> }[
                                                            header.column.getIsSorted() as 'asc' | 'desc'
                                                        ] ?? null}
                                                    </div>
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            {table.getRowModel().rows.length === 0 ? (
                                <tbody>
                                    <tr>
                                        <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                                            Üye Bulunamadı
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
                    rowsPerPageOptions={[50, 100, 200, 500]}
                    component='div'
                    className='border-bs'
                    count={totalCount}
                    rowsPerPage={limit}
                    page={page - 1}
                    onPageChange={(_, newPage) => setPage(newPage + 1)}
                    onRowsPerPageChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
                />
            </Card>

            <MemberAnnotateDialog
                member={annotateMember}
                onClose={() => setAnnotateMember(null)}
                onSaved={(id, adminTags, adminNote) => setData(rows => rows.map(r => (r._id === id ? { ...r, adminTags, adminNote } : r)))}
            />
            <MemberDeleteDialog
                member={deleteMember}
                onClose={() => setDeleteMember(null)}
                onDeleted={id => setData(rows => rows.map(r => (r._id === id ? { ...r, status: 'deleted' } : r)))}
            />
        </>
    )
}

export default MembersView
