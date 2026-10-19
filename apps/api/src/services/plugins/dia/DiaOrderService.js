const axios = require('axios');
const winston = require('winston');
const WebDia = require('../../../models/plugins/dia/DiaSettings');
const DiaStock = require('../../../models/plugins/DiaStock');
const WebMember = require('../../../models/web/user/WebMember');
const { SITES } = require('../../../config/sites');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'dia-order' },
    transports: [
        new winston.transports.File({ filename: 'logs/dia-order.log' }),
        new winston.transports.Console()
    ]
});

const DIA_CURRENCY_KEY_TRY = 2026;

const SITE_CUSTOMER_PREFIX = {
    alastik: 'AL',
    lastikjantavm: 'LJA'
};

const DIA_DELIVERY_LABEL = 'KARGO';
const DIA_DESCRIPTION_MAX_LENGTH = 128;

const SESSION_LOST_PATTERN = /INVALID_SESSION|SessionTimedOut|dönem yetkiniz/i;
const SESSION_RETRY_LIMIT = 4;
const DEPOT_STOCK_READ_ATTEMPTS = 2;
const SESSION_RETRY_DELAY_MS = 250;
const DIA_LOGIN_METHOD = 'login';
const isSessionLost = (data) => SESSION_LOST_PATTERN.test(String(data?.msg || '')) || SESSION_LOST_PATTERN.test(String(data?.message || ''));

class DiaOrderService {
    constructor(site) {
        this.site = site;
        this.settings = null;
        this.sessionId = null;
        this.orderSalespersonKey = null;
        this.firmaKodu = 0;
        this.donemKodu = 0;
    }

    async init() {
        this.settings = await WebDia.getSettings(this.site);

        const siparis = this.settings.siparis || {};

        if (!siparis.aktif) {
            return { active: false };
        }

        const missing = [];
        if (!this.settings.baseURL) missing.push('Sunucu adresi (baseURL)');
        if (!this.settings.username) missing.push('Kullanıcı adı');
        if (!this.settings.password) missing.push('Şifre');
        if (!this.settings.apiKey) missing.push('API anahtarı');
        if (!siparis.subeKey) missing.push('Şube Key');
        if (!siparis.depoKey) missing.push('Depo Key');

        if (missing.length > 0) {
            throw new Error(`DIA sipariş ayarları eksik: ${missing.join(', ')}. Modüller → DIA → Sipariş Entegrasyonu bölümünü doldurun.`);
        }

        this.firmaKodu = siparis.firmaKodu || this.settings.firmaKodu || 1;
        this.donemKodu = siparis.donemKodu || this.settings.donemKodu || 1;

        return { active: true };
    }

