const express = require('express');
const router = express.Router();
const WebOrder = require('../../../models/web/order/WebOrder');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebMember = require('../../../models/web/user/WebMember');
const WebVehicle = require('../../../models/web/user/WebVehicle');
const WebMontagePoint = require('../../../models/web/content/WebMontagePoint');
const Cargo = require('../../../models/admin/settings/Cargo');
const { CREDIT_PAYMENT_METHOD } = require('../../../services/web/b2b/creditLimit');


// Sipariş durumları (model'deki enum'a göre)
const ORDER_STATUSES = {
    pending: 'Onay Bekliyor',
    awaiting_payment: 'Ödeme Bekleniyor',
    confirmed: 'Onaylandı',
    processing: 'Hazırlanıyor',
    shipped: 'Kargoya Verildi',
    delivered: 'Teslim Edildi',
    cancelled: 'İptal Edildi',
    returned: 'İade Edildi',
    payment_failed: 'Ödeme Başarısız'
};

// Ödeme durumları (model'deki enum'a göre)
const PAYMENT_STATUSES = {
    pending: 'Bekliyor',
    paid: 'Ödendi',
    failed: 'Başarısız',
    refunded: 'İade Edildi',
    cancelled: 'İptal Edildi'
};

// GET /api/admin/orders - Sipariş listesi
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            orderNumber = '',
            status = '',
            paymentStatus = '',
            draft = '',
            paymentMethod = '',
            stockCode = '',
            phone = '',
            startDate = '',
            endDate = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Filtre oluştur
        let filter = { isActive: true, site: req.site };

        // Genel arama
        if (search) {
            filter.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'memberSnapshot.firstName': { $regex: search, $options: 'i' } },
                { 'memberSnapshot.lastName': { $regex: search, $options: 'i' } },
                { 'memberSnapshot.email': { $regex: search, $options: 'i' } },
                { 'billingSnapshot.fullName': { $regex: search, $options: 'i' } },
                { customerEmail: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } }
            ];
        }

        // Sipariş No (ID)
        if (orderNumber) {
            filter.orderNumber = { $regex: orderNumber, $options: 'i' };
        }

        // Sipariş durumu
        if (status) {
            filter.status = status;
        }

        if (paymentStatus === 'all') {
            // Tümü - payment.status filtresi yok
        } else if (paymentStatus) {
            const statusList = paymentStatus.split(',').map(s => s.trim()).filter(Boolean);
            if (statusList.length > 1) {
                filter['payment.status'] = { $in: statusList };
            } else if (statusList.length === 1) {
                filter['payment.status'] = statusList[0];
            }
        } else {
            // Varsayılan: ödenmiş siparişler VEYA banka havalesi (durumu ne olursa olsun)
            filter.$and = [
                ...(filter.$and || []),
                {
                    $or: [
                        { 'payment.status': 'paid' },
                        { 'payment.method': 'bank_transfer' },
                        // Vadeli Cari Sipariş ödeme beklemez: verildiği anda gerçek sipariştir
                        { 'payment.method': CREDIT_PAYMENT_METHOD }
                    ]
                }
            ];
        }

        // Ödeme yöntemi
        if (paymentMethod) {
            filter['payment.method'] = paymentMethod;
        } else if (draft === '1') {
            // Taslak Siparişler: vadeli Cari Sipariş taslak değildir (Siparişler listesinde yer alır)
            filter['payment.method'] = { $ne: CREDIT_PAYMENT_METHOD };
        }

        // Ürün stok kodu (items içinde)
        if (stockCode) {
            filter['items.stockCode'] = { $regex: stockCode, $options: 'i' };
        }

        // Telefon (snapshot alanlarında)
        if (phone) {
            const phoneRegex = phone.replace(/\D/g, '');
            if (phoneRegex) {
                filter.$or = [
                    ...(filter.$or || []),
                    { customerPhone: { $regex: phoneRegex } },
                    { 'memberSnapshot.phone': { $regex: phoneRegex } },
                    { 'billingSnapshot.phone': { $regex: phoneRegex } },
                    { 'shippingSnapshot.phone': { $regex: phoneRegex } }
                ];
            }
        }

        // Tarih aralığı
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const total = await WebOrder.countDocuments(filter);

        const orders = await WebOrder.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const formattedOrders = orders.map(order => {
            let customerName = order.customerName || '';
            if (!customerName && order.memberSnapshot) {
                customerName = `${order.memberSnapshot.firstName || ''} ${order.memberSnapshot.lastName || ''}`.trim();
            }
            if (!customerName && order.billingSnapshot) {
                customerName = order.billingSnapshot.fullName || '';
            }

            let customerEmail = order.customerEmail || '';
            if (!customerEmail && order.memberSnapshot) {
                customerEmail = order.memberSnapshot.email || '';
            }
            if (!customerEmail && order.billingSnapshot) {
                customerEmail = order.billingSnapshot.email || '';
            }

            return {
                id: order._id.toString(),
                orderNumber: order.orderNumber,
                customerName: customerName || 'Bilinmiyor',
                customerEmail: customerEmail,
                isGuest: order.isGuest || false,
                status: order.status || 'pending',
                statusText: ORDER_STATUSES[order.status] || order.status || 'Onay Bekliyor',
                paymentMethod: order.payment?.method || '',
                paymentMethodText: order.payment?.method === CREDIT_PAYMENT_METHOD ? 'Cari Sipariş' :
                    order.payment?.method === 'bank_transfer' ? 'Banka Havalesi' :
                    order.payment?.method === 'credit_card' ? 'Kredi Kartı (Ödeme Çekilmedi)' :
                        order.payment?.method === 'credit_card_3d' ? 'Kredi Kartı 3D Secure' :
                            order.payment?.method === 'netahsilat_installment' ? 'Kredi Kartı Taksitli' :
                                order.payment?.method === 'cash_on_delivery' ? 'Kapıda Ödeme' : order.payment?.method || '',
                paymentStatus: order.payment?.status || 'pending',
                statusText: order.payment?.paidAt ? 'Ödendi' :
                    order.payment?.status === 'failed' ? 'Başarısız' :
                        order.payment?.status === 'paid' ? 'Ödendi' :
                            PAYMENT_STATUSES[order.payment?.status] || 'Bekliyor',
                total: order.pricing?.total || 0,
                currency: order.pricing?.currency || 'TRY',
                itemCount: order.items?.length || 0,
                createdAt: order.createdAt,
                // Otomatik denemelere rağmen DIA'ya aktarılamadı (uyarı maili gitti, hâlâ aktarılmadı) — listede işaretlenir
                diaTransferFailed: !!order.diaIntegration?.transferAlertSentAt && order.diaIntegration?.status !== 'synced'
            };
        });

        res.json({
            success: true,
            data: formattedOrders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            meta: {
                statuses: ORDER_STATUSES,
                paymentStatuses: PAYMENT_STATUSES
            }
        });

    } catch (error) {
        console.error('Sipariş listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Siparişler yüklenirken hata oluştu',
            error: error.message
        });
    }
});

