export type XmlProductStatus = 'pending' | 'synced_to_dia' | 'filtered_out' | 'error' | 'mapped'
export type XmlProductType = {
    id: string
    sourceProductId: string
    source: string
    status: XmlProductStatus
    errorMessage: string | null
    createdAt: string
    updatedAt: string
    lastFetchedAt: string | null
    lastMappedAt: string | null
    lastSyncedToDiaAt: string | null
    syncHash: string | null
    diaKey: string | null

    stokKodu: string
    urunAdi: string
    marka: string
    hamFiyat: string
    stokAdeti: string
    gorselUrl: string
    mevsim: string
    uretimYili: string
    kategori: string
    aciklama: string
    barkod: string
    genislik: string
    kesit: string
    jant: string
    yukIndeksi: string
    hizIndeksi: string
    runFlat: string
    kdvOrani: string

    // Ham veri
    rawData: Record<string, any>
}