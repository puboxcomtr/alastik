export type CargoProviderOption = {
    code: string
    name: string
}

export const CARGO_PROVIDERS: CargoProviderOption[] = [
    { code: 'aras', name: 'Aras Kargo' },
    { code: 'byexpress', name: 'Byexpress Kargo' },
    { code: 'gelal', name: 'Gelal Kargo' },
    { code: 'hepsijet', name: 'Hepsijet Kargo' },
    { code: 'hts', name: 'HTS Kargo' },
    { code: 'interline_express', name: 'Interline Express Kargo' },
    { code: 'mng', name: 'MNG Kargo' },
    { code: 'ptt', name: 'PTT Kargo' },
    { code: 'ptt_global', name: 'PTT Kargo Global' },
    { code: 'sendeo', name: 'Sendeo Kargo' },
    { code: 'surat', name: 'Sürat Kargo' },
    { code: 'ups', name: 'UPS Kargo' },
    { code: 'yurtici', name: 'Yurtiçi Kargo' },
    { code: 'service_point', name: 'Servis Noktasından Teslim' }
]