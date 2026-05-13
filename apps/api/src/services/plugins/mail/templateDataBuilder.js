const mongoose = require('mongoose')

const WebOrder = require('../../../models/web/order/WebOrder')
const WebProduct = require('../../../models/web/catalog/WebProduct')
const PaymentMethod = require('../../../models/admin/order/PaymentMethod')


const buildCombinedAddress = (addr) => {
    if (!addr) return ''

    const parts = [
        addr.street,
        addr.buildingNo && `No: ${addr.buildingNo}`,
        addr.apartmentNo && `Daire: ${addr.apartmentNo}`,
        addr.floor && `Kat: ${addr.floor}`,
        addr.neighborhoodName && `${addr.neighborhoodName} Mah.`,
        addr.districtName,
        addr.cityName
    ].filter(Boolean)

    return parts.join(', ')
}

const formatTRY = (value) => {
    const num = Number(value) || 0

    return num.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
}

// Sipariş şablonu için veri hazırla
// options: { mode: 'preview' | 'real', orderId: string, guestOnly: boolean }
const buildOrderTemplateData = async (options = {}) => {
    const { mode = 'preview', orderId = null, guestOnly = false } = options

    let order = null

    // Gerçek mail: spesifik sipariş
    if (mode === 'real' && orderId) {
        order = await WebOrder.findById(orderId).lean()

        if (!order) {
            throw new Error(`Sipariş bulunamadı: ${orderId}`)
        }
    } else {
        // Önizleme: son siparişi çek
        const baseFilter = {
            isActive: true,
            'payment.status': 'paid'
        }

        if (guestOnly) {
            baseFilter.isGuest = true
        }

        order = await WebOrder.findOne(baseFilter).sort({ createdAt: -1 }).lean()

        if (!order && guestOnly) {
            order = await WebOrder.findOne({
                isActive: true,
                'payment.status': 'paid'
            }).sort({ createdAt: -1 }).lean()
        }

        if (!order) {
            order = await WebOrder.findOne({ isActive: true }).sort({ createdAt: -1 }).lean()
        }

        if (!order) {
            throw new Error('Önizleme için sipariş bulunamadı. Lütfen önce bir sipariş oluşturun.')
        }
    }

    // Şirket bilgileri - websettings + sitesettings collection'lardan
    let companyData = {
        companyName: 'ALastik.com',
        companyAddress: 'İstanbul, Türkiye',
        companyPhone1: '',
        companyPhone2: '',
        companyWebsite: 'www.alastik.com',
        siteUrl: 'https://alastik.com',
        logo: ''
    }

    try {
        const db = mongoose.connection.db

        // websettings: companyInfo
        const webSetting = await db.collection('websettings').findOne({})

        // sitesettings: theme value (logo)
        const themeSetting = await db.collection('sitesettings').findOne({ key: 'theme' })

        const ci = webSetting?.companyInfo || {}
        const themeVal = themeSetting?.value || {}

        // Web sitesi URL'i (https:// dahil)
        const websiteUrl = ci.website || companyData.siteUrl
        const websiteHost = websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')

        const mediaBaseUrl = (process.env.MEDIA_URL || process.env.API_PUBLIC_URL || 'https://api.alastik.com').replace(/\/$/, '')

        let logoUrl = ''

        if (themeVal.logo) {
            logoUrl = themeVal.logo.startsWith('http')
                ? themeVal.logo
                : `${mediaBaseUrl}${themeVal.logo.startsWith('/') ? '' : '/'}${themeVal.logo}`
        } else if (webSetting?.images?.mailLogo) {
            logoUrl = webSetting.images.mailLogo.startsWith('http')
                ? webSetting.images.mailLogo
                : `${mediaBaseUrl}${webSetting.images.mailLogo.startsWith('/') ? '' : '/'}${webSetting.images.mailLogo}`
        }

        // Adres oluştur
        const addressParts = [
            ci.address,
            ci.district,
            ci.city,
            ci.country
        ].filter(Boolean)

        companyData = {
            companyName: ci.name || ci.officialName || companyData.companyName,
            companyAddress: addressParts.join(', ') || companyData.companyAddress,
            companyPhone1: ci.phone || companyData.companyPhone1,
            companyPhone2: ci.phone2 || '',
            companyWebsite: websiteHost,
            siteUrl: websiteUrl,
            logo: logoUrl
        }
    } catch (e) {
        console.error('[templateDataBuilder] Settings okuma hatası:', e.message)
    }

    // Müşteri bilgileri
    const member = order.memberSnapshot || {}
    const billing = order.billingSnapshot || order.guestBillingAddress || {}
    const shipping = order.shippingSnapshot || order.guestShippingAddress || {}

    // Ürün ID'lerini topla
    // Ürün anahtarlarını topla (DIA _key)
    const productKeys = (order.items || [])
        .map(item => item.productKey)
        .filter(Boolean)

    // İlgili ürünleri tek seferde çek (_key ile eşleştir)
    const products = productKeys.length > 0
        ? await WebProduct.find({ _key: { $in: productKeys } })
            .select('_key customData diaData')
            .lean()
        : []

    const productMap = {}

    products.forEach(p => {
        productMap[p._key] = p
    })

    // Görsel önceliği helper'ı (memory'deki görsel öncelik kuralı)
    const getProductImage = (product) => {
        if (!product) return ''

        // 1. customData.featuredImage
        if (product.customData?.featuredImage) {
            return product.customData.featuredImage
        }

        // 2. customData.customImages (order'a göre)
        if (product.customData?.customImages?.length > 0) {
            const sorted = [...product.customData.customImages].sort((a, b) => (a.order || 0) - (b.order || 0))

            return sorted[0]?.url || ''
        }

        // 3. diaData.m_resimler (order_id'ye göre)
        if (product.diaData?.m_resimler?.length > 0) {
            const sorted = [...product.diaData.m_resimler].sort((a, b) => {
                const aOrder = parseInt(a.order_id) || 0
                const bOrder = parseInt(b.order_id) || 0

                return aOrder - bOrder
            })

            return sorted[0]?.aws_url || ''
        }

        return ''
    }

    // Sipariş kalemleri
    const orderItems = (order.items || []).map(item => {
        const product = item.productKey ? productMap[item.productKey] : null
        const productImage = getProductImage(product)
        const productSeoUrl = product?.customData?.seoUrl || ''

        return {
            productName: item.name || product?.diaData?.aciklama || '',
            productImage,
            productUrl: productSeoUrl ? `${companyData.siteUrl}/urun/${productSeoUrl}` : '#',
            unitPrice: formatTRY(item.unitPrice || 0),
            quantity: item.quantity || 1,
            totalPrice: formatTRY(item.totalPrice || 0),
            moneyOrderTotalPrice: 0,
            isProductPromotional: false,
            hasSubscription: false,
            isDigitalProduct: false,
            digitalProductDownloadUrl: '',
            customizations: []
        }
    })

    // Ödeme yöntemi metni
    const paymentMethodLabels = {
        credit_card: 'Kredi Kartı',
        credit_card_3d: 'Kredi Kartı (3D Secure)',
        bank_transfer: 'Havale/EFT',
        cash_on_delivery: 'Kapıda Ödeme',
        netahsilat_installment: 'Taksitli Ödeme'
    }

    const paymentProviderName = paymentMethodLabels[order.payment?.method] || 'Belirtilmemiş'
    const paymentGatewayName = order.payment?.cardInfo?.bankName || ''
    const installment = order.payment?.installment || 1
    const hasInstallment = installment > 1

    const pricing = order.pricing || {}
    const finalAmount = pricing.total || 0
    const installmentAmount = hasInstallment ? (finalAmount / installment).toFixed(2) : 0

    const VAT_RATE = 0.20
    const subtotalWithVat = pricing.subtotal || 0
    const subtotalWithoutVat = subtotalWithVat / (1 + VAT_RATE)
    const vatAmountCalc = subtotalWithVat - subtotalWithoutVat

    // IdeaSoft formatına uyumlu data objesi
    const data = {
        ...companyData,

        // Sipariş
        transactionId: order.orderNumber || '',
        createdAt: order.createdAt || new Date(),
        body: '<p>Siparişiniz başarıyla oluşturuldu ve en kısa süre içerisinde işleme alınacaktır. Süreçle ilgili gelişmeler tarafınıza düzenli olarak bildirilecektir.</p>',
        currency: pricing.currency || 'TL',
        membershipType: order.isGuest ? 'Üyeliksiz Alışveriş' : 'Üye',

        // Tutarlar
        amount: formatTRY(subtotalWithoutVat),
        taxAmount: formatTRY(vatAmountCalc),
        amountWithTax: formatTRY(subtotalWithVat),
        generalAmount: formatTRY(subtotalWithVat),
        finalAmount: formatTRY(finalAmount),
        couponDiscount: 0,
        promotionDiscount: pricing.discountAmount > 0 ? formatTRY(pricing.discountAmount) : 0,
        shippingAmount: pricing.shippingCost > 0 ? formatTRY(pricing.shippingCost) : 0,
        giftAmount: 0,
        additionalServiceAmount: 0,
        orderCustomTaxLines: [],

        // Ödeme
        paymentProviderName,
        paymentGatewayName,
        installment,
        installmentAmount: hasInstallment ? formatTRY(installmentAmount) : 0,
        installmentInfo: hasInstallment ? `${installment} Taksit x ${formatTRY(installmentAmount)} TL` : '',
        hasInstallment,

        // Kargo
        shippingCompanyName: order.shipping?.carrier || '',
        shippingTrackingUrl: order.shipping?.trackingNumber
            ? `https://kargo-takip.com/${order.shipping.trackingNumber}`
            : '',

        // Müşteri
        customer: {
            firstname: member.firstName || billing.fullName?.split(' ')[0] || 'Müşteri',
            surname: member.lastName || billing.fullName?.split(' ').slice(1).join(' ') || '',
            email: member.email || order.customerEmail || '',
            note: order.customerNote || '',
            hasRepresentative: false,
            representativeFirstname: '',
            representativeSurname: '',
            representativeEmail: ''
        },

        // Teslimat adresi
        shippingAddress: {
            firstname: shipping.fullName?.split(' ')[0] || '',
            surname: shipping.fullName?.split(' ').slice(1).join(' ') || '',
            phoneNumber: shipping.phone || '',
            mobilePhoneNumber: shipping.phone || '',
            combinedAddress: buildCombinedAddress(shipping)
        },

        // Fatura adresi
        billingAddress: {
            firstname: billing.fullName?.split(' ')[0] || billing.companyName?.split(' ')[0] || '',
            surname: billing.fullName?.split(' ').slice(1).join(' ') || billing.companyName?.split(' ').slice(1).join(' ') || '',
            phoneNumber: billing.phone || '',
            mobilePhoneNumber: billing.phone || '',
            combinedAddress: buildCombinedAddress(billing),
            invoiceType: billing.invoiceType === 'corporate' ? 'corporate' : 'individual',
            taxOffice: billing.taxOffice || '',
            taxNumber: billing.taxNo || '',
            identityRegistrationNumber: billing.tcNo || ''
        },

        // Ürünler
        orderItems,

        // Ek bilgiler
        // Ek bilgiler
        giftNote: '',
        deliveryDetail: null,
        bankAccounts: await getBankAccountsForMail(order),
        refundProcedure: '<p>İade ve iptal prosedürü için müşteri hizmetlerimizle iletişime geçiniz.</p>',
        salesCondition: '<p>Satış koşulları için müşteri hizmetlerimizle iletişime geçiniz.</p>',
        orderFastCommentUrl: '',
        pointPerComment: 0
    }

    return { data }
}

