const axios = require('axios');
const winston = require('winston');
const WebDia = require('../../../models/plugins/dia/DiaSettings');
const DiaStock = require('../../../models/plugins/DiaStock');
const WebMember = require('../../../models/web/user/WebMember');
const { SITES } = require('../../../config/sites');

/**
 * DIA Sipariş Entegrasyon Servisi (web → DIA)
 *
 * Vitrin siparişini DIA'ya aktarır: önce cari kaydı açılır (yoksa),
 * ardından sipariş girişi yapılır. Tetikleme: admin panelde "Onaylandı".
 *
 * Tüm bağlantı ve sipariş parametreleri site bazlı `webdia` ayar
 * kaydından okunur (DiaSettings modeli) — env veya gömülü değer kullanılmaz.
 */

// utils/logger.js boş olduğu için sipariş aktarımına özel winston logger kullanılır
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

// DIA sistem seviyesi (sis_*) sabit anahtarlar: aynı DIA sunucusunda firma
// bağımsızdır. 2026 = TL döviz kaydının _key değeri (eski entegrasyonda doğrulandı).
const DIA_CURRENCY_KEY_TRY = 2026;

// Site → DIA cari kodu öneki
const SITE_CUSTOMER_PREFIX = {
    alastik: 'AL',
    lastikjantavm: 'LJA'
};

// DIA sipariş açıklamasının 3. satırındaki teslim şekli etiketi
const DIA_DELIVERY_LABEL = 'KARGO';

class DiaOrderService {
    constructor(site) {
        this.site = site;
        this.settings = null;
        this.sessionId = null;
        // init() içinde ayarlardan hesaplanır
        this.firmaKodu = 0;
        this.donemKodu = 0;
    }

    /**
     * Ayarları yükler ve doğrular. Sipariş entegrasyonu kapalıysa
     * { active: false } döner, eksik ayar varsa hata fırlatır.
     */
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

        // Sipariş için firma/dönem; 0 ise bağlantı ayarındaki değerler geçerli
        this.firmaKodu = siparis.firmaKodu || this.settings.firmaKodu || 1;
        this.donemKodu = siparis.donemKodu || this.settings.donemKodu || 1;