// GET /api/admin/orders/:id - Sipariş detay
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const order = await WebOrder.findOne({ _id: id, site: req.site }).lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Sipariş bulunamadı'
            });
        }
        if (order.items && order.items.length > 0) {
            const productKeys = order.items.map(item => item.productKey);
            const products = await WebProduct.find({
                '_key': { $in: productKeys }
            }).select('_key diaData.m_resimler diaData.marka diaData.stokkartkodu diaData.ozelkod1kodu').lean();
            const productMap = {};
            products.forEach(product => {
                const firstImage = product.diaData?.m_resimler?.[0]?.aws_url || null;
                productMap[product._key] = {
                    image: firstImage,
                    brand: product.diaData?.marka || '',
                    sku: product.diaData?.stokkartkodu || '',
                    season: product.diaData?.ozelkod1kodu || ''
                };
            });
            order.items = order.items.map(item => ({
                ...item,
                image: productMap[item.productKey]?.image || null,
                brand: productMap[item.productKey]?.brand || '',
                sku: productMap[item.productKey]?.sku || '',
                season: productMap[item.productKey]?.season || ''
            }));
        }


        // Montaj noktalarını çöz (montaj hizmeti kalemlerindeki montagePointId'ler)
        let montagePoints = [];
        const montagePointIds = [...new Set(
            (order.items || []).map(item => item.montagePointId).filter(Boolean)
        )];
        if (montagePointIds.length > 0) {
            const points = await WebMontagePoint.find({ _id: { $in: montagePointIds } })
                .select('name city district address phone').lean();
            const pointMap = {};
            points.forEach(point => {
                pointMap[point._id.toString()] = {
                    id: point._id.toString(),
                    name: point.name || '',
                    city: point.city || '',
                    district: point.district || '',
                    address: point.address || '',
                    phone: point.phone || ''
                };
            });
            montagePoints = montagePointIds.map(pid => pointMap[pid]).filter(Boolean);
            order.items = order.items.map(item => ({
                ...item,
                montagePointName: item.montagePointId
                    ? (pointMap[item.montagePointId]?.name || '')
                    : ''
            }));
        }

        let customerName = order.customerName || '';
        if (!customerName && order.memberSnapshot) {
            customerName = `${order.memberSnapshot.firstName || ''} ${order.memberSnapshot.lastName || ''}`.trim();
        }
        if (!customerName && order.billingSnapshot) {
            customerName = order.billingSnapshot.fullName || '';
        }
        let memberInfo = null;
        if (order.memberId) {
            const member = await WebMember.findById(order.memberId).lean();
            if (member) {
                const orderCount = await WebOrder.countDocuments({
                    memberId: order.memberId,
                    isActive: true,
                    site: req.site
                });

                memberInfo = {
                    id: member._id.toString(),
                    firstName: member.firstName || '',
                    lastName: member.lastName || '',
                    email: member.email || '',
                    phone: member.phone || '',
                    createdAt: member.createdAt,
                    orderCount: orderCount
                };

            }
        }
        // Araç bilgilerini çek
        let vehicleInfo = null;
        if (order.memberId) {
            const vehicle = await WebVehicle.findOne({
                memberId: order.memberId,
                isPrimary: true,
                isActive: true
            }).lean();

            if (vehicle) {
                vehicleInfo = {
                    id: vehicle._id.toString(),
                    make: vehicle.wheelSizeData?.makeName || '',
                    model: vehicle.wheelSizeData?.modelName || '',
                    year: vehicle.wheelSizeData?.year || null,
                    bodyType: vehicle.userInputs?.bodyType || '',
                    enginePower: vehicle.userInputs?.enginePower || '',
                    plateNumber: vehicle.userInputs?.plateNumber || '',
                    mileage: vehicle.userInputs?.mileage || null,
                    image: vehicle.image?.url || null
                };
            }
        }
        // Teslimat yönteminin adı (Kargo Tanımları: site + kod)
        let shippingMethodName = '';
        if (order.shipping?.method) {
            const cargo = await Cargo.findOne({ site: order.site || req.site, code: order.shipping.method }).select('name').lean();
            shippingMethodName = cargo?.name || '';
        }
        const formattedOrder = {
            id: order._id.toString(),
            orderNumber: order.orderNumber,
            site: order.site || 'alastik',
            isGuest: order.isGuest,
            memberId: order.memberId?.toString() || null,
            memberInfo: memberInfo,
            vehicleInfo: vehicleInfo,

            customer: {
                name: customerName || 'Bilinmiyor',
                email: order.memberSnapshot?.email || order.billingSnapshot?.email || order.customerEmail || '',
                phone: order.memberSnapshot?.phone || order.billingSnapshot?.phone || order.customerPhone || '',
                isGuest: order.isGuest
            },

            billingAddress: order.billingSnapshot || null,
            shippingAddress: order.shippingSnapshot || null,
            items: order.items || [],
            montagePoints: montagePoints,
            pricing: order.pricing || {},

            payment: {
                method: order.payment?.method || '',
                methodText: order.payment?.method === CREDIT_PAYMENT_METHOD ? 'Cari Sipariş' :
                    order.payment?.method === 'bank_transfer' ? 'Banka Havalesi' :
                    order.payment?.method === 'credit_card' ? 'Kredi Kartı (Ödeme Çekilmedi)' :
                        order.payment?.method === 'credit_card_3d' ? 'Kredi Kartı 3D Secure' :
                            order.payment?.method === 'netahsilat_installment' ? 'Kredi Kartı Taksitli' :
                                order.payment?.method === 'cash_on_delivery' ? 'Kapıda Ödeme' : order.payment?.method || '',
                status: order.payment?.status || 'pending',
                statusText: PAYMENT_STATUSES[order.payment?.status] || order.payment?.status || 'Bekliyor',
                gateway: order.payment?.gateway || null,
                installment: order.payment?.installment || null,
                referenceCode: order.payment?.referenceCode || null,
                bankTransfer: order.payment?.bankTransfer || null,
                cardInfo: order.payment?.cardInfo || null,
                paidAt: order.payment?.paidAt || null,
                manualCollection: order.payment?.manualCollection || null
            },

            adminNote: order.adminNote || '',

            status: order.status || 'pending',
            statusText: ORDER_STATUSES[order.status] || order.status || 'Onay Bekliyor',

            // methodName: teslimat yönteminin Kargo Tanımları'ndaki adı (kod yerine gösterilir)
            shipping: { ...(order.shipping || {}), methodName: shippingMethodName },
            diaIntegration: order.diaIntegration || {},
            customerNote: order.customerNote || '',
            adminNote: order.adminNote || '',
            cancellation: order.cancellation || null,

            createdAt: order.createdAt,
            updatedAt: order.updatedAt
        };

        res.json({
            success: true,
            data: formattedOrder,
            meta: {
                statuses: ORDER_STATUSES,
                paymentStatuses: PAYMENT_STATUSES
            }
        });

    } catch (error) {
        console.error('Sipariş detay hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Sipariş detayı yüklenirken hata oluştu',
            error: error.message
        });
    }
});