    async sendRequest(endpoint, payload, attempt = 0) {
        const url = `${this.settings.baseURL}${endpoint}`;
        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
            validateStatus: () => true
        });
        const data = response.data;

        const method = payload && typeof payload === 'object' ? Object.keys(payload)[0] : null;
        const body = method ? payload[method] : null;
        if (attempt < SESSION_RETRY_LIMIT && body?.session_id && method !== DIA_LOGIN_METHOD && isSessionLost(data)) {
            if (!this.sessionId || String(body.session_id) === String(this.sessionId)) {
                await new Promise(r => setTimeout(r, SESSION_RETRY_DELAY_MS * (attempt + 1)));
                await this.login();
            }
            logger.warn('[DiaOrder] DIA oturumu düştü, oturum yenilenip istek tekrarlanıyor', {
                site: this.site, method, attempt: attempt + 1
            });
            return this.sendRequest(endpoint, { [method]: { ...body, session_id: this.sessionId } }, attempt + 1);
        }
        return data;
    }

    async login() {
        let lastResponse = null;
        for (const disconnect of ['False', 'True']) {
            const response = await this.sendRequest('/api/v3/sis/json', {
                login: {
                    username: this.settings.username,
                    password: this.settings.password,
                    disconnect_same_user: disconnect,
                    params: { apikey: this.settings.apiKey }
                }
            });
            if (response?.code === '200' && response.msg) {
                this.sessionId = response.msg;
                return this.sessionId;
            }
            lastResponse = response;
        }

        throw new Error(`DIA oturumu açılamadı: ${lastResponse?.msg || 'bilinmeyen hata'}`);
    }

    async ensureSession() {
        if (this.sessionId) return this.sessionId;
        return this.login();
    }

    formatDecimal(value) {
        const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : parseFloat(value);
        return isNaN(num) ? '0.000000' : num.toFixed(6);
    }

    normalizePhone(value) {
        let digits = String(value || '').replace(/\D/g, '');
        if (!digits) return '';
        if (digits.length > 10 && digits.startsWith('90')) digits = digits.slice(2);
        if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
        return digits.length === 10 ? `90${digits}` : digits;
    }

    async checkOrderExists(orderNumber) {
        const sessionId = await this.ensureSession();

        const request = {
            scf_siparis_listele: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                filters: [{ field: 'fisno', operator: '=', value: orderNumber }],
                sorts: '',
                params: { selectedcolumns: ['_key', 'fisno', 'turu', 'aciklama1', 'aciklama2', 'aciklama3'] },
                limit: 5,
                offset: 0
            }
        };

        const response = await this.sendRequest('/api/v3/scf/json', request);

        if (Array.isArray(response?.result) && response.result.length > 0) {
            const siteName = SITES[this.site]?.name || '';
            const own = response.result.find(row => {
                if (String(row.turu) !== '2') return false;
                const a1 = String(row.aciklama1 || '');
                const a2 = String(row.aciklama2 || '');
                const a3 = String(row.aciklama3 || '');
                return a2 === orderNumber || a2 === this.site || a1.includes(orderNumber)
                    || (siteName !== '' && a3.startsWith(`${siteName} - `));
            });
            if (own) {
                return { exists: true, diaKey: String(own._key) };
            }
            logger.warn('[DiaOrder] Aynı fiş numaralı YABANCI fiş bulundu, sahiplenilmedi', {
                orderNumber,
                foreignKeys: response.result.map(r => String(r._key))
            });
        }
        return { exists: false };
    }

    async nextCustomerCode(order) {
        const siparis = this.settings.siparis || {};

        const updated = await WebDia.findOneAndUpdate(
            { site: this.site },
            { $inc: { 'siparis.cariKodSayac': 1 } },
            { new: true }
        ).select('siparis.cariKodSayac').lean();

        const sequence = updated?.siparis?.cariKodSayac;
        if (!sequence) {
            throw new Error('Cari kod sayacı okunamadı. DIA sipariş ayarlarını kontrol edin.');
        }

        return `${siparis.cariKodOnek}${String(sequence).padStart(6, '0')}`;
    }

    buildCustomerCode(order) {
        const prefix = SITE_CUSTOMER_PREFIX[this.site] || this.site.slice(0, 3).toUpperCase();

        const phoneSource = order.customerPhone
            || order.memberSnapshot?.phone
            || order.billingSnapshot?.phone
            || order.shippingSnapshot?.phone
            || '';
        const phoneDigits = String(phoneSource).replace(/\D/g, '').replace(/^90/, '').replace(/^0/, '');

        if (phoneDigits.length === 10) {
            return `${prefix}-${phoneDigits}`;
        }

        if (order.memberId) {
            const numeric = String(parseInt(String(order.memberId).slice(-10), 16));
            return `${prefix}-M${numeric}`;
        }

        return `${prefix}-${String(order.orderNumber).replace(/\D/g, '')}`;
    }

    async findCustomerByCode(customerCode) {
        const sessionId = await this.ensureSession();

        const request = {
            scf_carikart_listele: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                filters: [{ field: 'carikartkodu', operator: '=', value: customerCode }],
                sorts: '',
                params: { selectedcolumns: ['_key', 'carikartkodu', 'unvan'] },
                limit: 1,
                offset: 0
            }
        };

        const response = await this.sendRequest('/api/v3/scf/json', request);

        if (response?.code === '200' && Array.isArray(response.result) && response.result.length > 0) {
            const found = response.result[0];
            return { key: String(found._key), code: found.carikartkodu, unvan: found.unvan };
        }
        return null;
    }

    buildAddressText(snapshot) {
        if (!snapshot) return '';
        const parts = [];
        if (snapshot.neighborhoodName) parts.push(snapshot.neighborhoodName);
        if (snapshot.street) parts.push(snapshot.street);
        if (snapshot.buildingNo) parts.push(`No:${snapshot.buildingNo}`);
        if (snapshot.floor) parts.push(`Kat:${snapshot.floor}`);
        if (snapshot.apartmentNo) parts.push(`Daire:${snapshot.apartmentNo}`);
        return parts.join(' ').trim();
    }

    buildCustomerAddresses(order, customerCode) {
        const billing = order.billingSnapshot || order.guestBillingAddress || {};
        const shipping = order.shippingSnapshot || order.guestShippingAddress || billing;
        const phone = this.normalizePhone(order.customerPhone || billing.phone || shipping.phone || '');
        const isCommercial = !!(billing.taxNo && String(billing.taxNo).replace(/\D/g, '').length === 10);

        const addresses = [];

        addresses.push({
            adres1: this.buildAddressText(billing),
            adres2: '',
            adresadi: `FT-${customerCode}`,
            adrestipi: 'F',
            anaadres: '1',
            ceptel: phone,
            _key_sis_sehirler: billing.cityName ? { sehiradi: String(billing.cityName).toLocaleUpperCase('tr-TR') } : 0,
            ilce: (billing.districtName || '').toLocaleUpperCase('tr-TR'),
            kayitturu: isCommercial ? 'KRLS' : 'SHS',
            ulke: 'TÜRKİYE',
            vergidairesi: billing.taxOffice || '',
            verginumarasi: billing.taxNo || ''
        });

        addresses.push({
            adres1: this.buildAddressText(shipping),
            adres2: '',
            adresadi: `SE-${customerCode}`,
            adrestipi: 'T',
            anaadres: '0',
            ceptel: this.normalizePhone(shipping.phone) || phone,
            _key_sis_sehirler: shipping.cityName ? { sehiradi: String(shipping.cityName).toLocaleUpperCase('tr-TR') } : 0,
            ilce: (shipping.districtName || '').toLocaleUpperCase('tr-TR'),
            kayitturu: isCommercial ? 'KRLS' : 'SHS',
            ulke: 'TÜRKİYE'
        });

        return addresses;
    }

    async createCustomer(order, customerCode) {
        const sessionId = await this.ensureSession();

        const billing = order.billingSnapshot || order.guestBillingAddress || {};
        const member = order.memberSnapshot || {};

        const email = order.customerEmail || member.email || billing.email || '';
        const phone = this.normalizePhone(order.customerPhone || member.phone || billing.phone || '');

        let tcNo = '11111111111';
        let taxNo = '';
        let kayitTuru = 'SHS';
        const cleanTax = String(billing.taxNo || '').replace(/\D/g, '');
        const cleanTc = String(billing.tcNo || '').replace(/\D/g, '');
        if (cleanTax.length === 10) {
            taxNo = cleanTax;
            tcNo = '';
            kayitTuru = 'KRLS';
        } else if (cleanTc.length === 11) {
            tcNo = cleanTc;
        }

        const fullName = billing.fullName
            || `${member.firstName || ''} ${member.lastName || ''}`.trim()
            || order.customerName
            || 'Müşteri';
        const unvan = (billing.companyName && billing.companyName.trim()) ? billing.companyName.trim() : fullName;

        const kart = {
            durum: 'A',
            carikartkodu: customerCode,
            unvan,
            eposta: email,
            ceptel: phone,
            tckimlikno: tcNo,
            verginumarasi: taxNo,
            vergidairesi: billing.taxOffice || '',
            carikayitturu: kayitTuru,
            m_adresler: this.buildCustomerAddresses(order, customerCode)
        };

        const siparis = this.settings.siparis || {};
        if (siparis.cariOzelKod1Key) {
            kart._key_sis_ozelkod1 = siparis.cariOzelKod1Key;
        }
        if (siparis.cariSeviyeKodKey) {
            kart._key_sis_seviyekodu = siparis.cariSeviyeKodKey;
        }
        if (siparis.cariOdemePlaniKey) {
            kart._key_scf_odeme_plani = siparis.cariOdemePlaniKey;
        }

        const request = {
            scf_carikart_ekle: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                kart
            }
        };

        logger.info('[DiaOrder] Cari kartı oluşturuluyor', {
            site: this.site,
            customerCode,
            unvan,
            kayitTuru
        });

        const response = await this.sendRequest('/api/v3/scf/json', request);

        if (response?.code === '200' || response?.code === '501') {
            const customer = await this.findCustomerByCode(customerCode);
            if (customer) return customer;
        }

        throw new Error(`DIA cari kartı oluşturulamadı (${response?.code}): ${response?.msg || 'bilinmeyen hata'}`);
    }

    async resolveCustomer(order) {
        const siparis = this.settings.siparis || {};

        if (siparis.cariModu === 'tekCari') {
            if (!siparis.genelCariKodu) {
                throw new Error('Cari modu "Tek Cari" seçili ancak Genel Cari Kodu boş. DIA sipariş ayarlarını kontrol edin.');
            }
            const customer = await this.findCustomerByCode(siparis.genelCariKodu);
            if (!customer) {
                throw new Error(`Genel cari DIA'da bulunamadı: ${siparis.genelCariKodu}`);
            }
            return { ...customer, created: false };
        }

        let memberDoc = null;
        if (order.memberId) {
            memberDoc = await WebMember.findById(order.memberId).select('diaCustomerKey diaCustomerCode');
            if (memberDoc?.diaCustomerKey) {
                return {
                    key: String(memberDoc.diaCustomerKey),
                    code: memberDoc.diaCustomerCode || '',
                    created: false
                };
            }
        }

        let customer = null;
        let created = false;

        if (siparis.cariKodOnek) {
            let customerCode = await this.nextCustomerCode(order);
            let attempts = 0;
            while (attempts < 5 && await this.findCustomerByCode(customerCode)) {
                customerCode = await this.nextCustomerCode(order);
                attempts++;
            }
            customer = await this.createCustomer(order, customerCode);
            created = true;
        } else {
            const customerCode = this.buildCustomerCode(order);
            customer = await this.findCustomerByCode(customerCode);
            if (!customer) {
                customer = await this.createCustomer(order, customerCode);
                created = true;
            }
        }

        if (memberDoc) {
            try {
                await WebMember.updateOne(
                    { _id: order.memberId },
                    { $set: { diaCustomerKey: customer.key, diaCustomerCode: customer.code } }
                );
            } catch (err) {
                logger.warn('[DiaOrder] Üyeye DIA cari anahtarı yazılamadı', { memberId: String(order.memberId), error: err.message });
            }
        }

        return { ...customer, created };
    }

    async resolveStockItem(item) {
        const sameFirm = this.firmaKodu === (this.settings.firmaKodu || 1);

        if (sameFirm && item.productKey) {
            const stock = await DiaStock.findOne({ _key: item.productKey })
                .select('_key anabirimkey stokkartkodu aciklama')
                .lean();
            if (stock) {
                let unitKey = stock.anabirimkey ? parseInt(stock.anabirimkey) : 0;
                if (!unitKey) {
                    unitKey = await this.findStockUnitKey(stock._key);
                }
                if (unitKey) {
                    return { stockKey: parseInt(stock._key), unitKey, stockCode: stock.stokkartkodu };
                }
            }
        }

        const searchCode = item.stockCode || item.productKey;
        if (!searchCode) return null;

        const sessionId = await this.ensureSession();
        const request = {
            scf_stokkart_listele: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                filters: [{ field: 'stokkartkodu', operator: '=', value: String(searchCode) }],
                sorts: '',
                params: { selectedcolumns: ['_key', 'stokkartkodu', 'anabirimkey'] },
                limit: 1,
                offset: 0
            }
        };

        const response = await this.sendRequest('/api/v3/scf/json', request);
        if (response?.code === '200' && Array.isArray(response.result) && response.result.length > 0) {
            const found = response.result[0];
            let unitKey = found.anabirimkey ? parseInt(found.anabirimkey) : 0;
            if (!unitKey) {
                unitKey = await this.findStockUnitKey(found._key);
            }
            if (unitKey) {
                return { stockKey: parseInt(found._key), unitKey, stockCode: found.stokkartkodu };
            }
        }

        if (!sameFirm) {
            try {
                return await this.maybeCreateServiceCard(item, searchCode);
            } catch (error) {
                logger.error('[DiaOrder] Hizmet kartı otomatik açılamadı', {
                    stockCode: searchCode, error: error.message
                });
            }
        }

        return null;
    }

    async maybeCreateServiceCard(item, searchCode) {
        const siparis = this.settings.siparis || {};
        const excludedCategories = (siparis.sirketlerArasiHaricKategoriler || []).filter(Boolean);
        if (!excludedCategories.length || !item.productKey) return null;

        const sourceStock = await DiaStock.findOne({ _key: item.productKey })
            .select('_key stokkartkodu aciklama m_kategoriler.kategori_aciklama_1')
            .lean();
        if (!sourceStock) return null;

        const isService = (sourceStock.m_kategoriler || [])
            .some(category => excludedCategories.includes(category.kategori_aciklama_1));
        if (!isService) return null;

        const sessionId = await this.ensureSession();
        const sourceFirma = this.settings.firmaKodu || 1;
        const sourceDonem = this.settings.donemKodu || this.donemKodu;

        const cardResp = await this.sendRequest('/api/v3/scf/json', {
            scf_stokkart_listele: {
                session_id: sessionId,
                firma_kodu: sourceFirma,
                donem_kodu: sourceDonem,
                filters: [{ field: 'stokkartkodu', operator: '=', value: String(searchCode) }],
                sorts: '',
                params: { selectedcolumns: ['_key', 'stokkartkodu', 'aciklama', 'stokkartturu', 'kdvsatis', 'kdvsatistoptan', 'kdvalis'] },
                limit: 1,
                offset: 0
            }
        });
        const sourceCard = Array.isArray(cardResp?.result) ? cardResp.result[0] : null;
        if (!sourceCard) return null;

        const unitResp = await this.sendRequest('/api/v3/scf/json', {
            scf_stokkart_birimleri_listele: {
                session_id: sessionId,
                firma_kodu: sourceFirma,
                donem_kodu: sourceDonem,
                filters: [{ field: '_key_scf_stokkart', operator: '=', value: String(sourceCard._key) }],
                sorts: '',
                params: {},
                limit: 1,
                offset: 0
            }
        });
        const sourceUnit = Array.isArray(unitResp?.result) ? unitResp.result[0] : null;
        const sisUnitKey = sourceUnit?._key_sis_stok_birim_listesi;
        if (!sisUnitKey) {
            throw new Error(`Kaynak kartın birim tanımı okunamadı: ${searchCode}`);
        }

        logger.info('[DiaOrder] Hizmet kartı sipariş firmasında açılıyor', {
            stockCode: searchCode,
            firmaKodu: this.firmaKodu
        });

        const createResp = await this.sendRequest('/api/v3/scf/json', {
            scf_stokkart_ekle: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                kart: {
                    stokkartkodu: sourceCard.stokkartkodu,
                    aciklama: sourceCard.aciklama,
                    stokkartturu: sourceCard.stokkartturu,
                    durum: 'A',
                    kdvsatis: sourceCard.kdvsatis,
                    kdvsatistoptan: sourceCard.kdvsatistoptan,
                    kdvalis: sourceCard.kdvalis,
                    m_birimler: [{
                        _key_sis_stok_birim_listesi: String(sisUnitKey),
                        anabirim: '1',
                        carpan: '1.000000'
                    }]
                }
            }
        });

        if (createResp?.code !== '200' && createResp?.code !== '501') {
            throw new Error(`DIA hizmet kartı açılamadı (${createResp?.code}): ${createResp?.msg || 'bilinmeyen hata'}`);
        }

        const verifyResp = await this.sendRequest('/api/v3/scf/json', {
            scf_stokkart_listele: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                filters: [{ field: 'stokkartkodu', operator: '=', value: String(searchCode) }],
                sorts: '',
                params: { selectedcolumns: ['_key', 'stokkartkodu'] },
                limit: 1,
                offset: 0
            }
        });
        const created = Array.isArray(verifyResp?.result) ? verifyResp.result[0] : null;
        if (!created) {
            throw new Error(`Hizmet kartı açıldı ama geri sorgulanamadı: ${searchCode}`);
        }

        const unitKey = await this.findStockUnitKey(created._key);
        if (!unitKey) {
            throw new Error(`Hizmet kartının birim satırı bulunamadı: ${searchCode}`);
        }

        logger.info('[DiaOrder] Hizmet kartı açıldı', {
            stockCode: searchCode,
            stockKey: created._key,
            firmaKodu: this.firmaKodu
        });

        return { stockKey: parseInt(created._key), unitKey, stockCode: created.stokkartkodu };
    }

    async findStockUnitKey(stockKey) {
        const sessionId = await this.ensureSession();
        const request = {
            scf_stokkart_birimleri_listele: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                filters: [{ field: '_key_scf_stokkart', operator: '=', value: String(stockKey) }],
                sorts: '',
                params: {},
                limit: 5,
                offset: 0
            }
        };

        const response = await this.sendRequest('/api/v3/scf/json', request);
        if (response?.code === '200' && Array.isArray(response.result) && response.result.length > 0) {
            return parseInt(response.result[0]._key);
        }
        return 0;
    }

    async findServiceUnitKey(serviceKey) {
        const sessionId = await this.ensureSession();
        const response = await this.sendRequest('/api/v3/scf/json', {
            scf_hizmetkart_birimleri_listele: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                filters: [{ field: '_key_scf_hizmetkart', operator: '=', value: String(serviceKey) }],
                sorts: '',
                params: {},
                limit: 5,
                offset: 0
            }
        });
        if (String(response?.code) === '200' && Array.isArray(response.result) && response.result.length > 0) {
            return parseInt(response.result[0]._key) || 0;
        }
        return 0;
    }

    lineFinancials(item, { separateShipping = false } = {}) {
        const qty = parseFloat(item.quantity) || 1;
        const vatRate = parseFloat(item.vatRate) || 20;
        const shippingPerUnit = parseFloat(item.shippingPerUnit)
            || ((parseFloat(item.shippingTotal) || 0) / qty) || 0;
        const finalKdvDahil = (parseFloat(item.unitPrice) || 0) + (separateShipping ? 0 : shippingPerUnit);
        let listeKdvDahil = parseFloat(item.listUnitPrice) || finalKdvDahil;
        if (listeKdvDahil < finalKdvDahil) listeKdvDahil = finalKdvDahil;
        const r6 = n => Math.round(n * 1e6) / 1e6;
        let rates = Array.isArray(item.discountRates)
            ? item.discountRates.map(r => parseFloat(r) || 0)
            : [];
        while (rates.length && Math.abs(rates[rates.length - 1]) < 0.000001) rates.pop();
        if (!rates.length && listeKdvDahil > finalKdvDahil) {
            rates = [r6((1 - finalKdvDahil / listeKdvDahil) * 100)];
        }
        const div = 1 + vatRate / 100;
        const listeHaric = r6(listeKdvDahil / div);
        let factor = 1;
        for (const r of rates) if (r > 0.000001) factor *= (1 - r / 100);
        const grossHaric = r6(listeHaric * qty);
        const netHaric = r6(grossHaric * factor);
        const indirimHaric = r6(grossHaric - netHaric);
        const kdv = r6(netHaric * vatRate / 100);
        return { qty, vatRate, shippingPerUnit, finalKdvDahil, listeHaric, rates, grossHaric, indirimHaric, netHaric, kdv, hasDiscount: rates.some(r => r > 0.000001) };
    }

    buildOrderItems(order, customer, resolvedStocks) {
        const siparis = this.settings.siparis || {};
        const items = [];
        let lineNo = 1;
        const today = new Date().toISOString().slice(0, 10);
        let toplam = 0, toplamindirim = 0, toplamkdv = 0;
        let shippingKdvDahil = 0;
        let shippingVatRate = 0;

        for (const item of order.items) {
            const stock = resolvedStocks.get(item);
            if (!stock) continue;

            const f = this.lineFinancials(item, { separateShipping: !!this.shippingServiceLine });
            shippingKdvDahil += f.shippingPerUnit * f.qty;
            toplam += f.netHaric;
            toplamindirim += f.indirimHaric;
            toplamkdv += f.kdv;

            const ortak = {
                _key_scf_carikart: parseInt(customer.key),
                _key_kalemturu: stock.stockKey,
                _key_scf_kalem_birimleri: stock.unitKey,
                _key_sis_depo_source: stock.depoKey || siparis.depoKey,
                _key_sis_doviz: DIA_CURRENCY_KEY_TRY,
                kalemturu: 'MLZM',
                anamiktar: this.formatDecimal(f.qty),
                miktar: this.formatDecimal(f.qty),
                dovizkuru: '1.000000',
                kdv: this.formatDecimal(f.vatRate),
                daraadet: '0.000000',
                note: item.name || '',
                note2: f.shippingPerUnit > 0 && !this.shippingServiceLine ? 'Kargo dahil' : '',
                onay: 'KABUL',
                rezervasyon: 'H',
                siptarih: today,
                sirano: lineNo
            };

            if (f.hasDiscount) {
                const kalem = {
                    ...ortak,
                    birimfiyati: this.formatDecimal(f.listeHaric),
                    sonbirimfiyati: this.formatDecimal(f.listeHaric),
                    yerelbirimfiyati: this.formatDecimal(f.listeHaric),
                    tutari: this.formatDecimal(f.grossHaric),
                    kdvdurumu: 'H',
                    kdvtutari: this.formatDecimal(f.kdv)
                };
                f.rates.forEach((r, i) => { kalem['indirim' + (i + 1)] = this.formatDecimal(r); });
                items.push(kalem);
            } else {
                items.push({
                    ...ortak,
                    birimfiyati: this.formatDecimal(f.finalKdvDahil),
                    sonbirimfiyati: this.formatDecimal(f.finalKdvDahil),
                    yerelbirimfiyati: this.formatDecimal(f.finalKdvDahil),
                    tutari: this.formatDecimal(f.finalKdvDahil * f.qty),
                    kdvdurumu: 'D',
                    kdvtutari: this.formatDecimal(f.kdv)
                });
            }
            if (!shippingVatRate) shippingVatRate = f.vatRate;
            lineNo++;
        }

        const r6 = n => Math.round(n * 1e6) / 1e6;

        if (this.shippingServiceLine && shippingKdvDahil > 0) {
            const vatRate = shippingVatRate || 20;
            const haric = r6(shippingKdvDahil / (1 + vatRate / 100));
            const kdv = r6(shippingKdvDahil - haric);
            const today = new Date().toISOString().slice(0, 10);
            items.push({
                _key_scf_carikart: parseInt(customer.key),
                _key_kalemturu: this.shippingServiceLine.serviceKey,
                _key_scf_kalem_birimleri: this.shippingServiceLine.unitKey,
                _key_sis_depo_source: siparis.depoKey,
                _key_sis_doviz: DIA_CURRENCY_KEY_TRY,
                kalemturu: 'HZMT',
                anamiktar: this.formatDecimal(1),
                miktar: this.formatDecimal(1),
                dovizkuru: '1.000000',
                kdv: this.formatDecimal(vatRate),
                daraadet: '0.000000',
                note: 'Kargo Bedeli',
                note2: '',
                onay: 'KABUL',
                rezervasyon: 'H',
                siptarih: today,
                sirano: lineNo,
                birimfiyati: this.formatDecimal(haric),
                sonbirimfiyati: this.formatDecimal(haric),
                yerelbirimfiyati: this.formatDecimal(haric),
                tutari: this.formatDecimal(haric),
                kdvdurumu: 'H',
                kdvtutari: this.formatDecimal(kdv)
            });
            toplam += haric;
            toplamkdv += kdv;
        }

        const totals = {
            toplam: this.formatDecimal(r6(toplam)),
            toplamindirim: this.formatDecimal(r6(toplamindirim)),
            toplamkdv: this.formatDecimal(r6(toplamkdv)),
            net: this.formatDecimal(r6(toplam + toplamkdv))
        };
        return { items, totals };
    }

    extractKey(value) {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return parseInt(value) || 0;
        if (Array.isArray(value)) {
            if (typeof value[1] === 'number') return value[1];
            if (Array.isArray(value[0])) return value[0][0];
            return parseInt(value[0]) || 0;
        }
        if (typeof value === 'object' && value._key) return parseInt(value._key);
        return 0;
    }

    async checkInvoiceExists(orderNumber) {
        const sessionId = await this.ensureSession();

        const request = {
            scf_fatura_listele: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                filters: [{ field: 'fisno', operator: '=', value: orderNumber }],
                sorts: '',
                params: { selectedcolumns: ['_key', 'fisno'] },
                limit: 5,
                offset: 0
            }
        };

        const response = await this.sendRequest('/api/v3/scf/json', request);

        if (Array.isArray(response?.result) && response.result.length > 0) {
            return { exists: true, diaKey: String(response.result[0]._key) };
        }
        return { exists: false };
    }

    async getDepotStock(stockCode, depoKey) {
        const sessionId = await this.ensureSession();

        const response = await this.sendRequest('/api/v3/scf/json', {
            scf_stokkart_detay_listele: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                filters: [{ field: 'stokkartkodu', operator: '=', value: String(stockCode) }],
                sorts: [{ field: 'stokkartkodu', sorttype: 'DESC' }],
                params: { _key_sis_depo: depoKey, _key_sis_depo_filtre: depoKey, tarih: '2099-12-31' },
                limit: 1,
                offset: 0
            }
        });

        const row = Array.isArray(response?.result) ? response.result[0] : null;
        return row ? (parseFloat(row.gercek_stok) || 0) : 0;
    }

    async resolveDealerSalespersonKey(order, customer) {
        if (!order?.memberId || !customer?.key) return null;
        const member = await WebMember.findById(order.memberId).select('diaCari.salespersonKey').lean();
        if (!member?.diaCari) return null;
        try {
            const sessionId = await this.ensureSession();
            const response = await this.sendRequest('/api/v3/scf/json', {
                scf_carikart_listele: {
                    session_id: sessionId,
                    firma_kodu: this.firmaKodu,
                    donem_kodu: this.donemKodu,
                    filters: [{ field: '_key', operator: '=', value: String(customer.key) }],
                    sorts: '',
                    params: { selectedcolumns: ['_key', '_key_scf_satiselemani'] },
                    limit: 1,
                    offset: 0
                }
            });
            const row = Array.isArray(response?.result) ? response.result[0] : null;
            if (row) {
                const liveKey = parseInt(row._key_scf_satiselemani) || 0;
                return liveKey > 0 ? liveKey : null;
            }
        } catch (error) {
            logger.warn('[DiaOrder] Carinin plasiyeri DIA\'dan okunamadı, kayıtlı değer kullanılacak', { orderNumber: order.orderNumber, error: error.message });
        }
        const storedKey = parseInt(member.diaCari.salespersonKey) || 0;
        return storedKey > 0 ? storedKey : null;
    }

    async getDepotStockOrNull(stockCode, depoKey) {
        for (let attempt = 0; attempt < DEPOT_STOCK_READ_ATTEMPTS; attempt++) {
            if (attempt > 0) {
                this.sessionId = null;
                await this.login();
            }
            const sessionId = await this.ensureSession();
            const response = await this.sendRequest('/api/v3/scf/json', {
                scf_stokkart_detay_listele: {
                    session_id: sessionId,
                    firma_kodu: this.firmaKodu,
                    donem_kodu: this.donemKodu,
                    filters: [{ field: 'stokkartkodu', operator: '=', value: String(stockCode) }],
                    sorts: [{ field: 'stokkartkodu', sorttype: 'DESC' }],
                    params: { _key_sis_depo: depoKey, _key_sis_depo_filtre: depoKey, tarih: '2099-12-31' },
                    limit: 1,
                    offset: 0
                }
            });
            const row = String(response?.code) === '200' && Array.isArray(response.result) ? response.result[0] : null;
            if (row) return parseFloat(row.gercek_stok) || 0;
            logger.warn('[DiaOrder] Depo stoğu okunamadı (boş yanıt)', { site: this.site, stockCode, depoKey, attempt: attempt + 1 });
        }
        return null;
    }

    async getDepotStockBatch(stockCodes, depoKey) {
        const codes = (stockCodes || []).map(c => String(c)).filter(Boolean);
        if (codes.length === 0) return {};

        const sessionId = await this.ensureSession();
        const response = await this.sendRequest('/api/v3/scf/json', {
            scf_stokkart_detay_listele: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                filters: [{ field: 'stokkartkodu', operator: 'IN', value: codes.join(',') }],
                sorts: '',
                params: { _key_sis_depo: depoKey, _key_sis_depo_filtre: depoKey, tarih: '2099-12-31' },
                limit: codes.length,
                offset: 0
            }
        });

        const rows = Array.isArray(response?.result) ? response.result : [];
        const map = {};
        for (const r of rows) {
            if (r?.stokkartkodu) map[r.stokkartkodu] = parseFloat(r.gercek_stok) || 0;
        }
        return map;
    }

    getInvoiceDepotKeys() {
        const siparis = this.settings.siparis || {};
        return String(siparis.faturaDepoKeys || '')
            .split(',')
            .map(value => parseInt(value.trim()))
            .filter(Boolean);
    }

    async resolveInvoiceDepot(stockCard, quantity, depotKeys) {
        const stockCode = stockCard?.stokkartkodu || '';
        const isService = stockCard?.stokkartturu === 'HZM';

        if (isService || !stockCode) {
            return depotKeys[0];
        }

        for (const depoKey of depotKeys) {
            const stock = await this.getDepotStock(stockCode, depoKey);
            if (stock >= quantity) {
                logger.info('[DiaOrder] Fatura deposu seçildi', { stockCode, depoKey, stock, quantity });
                return depoKey;
            }
        }

        const fallbackDepot = depotKeys[depotKeys.length - 1];
        logger.warn('[DiaOrder] Hiçbir depoda yeterli stok yok, son öncelikli depo denenecek', {
            stockCode,
            quantity,
            fallbackDepot
        });
        return fallbackDepot;
    }

    async createInvoice(order, diaOrderKey) {
        const siparis = this.settings.siparis || {};
        const sessionId = await this.ensureSession();

        const existing = await this.checkInvoiceExists(order.orderNumber);
        if (existing.exists) {
            return { invoiceKey: existing.diaKey, existing: true };
        }

        const depotKeys = this.getInvoiceDepotKeys();
        if (depotKeys.length === 0) {
            throw new Error('Fatura depo listesi boş. DIA ayarlarında "Fatura Depoları" alanını doldurun.');
        }
        const paymentPlanKey = this.resolvePaymentPlanKey(order);

        const sipResponse = await this.sendRequest('/api/v3/scf/json', {
            scf_siparis_getir: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                key: parseInt(diaOrderKey)
            }
        });
        const diaOrder = sipResponse?.result;
        if (!diaOrder) {
            throw new Error(`Fatura için DIA siparişi okunamadı (key: ${diaOrderKey})`);
        }

        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toTimeString().slice(0, 8);

        const items = [];
        let headerDepoKey = 0;
        let index = 0;
        for (const kalem of (diaOrder.m_kalemler || [])) {
            const quantity = parseFloat(kalem.miktar) || 1;
            const itemDepoKey = await this.resolveInvoiceDepot(kalem._key_kalemturu, quantity, depotKeys);
            if (!headerDepoKey) headerDepoKey = itemDepoKey;

            const invoiceItem = {
                _key_kalemturu: this.extractKey(kalem._key_kalemturu),
                _key_scf_kalem_birimleri: this.extractKey(kalem._key_scf_kalem_birimleri),
                _key_sis_depo_source: itemDepoKey,
                _key_sis_doviz: DIA_CURRENCY_KEY_TRY,
                _key_scf_odeme_plani: paymentPlanKey || this.extractKey(kalem._key_scf_odeme_plani),
                _key_scf_satiselemani: this.extractKey(diaOrder._key_scf_satiselemani) || siparis.satisElemaniKey || 0,
                kalemturu: kalem.kalemturu || 'MLZM',
                miktar: kalem.miktar,
                anamiktar: kalem.anamiktar || kalem.miktar,
                birimfiyati: kalem.birimfiyati,
                sonbirimfiyati: kalem.sonbirimfiyati || kalem.birimfiyati,
                yerelbirimfiyati: kalem.yerelbirimfiyati || kalem.birimfiyati,
                tutari: kalem.tutari,
                dovizkuru: '1.000000',
                kdv: kalem.kdv,
                kdvdurumu: kalem.kdvdurumu || 'D',
                kdvtutari: kalem.kdvtutari,
                sirano: (index + 1) * 10,
                note: ''
            };
            if (siparis.faturaSiparisiKapatsin) {
                invoiceItem._key_scf_siparis_kalemi = parseInt(kalem._key);
            }
            items.push(invoiceItem);
            index++;
        }

        if (!headerDepoKey) headerDepoKey = depotKeys[0];

        if (items.length === 0) {
            throw new Error('Fatura için sipariş kalemi bulunamadı');
        }

        const kart = {
            turu: 2,
            fisno: order.orderNumber,
            belgeno: '',
            tarih: dateStr,
            saat: timeStr,
            ortalamavade: dateStr,
            _key_scf_carikart: this.extractKey(diaOrder._key_scf_carikart),
            _key_sis_sube_source: siparis.subeKey,
            _key_sis_depo_source: headerDepoKey,
            _key_sis_doviz: DIA_CURRENCY_KEY_TRY,
            _key_sis_doviz_raporlama: DIA_CURRENCY_KEY_TRY,
            _key_scf_odeme_plani: paymentPlanKey,
            _key_scf_satiselemani: this.extractKey(diaOrder._key_scf_satiselemani) || siparis.satisElemaniKey || 0,
            _key_sis_seviyekodu: siparis.faturaSeviyeKodKey || siparis.siparisSeviyeKodKey || 0,
            dovizkuru: '1.000000',
            raporlamadovizkuru: '1.000000',
            aciklama1: order.orderNumber,
            aciklama2: (order.customerName
                || order.billingSnapshot?.fullName
                || order.shippingSnapshot?.fullName
                || order.billingSnapshot?.companyName
                || '').trim(),
            aciklama3: [SITES[this.site]?.name || this.site, this.getPaymentMethodLabel(order), DIA_DELIVERY_LABEL]
                .filter(Boolean)
                .join(' - '),
            m_kalemler: items,
            net: diaOrder.net,
            netdvz: diaOrder.netdvz || diaOrder.net,
            toplam: diaOrder.toplam,
            toplamdvz: diaOrder.toplamdvz || diaOrder.toplam,
            toplamkdv: diaOrder.toplamkdv,
            toplamkdvdvz: diaOrder.toplamkdvdvz || diaOrder.toplamkdv,
            toplamindirim: '0.000000',
            toplammasraf: '0.000000',
            sevkadresi1: diaOrder.sevkadresi1 || '',
            sevkadresi2: '',
            sevkadresi3: diaOrder.sevkadresi3 || ''
        };

        logger.info('[DiaOrder] Fatura kesiliyor', {
            orderNumber: order.orderNumber,
            diaOrderKey,
            depotKeys,
            itemDepots: items.map(item => item._key_sis_depo_source),
            itemCount: items.length
        });

        const response = await this.sendRequest('/api/v3/scf/json', {
            scf_fatura_ekle: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                kart
            }
        });

        if (response?.code === '200') {
            return { invoiceKey: String(response.key || ''), existing: false };
        }

        throw new Error(`DIA fatura kaydı reddedildi (${response?.code}): ${response?.msg || 'bilinmeyen hata'}`);
    }

    async getUnitPriceByNo(stockKey, priceNo) {
        const sessionId = await this.ensureSession();
        const response = await this.sendRequest('/api/v3/scf/json', {
            scf_stokkart_birimleri_listele: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                filters: [{ field: '_key_scf_stokkart', operator: '=', value: String(stockKey) }],
                sorts: '',
                params: {},
                limit: 1,
                offset: 0
            }
        });
        const row = Array.isArray(response?.result) ? response.result[0] : null;
        const price = parseFloat(row?.[`fiyat${priceNo}`]) || 0;
        return price;
    }

    async checkDispatchExists(fisno) {
        const sessionId = await this.ensureSession();
        const response = await this.sendRequest('/api/v3/scf/json', {
            scf_irsaliye_listele: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                filters: [{ field: 'fisno', operator: '=', value: fisno }],
                sorts: '',
                params: { selectedcolumns: ['_key', 'fisno'] },
                limit: 2,
                offset: 0
            }
        });
        const row = Array.isArray(response?.result) ? response.result[0] : null;
        return row ? { exists: true, diaKey: String(row._key) } : { exists: false };
    }

    async checkTransferExists(fisno) {
        const sessionId = await this.ensureSession();
        const response = await this.sendRequest('/api/v3/scf/json', {
            scf_malzeme_fisi_listele: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                filters: [{ field: 'fisno', operator: '=', value: fisno }],
                sorts: '',
                params: { selectedcolumns: ['_key', 'fisno'] },
                limit: 2,
                offset: 0
            }
        });
        const row = Array.isArray(response?.result) ? response.result[0] : null;
        return row ? { exists: true, diaKey: String(row._key) } : { exists: false };
    }

    async allocateSourceDepots(stockCode, quantity, depotKeys, fallbackDepoKey, { strict = false } = {}) {
        if (!Array.isArray(depotKeys) || depotKeys.length === 0 || !stockCode) {
            return [{ depoKey: fallbackDepoKey, quantity }];
        }

        const allocations = [];
        let remaining = quantity;
        for (const depoKey of depotKeys) {
            if (remaining <= 0) break;
            const read = await this.getDepotStockOrNull(stockCode, depoKey);
            if (read === null && strict) {
                throw new Error(`Kaynak depo stoğu DIA'dan okunamadı (${stockCode}, depo ${depoKey}); çıkış irsaliyesi kesilmedi, otomatik tekrar denenecek`);
            }
            const stock = read ?? 0;
            const take = Math.min(remaining, Math.max(0, Math.floor(stock)));
            if (take > 0) {
                allocations.push({ depoKey, quantity: take });
                remaining -= take;
            }
        }

        if (remaining > 0) {
            const lastDepot = depotKeys[depotKeys.length - 1];
            const existing = allocations.find(a => a.depoKey === lastDepot);
            if (existing) {
                existing.quantity += remaining;
            } else {
                allocations.push({ depoKey: lastDepot, quantity: remaining });
            }
            logger.warn('[DiaOrder] Kaynak depolarda yeterli stok yok, kalan son depoya yazıldı', {
                stockCode, quantity, remaining, lastDepot
            });
        }

        logger.info('[DiaOrder] Kaynak sipariş depo dağılımı', { stockCode, quantity, allocations });
        return allocations;
    }

    async createSourceOrder({ fisno, cariKey, depoKey, depotKeys = [], subeKey, planKey, elemanKey, seviyeKey, items, description, orderNumber }) {
        const sessionId = await this.ensureSession();
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);

        let subtotal = 0;
        let vatTotal = 0;
        const rows = [];
        let sirano = 1;
        for (const item of items) {
            const allocations = await this.allocateSourceDepots(item.stockCode, item.quantity, depotKeys, depoKey);
            for (const alloc of allocations) {
                const lineTotal = item.price * alloc.quantity;
                const lineVat = (lineTotal * item.vatRate) / 100;
                subtotal += lineTotal;
                vatTotal += lineVat;
                rows.push({
                    _key_scf_carikart: cariKey,
                    _key_kalemturu: item.stockKey,
                    _key_scf_kalem_birimleri: item.unitKey,
                    _key_sis_depo_source: alloc.depoKey,
                    _key_sis_doviz: DIA_CURRENCY_KEY_TRY,
                    _key_scf_odeme_plani: planKey || 0,
                    kalemturu: 'MLZM',
                    miktar: this.formatDecimal(alloc.quantity),
                    anamiktar: this.formatDecimal(alloc.quantity),
                    birimfiyati: this.formatDecimal(item.price),
                    sonbirimfiyati: this.formatDecimal(item.price),
                    yerelbirimfiyati: this.formatDecimal(item.price),
                    tutari: this.formatDecimal(lineTotal),
                    dovizkuru: '1.000000',
                    kdv: this.formatDecimal(item.vatRate),
                    kdvdurumu: 'H',
                    kdvtutari: this.formatDecimal(lineVat),
                    onay: 'KABUL',
                    rezervasyon: 'H',
                    siptarih: dateStr,
                    sirano: sirano++,
                    note: item.name || ''
                });
            }
        }

        const headerDepoKey = rows[0]?._key_sis_depo_source || depoKey;

        const kart = {
            _key_scf_carikart: cariKey,
            _key_sis_sube_source: subeKey,
            _key_sis_depo_source: headerDepoKey,
            _key_sis_doviz: DIA_CURRENCY_KEY_TRY,
            _key_sis_doviz_raporlama: DIA_CURRENCY_KEY_TRY,
            turu: 2,
            onay: 'KABUL',
            fisno,
            tarih: dateStr,
            saat: now.toTimeString().slice(0, 8),
            ortalamavade: dateStr,
            dovizkuru: '1.000000',
            raporlamadovizkuru: '1.000000',
            aciklama1: description,
            aciklama2: '',
            aciklama3: '',
            ekalan4: orderNumber,
            m_kalemler: rows,
            net: this.formatDecimal(subtotal + vatTotal),
            netdvz: this.formatDecimal(subtotal + vatTotal),
            toplam: this.formatDecimal(subtotal),
            toplamdvz: this.formatDecimal(subtotal),
            toplamindirim: '0.000000',
            toplamindirimdvz: '0.000000',
            toplamkdv: this.formatDecimal(vatTotal),
            toplamkdvdvz: this.formatDecimal(vatTotal),
            toplammasraf: '0.000000',
            toplammasrafdvz: '0.000000',
            sevkadresi1: '',
            sevkadresi2: '',
            sevkadresi3: '',
            teslimat_adres1: '',
            teslimat_adres2: '',
            teslimat_adsoyad: '',
            teslimat_ceptel: '',
            teslimat_telefon: '',
            teslimat_ilce: '',
            teslimat_key_sis_sehirler: 0
        };
        if (planKey) kart._key_scf_odeme_plani = planKey;
        if (elemanKey) kart._key_scf_satiselemani = elemanKey;
        if (seviyeKey) kart._key_sis_seviyekodu = seviyeKey;

        const response = await this.sendRequest('/api/v3/scf/json', {
            scf_siparis_ekle: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                kart
            }
        });

        if (response?.code !== '200') {
            throw new Error(`Kaynak firma siparişi oluşturulamadı [${fisno}] (${response?.code}): ${response?.msg || 'bilinmeyen hata'}`);
        }
        return String(response.key);
    }

    async createIncomingDispatch({ fisno, cariKey, depoKey, subeKey, items, description, turu = 1 }) {
        const sessionId = await this.ensureSession();
        const now = new Date();

        let subtotal = 0;
        let vatTotal = 0;
        const rows = items.map((item, index) => {
            const lineTotal = item.price * item.quantity;
            const lineVat = (lineTotal * item.vatRate) / 100;
            subtotal += lineTotal;
            vatTotal += lineVat;
            return {
                _key_kalemturu: item.stockKey,
                _key_scf_kalem_birimleri: item.unitKey,
                _key_sis_depo_source: item.depoKey || depoKey,
                _key_sis_doviz: DIA_CURRENCY_KEY_TRY,
                kalemturu: 'MLZM',
                miktar: this.formatDecimal(item.quantity),
                anamiktar: this.formatDecimal(item.quantity),
                birimfiyati: this.formatDecimal(item.price),
                sonbirimfiyati: this.formatDecimal(item.price),
                yerelbirimfiyati: this.formatDecimal(item.price),
                tutari: this.formatDecimal(lineTotal),
                dovizkuru: '1.000000',
                kdv: this.formatDecimal(item.vatRate),
                kdvdurumu: 'H',
                kdvtutari: this.formatDecimal(lineVat),
                sirano: (index + 1) * 10,
                note: item.name || ''
            };
        });

        const response = await this.sendRequest('/api/v3/scf/json', {
            scf_irsaliye_ekle: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                kart: {
                    turu,
                    fisno,
                    tarih: now.toISOString().slice(0, 10),
                    saat: now.toTimeString().slice(0, 8),
                    _key_scf_carikart: cariKey,
                    _key_sis_sube_source: subeKey,
                    _key_sis_depo_source: depoKey,
                    _key_sis_doviz: DIA_CURRENCY_KEY_TRY,
                    _key_sis_doviz_raporlama: DIA_CURRENCY_KEY_TRY,
                    dovizkuru: '1.000000',
                    raporlamadovizkuru: '1.000000',
                    aciklama1: description,
                    aciklama2: '',
                    aciklama3: '',
                    m_kalemler: rows,
                    net: this.formatDecimal(subtotal + vatTotal),
                    netdvz: this.formatDecimal(subtotal + vatTotal),
                    toplam: this.formatDecimal(subtotal),
                    toplamdvz: this.formatDecimal(subtotal),
                    toplamkdv: this.formatDecimal(vatTotal),
                    toplamkdvdvz: this.formatDecimal(vatTotal),
                    toplamindirim: '0.000000',
                    toplammasraf: '0.000000',
                    sevkadresi1: '',
                    sevkadresi2: '',
                    sevkadresi3: ''
                }
            }
        });

        if (response?.code !== '200') {
            throw new Error(`${turu === 2 ? 'Çıkış' : 'Giriş'} irsaliyesi oluşturulamadı [${fisno}] (${response?.code}): ${response?.msg || 'bilinmeyen hata'}`);
        }
        return String(response.key);
    }

    async createTransfer(items, toDepo, fisno, description) {
        const sessionId = await this.ensureSession();
        const siparis = this.settings.siparis || {};
        const now = new Date();

        let total = 0;
        const rows = items.map((item, index) => {
            const lineTotal = item.price * item.quantity;
            total += lineTotal;
            return {
                _key_scf_stokkart: item.stockKey,
                _key_scf_stokkart_birimleri: item.unitKey,
                _key_sis_depo: item.fromDepo,
                _key_sis_depo_dest: toDepo,
                _key_sis_doviz: DIA_CURRENCY_KEY_TRY,
                kalemturu: 'MLZM',
                miktar: this.formatDecimal(item.quantity),
                anamiktar: this.formatDecimal(item.quantity),
                birimfiyati: this.formatDecimal(item.price),
                yerelbirimfiyati: this.formatDecimal(item.price),
                tutari: this.formatDecimal(lineTotal),
                dovizkuru: '1.000000',
                sirano: index + 1,
                note: ''
            };
        });

        const response = await this.sendRequest('/api/v3/scf/json', {
            scf_malzeme_fisi_ekle: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                kart: {
                    turu,
                    fisno,
                    tarih: now.toISOString().slice(0, 10),
                    saat: now.toTimeString().slice(0, 8),
                    _key_sis_sube: siparis.kaynakSubeKey || 0,
                    _key_sis_depo: items[0].fromDepo,
                    _key_sis_depo_dest: toDepo,
                    _key_sis_doviz: DIA_CURRENCY_KEY_TRY,
                    dovizkuru: '1.000000',
                    durum: 'T',
                    aciklama1: description,
                    aciklama2: '',
                    aciklama3: '',
                    m_kalemler: rows,
                    toplam: this.formatDecimal(total),
                    toplamdvz: this.formatDecimal(total)
                }
            }
        });

        if (response?.code !== '200') {
            throw new Error(`Depo transferi oluşturulamadı (${response?.code}): ${response?.msg || 'bilinmeyen hata'}`);
        }
        return String(response.key);
    }

    async createSimpleInvoice({ turu, fisno, cariKey, depoKey, subeKey, planKey, elemanKey, seviyeKey, items, description }) {
        const sessionId = await this.ensureSession();
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);

        let subtotal = 0;
        let vatTotal = 0;
        const rows = items.map((item, index) => {
            const lineTotal = item.price * item.quantity;
            const lineVat = (lineTotal * item.vatRate) / 100;
            subtotal += lineTotal;
            vatTotal += lineVat;
            return {
                _key_kalemturu: item.stockKey,
                _key_scf_kalem_birimleri: item.unitKey,
                _key_sis_depo_source: depoKey,
                _key_sis_doviz: DIA_CURRENCY_KEY_TRY,
                _key_scf_odeme_plani: planKey || 0,
                _key_scf_satiselemani: elemanKey || 0,
                kalemturu: 'MLZM',
                miktar: this.formatDecimal(item.quantity),
                anamiktar: this.formatDecimal(item.quantity),
                birimfiyati: this.formatDecimal(item.price),
                sonbirimfiyati: this.formatDecimal(item.price),
                yerelbirimfiyati: this.formatDecimal(item.price),
                tutari: this.formatDecimal(lineTotal),
                dovizkuru: '1.000000',
                kdv: this.formatDecimal(item.vatRate),
                kdvdurumu: 'H',
                kdvtutari: this.formatDecimal(lineVat),
                sirano: (index + 1) * 10,
                note: item.name || ''
            };
        });

        const kart = {
            turu,
            fisno,
            tarih: dateStr,
            saat: now.toTimeString().slice(0, 8),
            ortalamavade: dateStr,
            _key_scf_carikart: cariKey,
            _key_sis_sube_source: subeKey,
            _key_sis_depo_source: depoKey,
            _key_sis_doviz: DIA_CURRENCY_KEY_TRY,
            _key_sis_doviz_raporlama: DIA_CURRENCY_KEY_TRY,
            _key_scf_odeme_plani: planKey || 0,
            _key_scf_satiselemani: elemanKey || 0,
            dovizkuru: '1.000000',
            raporlamadovizkuru: '1.000000',
            aciklama1: description,
            aciklama2: '',
            aciklama3: '',
            m_kalemler: rows,
            net: this.formatDecimal(subtotal + vatTotal),
            netdvz: this.formatDecimal(subtotal + vatTotal),
            toplam: this.formatDecimal(subtotal),
            toplamdvz: this.formatDecimal(subtotal),
            toplamkdv: this.formatDecimal(vatTotal),
            toplamkdvdvz: this.formatDecimal(vatTotal),
            toplamindirim: '0.000000',
            toplammasraf: '0.000000',
            sevkadresi1: '',
            sevkadresi2: '',
            sevkadresi3: ''
        };
        if (seviyeKey) kart._key_sis_seviyekodu = seviyeKey;

        const response = await this.sendRequest('/api/v3/scf/json', {
            scf_fatura_ekle: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                kart
            }
        });

        if (response?.code !== '200') {
            throw new Error(`Fatura oluşturulamadı [${fisno}] (${response?.code}): ${response?.msg || 'bilinmeyen hata'}`);
        }
        return String(response.key);
    }

    async cancelInvoiceInDia(invoiceKey, reason) {
        const sessionId = await this.ensureSession();

        const detail = await this.sendRequest('/api/v3/scf/json', {
            scf_fatura_getir: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                key: parseInt(invoiceKey)
            }
        });
        const dispatchKey = String(this.extractKey(detail?.result?._key_scf_irsaliye) || '');

        const accountingLinks = detail?.result?.m_muhasebefisi_baglantilari || [];
        for (const link of accountingLinks) {
            const voucherKey = link?._key_muhasebe_fisi?._key;
            if (!voucherKey) continue;
            const voucherDelete = await this.sendRequest('/api/v3/muh/json', {
                muh_muhasebefisi_sil: {
                    session_id: sessionId,
                    firma_kodu: this.firmaKodu,
                    donem_kodu: this.donemKodu,
                    key: String(voucherKey)
                }
            });
            if (voucherDelete?.code === '200') {
                logger.info('[DiaOrder] Faturanın muhasebe fişi kaldırıldı', { invoiceKey, voucherKey });
            } else {
                logger.warn('[DiaOrder] Muhasebe fişi kaldırılamadı', { invoiceKey, voucherKey, error: voucherDelete?.msg });
            }
        }

        const cancelResponse = await this.sendRequest('/api/v3/scf/json', {
            scf_fatura_iptalet: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                key: String(invoiceKey),
                params: { irsaliyeiptal: 'Evet', iptalNedeni: reason }
            }
        });

        const cancelOk = cancelResponse?.code === '200' && !/girilmelidir/i.test(cancelResponse?.msg || '');
        if (!cancelOk) {
            throw new Error(`DIA faturası iptal edilemedi (${cancelResponse?.code}): ${cancelResponse?.msg || 'bilinmeyen hata'}`);
        }

        const verify = await this.sendRequest('/api/v3/scf/json', {
            scf_fatura_listele: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                filters: [{ field: '_key', operator: '=', value: String(invoiceKey) }],
                sorts: '',
                params: { selectedcolumns: ['_key', 'iptal'] },
                limit: 1,
                offset: 0
            }
        });
        const verifyRow = Array.isArray(verify?.result) ? verify.result[0] : null;
        if (verifyRow && verifyRow.iptal !== 'X') {
            throw new Error('DIA faturası iptal edilemedi (muhtemelen muhasebeleştirilmiş — DIA içinden muhasebe fişi kaldırılıp iptal edilmeli)');
        }

        if (dispatchKey && dispatchKey !== '0') {
            const deleteResponse = await this.sendRequest('/api/v3/scf/json', {
                scf_irsaliye_sil: {
                    session_id: sessionId,
                    firma_kodu: this.firmaKodu,
                    donem_kodu: this.donemKodu,
                    key: dispatchKey
                }
            });
            if (deleteResponse?.code !== '200') {
                logger.warn('[DiaOrder] Fatura iptal edildi ancak irsaliye silinemedi (stok elle düzeltilmeli)', {
                    invoiceKey,
                    dispatchKey,
                    error: deleteResponse?.msg
                });
            }
        }
    }

    resolvePaymentPlanKey(order) {
        const siparis = this.settings.siparis || {};
        const payment = order.payment || {};
        const gelAl = order.shipping?.method === 'gelAl' || order.deliveryMethod === 'gelAl';
        const pick = (gelAlKey, normalKey) => (gelAl && gelAlKey) ? gelAlKey : (normalKey || gelAlKey || 0);

        if (payment.method === 'cari') {
            if (Number(payment.diaPaymentPlanKey) > 0) return Number(payment.diaPaymentPlanKey);
            return pick(siparis.odemePlaniCariGelAlKey, siparis.odemePlaniCariKey)
                || siparis.odemePlaniHavaleKey || siparis.odemePlaniTekCekimKey || 0;
        }

        if (payment.method === 'bank_transfer') {
            return pick(siparis.odemePlaniHavaleGelAlKey, siparis.odemePlaniHavaleKey);
        }

        const installment = Math.max(
            parseInt(payment.installment) || 1,
            parseInt(payment.cardInfo?.installments) || 1
        );

        if (installment > 1) {
            return pick(siparis.odemePlaniTaksitliGelAlKey, siparis.odemePlaniTaksitliKey);
        }
        return pick(siparis.odemePlaniTekCekimGelAlKey, siparis.odemePlaniTekCekimKey);
    }

    getPaymentMethodLabel(order) {
        const gateway = String(order.payment?.gateway || '').toLowerCase();
        if (gateway.startsWith('netahsilat')) return 'Netahsilat';
        if (gateway.startsWith('nkolay')) return 'Nkolay';
        if (gateway.startsWith('paynet')) return 'Paynet';

        const method = String(order.payment?.method || '').toLowerCase();
        if (method.startsWith('netahsilat')) return 'Netahsilat';
        if (method === 'bank_transfer') return 'Havale';
        if (method === 'cash_on_delivery') return 'Kapıda Ödeme';
        return gateway || method;
    }

    buildOrderPayload(order, customer, resolvedStocks, sessionId) {
        const siparis = this.settings.siparis || {};
        const shipping = order.shippingSnapshot || order.guestShippingAddress || {};

        const orderDate = new Date(order.createdAt || Date.now());
        const dateStr = orderDate.toISOString().slice(0, 10);
        const timeStr = orderDate.toTimeString().slice(0, 8);

        const { items: orderItems, totals: kartTotals } = this.buildOrderItems(order, customer, resolvedStocks);

        const customerFullName = (order.customerName || order.billingSnapshot?.fullName || shipping.fullName || customer.unvan || '').trim();
        const siteName = SITES[this.site]?.name || this.site;
        const descriptions = {
            aciklama1: order.orderNumber,
            aciklama2: customerFullName,
            aciklama3: [siteName, this.getPaymentMethodLabel(order), DIA_DELIVERY_LABEL]
                .filter(Boolean)
                .join(' - ')
        };
        const noteField = SITES[this.site]?.diaOrderNoteField;
        const orderNote = String(order.orderNote || '').replace(/\s+/g, ' ').trim();
        if (noteField && orderNote && Object.prototype.hasOwnProperty.call(descriptions, noteField)) {
            descriptions[noteField] = orderNote.slice(0, DIA_DESCRIPTION_MAX_LENGTH);
        }

        const headerDepoKey = orderItems[0]?._key_sis_depo_source || siparis.depoKey;
        const kart = {
            _key_scf_carikart: parseInt(customer.key),
            _key_sis_sube_source: siparis.subeKey,
            _key_sis_depo_source: headerDepoKey,
            _key_sis_doviz: DIA_CURRENCY_KEY_TRY,
            _key_sis_doviz_raporlama: DIA_CURRENCY_KEY_TRY,
            turu: 2,
            onay: 'KABUL',
            fisno: order.orderNumber,
            belgeno: this.site === 'alastik' ? order.orderNumber : '',
            tarih: dateStr,
            saat: timeStr,
            ortalamavade: dateStr,
            dovizkuru: '1.000000',
            raporlamadovizkuru: '1.000000',
            aciklama1: descriptions.aciklama1,
            aciklama2: descriptions.aciklama2,
            aciklama3: descriptions.aciklama3,
            ekalan4: order.orderNumber,
            m_kalemler: orderItems,
            net: kartTotals.net,
            netdvz: kartTotals.net,
            toplam: kartTotals.toplam,
            toplamdvz: kartTotals.toplam,
            toplamindirim: kartTotals.toplamindirim,
            toplamindirimdvz: kartTotals.toplamindirim,
            toplamkdv: kartTotals.toplamkdv,
            toplamkdvdvz: kartTotals.toplamkdv,
            toplammasraf: '0.000000',
            toplammasrafdvz: '0.000000',
            sevkadresi1: this.buildAddressText(shipping),
            sevkadresi2: '',
            sevkadresi3: `${shipping.districtName || ''} ${shipping.cityName || ''}`.trim(),
            teslimat_adres1: this.buildAddressText(shipping),
            teslimat_adres2: '',
            teslimat_adsoyad: shipping.fullName || order.customerName || '',
            teslimat_ceptel: this.normalizePhone(shipping.phone || order.customerPhone || ''),
            teslimat_telefon: this.normalizePhone(shipping.phone || order.customerPhone || ''),
            teslimat_ilce: shipping.districtName || '',
            teslimat_key_sis_sehirler: 0,
            _key_scf_carikart_adresleri: parseInt(shipping.diaAddressKey) || 0
        };

        const salespersonKey = this.orderSalespersonKey || siparis.satisElemaniKey;
        if (salespersonKey) {
            kart._key_scf_satiselemani = salespersonKey;
        }

        if (siparis.siparisSeviyeKodKey) {
            kart._key_sis_seviyekodu = siparis.siparisSeviyeKodKey;
        }

        if (siparis.kargoFirmaKey) {
            kart._key_krg_firma = siparis.kargoFirmaKey;
        }

        if (siparis.siparisYetkiKodu) {
            kart.yetkikodu = siparis.siparisYetkiKodu;
        }

        const paymentPlanKey = this.resolvePaymentPlanKey(order);
        if (paymentPlanKey) {
            kart._key_scf_odeme_plani = paymentPlanKey;
            for (const item of kart.m_kalemler) {
                item._key_scf_odeme_plani = paymentPlanKey;
            }
        }

        return {
            scf_siparis_ekle: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                kart
            }
        };
    }

    async fetchFaturaAddress(customerKey) {
        const sessionId = await this.ensureSession();
        const r = await this.sendRequest('/api/v3/scf/json', {
            scf_carikart_adresleri_listele: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                filters: [{ field: '_key_scf_carikart', operator: '=', value: parseInt(customerKey) }],
                limit: 50,
                offset: 0
            }
        });
        const list = Array.isArray(r?.result) ? r.result : [];
        if (!list.length) return null;
        const fatura = list.find(a => String(a.anaadres) === '1')
            || list.find(a => a.adrestipi !== 'T')
            || list[0];
        if (!fatura) return null;
        const adres = [fatura.adres1, fatura.adres2].filter(x => x && String(x).trim()).join(' ').trim();
        return {
            diaAddressKey: parseInt(fatura._key) || 0,
            street: adres,
            cityName: fatura._key_sis_sehirler?.sehiradi || fatura.sehir || fatura.sehiradi || '',
            districtName: fatura.ilce || '',
            phone: fatura.ceptel || ''
        };
    }
}