// Sadece havale ödeme tipinde banka hesaplarını getir
const getBankAccountsForMail = async (order) => {
    if (order.payment?.method !== 'bank_transfer') {
        return []
    }

    try {
        const banks = await PaymentMethod.find({
            type: 'bank_transfer',
            isActive: true,
            isDeleted: false
        }).sort({ priority: 1 }).lean()

        return banks.map(bank => {
            const s = bank.bankTransferSettings || {}
            const hasIban = !!s.iban

            return {
                bankName: bank.providerMeta?.displayName || bank.name || '',
                selected: false,
                usesIban: hasIban,
                accountCode: hasIban ? s.iban : (s.accountNumber || ''),
                accountName: s.accountName || '',
                accountType: 'TL',
                branchName: s.branchName || '',
                branchCode: s.branchCode || '',
                swiftCode: s.swift || ''
            }
        })
    } catch (e) {
        console.error('[templateDataBuilder] Banka hesapları alınamadı:', e.message)

        return []
    }
}

// templateKey'e göre uygun veri builder'ı çalıştır
// Şirket bilgilerini DB'den çek (companyData)
const buildCompanyData = async () => {
    let companyData = {
        companyName: 'ALastik.com',
        companyAddress: 'İstanbul, Türkiye',
        companyPhone1: '',
        companyPhone2: '',
        companyWebsite: 'www.alastik.com',
        siteUrl: 'https://alastik.com',
        logo: ''
    }

    try {
        const db = mongoose.connection.db
        const webSetting = await db.collection('websettings').findOne({})
        const themeSetting = await db.collection('sitesettings').findOne({ key: 'theme' })

        const ci = webSetting?.companyInfo || {}
        const themeVal = themeSetting?.value || {}

        const websiteUrl = ci.website || companyData.siteUrl
        const websiteHost = websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')

        const mediaBaseUrl = (process.env.MEDIA_URL || process.env.API_PUBLIC_URL || 'https://api.alastik.com').replace(/\/$/, '')

        let logoUrl = ''

        if (themeVal.logo) {
            logoUrl = themeVal.logo.startsWith('http')
                ? themeVal.logo
                : `${mediaBaseUrl}${themeVal.logo.startsWith('/') ? '' : '/'}${themeVal.logo}`
        } else if (webSetting?.images?.mailLogo) {
            logoUrl = webSetting.images.mailLogo.startsWith('http')
                ? webSetting.images.mailLogo
                : `${mediaBaseUrl}${webSetting.images.mailLogo.startsWith('/') ? '' : '/'}${webSetting.images.mailLogo}`
        }

        const addressParts = [
            ci.address,
            ci.district,
            ci.city,
            ci.country
        ].filter(Boolean)

        companyData = {
            companyName: ci.name || ci.officialName || companyData.companyName,
            companyAddress: addressParts.join(', ') || companyData.companyAddress,
            companyPhone1: ci.phone || companyData.companyPhone1,
            companyPhone2: ci.phone2 || '',
            companyWebsite: websiteHost,
            siteUrl: websiteUrl,
            logo: logoUrl
        }
    } catch (e) {
        console.error('[templateDataBuilder] Settings okuma hatası:', e.message)
    }

    return companyData
}

