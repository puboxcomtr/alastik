
export const formatTRY = (value: number) =>
    (Number(value) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatInt = (value: number) => (Number(value) || 0).toLocaleString('tr-TR')

export const timeAgo = (iso: string | Date) => {
    const diffMs = Date.now() - new Date(iso).getTime()
    const min = Math.floor(diffMs / 60000)
    if (min < 1) return 'az önce'
    if (min < 60) return `${min} dk önce`
    const hours = Math.floor(min / 60)
    if (hours < 24) return `${hours} sa önce`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days} gün önce`
    return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
}

export type StockStatus = 'in_stock' | 'low' | 'out' | 'unknown'

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

export type OverviewData = {
    stats: {
        totalOrders: number
        cancelledOrders: number
        awaitingApproval: number
        awaitingPayment: number
        activeProducts: number
        incompleteProducts: number
        lowStockProducts: number
    }
    orderActivity: { awaitingApproval: number; preparing: number; shipped: number; completed: number }
    customerGrowth: { thisMonth: number; lastMonth: number; total: number; trend: number }
    window: string
    salesMap: { city: string; total: number; count: number }[]
    seasonSplit: { totalUnits: number; items: { key: string; label: string; units: number; revenue: number; share: number }[] }
    rimSplit: { totalUnits: number; items: { inch: number; units: number; share: number }[] }
    topProducts: { all: TopProduct[]; month: TopProduct[]; week: TopProduct[] }
}
