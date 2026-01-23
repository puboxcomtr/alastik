'use client';

// React & Next
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// UI Libraries
import { Container, Row, Col } from 'react-bootstrap'
import { toast } from 'react-toastify';

// Config & Context
import { ROUTES } from '@/src/config/routes';
import { useCart } from '@/src/context/CartContext';
import { useAuth } from '@/src/hooks/Theme/useAuth';

// Components
import DeliveryTitle from '@/src/components/checkout/Content/DeliveryTitle';
import BillingForm from '@/src/components/checkout/Guest/BillingForm';
import ShippingForm from '@/src/components/checkout/Guest/ShippingForm';
import CheckoutSummary from '@/src/components/checkout/Guest/CheckoutSummary';
import MemberCheckout from '@/src/components/checkout/Member/MemberCheckout';

// Types
import { BillingData, ShippingData, initialBillingData, initialShippingData } from '@/src/types/checkout';

export default function CheckoutPage() {
    const router = useRouter();
    const { items, totals, loading: cartLoading } = useCart();
    const { user, isLoggedIn, loading: authLoading } = useAuth();
    const [billingData, setBillingData] = useState<BillingData>(initialBillingData);
    const [shippingData, setShippingData] = useState<ShippingData>(initialShippingData);
    const [differentShipping, setDifferentShipping] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedBillingAddressId, setSelectedBillingAddressId] = useState<string>('');
    const [selectedShippingAddressId, setSelectedShippingAddressId] = useState<string>('');

    useEffect(() => {
        if (cartLoading) return;
        if (items.length === 0) {
            router.push(ROUTES.CART);
        }
    }, [items, router, cartLoading]);

    const validateGuestForm = () => {
        const requiredFields = ['email', 'phone', 'cityId', 'districtId', 'neighborhoodId', 'street', 'buildingNo'];

        if (billingData.invoiceType === 'individual') {
            requiredFields.push('fullName');
        } else {
            requiredFields.push('companyName', 'taxOffice', 'taxNo', 'authorizedPerson');
        }

        const missingField = requiredFields.find(field => !billingData[field as keyof BillingData]);
        if (missingField) {
            toast.error('Lütfen Tüm Zorunlu Alanları Doldurunuz');
            return false;
        }
        if (differentShipping) {
            const shippingRequired = ['recipientName', 'phone', 'cityId', 'districtId', 'neighborhoodId'];
            const missingShipping = shippingRequired.find(field => !shippingData[field as keyof ShippingData]);
            if (missingShipping) {
                toast.error('Lütfen teslimat adresini doldurun');
                return false;
            }
        }

        return true;
    };

    const handleGuestSubmit = () => {
        if (!validateGuestForm()) return;
        setLoading(true);
        const checkoutData = {
            billing: billingData,
            shipping: differentShipping ? shippingData : null,
            useSameAddress: !differentShipping,
            isGuest: true
        };
        sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));
        router.push(ROUTES.PAYMENT);
    };

    const handleMemberSubmit = () => {
        if (!selectedBillingAddressId) {
            toast.error('Lütfen bir adres seçin');
            return;
        }
        setLoading(true);
        const isSameAddress = !selectedShippingAddressId || selectedBillingAddressId === selectedShippingAddressId;

        const checkoutData = {
            billingAddressId: selectedBillingAddressId,
            shippingAddressId: selectedShippingAddressId || selectedBillingAddressId,
            useSameAddress: isSameAddress,
            isGuest: false,
            memberId: user?.id
        };
        sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));
        router.push(ROUTES.PAYMENT);
    };

    if (cartLoading || authLoading) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return null;
    }

    return (
        <Container className='p-0'>
            <Row className='row-fluid px-0 py-lg-3'>
                <Col lg="12" className='px-0'>
                    <DeliveryTitle />
                </Col>
                <Col lg="8">
                    {isLoggedIn ? (
                        <Col size={12} className='px-0'>
                            <MemberCheckout
                                onAddressSelect={(billingId, shippingId) => {
                                    setSelectedBillingAddressId(billingId);
                                    setSelectedShippingAddressId(shippingId || billingId);
                                }}
                                loading={loading}
                            />
                        </Col>
                    ) : (
                        <>
                            <Col lg={12} className='px-0'>
                                <BillingForm data={billingData} onChange={setBillingData} />
                            </Col>
                            <div className="card border-0 mt-4">
                                <div className="card-body py-0">
                                    <div className="form-check">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id="differentShipping"
                                            checked={differentShipping}
                                            onChange={(e) => setDifferentShipping(e.target.checked)}
                                        />
                                        <label className="form-check-label cursor-pointer" htmlFor="differentShipping">
                                            Ürünlerim farklı bir <strong>teslimat adresine </strong>gönderilsin.
                                        </label>
                                    </div>
                                </div>
                            </div>
                            {differentShipping && (
                                <ShippingForm data={shippingData} onChange={setShippingData} />
                            )}
                        </>
                    )}
                </Col>
                <Col lg="3" className="offset-xl-1">
                    <CheckoutSummary
                        onSubmit={isLoggedIn ? handleMemberSubmit : handleGuestSubmit}
                        loading={loading}
                        showButton={true}
                    />
                </Col>
            </Row>
        </Container>
    );
}