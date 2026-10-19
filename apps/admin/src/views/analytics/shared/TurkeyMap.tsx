'use client'

import { useMemo } from 'react'

import Tooltip from '@mui/material/Tooltip'
import { useTheme } from '@mui/material/styles'

import { findProvince } from './turkeyProvinces'

export type TurkeyMapPoint = {
    city: string
    value: number
    label?: string
}

export type TurkeyMapProps = {
    points: TurkeyMapPoint[]
    valueLabel?: (value: number) => string
    height?: number
    color?: 'primary' | 'success'
}

const LON_MIN = 25.5
const LON_MAX = 45.0
const LAT_MIN = 35.7
const LAT_MAX = 42.3
const LAT_SCALE = Math.cos((39 * Math.PI) / 180)
const VIEW_W = 1000
const VIEW_H = Math.round((VIEW_W * (LAT_MAX - LAT_MIN)) / ((LON_MAX - LON_MIN) * LAT_SCALE))
const PAD = 12

const project = (lng: number, lat: number): [number, number] => {
    const x = PAD + ((lng - LON_MIN) / (LON_MAX - LON_MIN)) * (VIEW_W - PAD * 2)
    const y = PAD + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (VIEW_H - PAD * 2)

    return [x, y]
}

const TURKEY_OUTLINE: [number, number][] = [
    [26.05, 41.72],
    [26.6, 41.95],
    [27.3, 42.05],
    [28.0, 41.98],
    [28.6, 41.55],
    [29.05, 41.25],
    [29.6, 41.2],
    [30.4, 41.15],
    [31.3, 41.3],
    [32.2, 41.7],
    [33.2, 42.0],
    [34.2, 42.05],
    [35.2, 42.12],
    [35.5, 41.75],
    [36.2, 41.35],
    [37.0, 41.15],
    [38.4, 40.95],
    [39.7, 41.05],
    [40.5, 41.05],
    [41.5, 41.55],
    [42.6, 41.6],
    [43.4, 41.15],
    [43.7, 40.6],
    [43.65, 40.1],
    [44.4, 39.95],
    [44.8, 39.7],
    [44.4, 39.35],
    [44.05, 38.85],
    [44.4, 38.35],
    [44.3, 37.9],
    [44.8, 37.15],
    [44.3, 37.0],
    [43.4, 37.25],
    [42.7, 37.35],
    [42.35, 37.1],
    [41.9, 37.15],
    [41.0, 37.1],
    [40.2, 36.9],
    [39.2, 36.7],
    [38.4, 36.7],
    [37.5, 36.65],
    [36.8, 36.5],
    [36.7, 36.2],
    [36.4, 35.85],
    [36.0, 35.95],
    [35.95, 36.5],
    [35.8, 36.85],
    [35.5, 36.6],
    [34.9, 36.75],
    [34.1, 36.5],
    [33.4, 36.2],
    [32.85, 36.05],
    [32.0, 36.55],
    [31.0, 36.85],
    [30.55, 36.8],
    [30.3, 36.3],
    [29.6, 36.15],
    [29.1, 36.65],
    [28.4, 36.7],
    [28.0, 36.75],
    [27.4, 36.7],
    [27.6, 36.95],
    [27.3, 37.3],
    [27.35, 37.6],
    [27.2, 37.9],
    [26.3, 38.3],
    [26.7, 38.65],
    [26.6, 39.1],
    [26.9, 39.45],
    [26.35, 39.55],
    [26.15, 39.85],
    [26.2, 40.05],
    [26.45, 40.25],
    [26.75, 40.35],
    [27.6, 40.35],
    [27.9, 40.4],
    [28.85, 40.42],
    [29.05, 40.6],
    [29.45, 40.72],
    [29.1, 40.95],
    [28.95, 41.02],
    [28.2, 41.07],
    [27.5, 40.97],
    [27.0, 40.62],
    [26.7, 40.48],
    [26.2, 40.15],
    [26.6, 40.6],
    [26.05, 40.75],
    [26.35, 41.25]
]