// İletişim Formu için veri hazırla
// options: { mode: 'preview' | 'real', contactId, formData }
const buildContactFormData = async (options = {}) => {
    const { mode = 'preview', contactId = null, formData = null } = options

    const companyData = await buildCompanyData()

    let contentSubject = 'Lastik Stok Bilgisi'
    let fullName = 'Ahmet Yılmaz'
    let email = 'ahmet.yilmaz@example.com'
    let phone = '+90 555 123 45 67'
    let content = 'Merhaba, 205/55 R16 ebatında Pirelli Cinturato P7 modelinin stokta olup olmadığını öğrenebilir miyim? Ayrıca varsa fiyat bilgisini de paylaşabilirseniz çok memnun olurum. Teşekkürler.'

    if (mode === 'real') {
        // Gerçek mail: önce direkt formData'dan, yoksa contactId ile DB'den çek
        if (formData) {
            contentSubject = formData.subject || ''
            fullName = `${formData.name || ''} ${formData.surname || ''}`.trim()
            email = formData.email || ''
            phone = formData.phone || ''
            content = formData.message || ''
        } else if (contactId) {
            try {
                const db = mongoose.connection.db
                const contact = await db.collection('webcontacts').findOne({ _id: new mongoose.Types.ObjectId(contactId) })

                if (contact) {
                    contentSubject = contact.subject || ''
                    fullName = `${contact.name || ''} ${contact.surname || ''}`.trim()
                    email = contact.email || ''
                    phone = contact.phone || ''
                    content = contact.message || ''
                }
            } catch (e) {
                console.error('[templateDataBuilder] İletişim kaydı okunamadı:', e.message)
            }
        }
    }

    const data = {
        ...companyData,
        contentSubject,
        fullName,
        email,
        phone,
        content
    }

    return { data }
}

