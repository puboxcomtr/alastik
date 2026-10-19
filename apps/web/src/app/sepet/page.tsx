'use client';

import React, { useEffect } from 'react';
import { Grid } from "@mui/material";
import { useCart } from '@/src/context/CartContext';
import { Col, Container, Row } from 'react-bootstrap';
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
        <>
            <Container>
                <div className='row-fluid'>
                    <Row>
                        <Col lg={12}>
                            <CartTitle />
                        </Col>
                    </Row>
                </div>
            </Container>
            <Container>
                <div className='row-fluid'>
                    <Row>
                        <Col lg={9}>
                            <CartContent
                                items={items}
                                onUpdateQuantity={updateQuantity}
                                onRemoveItem={removeItem}
                            />
                        </Col>
                        <Col lg={3}>
                            <CartSidebar totals={totals} />
                        </Col>
                    </Row>
                </div>
            </Container>
        </>
    );
}