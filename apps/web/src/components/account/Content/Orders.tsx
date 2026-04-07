'use client';

import React, { useState } from 'react';
import { TextField, MenuItem, FormControl } from '@mui/material';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    pending: { label: 'Onay Bekliyor', color: 'bg-warning' },
    confirmed: { label: 'Onaylandı', color: 'bg-info' },
    processing: { label: 'Hazırlanıyor', color: 'bg-info' },
    shipped: { label: 'Kargoya Verildi', color: 'bg-primary' },
    delivered: { label: 'Teslim Edildi', color: 'bg-success' },
    cancelled: { label: 'İptal Edildi', color: 'bg-danger' },
    returned: { label: 'İade Edildi', color: 'bg-secondary' },
    payment_failed: { label: 'Ödeme Başarısız', color: 'bg-danger' },
};

const TIME_FILTERS = [
    { value: 'all-time', label: 'Tümü' },
    { value: 'last-year', label: 'Son 1 Yıl' },
    { value: 'last-3-months', label: 'Son 3 Ay' },
    { value: 'last-30-days', label: 'Son 30 Gün' },
    { value: 'last-week', label: 'Son 1 Hafta' },
];

type OrderItem = {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    image?: string | null;
};

type Order = {
    _id: string;
    orderNumber: string;
    status: string;
    createdAt: string;
    pricing: {
        total: number;
        currency?: string;
    };
    items: OrderItem[];
};

type Props = {
    orders: Order[];
    showAllLink?: boolean;
    onOrderClick?: (orderId: string) => void;
};