// templateKey'e göre uygun veri builder'ı çalıştır
const buildGuestOrderData = async (options = {}) => {
    // Sipariş Şablonu ile aynı veri yapısını kullan
    const result = await buildOrderTemplateData({ ...options, guestOnly: true })

    // Üyelik tipi ekle
    result.data.membershipType = 'Üyeliksiz Alışveriş'

    return result
}

// templateKey'e göre uygun veri builder'ı çalıştır
// Hesap Aktivasyon Maili için veri hazırla (son aktif üyeden örnek)
// Hesap Aktivasyon Maili için veri hazırla (sadece yöneticilere - adminusers)
const buildAccountActivationData = async () => {
    const companyData = await buildCompanyData()

    let fullName = 'Yönetici'
    let email = ''

    try {
        const db = mongoose.connection.db
        const adminUser = await db.collection('adminusers').findOne(
            { isActive: true },
            { sort: { lastLogin: -1 } }
        )

        if (adminUser) {
            fullName = adminUser.name || fullName
            email = adminUser.email || ''
        }
    } catch (e) {
        // Admin yoksa default kullan
    }

    const data = {
        ...companyData,
        fullName,
        email
    }

    return { data }
}

// Admin Şifremi Unuttum için veri hazırla (adminusers'tan örnek + reset url)
const buildAdminPasswordResetData = async () => {
    const companyData = await buildCompanyData()

    let fullName = 'Yönetici'
    let email = ''

    try {
        const db = mongoose.connection.db
        const adminUser = await db.collection('adminusers').findOne(
            { isActive: true },
            { sort: { lastLogin: -1 } }
        )

        if (adminUser) {
            fullName = adminUser.name || fullName
            email = adminUser.email || ''
        }
    } catch (e) {
        // Admin yoksa default kullan
    }

    // Örnek reset URL (gerçek mailde token ile dolu olacak)
    const adminBaseUrl = (process.env.ADMIN_URL || 'https://admin.alastik.com').replace(/\/$/, '')
    const resetUrl = `${adminBaseUrl}/sifre-sifirla?token=ORNEK_TOKEN_DEGER`

    const data = {
        ...companyData,
        fullName,
        email,
        resetUrl
    }

    return { data }
}

