export const ORDER_STATUS = {
    CONFIRMED: 'confirmed',
    PENDING: 'pending',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
} as const

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    [ORDER_STATUS.CONFIRMED]: 'Onaylandı',
    [ORDER_STATUS.PENDING]: 'Beklemede',
    [ORDER_STATUS.PROCESSING]: 'İşleniyor',
    [ORDER_STATUS.SHIPPED]: 'Kargoda',
    [ORDER_STATUS.DELIVERED]: 'Teslim Edildi',
    [ORDER_STATUS.CANCELLED]: 'İptal'
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, 'success' | 'warning' | 'info' | 'primary' | 'error'> = {
    [ORDER_STATUS.CONFIRMED]: 'success',
    [ORDER_STATUS.PENDING]: 'warning',
    [ORDER_STATUS.PROCESSING]: 'info',
    [ORDER_STATUS.SHIPPED]: 'primary',
    [ORDER_STATUS.DELIVERED]: 'success',
    [ORDER_STATUS.CANCELLED]: 'error'
}