// PUT /api/admin/orders/:id/status - Sipariş durumu güncelle
// Manuel tahsilat bilgisi - PUT /admin/orders/:id/manual-collection
// channel: paynet | otopirpos | nkolay | null (temizle)
router.put('/:id/manual-collection', async (req, res) => {
    try {
        const { channel } = req.body || {};
        const allowedChannels = ['paynet', 'otopirpos', 'nkolay', null];

        if (!allowedChannels.includes(channel ?? null)) {
            return res.status(400).json({ success: false, message: 'Geçersiz tahsilat kanalı' });
        }

        const order = await WebOrder.findOneAndUpdate(
            { _id: req.params.id, site: req.site },
            {
                $set: {
                    'payment.manualCollection': {
                        channel: channel || null,
                        updatedAt: new Date()
                    }
                }
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });
        }

        res.json({
            success: true,
            message: channel ? 'Manuel tahsilat bilgisi kaydedildi' : 'Manuel tahsilat bilgisi kaldırıldı',
            data: { manualCollection: order.payment?.manualCollection || null }
        });
    } catch (error) {
        console.error('Manuel tahsilat güncelleme hatası:', error);
        res.status(500).json({ success: false, message: 'Manuel tahsilat bilgisi güncellenemedi' });
    }
});

// Sipariş açıklaması - PUT /admin/orders/:id/admin-note
router.put('/:id/admin-note', async (req, res) => {
    try {
        const note = String(req.body?.note ?? '').trim();

        const order = await WebOrder.findOneAndUpdate(
            { _id: req.params.id, site: req.site },
            { $set: { adminNote: note } },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });
        }

        res.json({ success: true, message: 'Sipariş açıklaması kaydedildi', data: { adminNote: order.adminNote } });
    } catch (error) {
        console.error('Sipariş açıklaması güncelleme hatası:', error);
        res.status(500).json({ success: false, message: 'Sipariş açıklaması kaydedilemedi' });
    }
});

