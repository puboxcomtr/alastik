
export type SeoPeriodKey = 'yesterday' | '7d' | '30d' | '6m' | '1y' | 'custom'

export type SeoPeriodSelection = {
    key: SeoPeriodKey
    from?: string
    to?: string
}

export type SeoPeriod = {
    key: SeoPeriodKey
    label: string
    start: string
    end: string
    prevStart: string
    prevEnd: string
    days: number
    granularity: 'day' | 'month'
    latestDate: string
    labels?: Record<string, string>
}

export type QueryRow = {
    key: string
    clicks: number
    impressions: number
    ctr: number
    position: number
    prevPosition?: number
    delta?: number
    clicksDelta?: number
}

export type SyncState = {
    running: boolean
    startedAt: string
    finishedAt: string | null
    startDate: string
    endDate: string
    total: number
    done: number
    rows: number
    error: string
} | null

export type ReportSource = {
    available: boolean
    hasData: boolean
    latestDate: string | null
    reason: string
    property: string | null
    setup: { serviceAccount: string; domain: string; steps: string[] } | null
    sync: SyncState
}

export type ReportTotals = {
    clicks: number
    impressions: number
    ctr: number
    position: number
    clicksTrend: number
    impressionsTrend: number
    ctrDelta: number
    positionDelta: number
    previous: { clicks: number; impressions: number; ctr: number; position: number }
}

export type SeriesPoint = { key: string; label: string; clicks: number; impressions: number }

export type TrackedKeyword = {
    _id: string
    keyword: string
    source: 'manual' | 'product' | 'search' | 'console'
    createdAt: string
    position: number | null
    prevPosition: number | null
    delta: number | null
    clicks: number
    impressions: number
    ctr: number
    prevClicks: number
}

export type ReportData = {
    period: SeoPeriod
    source: ReportSource
    totals: ReportTotals
    series: SeriesPoint[]
    queries: { top: QueryRow[]; winners: QueryRow[]; losers: QueryRow[]; fresh: QueryRow[]; total: number }
    buckets: { top3: number; top10: number; top50: number; beyond: number }
    pages: QueryRow[]
    tracked: TrackedKeyword[]
}

export type KeywordsData = {
    period: SeoPeriod
    hasData: boolean
    items: TrackedKeyword[]
}

export type KeywordSuggestion = { keyword: string; hint: string; source: 'console' | 'product' | 'search' }
export type KeywordSuggestions = { console: KeywordSuggestion[]; product: KeywordSuggestion[]; search: KeywordSuggestion[] }

export type ContentType = 'product' | 'page' | 'blog' | 'category' | 'brand' | 'tag'
export type ScoreStatus = 'good' | 'fair' | 'poor' | 'none'

export type SeoCheck = {
    key: string
    group: string
    label: string
    passed: boolean | null
    weight: number
    detail: string
}

export type ContentRow = {
    _id?: string
    site: string
    type: ContentType
    refId: string
    title: string
    url: string
    editPath: string
    contentStatus: string
    focusKeyword: string
    source: 'custom' | 'template' | 'empty'
    score: number
    status: ScoreStatus
    passed: number
    failed: number
    effective: { title: string; description: string; slug: string }
    scannedAt: string
}

export type KeywordUsage = { type: ContentType; refId: string; title: string; url: string; editPath: string }

export type ContentAnalysis = {
    score: number
    status: ScoreStatus
    passed: number
    failed: number
    skipped: number
    checks: SeoCheck[]
    stats: Record<string, unknown>
    keywordUsage?: KeywordUsage[]
}

export type ContentDetail = ContentRow & { checks: SeoCheck[]; analysis: ContentAnalysis }

export type ScanState = {
    running: boolean
    scanId: string
    startedAt: string
    finishedAt: string | null
    currentType: string
    byType: Record<string, number>
    total: number
    error: string
} | null

export type ContentSummary = {
    total: number
    byStatus: Partial<Record<ScoreStatus, number>>
    byType: Partial<Record<ContentType, { count: number; avgScore: number }>>
    lastScanAt: string | null
}

export type ContentListData = {
    items: ContentRow[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
    summary: ContentSummary
    scan: ScanState
}

export const TYPE_LABELS: Record<ContentType, string> = {
    product: 'Ürün',
    page: 'Sayfa',
    blog: 'Blog',
    category: 'Kategori',
    brand: 'Marka',
    tag: 'Etiket'
}

export const STATUS_LABELS: Record<ScoreStatus, string> = {
    good: 'İyi',
    fair: 'Eksik',
    poor: 'Zayıf',
    none: 'Yapılmadı'
}

export const STATUS_COLORS: Record<ScoreStatus, 'success' | 'warning' | 'error' | 'default'> = {
    good: 'success',
    fair: 'warning',
    poor: 'error',
    none: 'default'
}

export const SOURCE_LABELS: Record<ContentRow['source'], string> = {
    custom: 'Elle girildi',
    template: 'Şablon',
    empty: 'Boş'
}

export const SEO_PERIOD_LABELS: Record<SeoPeriodKey, string> = {
    yesterday: 'Bugün',
    '7d': 'Son 7 Gün',
    '30d': 'Son 30 Gün',
    '6m': 'Son 6 Ay',
    '1y': 'Son 1 Yıl',
    custom: 'Diğer tarihler'
}

export const buildPeriodQuery = (selection: SeoPeriodSelection): string => {
    if (selection.key === 'custom' && selection.from && selection.to) {
        return new URLSearchParams({ period: 'custom', from: selection.from, to: selection.to }).toString()
    }

    return `period=${selection.key}`
}
