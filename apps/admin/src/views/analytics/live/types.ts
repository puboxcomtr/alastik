
export type LiveBehavior = {
    addedToCart: number
    reachedCheckout: number
    ordered: number
}

export type LiveRecentSale = {
    orderNumber: string
    total: number
    createdAt: string
}

export type LiveVisitorLocation = {
    city: string
    count: number
}

export type LiveAnalyticsData = {
    updatedAt: string
    activeVisitors: number
    sessions30m: number
    ordersToday: number
    collectedToday: number
    behavior15m: LiveBehavior
    recentSales: LiveRecentSale[]
    visitorLocations: LiveVisitorLocation[]
    geoAvailable: boolean
}

export const formatTRY = (value: number) =>
    (Number.isFinite(value) ? value : 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatCount = (value: number) => (Number.isFinite(value) ? value : 0).toLocaleString('tr-TR')