// Sipariş açıklama şablonları - GET /admin/orders/templates/notes (site bazlı, ayarlardan)
router.get('/templates/notes', async (req, res) => {
    try {
        const Setting = require('../../../models/admin/settings/Setting');

        let setting = await Setting.findOne({ site: req.site, group: 'order', key: 'noteTemplates' });

        if (!setting) {
            // Varsayılan şablonlar (ayarlardan düzenlenebilir kayıt olarak oluşturulur)
            setting = await Setting.create({
                site: req.site,
                group: 'order',
                key: 'noteTemplates',
                type: 'json',
                description: 'Sipariş açıklama şablonları',
                value: [
                    { title: 'Kargo Bilgilendirmesi', content: 'Siparişiniz kargoya verilmiştir. Takip numaranız ayrıca iletilecektir.' },
                    { title: 'Stok Bekleniyor', content: 'Siparişinizdeki ürünler tedarik sürecindedir. Tahmini gönderim tarihi güncellenecektir.' },
                    { title: 'Manuel Tahsilat Notu', content: 'Ödeme müşteriden telefonla manuel olarak tahsil edilmiştir.' }
                ]
            });
        }

        res.json({ success: true, data: setting.value || [] });
    } catch (error) {
        console.error('Sipariş şablonları hatası:', error);
        res.status(500).json({ success: false, message: 'Şablonlar yüklenemedi' });
    }
});