        return { active: true };
    }

    async sendRequest(endpoint, payload) {
        const url = `${this.settings.baseURL}${endpoint}`;
        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
            validateStatus: () => true
        });
        return response.data;
    }

    async login() {
        // Önce diğer oturumları düşürmeden dene — eşzamanlı aktarımlar ve
        // stok senkronu aynı DIA kullanıcısını paylaşıyor, birbirini düşürmesin
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

    /**
     * Telefonu DIA biçimine çevirir: 90 + 10 hane (örn. 905327411298).
     * '+90 532 741 12 98' gibi biçimli girişler temizlenir; 10 haneye
     * indirgenemiyorsa eldeki rakamlar olduğu gibi döner.
     */
    normalizePhone(value) {
        let digits = String(value || '').replace(/\D/g, '');
        if (!digits) return '';
        if (digits.length > 10 && digits.startsWith('90')) digits = digits.slice(2);
        if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
        return digits.length === 10 ? `90${digits}` : digits;
    }

    /**
     * Sipariş DIA'da zaten var mı (fisno = sipariş numarası)
     */
    async checkOrderExists(orderNumber) {
        const sessionId = await this.ensureSession();

        const request = {
            scf_siparis_listele: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                filters: [{ field: 'fisno', operator: '=', value: orderNumber }],
                sorts: '',
                params: { selectedcolumns: ['_key', 'fisno', 'turu', 'aciklama1', 'aciklama2'] },
                limit: 5,
                offset: 0
            }
        };

        const response = await this.sendRequest('/api/v3/scf/json', request);

        if (Array.isArray(response?.result) && response.result.length > 0) {
            // Aynı fiş numarası B2B/elle açılan fişlerde de kullanılabiliyor.
            // Fişi sahiplenmeden önce bizim yazdığımız imzayı doğrula:
            // web siparişleri turu=2 ile yazılır ve açıklamada sipariş no/site bulunur.
            const own = response.result.find(row => {
                if (String(row.turu) !== '2') return false;
                const a1 = String(row.aciklama1 || '');
                const a2 = String(row.aciklama2 || '');
                return a2 === orderNumber || a2 === this.site || a1.includes(orderNumber);
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

    // ==================== CARİ ====================

    /**
     * Önekli modda sıradaki cari hesap kodunu üretir:
     * '<önek><sipariş ayı>.<6 haneli sıra no>' (örn. AL-120.01.08.000003).
     * Sıra numarası site başına webdia ayar kaydındaki cariKodSayac alanından
     * atomik $inc ile alınır — her yeni cari bir öncekinin 1 fazlasını alır,
     * eşzamanlı siparişlerde de çakışmaz. DIA'da dolu çıkarsa (elle açılmış
     * kayıt vb.) resolveCustomer tekrar çağırıp bir sonraki numarayı dener.
     */
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

        const orderDate = new Date(order.createdAt || Date.now());
        const month = String(orderDate.getMonth() + 1).padStart(2, '0');
        return `${siparis.cariKodOnek}${month}.${String(sequence).padStart(6, '0')}`;
    }

    /**
     * Önek tanımlı değilken kullanılan telefon tabanlı deterministik
     * eski cari kodu üretimi.
     */
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
            // ObjectId'nin son 10 hex hanesi → deterministik sayı
            const numeric = String(parseInt(String(order.memberId).slice(-10), 16));
            return `${prefix}-M${numeric}`;
        }

        return `${prefix}-${String(order.orderNumber).replace(/\D/g, '')}`;
    }

    /**
     * Cari kodu ile DIA'da arama; bulunursa { key, code, unvan } döner
     */
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

    /**
     * DIA'da yeni cari kartı oluşturur, oluşan kaydı geri sorgular
     */
    async createCustomer(order, customerCode) {
        const sessionId = await this.ensureSession();

        const billing = order.billingSnapshot || order.guestBillingAddress || {};
        const member = order.memberSnapshot || {};

        const email = order.customerEmail || member.email || billing.email || '';
        const phone = this.normalizePhone(order.customerPhone || member.phone || billing.phone || '');

        // TC / vergi numarası ayrımı
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

        // Özel Kod 1 ve Yetki/Seviye Kodu — firma ayarında zorunlu olabilir, ayarlardan gelir
        const siparis = this.settings.siparis || {};
        if (siparis.cariOzelKod1Key) {
            kart._key_sis_ozelkod1 = siparis.cariOzelKod1Key;
        }
        if (siparis.cariSeviyeKodKey) {
            kart._key_sis_seviyekodu = siparis.cariSeviyeKodKey;
        }
        // Cari kartın varsayılan ödeme planı — ayarlardan gelir (örn. ACIK HESAP)
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

        // 200 = eklendi, 501 = zaten mevcut — her iki durumda geri sorgula
        if (response?.code === '200' || response?.code === '501') {
            const customer = await this.findCustomerByCode(customerCode);
            if (customer) return customer;
        }

        throw new Error(`DIA cari kartı oluşturulamadı (${response?.code}): ${response?.msg || 'bilinmeyen hata'}`);
    }

    /**
     * Cari politikasına göre kullanılacak cari kaydını bulur/oluşturur
     */
    async resolveCustomer(order) {
        const siparis = this.settings.siparis || {};

        // Tüm siparişler tek genel cariye yazılıyorsa
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

        // Müşteri bazlı cari: üyede kayıtlı DIA anahtarı varsa doğrudan kullan
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
            // Sıralı kod modu: sayaçtan sıradaki numarayı al; DIA'da dolu
            // çıkarsa (elle açılmış kayıt vb.) bir sonraki numarayı dene.
            // (Üyenin mevcut carisi yukarıda diaCustomerKey ile yakalanır.)
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

        // Üyeye kaydet — sonraki siparişlerde tekrar sorgulanmasın
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

    // ==================== STOK ====================

    /**
     * Sipariş kaleminin DIA stok kartı ve birim anahtarını bulur.
     * Sipariş firması stok senkron firmasıyla aynıysa yerel DiaStock
     * koleksiyonu yeterlidir; farklıysa DIA'dan stok kodu ile sorgulanır.
     */
    async resolveStockItem(item) {
        // Stok senkronunun çalıştığı firma = bağlantı ayarındaki firmaKodu.
        // Sipariş aynı firmaya düşüyorsa DiaStock'taki _key değerleri geçerlidir.
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

        // DIA üzerinden stok kodu ile ara
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

        return null;
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

    // ==================== SİPARİŞ ====================

    buildOrderItems(order, customer, resolvedStocks) {
        const siparis = this.settings.siparis || {};
        const items = [];
        let lineNo = 1;
        const today = new Date().toISOString().slice(0, 10);

        for (const item of order.items) {
            const stock = resolvedStocks.get(item);
            if (!stock) continue;

            const quantity = parseFloat(item.quantity) || 1;
            // Kargo bedeli ayrı kalem olarak GÖSTERİLMEZ (17 Ağu kararı) —
            // birim kargo payı ürün birim fiyatına dahil edilir; böylece DIA
            // fiş toplamı müşterinin ödediği tutarla birebir eşleşir
            const shippingPerUnit = parseFloat(item.shippingPerUnit)
                || ((parseFloat(item.shippingTotal) || 0) / quantity)
                || 0;
            const unitPrice = (parseFloat(item.unitPrice) || 0) + shippingPerUnit;
            const vatRate = parseFloat(item.vatRate) || 20;
            const lineTotal = unitPrice * quantity;
            // Fiyatlar KDV dahil (kdvdurumu: D) — KDV tutarı içten hesaplanır
            const vatAmount = (lineTotal * vatRate) / (100 + vatRate);

            items.push({
                _key_scf_carikart: parseInt(customer.key),
                _key_kalemturu: stock.stockKey,
                _key_scf_kalem_birimleri: stock.unitKey,
                _key_sis_depo_source: siparis.depoKey,
                _key_sis_doviz: DIA_CURRENCY_KEY_TRY,
                kalemturu: 'MLZM',
                anamiktar: this.formatDecimal(quantity),
                miktar: this.formatDecimal(quantity),
                birimfiyati: this.formatDecimal(unitPrice),
                sonbirimfiyati: this.formatDecimal(unitPrice),
                yerelbirimfiyati: this.formatDecimal(unitPrice),
                tutari: this.formatDecimal(lineTotal),
                dovizkuru: '1.000000',
                kdv: this.formatDecimal(vatRate),
                kdvdurumu: 'D',
                kdvtutari: this.formatDecimal(vatAmount),
                daraadet: '0.000000',
                note: item.name || '',
                note2: shippingPerUnit > 0 ? 'Kargo dahil' : '',
                onay: 'KABUL',
                rezervasyon: 'H',
                siptarih: today,
                sirano: lineNo
            });

            lineNo++;
        }

        return items;
    }

    /**
     * DIA yanıtlarındaki _key alanlarını normalize eder: sayı, dize,
     * {_key: x} nesnesi veya [[key, ad], key] dizisi gelebilir
     */
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

    /**
     * Fatura DIA'da zaten var mı (fisno = sipariş numarası)
     */
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

    /**
     * Belirli depodaki gerçek stok miktarını döner
     */
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

    /**
     * Fatura depo öncelik listesini döner (ayardan, virgülle ayrılmış _key)
     */
    getInvoiceDepotKeys() {
        const siparis = this.settings.siparis || {};
        return String(siparis.faturaDepoKeys || '')
            .split(',')
            .map(value => parseInt(value.trim()))
            .filter(Boolean);
    }

    /**
     * Kalem için stok düşülecek depoyu seçer: öncelik listesindeki
     * depolara sırayla bakılır, yeterli stoğu olan ilk depo kullanılır.
     * Hizmet kalemlerinde stok kontrolü yapılmaz (ilk depo kullanılır).
     * Hiçbir depoda yeterli stok yoksa son öncelikli depo döner ve karar
     * DIA'ya bırakılır (hizmet niteliğindeki TCR kartlar ile eksi stok
     * izinli depolar için fatura yine kesilebilir).
     */
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

    /**
     * DIA'daki siparişten satış faturası keser (kalemler sipariş kalemlerine
     * bağlanır, stok çıkışı fatura deposundan oluşur). Fatura fişno = sipariş no.
     * Depo, öncelik listesine göre kalem bazında seçilir.
     * XML ürünlerde de çağrılır (17 Ağu) — stok XML kartında eksiye düşer.
     */
    async createInvoice(order, diaOrderKey) {
        const siparis = this.settings.siparis || {};
        const sessionId = await this.ensureSession();

        // Mükerrer engeli
        const existing = await this.checkInvoiceExists(order.orderNumber);
        if (existing.exists) {
            return { invoiceKey: existing.diaKey, existing: true };
        }

        const depotKeys = this.getInvoiceDepotKeys();
        if (depotKeys.length === 0) {
            throw new Error('Fatura depo listesi boş. DIA ayarlarında "Fatura Depoları" alanını doldurun.');
        }
        const paymentPlanKey = this.resolvePaymentPlanKey(order);

        // Sipariş kalemlerini DIA'dan çek
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
            // Depo seçimi kalem bazında: öncelik listesinde stoğu yeten ilk depo
            const itemDepoKey = await this.resolveInvoiceDepot(kalem._key_kalemturu, quantity, depotKeys);
            if (!headerDepoKey) headerDepoKey = itemDepoKey;

            const invoiceItem = {
                _key_kalemturu: this.extractKey(kalem._key_kalemturu),
                _key_scf_kalem_birimleri: this.extractKey(kalem._key_scf_kalem_birimleri),
                _key_sis_depo_source: itemDepoKey,
                _key_sis_doviz: DIA_CURRENCY_KEY_TRY,
                _key_scf_odeme_plani: paymentPlanKey || this.extractKey(kalem._key_scf_odeme_plani),
                _key_scf_satiselemani: siparis.satisElemaniKey || 0,
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
            // Ayar açıksa fatura kalemi sipariş kalemine bağlanır → DIA siparişi
            // "Tamamı Sevk Edilmiş" yapar (alastik). Kapalıysa sipariş açık kalır (LJA).
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
            // Belge no'ya RESMİ fatura numarası (e-arşiv) yazılır — kesim anında
            // henüz oluşmadığı için boş bırakılır, e-arşiv gönderiminde DIA'da dolar
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
            _key_scf_satiselemani: siparis.satisElemaniKey || 0,
            _key_sis_seviyekodu: siparis.faturaSeviyeKodKey || siparis.siparisSeviyeKodKey || 0,
            dovizkuru: '1.000000',
            raporlamadovizkuru: '1.000000',
            // alastik: müşteri adı + sipariş no + 'ALastik <ÖDEME YÖNTEMİ>' (17 Ağu isteği)
            aciklama1: this.site === 'alastik'
                ? (order.customerName || order.billingSnapshot?.fullName || '').trim()
                : `Web sipariş ${order.orderNumber}`,
            aciklama2: this.site === 'alastik' ? order.orderNumber : this.site,
            aciklama3: this.site === 'alastik'
                ? `ALastik ${this.getPaymentMethodLabel(order).toLocaleUpperCase('tr-TR')}`
                : '',
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

    /**
     * Stok kartı biriminden fiyatN değerini okur (şirketler arası fatura fiyatı)
     */
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

    /**
     * Malzeme fişi (depo transferi) DIA'da var mı — fisno ile
     */
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

    /**
     * Kalem miktarını depo öncelik listesine göre böler: sırayla her depodan
     * mevcut stok kadar alınır, kalan miktar bir sonraki depoya geçer.
     * Hiçbir depoda karşılanamayan kalan, son öncelikli depoya yazılır
     * (karar DIA/muhasebeye kalır). Öncelik listesi boşsa tek depo kullanılır.
     */
    async allocateSourceDepots(stockCode, quantity, depotKeys, fallbackDepoKey) {
        if (!Array.isArray(depotKeys) || depotKeys.length === 0 || !stockCode) {
            return [{ depoKey: fallbackDepoKey, quantity }];
        }

        const allocations = [];
        let remaining = quantity;
        for (const depoKey of depotKeys) {
            if (remaining <= 0) break;
            const stock = await this.getDepotStock(stockCode, depoKey);
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

    /**
     * Kaynak firmada şirketler arası satış SİPARİŞİ oluşturur (ara cariye).
     * Fiyatlar KDV hariç (fiyatN). Sipariş listesinde izlenebilirlik için.
     * Kalemler depo öncelik listesine (depotKeys) göre stok bulunan depolara
     * bölünür; liste boşsa tüm kalemler depoKey deposundan yazılır.
     */
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

    /**
     * Alış (giriş) irsaliyesi keser — stok girişini işler.
     * DIA WS'nin alış faturasına otomatik bağladığı irsaliye stok işlemez;
     * giriş bu ayrı irsaliyeyle yapılır. items: createSimpleInvoice ile aynı.
     */
    async createIncomingDispatch({ fisno, cariKey, depoKey, subeKey, items, description }) {
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
                _key_sis_depo_source: depoKey,
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
                    turu: 1,
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
            throw new Error(`Giriş irsaliyesi oluşturulamadı [${fisno}] (${response?.code}): ${response?.msg || 'bilinmeyen hata'}`);
        }
        return String(response.key);
    }

    /**
     * Depolar arası transfer fişi keser (malzeme fişi turu:1).
     * items: [{ stockKey, unitKey, quantity, price, fromDepo }]
     */
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
                    turu: 1,
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

    /**
     * Genel fatura oluşturucu (şirketler arası satış/alış faturaları için).
     * turu: 2 satış, 1 alış. items: [{ stockKey, unitKey, quantity, price, vatRate, name }]
     * Fiyatlar KDV HARİÇ kabul edilir (fiyatN listeleri), KDV üstüne eklenir.
     */
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

    /**
     * DIA'daki faturayı iptal eder ve stok iadesi için bağlı irsaliyeyi siler.
     * İptal edilen fatura kaydı DIA'da "İptal" statüsüyle korunur (izlenebilirlik);
     * irsaliye ancak fatura iptal edildikten sonra silinebilir (DIA kilidi).
     */
    async cancelInvoiceInDia(invoiceKey, reason) {
        const sessionId = await this.ensureSession();

        // İrsaliye anahtarını iptalden önce al
        const detail = await this.sendRequest('/api/v3/scf/json', {
            scf_fatura_getir: {
                session_id: sessionId,
                firma_kodu: this.firmaKodu,
                donem_kodu: this.donemKodu,
                key: parseInt(invoiceKey)
            }
        });
        const dispatchKey = String(this.extractKey(detail?.result?._key_scf_irsaliye) || '');

        // Muhasebeleştirilmiş fatura iptal edilemez — önce muhasebe fişleri kaldırılır
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

        // Doğrulama: DIA bazı durumlarda (örn. muhasebeleştirilmiş fatura) 200 dönüp
        // iptali sessizce uygulamayabiliyor — fatura durumunu teyit et
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

        // Stok hareketini geri almak için irsaliyeyi sil
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

    /**
     * Siparişin ödeme şekline göre DIA ödeme planı anahtarını seçer:
     * banka havalesi → Havale planı; kredi kartında taksit sayısına göre
     * tek çekim (NKOLAY) veya taksitli (PIRELLI VIRMAN) planı kullanılır.
     */
    resolvePaymentPlanKey(order) {
        const siparis = this.settings.siparis || {};
        const payment = order.payment || {};

        if (payment.method === 'bank_transfer') {
            return siparis.odemePlaniHavaleKey || 0;
        }

        const installment = Math.max(
            parseInt(payment.installment) || 1,
            parseInt(payment.cardInfo?.installments) || 1
        );

        if (installment > 1) {
            return siparis.odemePlaniTaksitliKey || 0;
        }
        return siparis.odemePlaniTekCekimKey || 0;
    }

    /**
     * Sipariş ödeme yönteminin DIA açıklamalarında kullanılacak etiketi
     */
    getPaymentMethodLabel(order) {
        // Sağlayıcı adı payment.gateway alanında tutulur (netahsilat / nkolay / paynet).
        // payment.method yalnızca ödeme tipini söyler (credit_card_3d, bank_transfer...).
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

        const orderItems = this.buildOrderItems(order, customer, resolvedStocks);

        // Açıklama düzeni iki sitede de aynıdır (3 Eyl isteği):
        //   1: sipariş no  2: siparişi veren  3: SİTE ADI - Ödeme Sağlayıcı - Teslim Şekli
        const customerFullName = (order.customerName || order.billingSnapshot?.fullName || shipping.fullName || customer.unvan || '').trim();
        const siteName = SITES[this.site]?.name || this.site;
        const descriptions = {
            aciklama1: order.orderNumber,
            aciklama2: customerFullName,
            aciklama3: [siteName, this.getPaymentMethodLabel(order), DIA_DELIVERY_LABEL]
                .filter(Boolean)
                .join(' - ')
        };

        const kart = {
            _key_scf_carikart: parseInt(customer.key),
            _key_sis_sube_source: siparis.subeKey,
            _key_sis_depo_source: siparis.depoKey,
            _key_sis_doviz: DIA_CURRENCY_KEY_TRY,
            _key_sis_doviz_raporlama: DIA_CURRENCY_KEY_TRY,
            turu: 2,
            onay: 'KABUL',
            fisno: order.orderNumber,
            // Belge no = sipariş no (alastik isteği, 17 Ağu)
            belgeno: this.site === 'alastik' ? order.orderNumber : '',
            tarih: dateStr,
            saat: timeStr,
            ortalamavade: dateStr,
            dovizkuru: '1.000000',
            raporlamadovizkuru: '1.000000',
            aciklama1: descriptions.aciklama1,
            aciklama2: descriptions.aciklama2,
            aciklama3: descriptions.aciklama3,
            // Sipariş numarası her iki sitede de Ek Alan 4'te taşınır
            ekalan4: order.orderNumber,
            m_kalemler: orderItems,
            net: this.formatDecimal(order.pricing?.total),
            netdvz: this.formatDecimal(order.pricing?.total),
            toplam: this.formatDecimal(order.pricing?.subtotal),
            toplamdvz: this.formatDecimal(order.pricing?.subtotal),
            toplamindirim: this.formatDecimal(order.pricing?.discountAmount || 0),
            toplamindirimdvz: this.formatDecimal(order.pricing?.discountAmount || 0),
            toplamkdv: this.formatDecimal(order.pricing?.vatAmount || 0),
            toplamkdvdvz: this.formatDecimal(order.pricing?.vatAmount || 0),
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
            teslimat_key_sis_sehirler: 0
        };

        // Satış elemanı — firma ayarında zorunlu olabilir, ayarlardan gelir
        if (siparis.satisElemaniKey) {
            kart._key_scf_satiselemani = siparis.satisElemaniKey;
        }

        // Sipariş yetki/seviye kodu — cari yetki kodundan ayrı bir DIA kaydıdır
        if (siparis.siparisSeviyeKodKey) {
            kart._key_sis_seviyekodu = siparis.siparisSeviyeKodKey;
        }

        // Kargo firması — ayarlardan gelir (örn. ARAS KARGO)
        if (siparis.kargoFirmaKey) {
            kart._key_krg_firma = siparis.kargoFirmaKey;
        }

        // Ödeme planı — siparişin ödeme yöntemine göre seçilir
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
}

/**
 * Ana giriş: siparişi DIA'ya aktarır ve sonucu order.diaIntegration'a yazar.
 * Dönen değer: { success, skipped?, message, diaOrderKey?, diaCustomerKey? }
 */
async function syncOrderToDia(order) {
    const orderNumber = order?.orderNumber;
    const WebOrderModel = require('../../../models/web/order/WebOrder');

    // Koşum kilidi: aynı sipariş için eşzamanlı aktarımları engelle
    // (çift tıklama / paralel tetikleme yarışları çift belge riskini doğurur).
    // 2 dakikadan eski kilit bayat sayılır.
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

        // Zaten aktarılmışsa siparişi tekrar gönderme; eksikse faturayı tamamla
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

        // DIA tarafında mükerrer kontrolü (fisno = sipariş numarası)
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

        // 1) Cari
        const customer = await service.resolveCustomer(order);
        logger.info('[DiaOrder] Cari hazır', {
            orderNumber,
            site: order.site,
            customerKey: customer.key,
            customerCode: customer.code,
            created: customer.created
        });

        // 2) Stok kalemleri
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

        // 3) Sipariş girişi (plaka doluysa açıklamaya eklenir)
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

            // Otomatik fatura (ayar açıksa) — stok çıkışı faturayla oluşur
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
        ).catch(() => { /* kilit bırakılamazsa 2 dk sonra bayatlar */ });
    }
}

/**
 * Kaynak firma (fiziki stok sahibi) için servis kopyası oluşturur —
 * aynı ayar kaydı ve oturum, farklı firma/dönem
 */
function buildSourceService(service) {
    const siparis = service.settings.siparis || {};
    const src = new DiaOrderService(service.site);
    src.settings = service.settings;
    src.sessionId = service.sessionId;
    src.firmaKodu = siparis.kaynakFirmaKodu || 1;
    src.donemKodu = siparis.kaynakDonemKodu || service.donemKodu;
    return src;
}

/**
 * Şirketler arası zincir (müşteri faturasından ÖNCE çalışır):
 * 1) Kaynak firmada depo transferi (öncelikli depodan çıkış deposuna)
 * 2) Kaynak firmadan ara cariye satış faturası (fiyatN, KDV hariç)
 * 3) Bu firmaya tedarikçiden alış faturası (stok girişi)
 * Her adım mükerrer korumalı — yarım kalan zincir tekrar çalıştırılabilir.
 */
async function maybeRunInterCompanyChain(service, order) {
    const siparis = service.settings.siparis || {};
    // faturaOtomatik'e bağlı DEĞİL: alastik'te müşteri faturasını DIA'daki
    // Ws_Flow2 robotu keser (faturaOtomatik kapalı) ama kaynak firma
    // siparişi (F1 zinciri) yine de oluşturulmalıdır.
    if (!siparis.sirketlerArasiAktif) return null;

    const hasXmlItem = (order.items || []).some(
        item => item.isXml || String(item.stockCode || '').endsWith('-XML')
    );
    if (hasXmlItem) return null; // XML üründe kaynak stok ALastik depolarında değil — zincir çalışmaz

    const integration = order.diaIntegration || {};
    if (integration.diaSourceOrderKey) {
        return { success: true, existing: true };
    }

    const WebOrder = require('../../../models/web/order/WebOrder');
    const DiaStock = require('../../../models/plugins/DiaStock');
    const orderNumber = order.orderNumber;

    try {
        const src = buildSourceService(service);
        const priceNo = siparis.sirketlerArasiFiyatNo || 5;
        const toDepo = siparis.kaynakCikisDepoKey;

        // Depo öncelik listesi: kalemler stok bulunan depolara sırayla bölünür
        const depotKeys = String(siparis.kaynakDepoKeys || '')
            .split(',')
            .map(value => parseInt(value.trim()))
            .filter(Boolean);

        if ((!depotKeys.length && !toDepo) || !siparis.araCariKodu) {
            throw new Error('Şirketler arası ayarlar eksik (depo öncelik listesi / ara cari kodu)');
        }

        // Kaynak firma kalemleri: DiaStock kartları + fiyatN (KDV hariç)
        const srcItems = [];
        for (const item of order.items) {
            const stock = await DiaStock.findOne({ _key: item.productKey })
                .select('_key anabirimkey stokkartkodu aciklama').lean();
            if (!stock) throw new Error(`Kaynak firmada stok kartı bulunamadı: ${item.stockCode || item.name}`);

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

        // Belgelerde ortak açıklama: "Web sipariş <no> - <müşteri adı>"
        const customerName = (order.customerName || order.billingSnapshot?.fullName || '').trim();
        const customerLabel = customerName ? `Web sipariş ${orderNumber} - ${customerName}` : `Web sipariş ${orderNumber}`;

        const araCari = await src.findCustomerByCode(siparis.araCariKodu);
        if (!araCari) throw new Error(`Kaynak firmada ara cari bulunamadı: ${siparis.araCariKodu}`);

        // Kaynak firmada YALNIZCA şirketler arası satış siparişi oluşturulur —
        // transfer, fatura ve sevk kaynak firmada MUHASEBE tarafından manuel yapılır
        const existing = await src.checkOrderExists(orderNumber);
        const sourceOrderKey = existing.exists ? existing.diaKey : await src.createSourceOrder({
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
        return { success: true };
    } catch (error) {
        logger.error('[DiaOrder] Şirketler arası sipariş hatası', { orderNumber, error: error.message });
        try {
            await WebOrder.updateOne({ _id: order._id }, {
                $push: { 'diaIntegration.syncErrors': `${new Date().toISOString()} — Şirketler arası: ${error.message}` }
            });
        } catch { /* akışı bozma */ }
        return { success: false, error: error.message };
    }
}

/**
 * Ayarda otomatik fatura açıksa ve siparişin faturası yoksa fatura keser.
 * XML ürünlerde de fatura otomatik kesilir (17 Ağu kararı) — stok XML
 * kartında eksiye düşer, tedarikçi teslimatında alış faturasıyla kapanır.
 * Sonuç: null (kapalı) | { success:true, invoiceKey, existing } |
 *        { success:false, error }
 */
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
        } catch { /* hata kaydı yazılamazsa akışı bozma */ }
        return { success: false, error: error.message };
    }
}

/**
 * Senkron sonucunu order.diaIntegration alanına işler
 */
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

/**
 * Sipariş iptalini DIA'ya yansıtır: fatura iptal edilir (kayıt korunur),
 * irsaliyesi silinerek stok iade edilir, DIA siparişi silinir.
 * Sonuç: { success, skipped?, message }
 */
async function cancelOrderInDia(order) {
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

        // Şirketler arası zincir belgeleri de geri alınır
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
        } catch { /* hata kaydı yazılamazsa akışı bozma */ }
        return { success: false, message: error.message };
    }
}

/**
 * Ödeme onayı noktalarından çağrılan arka plan tetikleyici.
 * Ödeme/callback akışını bloklamaz; hata olursa loglanır ve
 * sonuç order.diaIntegration üzerinden takip edilir.
 */
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

module.exports = {
    DiaOrderService,
    syncOrderToDia,
    syncOrderToDiaBackground,
    cancelOrderInDia
};