// İptal/İade Talebi Bilgilendirme için veri hazırla
// (en son iade/iptal durumundaki siparişten talep kodu örneklenir)
const buildRefundRequestData = async () => {
    const companyData = await buildCompanyData()

    let refundRequestCode = 'IADE-000001'

    try {
        // İptal veya iade durumundaki son sipariş
        const order = await WebOrder.findOne({
            isActive: true,
            status: { $in: ['cancelled', 'returned'] }
        })
            .sort({ updatedAt: -1 })
            .lean()

        if (order?.orderNumber) {
            refundRequestCode = order.orderNumber
        }
    } catch (e) {
        // Sipariş yoksa default kullan
    }

    const data = {
        ...companyData,
        refundRequestCode
    }

    return { data }
}

// Üye Hesap Aktivasyonu için veri hazırla (webmembers'tan örnek + activation url)
// Üye Hesap Aktivasyonu için veri hazırla
// options: { mode: 'preview' | 'real', memberId, activationToken }
const buildMemberActivationData = async (options = {}) => {
    const { mode = 'preview', memberId = null, activationToken = null } = options

    const companyData = await buildCompanyData()

    let fullName = 'Müşteri'
    let email = ''
    let token = activationToken || 'ORNEK_TOKEN_DEGER'

    if (mode === 'real' && memberId) {
        // Gerçek mail: spesifik üye
        try {
            const db = mongoose.connection.db
            const member = await db.collection('webmembers').findOne({ _id: new mongoose.Types.ObjectId(memberId) })

            if (member) {
                fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || fullName
                email = member.email || ''
            }
        } catch (e) {
            console.error('[templateDataBuilder] Üye okunamadı:', e.message)
        }
    } else {
        // Önizleme: son aktif üyeden örnek
        try {
            const db = mongoose.connection.db
            const member = await db.collection('webmembers').findOne(
                { status: { $ne: 'deleted' } },
                { sort: { createdAt: -1 } }
            )

            if (member) {
                fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || fullName
                email = member.email || ''
            }
        } catch (e) {
            // Member yoksa default kullan
        }
    }

    // Activation URL (gerçek mailde gerçek token, önizlemede ORNEK_TOKEN_DEGER)
    const websiteUrl = (companyData.siteUrl || 'https://alastik.com').replace(/\/$/, '')
    const activationUrl = `${websiteUrl}/uye-aktivasyon?token=${token}`

    const data = {
        ...companyData,
        fullName,
        email,
        activationUrl
    }

    return { data }
}

