// apps/admin/src/constants/paymentStatus.ts

export const PAYMENT_STATUS = {
    PAID: 'paid',
    PENDING: 'pending',
    CANCELLED: 'cancelled',
    FAILED: 'failed'
} as const

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS]

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
    [PAYMENT_STATUS.PAID]: 'Ödendi',
    [PAYMENT_STATUS.PENDING]: 'Beklemede',
    [PAYMENT_STATUS.CANCELLED]: 'İptal',
    [PAYMENT_STATUS.FAILED]: 'Başarısız'
}

export const PAYMENT_STATUS_COLORS: Record<string, { color: 'success' | 'warning' | 'secondary' | 'error', colorClassName: string }> = {
    [PAYMENT_STATUS.PAID]: {
        color: 'success',
        colorClassName: 'text-success'
    },
    [PAYMENT_STATUS.PENDING]: {
        color: 'warning',
        colorClassName: 'text-warning'
    },
    [PAYMENT_STATUS.CANCELLED]: {
        color: 'secondary',
        colorClassName: 'text-secondary'
    },
    [PAYMENT_STATUS.FAILED]: {
        color: 'error',
        colorClassName: 'text-error'
    }
}