const express = require('express');
const router = express.Router();
const WebOrder = require('../../../models/web/order/WebOrder');
const WebAddress = require('../../../models/web/address/WebAddress');
const WebMember = require('../../../models/web/user/WebMember');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebDia = require('../../../models/plugins/dia/DiaSettings');
const { sendTemplateMail } = require('../../../services/plugins/mail/mailOrchestrator');
const { resolveSitePrice, resolveXmlShipping, PRICE_HIDDEN } = require('../../../utils/sitePricing');
const { resolveUnitShipping } = require('../../../services/web/cargo/ShippingRuleService');
const { loadMontagePrices } = require('../../../utils/montagePricing');
const DiaStockService = require('../../../services/plugins/dia/DiaStockService');
const { withDiaLock } = require('../../../services/plugins/dia/diaLock');

/**
 * Sepet ürünleri için backend'de items + pricing hesapla
 * Her ürün DB'den çekilir, gerçek webPrice ve shippingPerUnit ayrı kaydedilir
 */
const calculateOrderPricing = async (cartItems, site) => {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
        throw new Error('Sepet boş');
    }

    const keys = cartItems.map(i => String(i.productKey));
    // Site filtresi: yalnız bu sitede satılan ürünler siparişe girer (siteler arası sızmayı engeller)
    const products = await WebProduct.find(
        { _key: { $in: keys }, sites: site },
        {
            _key: 1,
            'diaData.stokkartkodu': 1,
            'diaData.aciklama': 1,
            'diaData.m_birimler': 1,
            'diaData.b2c_indirimorani': 1,
            'diaData.birimindirimorani': 1,
            'customData.webPrice': 1,
            'customData.shippingPerUnit': 1,
            // Site bazlı XML fiyatı ve kargo payı (siteData.<site>.xmlPrice/shippingPerUnit)
            'customData.siteData': 1,
            'syncInfo.syncSource': 1,
            // Kural tabanlı kargo payı için (ürün/marka/kategori/ebat/desi eşleşmesi)
            'diaData.marka': 1,
            'diaData.anabirimdesi': 1,
            'diaData.ozelkod7kodu': 1,
            'diaData.m_kategoriler': 1,
            'diaData.m_urunOzellikleri': 1,
            // Kritik stok kontrolü için gerçek stok
            'diaData.gercek_stok': 1
        }
    ).lean();

    const productMap = {};
    for (const p of products) {
        productMap[p._key] = p;
    }

    // Kritik stok kontrolü ayarı (site bazlı). Kapalıysa ekstra sorgu yapılmaz.
    // Amaç: stoğu olmayan ürünün satılmasını (oversell) engellemek. İki katmanlı:
    //   1) CANLI DIA stoğu (webStokDepolari = MASLAK+MERKEZ) sipariş anında çekilir
    //      → kesin. Böylece senkron bayat kalsa bile stoksuz ürün satılamaz.
    //   2) Canlı DIA erişilemezse (oturum çakışması/boş yanıt) DB stoğuna düşülür,
    //      ancak yalnız esik ve altı stoklu üründe blok — dolu stoğu OLAN ürün
    //      canlı okuma yapılamadı diye HAKSIZ bloklanmaz (satış baltalanmasın).
    // XML ürünler stok kontrolünden hariçtir (stokları tedarikçi tarafında).
    const diaSet = await WebDia.getSettings(site).catch(() => null);
    const kritikAktif = !!diaSet?.kritikStok?.kontrolAktif;
    const kritikEsik = Number(diaSet?.kritikStok?.esik) || 5;

    // Stok kontrolüne dahil (kendi stok / non-XML, stokkartkodu olan) ürünler
    const stokKontrolUrunler = kritikAktif
        ? products.filter(p => p.syncInfo?.syncSource !== 'xml_integration' && p.diaData?.stokkartkodu)
        : [];

    // Sipariş anında CANLI DIA stoğu (worker ile aynı WS kullanıcısı → diaLock ile
    // seri; kilit kısa süre beklenir, alınamazsa best-effort çalışır/boş dönerse
    // DB'ye düşülür → checkout bloklanmaz). null = canlı okuma başarısız.
    let liveStokMap = null;
    if (stokKontrolUrunler.length) {
        const codes = [...new Set(stokKontrolUrunler.map(p => String(p.diaData.stokkartkodu)))];
        try {
            liveStokMap = await withDiaLock(
                async () => new DiaStockService().fetchLiveStockSum(codes),
                { label: 'order-live-stock', waitMs: 6000, ttlMs: 30000 }
            );
        } catch (e) {
            liveStokMap = null; // canlı okuma başarısız → DB yedeğine düş
        }
    }

    // İlgili ürünlerin açık (bekleyen, henüz teslim/iptal olmamış) sipariş adetleri.
    // Kullanılabilir = stok − açık siparişler; web siparişleri DIA'da yalnız sipariş
    // (fiziksel stok hareketi değil) olduğu için gercek_stok'a yansımaz, düşülmeli.
    const acikSiparisMap = {};
    if (stokKontrolUrunler.length) {
        const kontrolKeys = stokKontrolUrunler.map(p => p._key);
        const acik = await WebOrder.aggregate([
            { $match: { site, isActive: true, status: { $in: ['pending', 'confirmed', 'processing', 'shipped'] } } },
            { $unwind: '$items' },
            { $match: { 'items.productKey': { $in: kontrolKeys } } },
            { $group: { _id: '$items.productKey', toplam: { $sum: '$items.quantity' } } }
        ]);
        for (const a of acik) acikSiparisMap[a._id] = a.toplam;
    }

    // Montaj noktasına bağlı hizmetlerde noktaya özel fiyat (0 = ücretsiz) geçerlidir
    const montagePrices = await loadMontagePrices(cartItems, site);

    const items = [];
    const cikarilanlar = [];
    let subtotal = 0;
    let shippingCost = 0;

    for (const cartItem of cartItems) {
        const product = productMap[String(cartItem.productKey)];
        if (!product) {
            // Ürün bu sitede satılmıyor veya katalogdan kalkmış: kalem siparişe alınmaz
            console.warn(`[Sipariş] Kalem atlandı — ürün ${cartItem.productKey} ${site} sitesinde bulunamadı`);
            continue;
        }

        const quantity = parseInt(cartItem.quantity) || 1;

        // Stok kontrolü (yalnız kendi stok / non-XML ürünlerde). Kullanılabilir =
        // stok − açık siparişler. İstenen adet karşılanmıyorsa kalem çıkarılır.
        //   • Canlı DIA okundu → o stoğu kullan (kesin), her zaman kontrol et.
        //   • Canlı okunamadı → DB stoğuna düş, yalnız esik ve altı stokta blok
        //     (dolu stoklu ürünü haksız bloklamamak için — satış baltalanmasın).
        const stokKod = product.diaData?.stokkartkodu;
        const isXmlStok = product.syncInfo?.syncSource === 'xml_integration';
        if (kritikAktif && !isXmlStok && stokKod) {
            const liveStok = liveStokMap ? liveStokMap[String(stokKod)] : undefined;
            let stok, kontrolEt;
            if (liveStok !== undefined) {
                stok = liveStok; kontrolEt = true;               // canlı: kesin
            } else {
                stok = Number(product.diaData?.gercek_stok || 0); // DB yedeği
                kontrolEt = stok <= kritikEsik;                   // yalnız düşük stok
            }
            if (kontrolEt) {
                const kullanilabilir = stok - (acikSiparisMap[product._key] || 0);
                if (quantity > kullanilabilir) {
                    cikarilanlar.push({
                        productKey: product._key,
                        stockCode: stokKod || '',
                        name: product.diaData?.aciklama || '',
                        istenen: quantity,
                        kalan: Math.max(0, kullanilabilir)
                    });
                    continue;
                }
            }
        }
        const isXml = product.syncInfo?.syncSource === 'xml_integration';
        const montagePointId = String(cartItem.montagePointId || '');
        const montagePrice = montagePrices.get(`${montagePointId}:${cartItem.productKey}`);

        // Kargosuz birim fiyat
        // Site fiyat kuralı önceliklidir (XML üründe siteData.<site>.xmlPrice, panel kuralı);
        // yoksa webPrice > fiyat4 (global webPrice sahip sitenin fiyatıdır, sitePrice varken kullanılmaz)
        const sitePrice = resolveSitePrice(product, site);
        // Fiyat gizli (__dinamik__16 seçili + dinamik yok): sipariş dışı bırakılır (sepete de eklenemez)
        if (sitePrice === PRICE_HIDDEN && typeof montagePrice !== 'number') {
            cikarilanlar.push({
                productKey: product._key,
                stockCode: stokKod || '',
                name: product.diaData?.aciklama || '',
                istenen: quantity,
                kalan: 0
            });
            continue;
        }
        const unitPrice = typeof montagePrice === 'number'
            ? montagePrice
            : (sitePrice !== null
                ? sitePrice
                : (product.customData?.webPrice || product.diaData?.m_birimler?.[0]?.fiyat4 || 0));

        // Kargo payı: XML ürünlerde senkronda yazılan site bazlı sabit değer; stoklu ürünlerde Kargo Tanımları kuralları
        const ruleShipping = isXml ? null : resolveUnitShipping(product, site, unitPrice);
        const shippingPerUnit = isXml
            ? (resolveXmlShipping(product, site)?.shippingPerUnit || 0)
            : (ruleShipping?.shippingPerUnit || 0);

        const totalPrice = Math.round(unitPrice * quantity * 100) / 100;
        const shippingTotal = Math.round(shippingPerUnit * quantity * 100) / 100;

        items.push({
            productKey: product._key,
            stockCode: product.diaData?.stokkartkodu || '',
            name: product.diaData?.aciklama || '',
            quantity,
            unitPrice: Math.round(unitPrice * 100) / 100,
            totalPrice,
            shippingPerUnit: Math.round(shippingPerUnit * 100) / 100,
            shippingTotal,
            isXml,
            montagePointId: typeof montagePrice === 'number' ? montagePointId : '',
            vatRate: 20,
            vatAmount: 0
        });

        subtotal += totalPrice;
        shippingCost += shippingTotal;
    }

    const pricing = {
        subtotal: Math.round(subtotal * 100) / 100,
        vatAmount: 0,
        shippingCost: Math.round(shippingCost * 100) / 100,
        discountAmount: 0,
        total: Math.round((subtotal + shippingCost) * 100) / 100,
        currency: 'TRY'
    };

    return { items, pricing, cikarilanlar };
};

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
            items: rawItems,
            paymentMethod,
            customerNote
        } = req.body;

        // Backend'de items ve pricing hesapla (frontend'den gelene güvenme)
        const { items, pricing, cikarilanlar } = await calculateOrderPricing(rawItems, req.site);

        // Kritik stok koruması: tüm kalemler stok yetersizliğinden çıkarıldıysa
        // sipariş oluşturulmaz; kısmî çıkarma varsa sipariş devam eder, uyarı döner.
        if (items.length === 0) {
            return res.status(409).json({
                success: false,
                message: 'Sepetinizdeki ürünlerin stoğu tükendi. Lütfen sepetinizi güncelleyin.',
                cikarilanlar: cikarilanlar || []
            });
        }

        // Sipariş numarası oluştur (önek siteye göre: AL / LJA)
        const orderNumber = await WebOrder.generateOrderNumber(req.site);

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
            site: req.site,
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

        // Mail gönderim koşulu:
        // - Havale (bank_transfer) ve kapıda ödeme: hemen mail gönder
        // - Kart (3D ödeme): commit endpoint'inden tetiklenecek (burada gönderme)
        const shouldSendMailNow = ['bank_transfer', 'cash_on_delivery'].includes(paymentMethod);

        if (shouldSendMailNow) {
            // Müşteri mail adresini belirle
            const customerMail = isGuest
                ? (guestBillingAddress?.email || customerEmail)
                : (memberSnapshot?.email || customerEmail);

            // Senkron + try/catch — mail patlasa sipariş etkilenmez
            sendTemplateMail({
                templateKey: isGuest ? 'uyeliksiz_alisveris_sablonu' : 'siparis_sablonu',
                context: { orderId: order._id.toString() },
                to: customerMail,
                alsoSendToAdmin: true,
                adminPurpose: 'order',
                site: order.site
            }).then((mailResult) => {
                if (!mailResult.success) {
                    console.warn('[order] Mail gönderilemedi:', order.orderNumber, mailResult.errors);
                } else {
                    console.log('[order] Mail gönderildi:', order.orderNumber, {
                        customer: mailResult.customerSent,
                        admin: mailResult.adminSent
                    });
                }
            }).catch((err) => {
                console.error('[order] Mail orchestrator hatası:', order.orderNumber, err.message);
            });
        }

        res.json({
            success: true,
            data: order,
            message: 'Sipariş başarıyla oluşturuldu',
            // Kritik stok nedeniyle çıkarılan kalemler (varsa) — frontend uyarı gösterir
            ...(cikarilanlar && cikarilanlar.length ? { cikarilanlar } : {})
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
            site: req.site,
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

        // Havale onaylandıysa müşteriye + admine bilgilendirme maili
        if (paymentStatus === 'paid') {
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
            }).then((mailResult) => {
                if (!mailResult.success) {
                    console.warn('[order:payment-approved] Mail gönderilemedi:', order.orderNumber, mailResult.errors);
                }
            }).catch((err) => {
                console.error('[order:payment-approved] Mail hatası:', order.orderNumber, err.message);
            });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;