// Üye Şifremi Unuttum için veri hazırla
// options: { mode: 'preview' | 'real', memberId, resetToken }
const buildMemberPasswordResetData = async (options = {}) => {
    const { mode = 'preview', memberId = null, resetToken = null } = options

    const companyData = await buildCompanyData()

    let fullName = 'Müşteri'
    let email = ''
    let token = resetToken || 'ORNEK_TOKEN_DEGER'

    if (mode === 'real' && memberId) {
        // Gerçek mail: spesifik üye
        try {
            const db = mongoose.connection.db
            const member = await db.collection('webmembers').findOne({ _id: new mongoose.Types.ObjectId(memberId) })

            if (member) {
                fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || fullName
                email = member.email || ''
            }
        } catch (e) {
            console.error('[templateDataBuilder] Üye okunamadı:', e.message)
        }
    } else {
        // Önizleme: son aktif üyeden örnek
        try {
            const db = mongoose.connection.db
            const member = await db.collection('webmembers').findOne(
                { status: { $ne: 'deleted' } },
                { sort: { lastLoginAt: -1 } }
            )

            if (member) {
                fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || fullName
                email = member.email || ''
            }
        } catch (e) {
            // Member yoksa default kullan
        }
    }

    // Reset URL (gerçek mailde gerçek token, önizlemede ORNEK_TOKEN_DEGER)
    const websiteUrl = (companyData.siteUrl || 'https://alastik.com').replace(/\/$/, '')
    const resetUrl = `${websiteUrl}/sifre-sifirla?token=${token}`

    const data = {
        ...companyData,
        fullName,
        email,
        resetUrl
    }

    return { data }
}