export default function OrdersContent({ orders, showAllLink, onOrderClick }: Props) {
    const [statusFilter, setStatusFilter] = useState('all');
    const [timeFilter, setTimeFilter] = useState('all-time');

    const showFilters = !showAllLink;
    if (!orders || orders.length === 0) {
        return (
            <div className="ps-lg-3 ps-xl-0">
                <h2 className="h5 mb-0 text-primary">Siparişlerim</h2>
                <div className="text-center py-4">
                    Henüz siparişiniz bulunmamaktadır.
                </div>
            </div>
        );
    }

    const filteredOrders = orders.filter((order) => {
        if (statusFilter !== 'all' && order.status !== statusFilter) return false;
        if (timeFilter !== 'all-time') {
            const orderDate = new Date(order.createdAt);
            const now = new Date();
            const cutoff = new Date();

            switch (timeFilter) {
                case 'last-year':
                    cutoff.setFullYear(now.getFullYear() - 1);
                    break;
                case 'last-3-months':
                    cutoff.setMonth(now.getMonth() - 3);
                    break;
                case 'last-30-days':
                    cutoff.setDate(now.getDate() - 30);
                    break;
                case 'last-week':
                    cutoff.setDate(now.getDate() - 7);
                    break;
            }

            if (orderDate < cutoff) return false;
        }

        return true;
    });

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatSortDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const y = String(d.getFullYear()).slice(-2);
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
        }).format(price);
    };

    const getStatus = (status: string) => {
        return STATUS_MAP[status] || { label: status, color: 'bg-secondary' };
    };

    return (
        <div className="my-3 py-4">
            {/* Başlık */}
            <div className="nav flex-nowrap align-items-center justify-content-between pb-1 mb-3">
                <h2 className="h6 mb-0 text-primary">Siparişlerim</h2>
                {showAllLink && orders.length > 0 && (
                    <a className="nav-link text-decoration-underline p-0" href="/hesabim/siparislerim">
                        Tümünü Gör
                    </a>
                )}
            </div>

            {/* Filtreler - sadece tam sayfa */}
            {!showAllLink && (
                <div className="row align-items-center pb-3 pb-md-4 mb-md-1 mb-lg-2">
                    <div className="col-md-8 col-xl-6 ms-auto">
                        <div className="row row-cols-1 row-cols-sm-2 g-3 g-xxl-4">
                            <div className="col">
                                <FormControl fullWidth>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        variant="outlined"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        SelectProps={{
                                            MenuProps: { PaperProps: { style: { maxHeight: 200, overflowY: 'auto' } } },
                                            IconComponent: (props) => <i {...props} className="ri-arrow-down-s-line" style={{ color: '#555', fontSize: 20 }} />
                                        }}
                                        sx={{ backgroundColor: '#f5f5f5', borderRadius: 1 }}
                                    >
                                        <MenuItem value="all" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>
                                            Tümü
                                        </MenuItem>
                                        {Object.entries(STATUS_MAP).map(([key, val]) => (
                                            <MenuItem key={key} value={key} sx={{ fontSize: '13px', borderBottom: '1px solid #eee', '&:last-child': { borderBottom: 'none' } }}>
                                                {val.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </FormControl>
                            </div>
                            <div className="col">
                                <FormControl fullWidth>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        variant="outlined"
                                        value={timeFilter}
                                        onChange={(e) => setTimeFilter(e.target.value)}
                                        SelectProps={{
                                            MenuProps: { PaperProps: { style: { maxHeight: 200, overflowY: 'auto' } } },
                                            IconComponent: (props) => <i {...props} className="ri-arrow-down-s-line" style={{ color: '#555', fontSize: 20 }} />
                                        }}
                                        sx={{ backgroundColor: '#f5f5f5', borderRadius: 1 }}
                                    >
                                        {TIME_FILTERS.map((tf) => (
                                            <MenuItem key={tf.value} value={tf.value} sx={{ fontSize: '13px', borderBottom: '1px solid #eee', '&:last-child': { borderBottom: 'none' } }}>
                                                {tf.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </FormControl>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sipariş Tablosu */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-3">
                    Sipariş bulunamadı.
                </div>
            ) : (
                <table className="table align-middle fs-sm text-nowrap">
                    <thead>
                        <tr>
                            <th scope="col" className="py-3 ps-0">
                                <span className="text-body fw-normal">Sipariş Numarası</span>
                            </th>
                            <th scope="col" className="py-3 d-none d-md-table-cell">
                                <span className="text-body fw-normal">Tarih</span>
                            </th>
                            <th scope="col" className="py-3 d-none d-md-table-cell">
                                <span className="text-body fw-normal">Durum</span>
                            </th>
                            <th scope="col" className="py-3 d-none d-md-table-cell">
                                <span className="text-body fw-normal">Toplam</span>
                            </th>
                            <th scope="col" className="py-3">{'\u00A0'}</th>
                        </tr>
                    </thead>
                    <tbody className="text-body-emphasis">
                        {filteredOrders.map((order) => {
                            const st = getStatus(order.status);
                            return (
                                <tr key={order._id}>
                                    <td className="fw-medium pt-2 pb-3 py-md-2 ps-0">
                                        <a className="d-inline-block animate-underline text-body-emphasis text-decoration-none py-2"
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); onOrderClick?.(order._id); }}
                                        >
                                            <span className="animate-target">{order.orderNumber}</span>
                                        </a>
                                        <ul className="list-unstyled fw-normal text-body m-0 d-md-none">
                                            <li>{formatDate(order.createdAt)}</li>
                                            <li className="d-flex align-items-center">
                                                <span className={`${st.color} rounded-circle p-1 me-2`}></span>
                                                {st.label}
                                            </li>
                                            <li className="fw-medium text-body-emphasis">
                                                {formatPrice(order.pricing.total)}
                                            </li>
                                        </ul>
                                    </td>
                                    <td className="fw-medium py-3 d-none d-md-table-cell">
                                        {formatDate(order.createdAt)}
                                        <span className="date d-none">{formatSortDate(order.createdAt)}</span>
                                    </td>
                                    <td className="fw-medium py-3 d-none d-md-table-cell">
                                        <span className="d-flex align-items-center">
                                            <span className={`${st.color} rounded-circle p-1 me-2`}></span>
                                            {st.label}
                                        </span>
                                    </td>
                                    <td className="fw-medium py-3 d-none d-md-table-cell">
                                        {formatPrice(order.pricing.total)}
                                        <span className="total d-none">{Math.round(order.pricing.total * 100)}</span>
                                    </td>
                                    <td className="py-3 pe-0">
                                        <span className="d-flex align-items-center justify-content-end position-relative gap-1 gap-sm-2 ms-n2 ms-sm-0">
                                            {order.items.slice(0, 3).map((item, idx) => (
                                                item.image ? (
                                                    <span key={idx}>
                                                        <img src={item.image} width="64" alt={item.name} style={{ objectFit: 'contain' }} />
                                                    </span>
                                                ) : null
                                            ))}
                                            {order.items.length > 3 && (
                                                <span className="fw-medium me-1">+{order.items.length - 3}</span>
                                            )}
                                            <span className="fw-medium me-1">{order.items.length} ürün</span>
                                            <a className="btn btn-icon btn-ghost btn-secondary stretched-link border-0"
                                                href="#"
                                                onClick={(e) => { e.preventDefault(); onOrderClick?.(order._id); }}
                                            >
                                                <i className="ci-chevron-right fs-lg"></i>
                                            </a>
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}