async function _syncOrderToDia(order) {
    const orderNumber = order?.orderNumber;
    const WebOrderModel = require('../../../models/web/order/WebOrder');

    const lockCutoff = new Date(Date.now() - 2 * 60 * 1000);
    const lockAcquired = await WebOrderModel.findOneAndUpdate(
        {
            _id: order._id,
            $or: [
                { 'diaIntegration.syncLockAt': { $exists: false } },
                { 'diaIntegration.syncLockAt': null },
                { 'diaIntegration.syncLockAt': { $lt: lockCutoff } }
            ]
        },
        { $set: { 'diaIntegration.syncLockAt': new Date() } }
    );
    if (!lockAcquired) {
        return { success: false, skipped: true, message: 'Bu sipariş için DIA aktarımı zaten sürüyor' };
    }

    try {
        const service = new DiaOrderService(order.site);
        const { active } = await service.init();

        if (!active) {
            return { success: false, skipped: true, message: 'DIA sipariş entegrasyonu bu site için kapalı' };
        }

        if (order.diaIntegration?.status === 'synced' && order.diaIntegration?.diaOrderKey) {
            await service.login();
            const chain = await maybeRunInterCompanyChain(service, order);
            const invoice = (chain && chain.success === false)
                ? null
                : await maybeCreateInvoice(service, order, order.diaIntegration.diaOrderKey);
            let message = 'Sipariş zaten DIA\'ya aktarılmış';
            if (chain && chain.success === false) message += ` — Şirketler arası zincir hatası: ${chain.error}`;
            else if (invoice?.success && !invoice.existing) message += ', fatura kesildi';
            else if (invoice && invoice.success === false) message += ` — Fatura kesilemedi: ${invoice.error}`;
            return {
                success: !invoice || invoice.success !== false,
                message,
                diaOrderKey: order.diaIntegration.diaOrderKey
            };
        }

        const sessionId = await service.login();

        const existing = await service.checkOrderExists(orderNumber);
        if (existing.exists) {
            await applySyncResult(order, {
                status: 'synced',
                diaOrderKey: existing.diaKey,
                diaOrderNumber: orderNumber
            });
            const chain = await maybeRunInterCompanyChain(service, order);
            const invoice = (chain && chain.success === false)
                ? null
                : await maybeCreateInvoice(service, order, existing.diaKey);
            let message = 'Sipariş DIA\'da zaten mevcut';
            if (chain && chain.success === false) message += ` — Şirketler arası zincir hatası: ${chain.error}`;
            else if (invoice?.success && !invoice.existing) message += ', fatura kesildi';
            else if (invoice && invoice.success === false) message += ` — Fatura kesilemedi: ${invoice.error}`;
            return { success: !invoice || invoice.success !== false, message, diaOrderKey: existing.diaKey };
        }

        const customer = await service.resolveCustomer(order);
        service.orderSalespersonKey = await service.resolveDealerSalespersonKey(order, customer);
        logger.info('[DiaOrder] Cari hazır', {
            orderNumber,
            site: order.site,
            customerKey: customer.key,
            customerCode: customer.code,
            created: customer.created
        });

        const resolvedStocks = new Map();
        const unresolvedItems = [];
        for (const item of order.items) {
            const stock = await service.resolveStockItem(item);
            if (stock) {
                resolvedStocks.set(item, stock);
            } else {
                unresolvedItems.push(item.stockCode || item.name || item.productKey);
            }
        }

        if (resolvedStocks.size === 0) {
            throw new Error(`Sipariş kalemleri DIA stok kartlarıyla eşleştirilemedi: ${unresolvedItems.join(', ')}`);
        }
        if (unresolvedItems.length > 0) {
            logger.warn('[DiaOrder] Bazı kalemler DIA stok kartıyla eşleşmedi, atlanıyor', { orderNumber, unresolvedItems });
        }

        const siparisAyar = service.settings.siparis || {};
        const depoOncelik = String(siparisAyar.siparisDepoKeys || '')
            .split(',').map(v => parseInt(String(v).trim())).filter(Boolean);
        if (depoOncelik.length) {
            const codes = [...resolvedStocks.values()].map(s => s.stockCode).filter(Boolean);
            const depoStok = {};
            for (const dk of depoOncelik) {
                depoStok[dk] = await service.getDepotStockBatch(codes, dk).catch(() => ({}));
            }
            for (const [item, stock] of resolvedStocks) {
                const qty = parseFloat(item.quantity) || 1;
                let secilen = depoOncelik[depoOncelik.length - 1];
                for (const dk of depoOncelik) {
                    if ((depoStok[dk]?.[stock.stockCode] || 0) >= qty) { secilen = dk; break; }
                }
                stock.depoKey = secilen;
                logger.info('[DiaOrder] Sipariş deposu seçildi', { stockCode: stock.stockCode, depoKey: secilen, qty });
            }
        }

        const ship = order.shippingSnapshot || {};
        const sevkVar = ship.street || ship.address || ship.neighborhoodName;
        if (!sevkVar) {
            try {
                const fatura = await service.fetchFaturaAddress(customer.key);
                if (fatura && fatura.street) {
                    order.shippingSnapshot = { ...ship, ...fatura };
                    logger.info('[DiaOrder] Sevk adresi fatura adresinden alındı', { orderNumber });
                }
            } catch (e) {
                logger.warn('[DiaOrder] Fatura adresi çekilemedi', { orderNumber, error: e.message });
            }
        }

        service.shippingServiceLine = null;
        const kargoKartKey = Number(siparisAyar.kargoHizmetKartKey) || 0;
        const orderShipping = (order.items || []).reduce((sum, i) => sum + (parseFloat(i.shippingPerUnit) || 0) * (parseFloat(i.quantity) || 1), 0);
        if (kargoKartKey && orderShipping > 0) {
            const unitKey = await service.findServiceUnitKey(kargoKartKey);
            if (!unitKey) throw new Error(`Kargo bedeli hizmet kartının birimi bulunamadı (kart ${kargoKartKey})`);
            service.shippingServiceLine = { serviceKey: kargoKartKey, unitKey };
        }

        const payload = service.buildOrderPayload(order, customer, resolvedStocks, sessionId);

        logger.info('[DiaOrder] Sipariş DIA\'ya gönderiliyor', {
            orderNumber,
            site: order.site,
            firmaKodu: service.firmaKodu,
            donemKodu: service.donemKodu,
            itemCount: payload.scf_siparis_ekle.kart.m_kalemler.length,
            payload: JSON.stringify(payload.scf_siparis_ekle.kart)
        });

        const response = await service.sendRequest('/api/v3/scf/json', payload);

        if (response?.code === '200') {
            const diaOrderKey = String(response.key || response.msg || '');
            await applySyncResult(order, {
                status: 'synced',
                diaOrderKey,
                diaOrderNumber: orderNumber,
                diaCustomerKey: customer.key
            });

            logger.info('[DiaOrder] Sipariş DIA\'ya aktarıldı', { orderNumber, diaOrderKey, customerKey: customer.key });

            let message = 'Sipariş DIA\'ya aktarıldı';
            if (customer.created) message += ' (yeni cari açıldı)';
            if (unresolvedItems.length > 0) message += ` — Uyarı: ${unresolvedItems.length} kalem stok eşleşmediği için atlandı`;

            const chain = await maybeRunInterCompanyChain(service, order);
            const invoice = (chain && chain.success === false)
                ? null
                : await maybeCreateInvoice(service, order, diaOrderKey);
            if (chain && chain.success === false) message += ` — Şirketler arası zincir hatası: ${chain.error}`;
            else if (invoice?.success && !invoice.existing) message += ', fatura kesildi';
            else if (invoice && invoice.success === false) message += ` — Fatura kesilemedi: ${invoice.error}`;

            return { success: true, message, diaOrderKey, diaCustomerKey: customer.key };
        }

        throw new Error(`DIA sipariş kaydı reddedildi (${response?.code}): ${response?.msg || 'bilinmeyen hata'}`);
    } catch (error) {
        logger.error('[DiaOrder] Sipariş aktarımı başarısız', {
            orderNumber,
            site: order?.site,
            error: error.message
        });

        try {
            await applySyncResult(order, { status: 'failed', error: error.message });
        } catch (saveErr) {
            logger.error('[DiaOrder] Hata durumu siparişe yazılamadı', { orderNumber, error: saveErr.message });
        }

        return { success: false, message: error.message };
    } finally {
        await WebOrderModel.updateOne(
            { _id: order._id },
            { $unset: { 'diaIntegration.syncLockAt': '' } }
        ).catch(() => {  });
    }
}

