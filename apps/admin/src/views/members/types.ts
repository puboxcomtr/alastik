
export type MemberStatus = 'pending' | 'active' | 'suspended' | 'deleted'

export type MemberRow = {
    _id: string
    memberNo?: number
    firstName: string
    lastName: string
    email: string
    phone?: string
    status: MemberStatus
    diaCustomerCode?: string
    orderCount: number
    totalSpend: number
    lastOrderAt?: string | null
    createdAt: string
    lastLoginAt?: string | null
    adminTags?: string[]
    adminNote?: string
    cart?: { itemCount: number; total: number } | null
    diaCreatedAt?: string | null
    salespersonName?: string
    premium?: boolean
    invoiceCount12m?: number
}

export type MemberOrder = {
    _id: string
    orderNumber: string
    status: string
    payment?: { status?: string; method?: string }
    pricing?: { total?: number }
    items?: { quantity: number }[]
    createdAt: string
}

export type MemberAddress = {
    _id: string
    addressName?: string
    fullName?: string
    phone?: string
    cityName?: string
    districtName?: string
    addressDescription?: string
    addressNote?: string
    isDefault?: boolean
    createdAt?: string
}

export type TimelineEntry = {
    type: 'register' | 'activate' | 'login' | 'order'
    title: string
    subtitle?: string
    orderId?: string
    status?: string
    at: string
}

export type MemberCartItem = {
    productName: string
    brandName: string
    quantity: number
    unitPrice: number
    lineTotal: number
}

export type MemberCart = {
    itemCount: number
    total: number
    updatedAt?: string | null
    items: MemberCartItem[]
}

export type MemberVehicle = {
    _id: string
    makeName: string
    modelName: string
    year?: number | null
    plateNumber?: string
    imageUrl?: string
    isPrimary?: boolean
    createdAt?: string
}

export type MemberDetail = {
    member: MemberRow & { marketingConsent?: boolean; activatedAt?: string | null; diaCustomerKey?: string; site?: string }
    orders: MemberOrder[]
    addresses: MemberAddress[]
    favouriteCount: number
    cart?: MemberCart | null
    vehicles?: MemberVehicle[]
    stats: {
        orders: number
        paidOrders: number
        totalSpend: number
        cancelledOrders: number
        unitsBought: number
        firstOrderAt?: string | null
        lastOrderAt?: string | null
        avgOrderValue: number
    }
    timeline: TimelineEntry[]
}

export const STATUS_META: Record<MemberStatus, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
    active: { label: 'Aktif', color: 'success' },
    pending: { label: 'Onay Bekliyor', color: 'warning' },
    suspended: { label: 'Askıda', color: 'error' },
    deleted: { label: 'Silinmiş', color: 'default' }
}

export const ORDER_STATUS_META: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'default' }> = {
    pending: { label: 'Onay Bekliyor', color: 'warning' },
    confirmed: { label: 'Onaylandı', color: 'info' },
    processing: { label: 'Hazırlanıyor', color: 'info' },
    shipped: { label: 'Kargoya Verildi', color: 'primary' },
    delivered: { label: 'Tamamlandı', color: 'success' },
    cancelled: { label: 'İptal Edildi', color: 'error' },
    returned: { label: 'İade', color: 'error' },
    awaiting_payment: { label: 'Ödeme Bekleniyor', color: 'warning' },
    payment_failed: { label: 'Ödeme Başarısız', color: 'error' }
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
    paid: 'Ödendi',
    pending: 'Bekliyor',
    failed: 'Başarısız',
    refunded: 'İade Edildi',
    cancelled: 'İptal'
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
    credit_card: 'Kredi Kartı',
    credit_card_3d: 'Kredi Kartı (3D)',
    bank_transfer: 'Havale/EFT',
    cash_on_delivery: 'Kapıda Ödeme',
    netahsilat_installment: 'Kredi Kartı (Taksitli)'
}

export const fullName = (m: { firstName?: string; lastName?: string; email?: string }) =>
    `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email || 'Üye'

export const initials = (m: { firstName?: string; lastName?: string; email?: string }) => {
    const parts = [m.firstName, m.lastName].filter(Boolean).map(p => String(p).charAt(0).toUpperCase())

    return parts.join('') || (m.email || 'Ü').charAt(0).toUpperCase()
}

export const formatTRY = (value: number) =>
    (Number(value) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export const formatShortDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export const formatDateTime = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export const timeAgo = (iso?: string | null) => {
    if (!iso) return '—'
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (min < 1) return 'az önce'
    if (min < 60) return `${min} dakika önce`
    const hours = Math.floor(min / 60)
    if (hours < 24) return `${hours} saat önce`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days} gün önce`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months} ay önce`
    return `${Math.floor(months / 12)} yıl önce`
}

export const lastActivityOf = (m: { lastLoginAt?: string | null; lastOrderAt?: string | null }) => {
    const candidates = [m.lastLoginAt, m.lastOrderAt].filter(Boolean) as string[]
    if (!candidates.length) return null
    return candidates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
}