router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!ORDER_STATUSES[status]) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz sipariş durumu'
            });
        }

        const order = await WebOrder.findOneAndUpdate(
            { _id: id, site: req.site },
            { status, updatedAt: new Date() },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Sipariş bulunamadı'
            });
        }

        // Sipariş onaylandığında DIA'ya aktar (cari + sipariş girişi).
        // Banka havalesi HARİÇ — havale siparişleri sipariş detayındaki
        // "DIA'ya Gönder" butonuyla manuel aktarılır.
        // Entegrasyon kapalıysa servis kendisi atlar; hata durum güncellemesini bozmaz.
        let diaResult = null;
        if (status === 'confirmed' && order.payment?.method !== 'bank_transfer') {
            try {
                const { syncOrderToDia } = require('../../../services/plugins/dia/DiaOrderService');
                diaResult = await syncOrderToDia(order);
            } catch (diaError) {
                console.error('DIA sipariş aktarım hatası:', diaError);
                diaResult = { success: false, message: diaError.message };
            }
        }

        // Sipariş iptal edildiğinde DIA'daki kayıtlar da iptal edilir
        // (fatura iptal + stok iadesi + sipariş silme)
        if (status === 'cancelled' && (order.diaIntegration?.diaOrderKey || order.diaIntegration?.diaInvoiceKey)) {
            try {
                const { cancelOrderInDia } = require('../../../services/plugins/dia/DiaOrderService');
                diaResult = await cancelOrderInDia(order);
            } catch (diaError) {
                console.error('DIA sipariş iptal hatası:', diaError);
                diaResult = { success: false, message: diaError.message };
            }
        }

        res.json({
            success: true,
            message: 'Sipariş durumu güncellendi',
            data: {
                id: order._id.toString(),
                status: order.status,
                statusText: ORDER_STATUSES[order.status]
            },
            dia: diaResult
        });

    } catch (error) {
        console.error('Sipariş durumu güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Sipariş durumu güncellenirken hata oluştu',
            error: error.message
        });
    }
});

// PUT /api/admin/orders/:id/payment-status - Ödeme durumu güncelle
router.put('/:id/payment-status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!PAYMENT_STATUSES[status]) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz ödeme durumu'
            });
        }

        const updateData = {
            'payment.status': status,
            updatedAt: new Date()
        };

        // Ödendi ise paidAt ekle
        if (status === 'paid') {
            updateData['payment.paidAt'] = new Date();
        }

        const order = await WebOrder.findOneAndUpdate(
            { _id: id, site: req.site },
            updateData,
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Sipariş bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Ödeme durumu güncellendi',
            data: {
                id: order._id.toString(),
                paymentStatus: order.payment.status,
                paymentStatusText: PAYMENT_STATUSES[order.payment.status]
            }
        });

    } catch (error) {
        console.error('Ödeme durumu güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Ödeme durumu güncellenirken hata oluştu',
            error: error.message
        });
    }
});

// POST /api/admin/orders/:id/sync-dia - Siparişi DIA'ya manuel gönder (yeniden deneme)
router.post('/:id/sync-dia', async (req, res) => {
    try {
        const order = await WebOrder.findOne({ _id: req.params.id, site: req.site });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });
        }

        const { syncOrderToDia } = require('../../../services/plugins/dia/DiaOrderService');
        const result = await syncOrderToDia(order);

        res.json({
            success: result.success,
            message: result.message,
            data: {
                diaOrderKey: result.diaOrderKey || null,
                diaCustomerKey: result.diaCustomerKey || null,
                skipped: result.skipped || false
            }
        });
    } catch (error) {
        console.error('DIA manuel gönderim hatası:', error);
        res.status(500).json({ success: false, message: 'DIA gönderimi sırasında hata oluştu', error: error.message });
    }
});