function buildSourceService(service) {
    const siparis = service.settings.siparis || {};
    const src = new DiaOrderService(service.site);
    src.settings = service.settings;
    src.sessionId = service.sessionId;
    src.firmaKodu = siparis.kaynakFirmaKodu || 1;
    src.donemKodu = siparis.kaynakDonemKodu || service.donemKodu;
    return src;
}

async function maybeRunInterCompanyChain(service, order) {
    const siparis = service.settings.siparis || {};
    if (!siparis.sirketlerArasiAktif) return null;

    const hasXmlItem = (order.items || []).some(
        item => item.isXml || String(item.stockCode || '').endsWith('-XML')
    );
    if (hasXmlItem) return null;

    const integration = order.diaIntegration || {};

    const WebOrder = require('../../../models/web/order/WebOrder');
    const DiaStock = require('../../../models/plugins/DiaStock');
    const orderNumber = order.orderNumber;

    try {
        const src = buildSourceService(service);
        const priceNo = siparis.sirketlerArasiFiyatNo || 5;
        const toDepo = siparis.kaynakCikisDepoKey;

        const depotKeys = String(siparis.kaynakDepoKeys || '')
            .split(',')
            .map(value => parseInt(value.trim()))
            .filter(Boolean);

        if ((!depotKeys.length && !toDepo) || !siparis.araCariKodu) {
            throw new Error('Şirketler arası ayarlar eksik (depo öncelik listesi / ara cari kodu)');
        }

        const excludedCategories = (siparis.sirketlerArasiHaricKategoriler || []).filter(Boolean);

        const srcItems = [];
        for (const item of order.items) {
            const stock = await DiaStock.findOne({ _key: item.productKey })
                .select('_key anabirimkey stokkartkodu aciklama m_kategoriler.kategori_aciklama_1').lean();
            if (!stock) throw new Error(`Kaynak firmada stok kartı bulunamadı: ${item.stockCode || item.name}`);

            const isExcluded = excludedCategories.length > 0 && (stock.m_kategoriler || [])
                .some(category => excludedCategories.includes(category.kategori_aciklama_1));
            if (isExcluded) {
                logger.info('[DiaOrder] Şirketler arası zincirden hariç tutuldu (kategori)', {
                    orderNumber, stockCode: stock.stokkartkodu
                });
                continue;
            }

            const quantity = parseFloat(item.quantity) || 1;
            const price = await src.getUnitPriceByNo(stock._key, priceNo);
            if (!price) throw new Error(`Stok kartında fiyat${priceNo} tanımlı değil: ${stock.stokkartkodu}`);

            srcItems.push({
                stockKey: parseInt(stock._key),
                stockCode: stock.stokkartkodu || '',
                unitKey: parseInt(stock.anabirimkey) || 0,
                quantity,
                price,
                vatRate: parseFloat(item.vatRate) || 20,
                name: item.name || ''
            });
        }

        if (!srcItems.length) {
            logger.info('[DiaOrder] Şirketler arası zincir atlandı: zincire girecek kalem yok', { orderNumber });
            return { success: true, skipped: true };
        }

        const customerName = (order.customerName || order.billingSnapshot?.fullName || '').trim();
        const customerLabel = customerName ? `Web sipariş ${orderNumber} - ${customerName}` : `Web sipariş ${orderNumber}`;

        const araCari = await src.findCustomerByCode(siparis.araCariKodu);
        if (!araCari) throw new Error(`Kaynak firmada ara cari bulunamadı: ${siparis.araCariKodu}`);

        let sourceOrderKey = integration.diaSourceOrderKey;
        if (!sourceOrderKey) {
            const existing = await src.checkOrderExists(orderNumber);
            sourceOrderKey = existing.exists ? existing.diaKey : await src.createSourceOrder({
                fisno: orderNumber,
                cariKey: parseInt(araCari.key),
                depoKey: toDepo || depotKeys[0],
                depotKeys,
                subeKey: siparis.kaynakSubeKey || 0,
                planKey: siparis.kaynakOdemePlaniKey,
                elemanKey: siparis.kaynakSatisElemaniKey,
                seviyeKey: siparis.kaynakSeviyeKodKey,
                items: srcItems,
                description: customerLabel,
                orderNumber
            });

            await WebOrder.updateOne({ _id: order._id }, { $set: { 'diaIntegration.diaSourceOrderKey': sourceOrderKey } });
            integration.diaSourceOrderKey = sourceOrderKey;

            logger.info('[DiaOrder] Kaynak firma siparişi oluşturuldu (fatura/sevk muhasebede)', { orderNumber, sourceOrderKey });
        }

        const cikisFisno = `${orderNumber}-C`;
        if (!integration.diaOutgoingDispatchKey) {
            const cikisItems = [];
            for (const srcItem of srcItems) {
                const dagitim = await src.allocateSourceDepots(srcItem.stockCode, srcItem.quantity, depotKeys, toDepo || depotKeys[0], { strict: true });
                for (const pay of dagitim) {
                    cikisItems.push({ ...srcItem, quantity: pay.quantity, depoKey: pay.depoKey });
                }
            }

            const mevcutCikis = await src.checkDispatchExists(cikisFisno);
            const cikisKey = mevcutCikis.exists ? mevcutCikis.diaKey : await src.createIncomingDispatch({
                turu: 2,
                fisno: cikisFisno,
                cariKey: parseInt(araCari.key),
                depoKey: cikisItems[0]?.depoKey || toDepo || depotKeys[0],
                subeKey: siparis.kaynakSubeKey || 0,
                items: cikisItems,
                description: customerLabel
            });
            await WebOrder.updateOne({ _id: order._id }, { $set: { 'diaIntegration.diaOutgoingDispatchKey': cikisKey } });
            integration.diaOutgoingDispatchKey = cikisKey;
            logger.info('[DiaOrder] F1 çıkış irsaliyesi kesildi (stok düştü)', { orderNumber, cikisKey });
        }

        const girisFisno = `${orderNumber}-G`;
        if (!integration.diaIncomingDispatchKey) {
            if (!siparis.tedarikciCariKodu) throw new Error('Şirketler arası tedarikçi cari kodu tanımsız');
            const tedarikci = await service.findCustomerByCode(siparis.tedarikciCariKodu);
            if (!tedarikci) throw new Error(`Tedarikçi cari bulunamadı: ${siparis.tedarikciCariKodu}`);

            const f2Items = [];
            for (const srcItem of srcItems) {
                const f2Stock = await service.resolveStockItem({ stockCode: srcItem.stockCode });
                if (!f2Stock) throw new Error(`Bu firmada stok kartı bulunamadı: ${srcItem.stockCode}`);
                f2Items.push({ ...srcItem, stockKey: f2Stock.stockKey, unitKey: f2Stock.unitKey });
            }

            const mevcutGiris = await service.checkDispatchExists(girisFisno);
            const girisKey = mevcutGiris.exists ? mevcutGiris.diaKey : await service.createIncomingDispatch({
                turu: 1,
                fisno: girisFisno,
                cariKey: parseInt(tedarikci.key),
                depoKey: siparis.depoKey,
                subeKey: siparis.subeKey || 0,
                items: f2Items,
                description: customerLabel
            });
            await WebOrder.updateOne({ _id: order._id }, { $set: { 'diaIntegration.diaIncomingDispatchKey': girisKey } });
            integration.diaIncomingDispatchKey = girisKey;
            logger.info('[DiaOrder] F2 giriş irsaliyesi kesildi (stok girdi)', { orderNumber, girisKey });
        }

        return { success: true };
    } catch (error) {
        logger.error('[DiaOrder] Şirketler arası sipariş hatası', { orderNumber, error: error.message });
        try {
            await WebOrder.updateOne({ _id: order._id }, {
                $push: { 'diaIntegration.syncErrors': `${new Date().toISOString()} — Şirketler arası: ${error.message}` }
            });
        } catch {  }
        return { success: false, error: error.message };
    }
}

