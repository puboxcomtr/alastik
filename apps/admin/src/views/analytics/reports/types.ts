
export type PeriodKey = 'today' | 'week' | 'month' | 'last_month' | 'year' | 'custom'
export type Granularity = 'hour' | 'day' | 'month'
export type StockStatus = 'in_stock' | 'low' | 'out' | 'unknown'

export type PeriodSelection = {
    key: PeriodKey
    from?: string
    to?: string
}

export type ReportPeriod = {
    key: PeriodKey
    label: string
    start: string
    end: string
    granularity: Granularity
    sessionsSince: string | null
}

export type ReportKpis = {
    collected: number
    collectedTrend: number
    orders: number
    ordersTrend: number
    avgBasket: number
    cancelled: number
    unitsSold: number
    sessions: number
    sessionsTrend: number
    conversionRate: number
    returningCustomerRate: number
    shippedOrders: number
}

export type TimePoint = {
    key: string
    label: string
    value: number
}

export type SalesBreakdown = {
    gross: number
    refunds: number
    net: number
    shippingCollected: number
    collected: number
    avgOrderValue: number
}

export type Funnel = {
    sessions: number
    addedToCart: number
    addedToCartPct: number
    reachedCheckout: number
    reachedCheckoutPct: number
    ordered: number
    orderedPct: number
}

export type HourDensityPoint = {
    hour: number
    avg: number
}

export type HourDensity = {
    hours: HourDensityPoint[]
    peakHour: number
    avgPerDay: number
}

export type CountItem = {
    label: string
    count: number
}

export type MonthlyTrendPoint = {
    key: string
    label: string
    collected: number
    orders: number
}

export type TopProduct = {
    productKey: string
    stockCode: string
    name: string
    units: number
    revenue: number
    orders: number
    stock: number | null
    stockStatus: StockStatus
}

export type ReportsData = {
    period: ReportPeriod
    kpis: ReportKpis
    collectedOverTime: TimePoint[]
    salesBreakdown: SalesBreakdown
    sessionsOverTime: TimePoint[]
    funnel: Funnel
    hourDensity: HourDensity
    byDevice: CountItem[]
    byCity: CountItem[]
    byReferrer: CountItem[]
    byLandingPage: CountItem[]
    monthlyTrend: MonthlyTrendPoint[]
    topProducts: TopProduct[]
    geoAvailable: boolean
}
