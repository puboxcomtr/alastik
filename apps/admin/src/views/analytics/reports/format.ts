// Raporlar sayfası biçimlendirme yardımcıları (tr-TR)

export const toNumber = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : 0

export const formatNumber = (value: number): string => toNumber(value).toLocaleString('tr-TR')

export const formatDecimal = (value: number, maximumFractionDigits = 1): string =>
    toNumber(value).toLocaleString('tr-TR', { maximumFractionDigits })

export const formatTRY = (value: number): string =>
    `${toNumber(value).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`

export const formatPercent = (value: number): string => `%${formatDecimal(value, 1)}`

// Eksen etiketleri için kısa sayı: 1.250 -> 1,3k, 2.400.000 -> 2,4M
export const formatCompact = (value: number): string => {
    const n = toNumber(value)
    const abs = Math.abs(n)

    if (abs >= 1_000_000) return `${formatDecimal(n / 1_000_000, 1)}M`
    if (abs >= 1_000) return `${formatDecimal(n / 1_000, 1)}k`

    return formatDecimal(n, 0)
}

export const formatDateLong = (iso: string | null | undefined): string => {
    if (!iso) return ''

    const date = new Date(iso)

    if (Number.isNaN(date.getTime())) return ''

    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// <input type="date"> için yerel tarih -> YYYY-MM-DD
export const toDateInputValue = (date: Date): string => {
    const y = date.getFullYear()
    const m = `${date.getMonth() + 1}`.padStart(2, '0')
    const d = `${date.getDate()}`.padStart(2, '0')

    return `${y}-${m}-${d}`
}