async function maybeCreateInvoice(service, order, diaOrderKey) {
    const siparis = service.settings.siparis || {};
    if (!siparis.faturaOtomatik) return null;
    if (order.diaIntegration?.diaInvoiceKey) {
        return { success: true, invoiceKey: order.diaIntegration.diaInvoiceKey, existing: true };
    }

    const WebOrder = require('../../../models/web/order/WebOrder');

    try {
        const result = await service.createInvoice(order, diaOrderKey);

        await WebOrder.updateOne({ _id: order._id }, {
            $set: {
                'diaIntegration.diaInvoiceKey': result.invoiceKey,
                'diaIntegration.diaInvoiceNumber': order.orderNumber,
                'diaIntegration.invoicedAt': new Date()
            }
        });

        logger.info('[DiaOrder] Fatura kesildi', {
            orderNumber: order.orderNumber,
            invoiceKey: result.invoiceKey,
            existing: result.existing
        });

        return { success: true, ...result };
    } catch (error) {
        logger.error('[DiaOrder] Fatura kesilemedi', { orderNumber: order.orderNumber, error: error.message });
        try {
            await WebOrder.updateOne({ _id: order._id }, {
                $push: { 'diaIntegration.syncErrors': `${new Date().toISOString()} — Fatura: ${error.message}` }
            });
        } catch {  }
        return { success: false, error: error.message };
    }
}