// Üye İade/İptal Talebi (sonuç bildirimi) için veri hazırla
// status: 'approved' | 'rejected'
const buildMemberRefundResponseData = async () => {
    const companyData = await buildCompanyData()

    let refundRequestCode = 'IADE-000001'
    let status = 'approved'

    try {
        // İptal/iade durumundaki son sipariş
        const order = await WebOrder.findOne({
            isActive: true,
            status: { $in: ['cancelled', 'returned'] }
        })
            .sort({ updatedAt: -1 })
            .lean()

        if (order?.orderNumber) {
            refundRequestCode = order.orderNumber
            // returned -> approved (iade onaylandı), cancelled -> rejected (iptal edildi)
            status = order.status === 'returned' ? 'approved' : 'rejected'
        }
    } catch (e) {
        // Sipariş yoksa default kullan
    }

    const data = {
        ...companyData,
        refundRequestCode,
        status
    }

    return { data }
}

// Havale Bildirim Formu için veri hazırla
// (havale ödeme yöntemli son siparişten örnek)
const buildBankTransferNotificationData = async () => {
    const companyData = await buildCompanyData()

    // Havale/EFT ödeme yöntemli son sipariş
    let order = await WebOrder.findOne({
        isActive: true,
        'payment.method': 'bank_transfer'
    })
        .sort({ createdAt: -1 })
        .lean()

    // Yoksa son sipariş
    if (!order) {
        order = await WebOrder.findOne({ isActive: true })
            .sort({ createdAt: -1 })
            .lean()
    }

    if (!order) {
        throw new Error('Önizleme için sipariş bulunamadı.')
    }

    const member = order.memberSnapshot || {}
    const billing = order.billingSnapshot || order.guestBillingAddress || {}

    // Üye adı: önce memberSnapshot, yoksa billingSnapshot.fullName
    const memberFirstname = member.firstName || billing.fullName?.split(' ')[0] || 'Müşteri'
    const memberSurname = member.lastName || billing.fullName?.split(' ').slice(1).join(' ') || ''
    const memberEmail = member.email || order.customerEmail || ''
    const memberPhone = member.phone || order.customerPhone || ''

    // Tarih (sipariş tarihi)
    const orderDate = order.createdAt
        ? new Date(order.createdAt).toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        : ''

    // Banka bilgileri (payment.bankTransfer'dan, yoksa boş)
    const bankTransfer = order.payment?.bankTransfer || {}
    const paymentGatewayName = bankTransfer.bankName || ''
    const accountName = bankTransfer.accountHolder || ''
    const accountCode = bankTransfer.iban || ''
    const branchName = ''
    const branchCode = ''
    const swiftCode = ''
    const accountType = 'TL'

    const data = {
        ...companyData,

        orderDate,
        memberFirstname,
        memberSurname,
        memberEmail,
        memberPhone,

        paymentGatewayName,
        branchName,
        branchCode,
        accountName,
        accountCode,
        swiftCode,
        accountType,

        transactionId: order.orderNumber || '',
        info: bankTransfer.referenceCode || ''
    }

    return { data }
}
// templateKey'e göre uygun veri builder'ı çalıştır
const buildData = async (templateKey, options = {}) => {
    if (templateKey === 'siparis_sablonu') {
        return await buildOrderTemplateData(options)
    }

    if (templateKey === 'iletisim_formu') {
        return await buildContactFormData(options)
    }

    if (templateKey === 'uyeliksiz_alisveris_sablonu') {
        return await buildGuestOrderData(options)
    }

    if (templateKey === 'hesap_aktivasyon_maili') {
        return await buildAccountActivationData()
    }
    if (templateKey === 'admin_sifremi_unuttum') {
        return await buildAdminPasswordResetData()
    }

    if (templateKey === 'iptal_iade_bilgilendirme') {
        return await buildRefundRequestData()
    }

    if (templateKey === 'uye_hesap_aktivasyonu') {
        return await buildMemberActivationData(options)
    }

    if (templateKey === 'uye_sifremi_unuttum') {
        return await buildMemberPasswordResetData(options)
    }

    if (templateKey === 'uye_iade_iptal_talebi') {
        return await buildMemberRefundResponseData()
    }

    if (templateKey === 'havale_bildirim_formu') {
        return await buildBankTransferNotificationData()
    }

    // Default boş veri
    return { data: {} }
}

module.exports = { buildData }