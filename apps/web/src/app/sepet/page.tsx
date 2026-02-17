'use client';

import React, { useEffect } from 'react';
import { Grid } from "@mui/material";
import { useCart } from '@/src/context/CartContext';
import CartEmpty from '@/src/components/cart/Empty/CartEmpty';
import CartTitle from '@/src/components/cart/Content/CartTitle';
import CartContent from '@/src/components/cart/Content/CartContent';
import CartCampaign from '@/src/components/cart/Content/CartCampaign';
import CartSidebar from '@/src/components/cart/Sidebar/CartSidebar';

export default function CartPage() {
    const { items, totals, updateQuantity, removeItem, clearCart, refreshCart } = useCart();

    useEffect(() => {
        refreshCart();
    }, [refreshCart]);

    if (items.length === 0) {
        return <CartEmpty />;
    }

    return (
        <Grid className="row-fluid" container>
            <Grid size={12}>
                <CartTitle />
            </Grid>
            <Grid size={9}>
                <Grid size={12}>
                    <CartCampaign />
                </Grid>
                <Grid size={12}>
                    <CartContent
                        items={items}
                        onUpdateQuantity={updateQuantity}
                        onRemoveItem={removeItem}
                    />
                </Grid>
            </Grid>
            <Grid size={3}>
                <CartSidebar totals={totals} />
            </Grid>
        </Grid>
    );
}