async function applySyncResult(order, result) {
    const WebOrder = require('../../../models/web/order/WebOrder');

    const update = {};
    if (result.status === 'synced') {
        update['diaIntegration.status'] = 'synced';
        update['diaIntegration.diaOrderKey'] = result.diaOrderKey || '';
        update['diaIntegration.diaOrderNumber'] = result.diaOrderNumber || '';
        update['diaIntegration.syncedAt'] = new Date();
        if (result.diaCustomerKey) {
            update['diaIntegration.diaCustomerKey'] = result.diaCustomerKey;
        }
    } else {
        update['diaIntegration.status'] = 'failed';
    }

    const operation = { $set: update };
    if (result.error) {
        operation.$push = { 'diaIntegration.syncErrors': `${new Date().toISOString()} — ${result.error}` };
    }

    await WebOrder.updateOne({ _id: order._id }, operation);
}

async function _cancelOrderInDia(order) {
    const orderNumber = order?.orderNumber;
    const WebOrder = require('../../../models/web/order/WebOrder');

    try {
        const service = new DiaOrderService(order.site);
        const { active } = await service.init();
        if (!active) {
            return { success: false, skipped: true, message: 'DIA sipariş entegrasyonu bu site için kapalı' };
        }

        const integration = order.diaIntegration || {};
        if (!integration.diaOrderKey && !integration.diaInvoiceKey) {
            return { success: true, skipped: true, message: 'DIA\'da iptal edilecek kayıt yok' };
        }

        await service.login();
        const steps = [];
        const manual = [];
        const attempt = async (label, fn) => {
            try {
                await fn();
                steps.push(label);
            } catch (stepError) {
                logger.warn('[DiaOrder] İptal adımı başarısız (manuel yapılmalı)', { orderNumber, label, error: stepError.message });
                manual.push(`${label} (${stepError.message})`);
            }
        };

        if (integration.diaInvoiceKey) {
            await attempt('müşteri faturası iptali', () =>
                service.cancelInvoiceInDia(integration.diaInvoiceKey, `Web sipariş iptali: ${orderNumber}`));
        }

        if (integration.diaPurchaseDispatchKey) {
            await attempt('alış girişinin geri alınması', async () => {
                const dispatchDelete = await service.sendRequest('/api/v3/scf/json', {
                    scf_irsaliye_sil: {
                        session_id: service.sessionId,
                        firma_kodu: service.firmaKodu,
                        donem_kodu: service.donemKodu,
                        key: String(integration.diaPurchaseDispatchKey)
                    }
                });
                if (dispatchDelete?.code !== '200') throw new Error(String(dispatchDelete?.msg || '').slice(0, 150));
            });
        }
        if (integration.diaPurchaseInvoiceKey) {
            await attempt('alış faturası iptali', () =>
                service.cancelInvoiceInDia(integration.diaPurchaseInvoiceKey, `Web sipariş iptali: ${orderNumber}`));
        }
        if (integration.diaSourceInvoiceKey || integration.diaTransferKey) {
            const src = buildSourceService(service);
            src.sessionId = service.sessionId;
            if (integration.diaSourceInvoiceKey) {
                await attempt('kaynak firma faturası iptali', () =>
                    src.cancelInvoiceInDia(integration.diaSourceInvoiceKey, `Web sipariş iptali: ${orderNumber}`));
            }
            if (integration.diaSourceOrderKey) {
                await attempt('kaynak firma siparişinin silinmesi', async () => {
                    const orderDelete = await src.sendRequest('/api/v3/scf/json', {
                        scf_siparis_sil: {
                            session_id: src.sessionId,
                            firma_kodu: src.firmaKodu,
                            donem_kodu: src.donemKodu,
                            key: String(integration.diaSourceOrderKey)
                        }
                    });
                    if (orderDelete?.code !== '200') throw new Error(String(orderDelete?.msg || '').slice(0, 150));
                });
            }
            if (integration.diaTransferKey) {
                await attempt('depo transferinin geri alınması', async () => {
                    const transferDelete = await src.sendRequest('/api/v3/scf/json', {
                        scf_malzeme_fisi_sil: {
                            session_id: src.sessionId,
                            firma_kodu: src.firmaKodu,
                            donem_kodu: src.donemKodu,
                            key: String(integration.diaTransferKey)
                        }
                    });
                    if (transferDelete?.code !== '200') throw new Error(String(transferDelete?.msg || '').replace(/<[^>]*>/g, '').slice(0, 150));
                });
            }
        }

        if (integration.diaOrderKey) {
            await attempt('siparişin silinmesi', async () => {
                const deleteResponse = await service.sendRequest('/api/v3/scf/json', {
                    scf_siparis_sil: {
                        session_id: service.sessionId,
                        firma_kodu: service.firmaKodu,
                        donem_kodu: service.donemKodu,
                        key: String(integration.diaOrderKey)
                    }
                });
                if (deleteResponse?.code !== '200') throw new Error(String(deleteResponse?.msg || '').slice(0, 150));
            });
        }

        await WebOrder.updateOne({ _id: order._id }, { $set: { 'diaIntegration.status': 'cancelled' } });
        if (manual.length > 0) {
            await WebOrder.updateOne({ _id: order._id }, {
                $push: { 'diaIntegration.syncErrors': `${new Date().toISOString()} — İptalde manuel kalanlar: ${manual.join('; ')}` }
            });
        }

        logger.info('[DiaOrder] Sipariş iptali DIA\'ya yansıtıldı', { orderNumber, steps, manual });
        let message = steps.length > 0 ? `DIA kayıtları iptal edildi (${steps.join(', ')})` : 'DIA iptali yapılamadı';
        if (manual.length > 0) message += ` — DIA içinden manuel yapılmalı: ${manual.join('; ')}`;
        return { success: steps.length > 0, message };
    } catch (error) {
        logger.error('[DiaOrder] DIA iptali başarısız', { orderNumber, error: error.message });
        try {
            await WebOrder.updateOne({ _id: order._id }, {
                $push: { 'diaIntegration.syncErrors': `${new Date().toISOString()} — İptal: ${error.message}` }
            });
        } catch {  }
        return { success: false, message: error.message };
    }
}

