const mongoose = require('mongoose')

const WebOrder = require('../../../models/web/order/WebOrder')
const WebProduct = require('../../../models/web/catalog/WebProduct')
const PaymentMethod = require('../../../models/admin/order/PaymentMethod')
const { SITES, DEFAULT_SITE } = require('../../../config/sites')

const resolveSite = (site) => (SITES[site] ? site : DEFAULT_SITE)

const B2B_THEME = 'b2b'
const B2B_CREDIT_METHOD = 'cari'
const B2B_PAYMENT_RECEIPT_TEMPLATE = 'b2b_odeme_makbuzu'

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

const buildOrderTemplateData = async (options = {}) => {
    const { mode = 'preview', orderId = null, guestOnly = false } = options

    let order = null

    if (mode === 'real' && orderId) {
        order = await WebOrder.findById(orderId).lean()

        if (!order) {
            throw new Error(`Sipariş bulunamadı: ${orderId}`)
        }
    } else {
        const previewSite = options.site ? resolveSite(options.site) : null
        const withSite = (f) => (previewSite ? { ...f, site: previewSite } : f)

        const filters = []

        if (guestOnly) {
            filters.push(withSite({ isActive: true, 'payment.status': 'paid', isGuest: true }))
        }
        filters.push(withSite({ isActive: true, 'payment.status': 'paid' }))
        filters.push(withSite({ isActive: true }))
        filters.push({ isActive: true })

        for (const filter of filters) {
            order = await WebOrder.findOne(filter).sort({ createdAt: -1 }).lean()
            if (order) break
        }

        if (!order) {
            throw new Error('Önizleme için sipariş bulunamadı. Lütfen önce bir sipariş oluşturun.')
        }
    }

    const site = mode === 'real'
        ? (order.site || options.site)
        : (options.site || order.site)
    const companyData = await buildCompanyData(site)

    const member = order.memberSnapshot || {}
    const billing = order.billingSnapshot || order.guestBillingAddress || {}
    const shipping = order.shippingSnapshot || order.guestShippingAddress || {}

    const productKeys = (order.items || [])
        .map(item => item.productKey)
        .filter(Boolean)

    const products = productKeys.length > 0
        ? await WebProduct.find({ _key: { $in: productKeys } })
            .select('_key customData diaData')
            .lean()
        : []

    const productMap = {}

    products.forEach(p => {
        productMap[p._key] = p
    })

    const getProductImage = (product) => {
        if (!product) return ''

        if (product.customData?.featuredImage) {
            return product.customData.featuredImage
        }

        if (product.customData?.customImages?.length > 0) {
            const sorted = [...product.customData.customImages].sort((a, b) => (a.order || 0) - (b.order || 0))

            return sorted[0]?.url || ''
        }

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

    const data = {
        ...companyData,

        transactionId: order.orderNumber || '',
        createdAt: order.createdAt || new Date(),
        body: '<p>Siparişiniz başarıyla oluşturuldu ve en kısa süre içerisinde işleme alınacaktır. Süreçle ilgili gelişmeler tarafınıza düzenli olarak bildirilecektir.</p>',
        currency: pricing.currency || 'TL',
        membershipType: order.isGuest ? 'Üyeliksiz Alışveriş' : 'Üye',

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

        paymentProviderName,
        paymentGatewayName,
        installment,
        installmentAmount: hasInstallment ? formatTRY(installmentAmount) : 0,
        installmentInfo: hasInstallment ? `${installment} Taksit x ${formatTRY(installmentAmount)} TL` : '',
        hasInstallment,

        shippingCompanyName: order.shipping?.carrier || '',
        shippingTrackingUrl: order.shipping?.trackingNumber
            ? `https://kargo-takip.com/${order.shipping.trackingNumber}`
            : '',

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

        shippingAddress: {
            firstname: shipping.fullName?.split(' ')[0] || '',
            surname: shipping.fullName?.split(' ').slice(1).join(' ') || '',
            phoneNumber: shipping.phone || '',
            mobilePhoneNumber: shipping.phone || '',
            combinedAddress: buildCombinedAddress(shipping)
        },

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

        orderItems,

        giftNote: '',
        deliveryDetail: null,
        bankAccounts: await getBankAccountsForMail(order),
        refundProcedure: '<p>İade ve iptal prosedürü için müşteri hizmetlerimizle iletişime geçiniz.</p>',
        salesCondition: '<p>Satış koşulları için müşteri hizmetlerimizle iletişime geçiniz.</p>',
        orderFastCommentUrl: '',
        pointPerComment: 0
    }

    if (isB2bSite(order.site)) {
        await applyB2bOrderData(order, data)
    }

    return { data }
}

const isB2bSite = (site) => SITES[site]?.theme === B2B_THEME

const b2bPaymentLabel = (payment = {}, member = null) => {
    if (payment.method === B2B_CREDIT_METHOD) {
        const days = Number(member?.diaCari?.paymentTermDays)
        return days > 0 ? `Cari Sipariş (${days} Gün Vade)` : 'Cari Sipariş'
    }
    if (payment.method === 'bank_transfer') return 'Havale / EFT'
    if (payment.method === 'credit_card') {
        const n = Number(payment.installment) || 1
        return n > 1 ? `Kredi Kartı — ${n} Taksit` : 'Kredi Kartı — Tek Çekim'
    }
    return payment.method || 'Belirtilmemiş'
}

const applyB2bOrderData = async (order, data) => {
    const WebMember = require('../../../models/web/user/WebMember')
    const Cargo = require('../../../models/admin/settings/Cargo')
    const member = order.memberId
        ? await WebMember.findById(order.memberId).select('email phone diaCustomerCode diaCari.paymentTermDays diaCari.vergiDairesi diaCari.vergiNo diaCari.addresses').lean()
        : null
    const pricing = order.pricing || {}
    const shipping = order.shippingSnapshot || {}
    const billingAddr = (member?.diaCari?.addresses || []).find(a => a.ana) || (member?.diaCari?.addresses || [])[0] || {}
    const companyTitle = order.customerName || ''
    const phone = [shipping.phone, member?.phone].find(v => v && v !== '-') || ''

    data.amount = formatTRY(pricing.subtotal)
    data.taxAmount = formatTRY(pricing.vatAmount)
    data.amountWithTax = formatTRY(pricing.total)
    data.generalAmount = formatTRY(pricing.total)
    data.finalAmount = formatTRY(pricing.total)
    data.promotionDiscount = pricing.discountAmount > 0 ? formatTRY(pricing.discountAmount) : 0

    data.paymentProviderName = b2bPaymentLabel(order.payment, member)
    data.hasInstallment = false
    data.installmentInfo = ''
    data.installmentAmount = 0

    if (order.shipping?.method) {
        const cargo = await Cargo.findOne({ site: order.site, code: order.shipping.method }).select('name').lean()
        data.shippingCompanyName = cargo?.name || ''
    }

    data.customer = {
        ...data.customer,
        firstname: companyTitle || 'Bayi',
        surname: '',
        email: member?.email || data.customer?.email || '',
        note: ''
    }
    data.shippingAddress = {
        firstname: shipping.fullName || companyTitle,
        surname: '',
        phoneNumber: phone,
        mobilePhoneNumber: phone,
        combinedAddress: buildCombinedAddress(shipping) || [billingAddr.adres, billingAddr.ilce, billingAddr.il].filter(Boolean).join(', ')
    }
    data.billingAddress = {
        ...data.billingAddress,
        firstname: companyTitle,
        surname: member?.diaCustomerCode ? `(${member.diaCustomerCode})` : '',
        phoneNumber: phone,
        mobilePhoneNumber: phone,
        combinedAddress: [billingAddr.adres, billingAddr.ilce, billingAddr.il].filter(Boolean).join(', '),
        invoiceType: 'corporate',
        taxOffice: member?.diaCari?.vergiDairesi || '',
        taxNumber: member?.diaCari?.vergiNo || '',
        identityRegistrationNumber: ''
    }
}

const getBankAccountsForMail = async (order) => {
    if (order.payment?.method !== 'bank_transfer') {
        return []
    }

    try {
        const banks = await PaymentMethod.find({
            type: 'bank_transfer',
            isActive: true,
            isDeleted: false,
            site: resolveSite(order.site)
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

const buildCompanyData = async (site) => {
    const slug = resolveSite(site)
    const siteConf = SITES[slug]
    const siteHost = siteConf.domains[0]

    let companyData = {
        companyName: siteConf.name,
        companyAddress: 'İstanbul, Türkiye',
        companyPhone1: '',
        companyPhone2: '',
        companyWebsite: `www.${siteHost}`,
        siteUrl: `https://${siteHost}`,
        logo: ''
    }

    try {
        const db = mongoose.connection.db
        const webSetting = await db.collection('websettings').findOne({ site: slug })
        const themeSetting = await db.collection('sitesettings').findOne({ key: 'theme', site: slug })

        const ci = webSetting?.companyInfo || {}
        const themeVal = themeSetting?.value || {}

        const websiteUrl = ci.website || companyData.siteUrl
        const websiteHost = websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')

        const mediaBaseUrl = (process.env.MEDIA_URL || process.env.API_PUBLIC_URL || 'https://api.alastik.com').replace(/\/$/, '')

        const toAbsolute = (u) => (u.startsWith('http') ? u : `${mediaBaseUrl}${u.startsWith('/') ? '' : '/'}${u}`)
        const logoSource = webSetting?.images?.mailLogo || themeVal.logo || ''
        const logoUrl = logoSource ? toAbsolute(logoSource) : ''

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

const buildContactFormData = async (options = {}) => {
    const { mode = 'preview', contactId = null, formData = null } = options

    const companyData = await buildCompanyData(options.site)

    let contentSubject = 'Lastik Stok Bilgisi'
    let fullName = 'Ahmet Yılmaz'
    let email = 'ahmet.yilmaz@example.com'
    let phone = '+90 555 123 45 67'
    let content = 'Merhaba, 205/55 R16 ebatında Pirelli Cinturato P7 modelinin stokta olup olmadığını öğrenebilir miyim? Ayrıca varsa fiyat bilgisini de paylaşabilirseniz çok memnun olurum. Teşekkürler.'

    if (mode === 'real') {
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

const buildGuestOrderData = async (options = {}) => {
    const result = await buildOrderTemplateData({ ...options, guestOnly: true })

    result.data.membershipType = 'Üyeliksiz Alışveriş'

    return result
}

const buildAccountActivationData = async (options = {}) => {
    const companyData = await buildCompanyData(options.site)

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
    }

    const data = {
        ...companyData,
        fullName,
        email
    }

    return { data }
}

const buildAdminPasswordResetData = async (options = {}) => {
    const companyData = await buildCompanyData(options.site)

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
    }

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

const buildRefundRequestData = async (options = {}) => {
    const companyData = await buildCompanyData(options.site)

    let refundRequestCode = 'IADE-000001'

    try {
        const filter = {
            isActive: true,
            status: { $in: ['cancelled', 'returned'] }
        }
        if (options.site) filter.site = resolveSite(options.site)

        const order = await WebOrder.findOne(filter).sort({ updatedAt: -1 }).lean()
            || await WebOrder.findOne({ isActive: true, status: { $in: ['cancelled', 'returned'] } }).sort({ updatedAt: -1 }).lean()

        if (order?.orderNumber) {
            refundRequestCode = order.orderNumber
        }
    } catch (e) {
    }

    const data = {
        ...companyData,
        refundRequestCode
    }

    return { data }
}

const buildMemberActivationData = async (options = {}) => {
    const { mode = 'preview', memberId = null, activationToken = null } = options

    const companyData = await buildCompanyData(options.site)

    let fullName = 'Müşteri'
    let email = ''
    let token = activationToken || 'ORNEK_TOKEN_DEGER'

    if (mode === 'real' && memberId) {
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
        }
    }

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

const buildMemberPasswordResetData = async (options = {}) => {
    const { mode = 'preview', memberId = null, resetToken = null } = options

    const companyData = await buildCompanyData(options.site)

    let fullName = 'Müşteri'
    let email = ''
    let token = resetToken || 'ORNEK_TOKEN_DEGER'

    if (mode === 'real' && memberId) {
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
        }
    }

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

const buildMemberRefundResponseData = async (options = {}) => {
    const companyData = await buildCompanyData(options.site)

    let refundRequestCode = 'IADE-000001'
    let status = 'approved'

    try {
        const filter = {
            isActive: true,
            status: { $in: ['cancelled', 'returned'] }
        }
        if (options.site) filter.site = resolveSite(options.site)

        const order = await WebOrder.findOne(filter).sort({ updatedAt: -1 }).lean()
            || await WebOrder.findOne({ isActive: true, status: { $in: ['cancelled', 'returned'] } }).sort({ updatedAt: -1 }).lean()

        if (order?.orderNumber) {
            refundRequestCode = order.orderNumber
            status = order.status === 'returned' ? 'approved' : 'rejected'
        }
    } catch (e) {
    }

    const data = {
        ...companyData,
        refundRequestCode,
        status
    }

    return { data }
}

const buildBankTransferNotificationData = async (options = {}) => {
    const companyData = await buildCompanyData(options.site)

    const previewSite = options.site ? resolveSite(options.site) : null
    const withSite = (f) => (previewSite ? { ...f, site: previewSite } : f)

    let order = null
    const filters = [
        withSite({ isActive: true, 'payment.method': 'bank_transfer' }),
        withSite({ isActive: true }),
        { isActive: true }
    ]

    for (const filter of filters) {
        order = await WebOrder.findOne(filter).sort({ createdAt: -1 }).lean()
        if (order) break
    }

    if (!order) {
        throw new Error('Önizleme için sipariş bulunamadı.')
    }

    const member = order.memberSnapshot || {}
    const billing = order.billingSnapshot || order.guestBillingAddress || {}

    const memberFirstname = member.firstName || billing.fullName?.split(' ')[0] || 'Müşteri'
    const memberSurname = member.lastName || billing.fullName?.split(' ').slice(1).join(' ') || ''
    const memberEmail = member.email || order.customerEmail || ''
    const memberPhone = member.phone || order.customerPhone || ''

    const orderDate = order.createdAt
        ? new Date(order.createdAt).toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        : ''

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
const buildB2bPaymentReceiptData = async (options = {}) => {
    const B2bPayment = require('../../../models/web/user/B2bPayment')
    const WebMember = require('../../../models/web/user/WebMember')
    const { tahsilatOdemeAdi } = require('../../web/b2b/makbuzPdf')
    const { mode = 'preview', paymentId = null } = options

    let payment = null
    if (mode === 'real' && paymentId) {
        payment = await B2bPayment.findById(paymentId).lean()
        if (!payment) throw new Error(`Ödeme bulunamadı: ${paymentId}`)
    } else {
        const filter = { status: 'paid', ...(options.site ? { site: resolveSite(options.site) } : {}) }
        payment = await B2bPayment.findOne(filter).sort({ paidAt: -1 }).lean()
    }

    const site = mode === 'real' ? (payment?.site || options.site) : (options.site || payment?.site)
    const companyData = await buildCompanyData(site)
    if (!payment) {
        return { data: { ...companyData, reference: 'TC0000000', paidAt: new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }), payerName: 'Örnek Bayi Ltd. Şti.', cariKodu: '120.1.01.000000', amount: formatTRY(1000), paymentMethod: 'Kredi Kartı - Tek Çekim', cardLastFour: '1234', bankName: '', authCode: '' } }
    }

    const member = await WebMember.findById(payment.memberId).select('firstName lastName email diaCustomerCode').lean()
    const payerName = `${member?.firstName || ''} ${member?.lastName || ''}`.replace(/ \.$/, '').trim()
    return {
        data: {
            ...companyData,
            reference: payment.reference || '',
            paidAt: new Date(payment.paidAt || payment.createdAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }),
            payerName: payerName || payment.cariKodu || 'Bayi',
            payerEmail: member?.email || '',
            cariKodu: payment.cariKodu || member?.diaCustomerCode || '',
            amount: formatTRY((payment.amountKurus || 0) / 100),
            paymentMethod: tahsilatOdemeAdi(payment),
            cardLastFour: payment.cardInfo?.lastFourDigits || '',
            bankName: payment.cardInfo?.bankName || '',
            authCode: payment.authCode || ''
        }
    }
}

const buildData = async (templateKey, options = {}) => {
    if (templateKey === B2B_PAYMENT_RECEIPT_TEMPLATE) {
        return await buildB2bPaymentReceiptData(options)
    }

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
        return await buildAccountActivationData(options)
    }
    if (templateKey === 'admin_sifremi_unuttum') {
        return await buildAdminPasswordResetData(options)
    }

    if (templateKey === 'iptal_iade_bilgilendirme') {
        return await buildRefundRequestData(options)
    }

    if (templateKey === 'uye_hesap_aktivasyonu') {
        return await buildMemberActivationData(options)
    }

    if (templateKey === 'uye_sifremi_unuttum') {
        return await buildMemberPasswordResetData(options)
    }

    if (templateKey === 'uye_iade_iptal_talebi') {
        return await buildMemberRefundResponseData(options)
    }

    if (templateKey === 'havale_bildirim_formu') {
        return await buildBankTransferNotificationData(options)
    }

    return { data: {} }
}

module.exports = { buildData }