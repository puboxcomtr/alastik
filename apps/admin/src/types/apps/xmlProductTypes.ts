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

    // rawData alanları 
    productName: string
    productCode: string
    brandName: string
    categoryCode: string
    imageUrl: string
    retailPrice: string
    price: string
    taxRatio: string
    stockNumber: string
    productionDate: string
    season: string
    runFlat: string
    oem: string

    // Ebat bilgileri
    width: string
    profile: string
    rim: string
    loadIndex: string
    speedIndex: string
}