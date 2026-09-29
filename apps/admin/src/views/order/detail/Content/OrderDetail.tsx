'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import tableStyles from '@core/styles/table.module.css'

interface OrderItem {
    productKey: string
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
    // Kargo ürün fiyatına GÖMÜLÜ (kargo dahil). Panelde ürün kargo-dahil fiyatla
    // gösterilir; kargo payı ayrı bir bilgi satırında belirtilir (toplama eklenmez).
    shippingPerUnit?: number
    shippingTotal?: number
    image?: string
    brand?: string
    sku?: string
    season?: string
    montagePointName?: string
}

interface Pricing {
    subtotal: number
    shippingCost: number
    discountAmount: number
    total: number
}

interface OrderDetailContentProps {
    items: OrderItem[]
    pricing: Pricing
}

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(price) + ' TL'
}

const OrderDetailContent = ({ items, pricing }: OrderDetailContentProps) => {
    return (
        <Card>
            <CardHeader title='Sipariş Detayları' />
            <div className='overflow-x-auto'>
                <table className={tableStyles.table}>
                    <thead>
                        <tr>
                            <th>Ürün</th>
                            <th>Fiyat</th>
                            <th>Adet</th>
                            <th className='text-right'>Toplam</th>
                        </tr>
                    </thead>
                    <tbody className='border-be'>
                        {items.map((item, index) => (
                            <tr key={index}>
                                <td>
                                    <div className='flex items-center gap-3'>
                                        <img
                                            src={item.image || '/images/apps/ecommerce/product-placeholder.png'}
                                            alt={item.name}
                                            height={55}
                                            className='rounded'
                                        />
                                        <div className='flex flex-col items-start'>
                                            <Typography color='text.primary' className='font-medium'>
                                                {item.name}
                                            </Typography>
                                            <Typography variant='body2' color='text.secondary'>
                                                {[item.sku, item.brand, item.season].filter(Boolean).join(' | ')}
                                            </Typography>
                                            {item.montagePointName && (
                                                <Typography variant='body2' color='primary.main' className='font-medium'>
                                                    Montaj Noktası: {item.montagePointName}
                                                </Typography>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td><Typography>{formatPrice(item.unitPrice + (item.shippingPerUnit || 0))}</Typography></td>
                                <td><Typography>{item.quantity}</Typography></td>
                                <td className='text-right'><Typography>{formatPrice(item.totalPrice + (item.shippingTotal || 0))}</Typography></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <CardContent className='flex justify-end'>
                <div>
                    <div className='flex items-center gap-12'>
                        <Typography color='text.primary' className='min-is-[100px]'>
                            Ara Toplam:
                        </Typography>
                        <Typography color='text.primary' className='font-medium'>
                            {formatPrice(pricing.subtotal + (pricing.shippingCost || 0))}
                        </Typography>
                    </div>
                    {(pricing.shippingCost || 0) > 0 && (
                        <div className='flex items-center gap-12'>
                            <Typography variant='body2' color='text.secondary' className='min-is-[100px]'>
                                Kargo (fiyata dahil):
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                                {formatPrice(pricing.shippingCost)}
                            </Typography>
                        </div>
                    )}
                    <div className='flex items-center gap-12'>
                        <Typography color='text.primary' className='min-is-[100px]'>
                            İndirim:
                        </Typography>
                        <Typography color='text.primary' className='font-medium'>
                            {formatPrice(pricing.discountAmount || 0)}
                        </Typography>
                    </div>
                    <div className='flex items-center gap-12'>
                        <Typography color='text.primary' className='font-medium min-is-[100px]'>
                            Toplam:
                        </Typography>
                        <Typography color='text.primary' className='font-medium'>
                            {formatPrice(pricing.total)}
                        </Typography>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default OrderDetailContent