function syncOrderToDiaBackground(order, source) {
    syncOrderToDia(order)
        .then(result => {
            if (result?.skipped) return;
            logger.info('[DiaOrder] Otomatik aktarım tamamlandı', {
                orderNumber: order.orderNumber,
                source,
                success: result?.success,
                message: result?.message
            });
        })
        .catch(error => {
            logger.error('[DiaOrder] Otomatik aktarım hatası', {
                orderNumber: order.orderNumber,
                source,
                error: error.message
            });
        });
}

async function syncOrderToDia(order) {
    if (order?.site === 'b2b') {
        const { withDiaLock, B2B_LOCK_KEY } = require('./diaLock');
        return withDiaLock(() => _syncOrderToDia(order), { label: 'b2b-order-sync', key: B2B_LOCK_KEY, waitMs: 180000 });
    }
    return _syncOrderToDia(order);
}

async function cancelOrderInDia(order) {
    if (order?.site === 'b2b') {
        const { withDiaLock, B2B_LOCK_KEY } = require('./diaLock');
        return withDiaLock(() => _cancelOrderInDia(order), { label: 'b2b-order-cancel', key: B2B_LOCK_KEY, waitMs: 180000 });
    }
    return _cancelOrderInDia(order);
}

module.exports = {
    DiaOrderService,
    syncOrderToDia,
    syncOrderToDiaBackground,
    cancelOrderInDia
};
