'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'

import type { QueryRow } from '../types'

import { formatDecimal, formatNumber, formatPercent } from '@/views/analytics/reports/format'

import tableStyles from '@core/styles/table.module.css'

import EmptyState from '@/views/analytics/reports/EmptyState'

type QueryTableCardProps = {
    title: string
    subheader?: string
    keyLabel: string
    rows: QueryRow[]
    formatKey?: (key: string) => string
    href?: (key: string) => string | null
}

const QueryTableCard = ({ title, subheader, keyLabel, rows, formatKey, href }: QueryTableCardProps) => {
    return (
        <Card className='bs-full'>
            <CardHeader title={title} subheader={subheader} />
            {rows.length === 0 ? (
                <EmptyState />
            ) : (
                <div className='overflow-x-auto'>
                    <table className={tableStyles.table}>
                        <thead>
                            <tr>
                                <th>{keyLabel}</th>
                                <th className='text-end'>Tıklama</th>
                                <th className='text-end'>Gösterim</th>
                                <th className='text-end'>CTR</th>
                                <th className='text-end'>Pozisyon</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => {
                                const label = formatKey ? formatKey(row.key) : row.key
                                const link = href ? href(row.key) : null

                                return (
                                    <tr key={row.key}>
                                        <td className='max-is-[420px]'>
                                            {link ? (
                                                <a href={link} target='_blank' rel='noreferrer' className='truncate block' title={row.key}>
                                                    <Typography color='primary.main' className='truncate'>{label}</Typography>
                                                </a>
                                            ) : (
                                                <Typography className='truncate' title={row.key}>{label}</Typography>
                                            )}
                                        </td>
                                        <td className='text-end' style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(row.clicks)}</td>
                                        <td className='text-end' style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(row.impressions)}</td>
                                        <td className='text-end' style={{ fontVariantNumeric: 'tabular-nums' }}>{formatPercent(row.ctr)}</td>
                                        <td className='text-end' style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDecimal(row.position, 1)}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    )
}

export default QueryTableCard
