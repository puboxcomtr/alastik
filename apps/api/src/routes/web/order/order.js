const express = require('express');
const router = express.Router();
const WebOrder = require('../../../models/web/order/WebOrder');
const WebAddress = require('../../../models/web/address/WebAddress');
const WebMember = require('../../../models/web/user/WebMember');
const WebProduct = require('../../../models/web/catalog/WebProduct');

// POST - Yeni sipariş oluştur
router.post('/', async (req, res) => {
    try {
        const {
            memberId,
            isGuest,
            customerEmail,
            customerPhone,
            customerName,
            billingAddressId,
            shippingAddressId,
            guestBillingAddress,
            guestShippingAddress,
            items,
            pricing,
            paymentMethod,
            customerNote
        } = req.body;

        // Sipariş numarası oluştur
        const orderNumber = await WebOrder.generateOrderNumber();

        // Snapshot'ları hazırla
        let billingSnapshot = null;
        let shippingSnapshot = null;
        let memberSnapshot = null;

        if (isGuest) {
            // Misafir sipariş - guestBillingAddress'den snapshot oluştur
            if (guestBillingAddress) {
                billingSnapshot = {
                    addressName: 'Misafir Fatura Adresi',
                    invoiceType: guestBillingAddress.invoiceType,
                    fullName: guestBillingAddress.fullName,
                    tcNo: guestBillingAddress.tcNo,
                    companyName: guestBillingAddress.companyName,
                    taxOffice: guestBillingAddress.taxOffice,
                    taxNo: guestBillingAddress.taxNo,
                    authorizedPerson: guestBillingAddress.authorizedPerson,
                    email: guestBillingAddress.email,
                    phone: guestBillingAddress.phone,
                    cityId: guestBillingAddress.cityId,
                    cityName: guestBillingAddress.cityName,
                    districtId: guestBillingAddress.districtId,
                    districtName: guestBillingAddress.districtName,
                    neighborhoodId: guestBillingAddress.neighborhoodId,
                    neighborhoodName: guestBillingAddress.neighborhoodName,
                    street: guestBillingAddress.street,
                    buildingNo: guestBillingAddress.buildingNo,
                    floor: guestBillingAddress.floor,
                    apartmentNo: guestBillingAddress.apartmentNo,
                    addressNote: guestBillingAddress.addressNote
                };

                // Misafir için memberSnapshot (fatura bilgilerinden)
                const guestName = guestBillingAddress.invoiceType === 'corporate'
                    ? guestBillingAddress.authorizedPerson
                    : guestBillingAddress.fullName;

                memberSnapshot = {
                    firstName: guestName?.split(' ')[0] || '',
                    lastName: guestName?.split(' ').slice(1).join(' ') || '',
                    email: guestBillingAddress.email,
                    phone: guestBillingAddress.phone
                };
            }

            // Misafir teslimat adresi
            if (guestShippingAddress) {
                const shippingName = guestShippingAddress.recipientName
                    || guestShippingAddress.fullName
                    || guestBillingAddress?.authorizedPerson
                    || guestBillingAddress?.fullName;
                shippingSnapshot = {
                    addressName: 'Misafir Teslimat Adresi',
                    invoiceType: 'individual',
                    fullName: shippingName,
                    tcNo: '',
                    companyName: '',
                    taxOffice: '',
                    taxNo: '',
                    authorizedPerson: '',
                    email: guestBillingAddress?.email || '',
                    phone: guestShippingAddress.phone,
                    cityId: guestShippingAddress.cityId,
                    cityName: guestShippingAddress.cityName,
                    districtId: guestShippingAddress.districtId,
                    districtName: guestShippingAddress.districtName,
                    neighborhoodId: guestShippingAddress.neighborhoodId,
                    neighborhoodName: guestShippingAddress.neighborhoodName,
                    street: guestShippingAddress.street,
                    buildingNo: guestShippingAddress.buildingNo,
                    floor: guestShippingAddress.floor,
                    apartmentNo: guestShippingAddress.apartmentNo,
                    addressNote: guestShippingAddress.addressNote
                };
            } else {
                // Teslimat adresi aynı ise fatura adresini kullan
                shippingSnapshot = billingSnapshot;
            }
        } else {
            // Üye bilgilerini al
            if (memberId) {
                const member = await WebMember.findById(memberId);
                if (member) {
                    memberSnapshot = {
                        firstName: member.firstName,
                        lastName: member.lastName,
                        email: member.email,
                        phone: member.phone
                    };
                }
            }

            // Fatura adresini al
            if (billingAddressId) {
                const billingAddr = await WebAddress.findById(billingAddressId);
                if (billingAddr) {
                    billingSnapshot = {
                        addressName: billingAddr.addressName,
                        invoiceType: billingAddr.invoiceType,
                        fullName: billingAddr.fullName,
                        tcNo: billingAddr.tcNo,
                        companyName: billingAddr.companyName,
                        taxOffice: billingAddr.taxOffice,
                        taxNo: billingAddr.taxNo,
                        authorizedPerson: billingAddr.authorizedPerson,
                        email: billingAddr.email,
                        phone: billingAddr.phone,
                        cityId: billingAddr.cityId,
                        cityName: billingAddr.cityName,
                        districtId: billingAddr.districtId,
                        districtName: billingAddr.districtName,
                        neighborhoodId: billingAddr.neighborhoodId,
                        neighborhoodName: billingAddr.neighborhoodName,
                        street: billingAddr.street,
                        buildingNo: billingAddr.buildingNo,
                        floor: billingAddr.floor,
                        apartmentNo: billingAddr.apartmentNo,
                        addressNote: billingAddr.addressNote
                    };
                }
            }

            // Teslimat adresini al
            if (shippingAddressId) {
                const shippingAddr = await WebAddress.findById(shippingAddressId);
                if (shippingAddr) {
                    shippingSnapshot = {
                        addressName: shippingAddr.addressName,
                        invoiceType: shippingAddr.invoiceType,
                        fullName: shippingAddr.fullName,
                        tcNo: shippingAddr.tcNo,
                        companyName: shippingAddr.companyName,
                        taxOffice: shippingAddr.taxOffice,
                        taxNo: shippingAddr.taxNo,
                        authorizedPerson: shippingAddr.authorizedPerson,
                        email: shippingAddr.email,
                        phone: shippingAddr.phone,
                        cityId: shippingAddr.cityId,
                        cityName: shippingAddr.cityName,
                        districtId: shippingAddr.districtId,
                        districtName: shippingAddr.districtName,
                        neighborhoodId: shippingAddr.neighborhoodId,
                        neighborhoodName: shippingAddr.neighborhoodName,
                        street: shippingAddr.street,
                        buildingNo: shippingAddr.buildingNo,
                        floor: shippingAddr.floor,
                        apartmentNo: shippingAddr.apartmentNo,
                        addressNote: shippingAddr.addressNote
                    };
                }
            }
        }

        // Sipariş oluştur
        const order = new WebOrder({
            orderNumber,
            memberId: isGuest ? null : memberId,
            isGuest,
            customerEmail,
            customerPhone,
            customerName,
            billingAddressId: isGuest ? null : billingAddressId,
            shippingAddressId: isGuest ? null : shippingAddressId,
            guestBillingAddress: isGuest ? guestBillingAddress : null,
            guestShippingAddress: isGuest ? guestShippingAddress : null,
            billingSnapshot,
            shippingSnapshot,
            memberSnapshot,
            items,
            pricing,
            payment: {
                method: paymentMethod,
                status: 'pending',
                bankTransfer: paymentMethod === 'bank_transfer' ? {
                    referenceCode: orderNumber
                } : null
            },
            status: paymentMethod === 'credit_card' ? 'payment_failed' : 'pending',
            customerNote,
            diaIntegration: {
                status: 'pending'
            }
        });

        await order.save();

        res.json({
            success: true,
            data: order,
            message: 'Sipariş başarıyla oluşturuldu'
        });

    } catch (error) {
        console.error('Sipariş oluşturma hatası:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET - Kullanıcı siparişleri
router.get('/user/:userId', async (req, res) => {
    try {
        const orders = await WebOrder.find({
            memberId: req.params.userId,
            isActive: true
        }).sort({ createdAt: -1 }).lean();

        // Tüm productKey'leri topla
        const allKeys = [];
        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.productKey && !allKeys.includes(item.productKey)) {
                    allKeys.push(item.productKey);
                }
            });
        });

        // Tek sorguda tüm ürünleri çek
        const products = await WebProduct.find(
            { _key: { $in: allKeys } },
            { _key: 1, 'diaData.m_resimler': 1, 'customData.featuredImage': 1, 'customData.customImages': 1 }
        ).lean();

        // Key → görsel map
        const imageMap = {};
        products.forEach(p => {
            let image = null;

            if (p.customData?.customImages && p.customData.customImages.length > 0) {
                const sorted = [...p.customData.customImages].sort((a, b) => (a.order || 0) - (b.order || 0));
                if (sorted[0]?.url) image = sorted[0].url;
            }

            if (!image && p.customData?.featuredImage) {
                image = p.customData.featuredImage;
            }

            if (!image && p.diaData?.m_resimler && p.diaData.m_resimler.length > 0) {
                const sorted = [...p.diaData.m_resimler].sort((a, b) =>
                    parseInt(a.order_id || '999') - parseInt(b.order_id || '999')
                );
                if (sorted[0]?.aws_url) image = sorted[0].aws_url;
            }

            imageMap[p._key] = image;
        });

        // Siparişlere görsel ekle
        orders.forEach(order => {
            order.items.forEach(item => {
                item.image = imageMap[item.productKey] || null;
            });
        });

        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET - Tek sipariş detayı
router.get('/:id', async (req, res) => {
    try {
        const order = await WebOrder.findById(req.params.id)
            .populate('memberId', 'firstName lastName email phone')
            .populate('billingAddressId')
            .populate('shippingAddressId')
            .lean();

        if (!order) {
            return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });
        }

        // Ürün görsellerini çek
        const productKeys = order.items
            .filter(item => item.productKey)
            .map(item => item.productKey);

        if (productKeys.length > 0) {
            const products = await WebProduct.find(
                { _key: { $in: productKeys } },
                { _key: 1, 'diaData.m_resimler': 1, 'customData.featuredImage': 1, 'customData.customImages': 1, 'customData.seoUrl': 1 }
            ).lean();

            const productMap = {};
            products.forEach(p => {
                let image = null;
                if (p.customData?.customImages?.length > 0) {
                    const sorted = [...p.customData.customImages].sort((a, b) => (a.order || 0) - (b.order || 0));
                    if (sorted[0]?.url) image = sorted[0].url;
                }
                if (!image && p.customData?.featuredImage) image = p.customData.featuredImage;
                if (!image && p.diaData?.m_resimler?.length > 0) {
                    const sorted = [...p.diaData.m_resimler].sort((a, b) => parseInt(a.order_id || '999') - parseInt(b.order_id || '999'));
                    if (sorted[0]?.aws_url) image = sorted[0].aws_url;
                }
                productMap[p._key] = { image, seoUrl: p.customData?.seoUrl || null };
            });

            order.items.forEach(item => {
                const prod = productMap[item.productKey] || {};
                item.image = prod.image || null;
                item.seoUrl = prod.seoUrl || null;
            });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET - Sipariş numarası ile sorgula
router.get('/number/:orderNumber', async (req, res) => {
    try {
        const order = await WebOrder.findOne({ orderNumber: req.params.orderNumber })
            .populate('memberId', 'firstName lastName email phone')
            .populate('billingAddressId')
            .populate('shippingAddressId');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT - Sipariş durumu güncelle
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        const order = await WebOrder.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT - Ödeme durumu güncelle (havale onayı için)
router.put('/:id/payment', async (req, res) => {
    try {
        const { paymentStatus, approvedBy } = req.body;

        const updateData = {
            'payment.status': paymentStatus
        };

        if (paymentStatus === 'paid') {
            updateData['payment.paidAt'] = new Date();
            updateData['payment.bankTransfer.approvedAt'] = new Date();
            updateData['payment.bankTransfer.approvedBy'] = approvedBy;
            updateData['status'] = 'confirmed';
        }

        const order = await WebOrder.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;