// POST /api/admin/orders/:id/verify-payment - Nkolay ödeme durumunu sorgula, ödendiyse onayla
router.post('/:id/verify-payment', async (req, res) => {
    try {
        const { id } = req.params;

        const order = await WebOrder.findOne({ _id: id, site: req.site });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });
        }

        // Sadece Nkolay ve henüz ödenmemiş siparişler
        if (order.payment?.gateway !== 'nkolay') {
            return res.json({ success: true, updated: false, reason: 'not_nkolay', paymentStatus: order.payment?.status });
        }
        if (order.payment?.status === 'paid') {
            return res.json({ success: true, updated: false, reason: 'already_paid', paymentStatus: 'paid' });
        }

        const NkolayService = require('../../../services/plugins/payment/NKolayService');
        const result = await NkolayService.checkPaymentStatus({ clientRefCode: order.orderNumber, site: order.site });

        if (!result.success || !result.found) {
            return res.json({ success: true, updated: false, reason: 'not_found_in_nkolay', paymentStatus: order.payment?.status });
        }

        // Ödenmemiş (NEW/ERROR) ise dokunma
        if (!result.isPaid) {
            return res.json({ success: true, updated: false, reason: 'not_paid', nkolayStatus: result.status, paymentStatus: order.payment?.status });
        }

        // Tutar doğrulama - yanlış onayı engelle
        const nkolayAmount = parseFloat(result.transactionAmount);
        const orderAmount = parseFloat(order.pricing?.total);
        if (isNaN(nkolayAmount) || isNaN(orderAmount) || Math.abs(nkolayAmount - orderAmount) > 0.01) {
            return res.json({
                success: true,
                updated: false,
                reason: 'amount_mismatch',
                nkolayAmount: result.transactionAmount,
                orderAmount: order.pricing?.total
            });
        }

        // Ödeme doğrulandı - siparişi onayla
        order.payment.status = 'paid';
        order.status = 'confirmed';
        order.payment.method = 'credit_card_3d';
        order.payment.paidAt = new Date();
        order.payment.authCode = result.authCode;
        order.payment.referenceCode = result.referenceCode || order.payment.referenceCode;
        order.payment.bankMessage = `Otomatik dogrulama - Nkolay STATUS=SUCCESS (${result.cardBankName || ''})`;
        order.updatedAt = new Date();
        await order.save();

        console.log('[verify-payment] Odeme dogrulandi ve onaylandi:', order.orderNumber);

        // Kredi kartı ödemesi onaylandı → DIA'ya otomatik aktar (arka planda)
        try {
            const { syncOrderToDiaBackground } = require('../../../services/plugins/dia/DiaOrderService');
            syncOrderToDiaBackground(order, 'verify-payment');
        } catch (diaErr) {
            console.error('[verify-payment] DIA tetikleme hatası:', diaErr.message);
        }

        // Ödeme başarılı maili tetikle (fire-and-forget)
        try {
            const { sendTemplateMail } = require('../../../services/plugins/mail/mailOrchestrator');
            const customerMail = order.isGuest
                ? (order.guestBillingAddress?.email || order.customerEmail)
                : (order.memberSnapshot?.email || order.customerEmail);

            sendTemplateMail({
                templateKey: order.isGuest ? 'uyeliksiz_alisveris_sablonu' : 'siparis_sablonu',
                context: { orderId: order._id.toString() },
                to: customerMail,
                alsoSendToAdmin: true,
                adminPurpose: 'order',
                site: order.site
            }).catch(err => console.error('[verify-payment] Mail hatasi:', order.orderNumber, err.message));
        } catch (mailErr) {
            console.error('[verify-payment] Mail tetikleme hatasi:', mailErr.message);
        }

        return res.json({
            success: true,
            updated: true,
            paymentStatus: 'paid',
            orderStatus: 'confirmed',
            authCode: result.authCode
        });

    } catch (error) {
        console.error('[verify-payment] Hata:', error);
        return res.status(500).json({ success: false, message: 'Ödeme doğrulama hatası', error: error.message });
    }
});

module.exports = router;