const pointInPolygon = (lng: number, lat: number, polygon: [number, number][]): boolean => {
    let inside = false

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i]
        const [xj, yj] = polygon[j]
        const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi

        if (intersects) inside = !inside
    }

    return inside
}

const GRID_STEP = 0.27

const buildDotGrid = (): [number, number][] => {
    const dots: [number, number][] = []

    for (let lat = LAT_MIN + GRID_STEP / 2; lat < LAT_MAX; lat += GRID_STEP) {
        for (let lng = LON_MIN + GRID_STEP / 2; lng < LON_MAX; lng += GRID_STEP) {
            if (pointInPolygon(lng, lat, TURKEY_OUTLINE)) dots.push(project(lng, lat))
        }
    }

    return dots
}

const OUTLINE_PATH = TURKEY_OUTLINE.map(([lng, lat], index) => {
    const [x, y] = project(lng, lat)

    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
}).join(' ') + ' Z'

const DOT_GRID = buildDotGrid()

const MIN_RADIUS = 6
const MAX_RADIUS = 22

const defaultValueLabel = (value: number) => value.toLocaleString('tr-TR')

const TurkeyMap = ({ points, valueLabel = defaultValueLabel, height = 320, color = 'primary' }: TurkeyMapProps) => {
    const theme = useTheme()
    const bubbleColor = color === 'success' ? theme.palette.success.main : theme.palette.primary.main
    const dotColor = theme.palette.primary.light
    const outlineColor = theme.palette.divider

    const bubbles = useMemo(() => {
        const merged = new Map<string, { name: string; label?: string; x: number; y: number; value: number }>()

        for (const point of points ?? []) {
            const value = Number(point?.value)

            if (!point?.city || !Number.isFinite(value) || value <= 0) continue

            const province = findProvince(point.city)

            if (!province) continue

            const existing = merged.get(province.name)

            if (existing) {
                existing.value += value
            } else {
                const [x, y] = project(province.lng, province.lat)

                merged.set(province.name, { name: province.name, label: point.label, x, y, value })
            }
        }

        const list = Array.from(merged.values())
        const maxValue = list.reduce((max, item) => Math.max(max, item.value), 0)

        return list
            .map(item => {
                const ratio = maxValue > 0 ? Math.sqrt(item.value / maxValue) : 0
                const radius = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * ratio

                return { ...item, radius }
            })
            .sort((a, b) => b.radius - a.radius)
    }, [points])

    return (
        <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            width='100%'
            height={height}
            preserveAspectRatio='xMidYMid meet'
            role='img'
            aria-label='Türkiye haritası'
            style={{ display: 'block', overflow: 'visible' }}
        >
            <path d={OUTLINE_PATH} fill='none' stroke={outlineColor} strokeWidth={1.5} strokeLinejoin='round' />
            <g fill={dotColor} fillOpacity={0.35}>
                {DOT_GRID.map(([x, y], index) => (
                    <circle key={index} cx={x} cy={y} r={2} />
                ))}
            </g>
            {bubbles.map(bubble => (
                <Tooltip
                    key={bubble.name}
                    title={`${bubble.label ?? bubble.name} — ${valueLabel(bubble.value)}`}
                    arrow
                    placement='top'
                >
                    <g style={{ cursor: 'pointer' }}>
                        <circle cx={bubble.x} cy={bubble.y} r={bubble.radius + 8} fill='transparent' />
                        <circle cx={bubble.x} cy={bubble.y} r={bubble.radius + 5} fill={bubbleColor} fillOpacity={0.2} />
                        <circle
                            cx={bubble.x}
                            cy={bubble.y}
                            r={bubble.radius}
                            fill={bubbleColor}
                            fillOpacity={0.85}
                            stroke={theme.palette.background.paper}
                            strokeWidth={2}
                        />
                    </g>
                </Tooltip>
            ))}
        </svg>
    )
}

export default TurkeyMap
