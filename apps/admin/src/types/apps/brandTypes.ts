export type BrandType = {
    id: string
    name: string
    description: string
    seoTitle: string
    seoDescription: string
    seoUrl: string
    productCount: number
    webOrder: number
    webVisible?: boolean
    logo: string
    status: string
    completenessScore: number
    totalStock: number
    priceRange: {
        averageFormatted: string
    }
}