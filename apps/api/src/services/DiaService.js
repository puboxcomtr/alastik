const axios = require('axios');
const logger = require('../utils/logger');

/**
 * DIA Entegrasyon Servisi
 * C# DiaService.cs dosyasından uyarlanmıştır
 * 
 * Ortam değişkenleri:
 * - DIA_BASE_URL: DIA API base URL'i
 * - DIA_USERNAME: DIA kullanıcı adı
 * - DIA_PASSWORD: DIA şifresi
 * - DIA_API_KEY: DIA API anahtarı
 * - DIA_FIRMA_KODU: Firma kodu (default: 1)
 * - DIA_DONEM_KODU: Dönem kodu (default: 2)
 */

class DiaService {
    constructor() {
        this.baseURL = process.env.DIA_BASE_URL;
        this.username = process.env.DIA_USERNAME;
        this.password = process.env.DIA_PASSWORD;
        this.apiKey = process.env.DIA_API_KEY;
        // Cari ve sipariş kayıtlarını firma 2 / dönem 2'de yap
        this.firmaKodu = 2;
        this.donemKodu = 2;
        // Sipariş için kullanılacak şube ve depo anahtar/kodları (stok senkronundan farklı olabilir)
        this.siparisSubeKey = parseInt(process.env.DIA_SIPARIS_SUBE_KEY) || 215114;
        this.siparisDepoKey = parseInt(process.env.DIA_SIPARIS_DEPO_KEY) || 215115;
        this.siparisSubeKodu = process.env.DIA_SIPARIS_SUBE_KODU || '00000001';
        this.siparisDepoKodu = process.env.DIA_SIPARIS_DEPO_KODU || '00000001';
        // Siparişte sabit kullanılacak cari/adres key'leri
        this.siparisCariKey = parseInt(process.env.DIA_SIPARIS_CARI_KEY) || 215689;
        this.siparisAdresKey = parseInt(process.env.DIA_SIPARIS_ADRES_KEY) || 215690;
        this.sessionId = null;
        this.sessionTimeout = 30 * 60 * 1000; // 30 dakika
        this.lastSessionCheck = null;
        
        logger.info('DiaService başlatıldı', {
            baseURL: this.baseURL,
            username: this.username ? '***' : 'YOK',
            firmaKodu: this.firmaKodu,
            donemKodu: this.donemKodu,
            siparisSubeKey: this.siparisSubeKey,
            siparisDepoKey: this.siparisDepoKey,
            siparisCariKey: this.siparisCariKey,
            siparisAdresKey: this.siparisAdresKey
        });
    }

    /**
     * DIA sistemi login işlemi
     */
    async loginAsync() {
        try {
            logger.info('DIA login başlatılıyor', {
                username: this.username,
                baseURL: this.baseURL
            });
            
            const loginRequest = {
                login: {
                    username: this.username,
                    password: this.password,
                    disconnect_same_user: "True",
                    params: {
                        apikey: this.apiKey
                    }
                }
            };

            const response = await this.sendRequestAsync('/api/v3/sis/json', loginRequest);
            
            if (response && response.code === "200") {
                this.sessionId = response.msg;
                this.lastSessionCheck = Date.now();
                logger.info('DIA login başarılı', {
                    sessionId: this.sessionId ? '***' : 'YOK'
                });
                return this.sessionId;
            }
            
            logger.error('DIA login başarısız', {
                code: response?.code,
                message: response?.msg
            });
            return null;
        } catch (error) {
            logger.error('DIA login hatası:', {
                error: error.message,
                stack: error.stack
            });
            return null;
        }
    }

    /**
     * Session geçerliliğini kontrol eder ve gerekirse yeniler
     */
    async ensureValidSessionAsync() {
        const now = Date.now();
        
        // Son kontrol üzerinden 5 dakika geçmemişse mevcut session'ı kullan
        if (this.sessionId && this.lastSessionCheck && (now - this.lastSessionCheck) < 5 * 60 * 1000) {
            return this.sessionId;
        }

        this.lastSessionCheck = now;

        if (!this.sessionId) {
            return await this.loginAsync();
        }

        try {
            // Session test et
            const testRequest = {
                session_test: {
                    session_id: this.sessionId
                }
            };
            
            const response = await this.sendRequestAsync('/api/v3/sis/json', testRequest);
            if (response?.code !== "200") {
                logger.info('Session geçersiz, yeniden login yapılıyor');
                return await this.loginAsync();
            }
            
            return this.sessionId;
        } catch (error) {
            logger.warn('Session test hatası, yeniden login yapılıyor', {
                error: error.message
            });
            return await this.loginAsync();
        }
    }

    /**
     * DIA'da sipariş var mı kontrol eder
     */
    async checkOrderExistsInDia(orderCode) {
        try {
            logger.info('DIA\'da sipariş kontrol ediliyor', { orderCode });
            
            const sessionId = await this.loginAsync();
            if (!sessionId) {
                return {
                    exists: false,
                    message: "Session ID alınamadı"
                };
            }

            const request = {
                scf_siparis_listele: {
                    session_id: sessionId,
                    firma_kodu: this.firmaKodu,
                    donem_kodu: this.donemKodu,
                    filters: [
                        { field: "fisno", operator: "=", value: orderCode }
                    ],
                    sorts: "",
                    params: { selectedcolumns: ["_key", "fisno"] },
                    limit: 10,
                    offset: 0
                }
            };

            const response = await this.sendRequestAsync('/api/v3/scf/json', request);

            if (response?.result && response.result.length > 0) {
                logger.info('Sipariş DIA\'da bulundu', {
                    orderCode,
                    diaKey: response.result[0]._key
                });
                return {
                    exists: true,
                    diaKey: response.result[0]._key,
                    orderCode: response.result[0].fisno,
                    message: "Sipariş DIA'da mevcut"
                };
            }

            logger.info('Sipariş DIA\'da bulunamadı', { orderCode });
            return {
                exists: false,
                message: "Sipariş DIA'da bulunamadı"
            };
        } catch (error) {
            logger.error('Sipariş kontrolü sırasında hata oluştu', {
                orderCode,
                error: error.message,
                stack: error.stack
            });
            return {
                exists: false,
                message: `Hata: ${error.message}`
            };
        }
    }

    /**
     * Müşteri kodunu formatlar: AL- + id'den türetilmiş 7 haneli numerik
     */
    formatCustomerCode(order) {
        const base = (order.customerId || order.customerCode || '').toString();
        let numeric = base.replace(/\D/g, '');
        if (!numeric || numeric.length < 7) {
            // Yeterli numerik yoksa Date.now() üzerinden üret
            numeric = (numeric + Date.now().toString()).replace(/\D/g, '');
        }
        const seven = numeric.slice(0, 7).padEnd(7, '0');
        const fullCode = `AL-${seven}`;

        logger.info('Müşteri kodu formatlandı', {
            originalId: order.customerId,
            fullCode
        });

        return { prefix: 'AL-', fullCode };
    }

    /**
     * DIA'da müşteri var mı kontrol eder
     */
    async checkDiaCustomer(sessionId, customerCode) {
        try {
            logger.info('DIA\'da müşteri kontrol ediliyor', { customerCode });
            
            const request = {
                scf_carikart_listele: {
                    session_id: sessionId,
                    firma_kodu: this.firmaKodu,
                    donem_kodu: this.donemKodu,
                    filters: [
                        {
                            field: "carikartkodu",
                            operator: "=",
                            value: customerCode
                        }
                    ],
                    sorts: [
                        {
                            field: "carikartkodu",
                            sorttype: "DESC"
                        }
                    ],
                    params: {
                        irsaliyeleriDahilEt: "False"
                    },
                    limit: 1,
                    offset: 0
                }
            };

            const response = await this.sendRequestAsync('/api/v3/scf/json', request);

            if (response?.code === "200" && response.result && response.result.length > 0) {
                const customerResult = response.result[0];
                logger.info('Müşteri DIA\'da bulundu', {
                    customerCode,
                    diaKey: customerResult._key,
                    unvan: customerResult.unvan
                });
                
                return this.convertToDiaCustomer(customerResult, null, customerCode);
            }

            logger.info('Müşteri DIA\'da bulunamadı', { customerCode });
            return null;
        } catch (error) {
            logger.error('Müşteri kontrol hatası', {
                customerCode,
                error: error.message,
                stack: error.stack
            });
            return null;
        }
    }

    /**
     * Şehir plaka kodunu DIA city key'e çevirir
     */
    getCityKey(plateCode) {
        const cityKeyMap = {
            "1": "1402", "2": "1404", "3": "1405", "4": "1406", "68": "1470",
            "5": "1407", "6": "1408", "7": "1409", "75": "1477", "8": "1410",
            "9": "1411", "10": "1412", "74": "1476", "72": "1474", "69": "1471",
            "11": "1413", "12": "1414", "13": "1415", "14": "1416", "15": "1417",
            "16": "1418", "17": "1419", "18": "1420", "19": "1421", "20": "1422",
            "21": "1423", "81": "1483", "22": "1424", "23": "1425", "24": "1426",
            "25": "1427", "26": "1428", "27": "1429", "28": "1430", "29": "1431",
            "30": "1432", "31": "1433", "76": "1478", "32": "1434", "34": "1436",
            "35": "1437", "46": "1448", "78": "1480", "70": "1472", "36": "1438",
            "37": "1439", "38": "1440", "71": "1473", "39": "1441", "40": "1442",
            "79": "1481", "41": "1443", "42": "1444", "43": "1445", "44": "1446",
            "45": "1447", "47": "1449", "33": "1435", "48": "1450", "49": "1451",
            "50": "1452", "51": "1453", "52": "1454", "80": "1482", "53": "1455",
            "54": "1456", "55": "1457", "56": "1458", "57": "1459", "58": "1460",
            "63": "1465", "73": "1475", "59": "1461", "60": "1462", "61": "1463",
            "62": "1464", "64": "1466", "65": "1467", "77": "1479", "66": "1468",
            "67": "1469"
        };

        if (!plateCode) return "1436"; // İstanbul varsayılan
        
        // Plaka kodunun başındaki sıfırı kaldır
        const cleanPlateCode = plateCode.toString().replace(/^0+/, '');
        return cityKeyMap[cleanPlateCode] || "1436";
    }

    /**
     * Müşteri adreslerini oluşturur
     */
    createCustomerAddresses(order) {
        return [
            // Fatura Adresi
            {
                adres1: (order.invoiceAddress || "").trim(),
                adres2: "",
                adresadi: `FT-${order.customerId}`,
                adrestipi: "F",
                anaadres: "1",
                ceptel: order.customerPhone || "",
                _key_sis_sehirler: order.invoiceCity ? { sehiradi: String(order.invoiceCity).toUpperCase() } : this.getCityKey(order.invoiceCityCode),
                ilce: (order.invoiceTown || "").trim().toUpperCase(),
                kayitturu: order.isCommercial ? "KRLS" : "SHS",
                ulke: (order.deliveryCountry || "").trim().toUpperCase(),
                vergidairesi: order.invoiceTaxOffice || "",
                verginumarasi: order.invoiceTaxNumber || ""
            },
            // Teslimat Adresi
            {
                adres1: (order.deliveryAddress || "").trim(),
                adres2: "",
                adresadi: `SE-${order.customerId}`,
                adrestipi: "T",
                anaadres: "0",
                ceptel: order.customerPhone || "",
                _key_sis_sehirler: order.deliveryCity ? { sehiradi: String(order.deliveryCity).toUpperCase() } : this.getCityKey(order.deliveryCityCode),
                ilce: (order.deliveryTown || "").trim().toUpperCase(),
                kayitturu: order.isCommercial ? "KRLS" : "SHS",
                ulke: (order.deliveryCountry || "").trim().toUpperCase()
            }
        ];
    }

    /**
     * DIA'da yeni müşteri oluşturur
     */
    async createCustomerInDia(sessionId, order, customerCode) {
        try {
            logger.info('DIA\'da yeni müşteri oluşturuluyor', {
                customerCode,
                customerName: order.customerName,
                platform: order.sourcePlatform
            });

            // Grup kodu belirleme
            const grupKodu = (order.sourcePlatform || 'unknown').toLowerCase() === 'parfumevi' ? 763968 :
                            (order.sourcePlatform || 'unknown').toLowerCase() === 'esans' ? 763966 :
                            (order.sourcePlatform || 'unknown').toLowerCase() === 'trendyol' ? 763964 : 763964;

            // Vergi/TC numarası kontrolü
            let tcKimlikNo = "11111111111";
            let vergiNumarasi = "";
            let kayitTuru = "SHS";

            if (order.invoiceTaxNumber && order.invoiceTaxNumber.trim()) {
                const cleanNumber = order.invoiceTaxNumber.trim();
                if (cleanNumber.length === 11) {
                    tcKimlikNo = cleanNumber;
                    vergiNumarasi = "";
                    kayitTuru = "SHS";
                    logger.info('11 haneli TC Kimlik numarası kullanılıyor', { cleanNumber });
                } else if (cleanNumber.length === 10) {
                    tcKimlikNo = "";
                    vergiNumarasi = cleanNumber;
                    kayitTuru = "KRLS";
                    logger.info('10 haneli vergi numarası kullanılıyor', { cleanNumber });
                } else {
                    logger.warn('Geçersiz uzunlukta vergi/TC numarası, varsayılan değerler kullanılıyor', { cleanNumber });
                }
            }

            const createRequest = {
                scf_carikart_ekle: {
                    session_id: sessionId,
                    firma_kodu: this.firmaKodu,
                    donem_kodu: this.donemKodu,
                    kart: {
                        durum: "A",
                        carikartkodu: customerCode,
                        eposta: order.customerUsername || order.customerEmail || "",
                        ceptel: order.customerPhone || "",
                        m_adresler: this.createCustomerAddresses(order),
                        unvan: order.invoiceCompany && order.invoiceCompany.trim() ? 
                               order.invoiceCompany : 
                               (order.invoiceName || order.customerName || ""),
                        // eksayisalalan5 kaldırıldı (DIA hata veriyor)
                        verginumarasi: vergiNumarasi,
                        vergidairesi: order.invoiceTaxOffice || "",
                        tckimlikno: tcKimlikNo,
                        carikayitturu: kayitTuru
                    }
                }
            };

            logger.info('Müşteri oluşturma isteği gönderiliyor', {
                customerCode,
                grupKodu,
                kayitTuru,
                tcKimlikNo: tcKimlikNo ? '***' : 'YOK',
                vergiNumarasi: vergiNumarasi ? '***' : 'YOK'
            });

            const createResponse = await this.sendRequestAsync('/api/v3/scf/json', createRequest);

            // Müşteri oluşturuldu veya zaten varsa (501 = zaten var, 200 = başarılı)
            if (createResponse?.code === "501" || createResponse?.code === "200") {
                logger.info('Müşteri oluşturma tamamlandı', {
                    customerCode,
                    responseCode: createResponse.code,
                    message: createResponse.msg
                });
                
                // Tekrar müşteri bilgisini al
                let customer = await this.checkDiaCustomer(sessionId, customerCode);
                if (customer) {
                    // createResponse.extra.addresskeys varsa ekle
                    try {
                        const addrKeys = createResponse?.extra?.addresskeys || createResponse?.addresskeys;
                        if (Array.isArray(addrKeys) && addrKeys.length > 0) {
                            customer.AddressKeys = addrKeys.map(x => String(x));
                        }
                    } catch {}
                    logger.info('Oluşturulan müşteri başarıyla alındı', {
                        customerCode,
                        diaKey: customer.Key
                    });
                    return customer;
                }
            }

            logger.error('Müşteri oluşturulamadı', {
                customerCode,
                responseCode: createResponse?.code,
                message: createResponse?.msg
            });
            return null;
        } catch (error) {
            logger.error('Müşteri oluşturma hatası', {
                customerCode,
                error: error.message,
                stack: error.stack
            });
            return null;
        }
    }

    /**
     * DIA customer result'ını local customer objesine çevirir
     */
    convertToDiaCustomer(result, order, fullCustomerCode) {
        return {
            Key: result._key.toString(),
            CariKartKodu: fullCustomerCode,
            Unvan: result.unvan,
            Note: order ? `${order.customerId}-${order.customerName}` : result.note,
            Email: order?.customerUsername || order?.customerEmail || result.eposta,
            Phone: order?.customerPhone || result.ceptel,
            TaxNumber: order?.invoiceTaxNumber || result.verginumarasi,
            TaxOffice: order?.invoiceTaxOffice || result.vergidairesi,
            IsCommercial: order?.isCommercial || false,
            SourceCustomerId: order?.customerId,
            SourcePlatform: order?.sourcePlatform,
            InvoiceAddress: order?.invoiceAddress,
            InvoiceCity: order?.invoiceCity,
            InvoiceTown: order?.invoiceTown,
            DeliveryAddress: order?.deliveryAddress,
            DeliveryCity: order?.deliveryCity,
            DeliveryTown: order?.deliveryTown,
            AddressKeys: Array.isArray(result.addresskeys || result.m_adresler) ?
                (result.addresskeys || result.m_adresler).map(a => a?._key || a).filter(Boolean) : []
        };
    }

    /**
     * Müşteri getir veya oluştur
     */
    async getOrCreateCustomer(order) {
        try {
            logger.info('DIA müşteri işlemi başlatılıyor', {
                customerId: order.customerId,
                customerName: order.customerName,
                sourcePlatform: order.sourcePlatform
            });
            
            const sessionId = await this.ensureValidSessionAsync();
            if (!sessionId) {
                throw new Error('Session ID alınamadı');
            }

            const { fullCode: customerCode } = this.formatCustomerCode(order);
            
            // Önce müşteriyi sorgula
            let customer = await this.checkDiaCustomer(sessionId, customerCode);
            
            if (customer) {
                logger.info('Müşteri DIA\'da bulundu', {
                    customerCode: customerCode,
                    diaKey: customer.Key
                });
            } else {
                logger.info('Müşteri DIA\'da bulunamadı, yeni müşteri oluşturuluyor', {
                    customerCode: customerCode
                });
                // Müşteri yoksa oluştur
                customer = await this.createCustomerInDia(sessionId, order, customerCode);
                
                if (customer) {
                    logger.info('Yeni müşteri başarıyla oluşturuldu', {
                        customerCode: customerCode,
                        diaKey: customer.Key
                    });
                } else {
                    logger.error('Müşteri oluşturulamadı', {
                        customerCode: customerCode
                    });
                }
            }

            return customer;
        } catch (error) {
            logger.error('Müşteri işlemi hatası:', {
                customerId: order.customerId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * HTTP istek gönderme yardımcı metodu
     */
    async sendRequestAsync(endpoint, data) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            
            logger.info('DIA API isteği gönderiliyor', {
                url,
                endpoint,
                dataSize: JSON.stringify(data).length
            });

            const response = await axios.post(url, data, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000,
                validateStatus: () => true
            });

            logger.info('DIA API yanıtı alındı', {
                endpoint,
                statusCode: response.status,
                responseCode: response.data?.code,
                responseMessage: response.data?.msg
            });

            return response.data;
        } catch (error) {
            logger.error('DIA API isteği sırasında hata oluştu', {
                endpoint,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Stok kartı key'ini getirir veya oluşturur
     */
    async getStockCardKey(stockCode, barcode = null) {
        try {
            logger.info('Stok kartı sorgulanıyor', { stockCode, barcode });
            
            const sessionId = await this.loginAsync();
            if (!sessionId) {
                throw new Error('Session ID alınamadı');
            }

            // Önce barkod ile arama yap
            if (barcode) {
                const barcodeRequest = {
                    scf_stokkart_listele: {
                        session_id: sessionId,
                        firma_kodu: this.firmaKodu,
                        donem_kodu: this.donemKodu,
                        filters: [
                            {
                                field: "anabarkod",
                                operator: "=",
                                value: barcode
                            }
                        ],
                        sorts: [
                            {
                                field: "stokkartkodu",
                                sorttype: "ASC"
                            }
                        ],
                        params: {
                            _key_sis_depo: 0,
                            _key_sis_depo_filtre: 0,
                            tarih: "2099-12-31"
                        },
                        limit: 1,
                        offset: 0
                    }
                };

                const barcodeResponse = await this.sendRequestAsync('/api/v3/scf/json', barcodeRequest);
                if (barcodeResponse?.code === "200" && barcodeResponse.result && barcodeResponse.result.length > 0) {
                    logger.info('Ürün barkod ile bulundu', { barcode, key: barcodeResponse.result[0]._key });
                    return barcodeResponse.result[0]._key;
                }
            }

            // Barkod ile bulunamazsa stok kodu ile ara
            const stockRequest = {
                scf_stokkart_listele: {
                    session_id: sessionId,
                    firma_kodu: this.firmaKodu,
                    donem_kodu: this.donemKodu,
                    filters: [
                        {
                            field: "stokkartkodu",
                            operator: "=",
                            value: stockCode
                        }
                    ],
                    sorts: [
                        {
                            field: "stokkartkodu",
                            sorttype: "ASC"
                        }
                    ],
                    params: {
                        _key_sis_depo: 0,
                        _key_sis_depo_filtre: 0,
                        tarih: "2099-12-31"
                    },
                    limit: 1,
                    offset: 0
                }
            };

            const response = await this.sendRequestAsync('/api/v3/scf/json', stockRequest);
            if (response?.code === "200" && response.result && response.result.length > 0) {
                logger.info('Ürün stok kodu ile bulundu', { stockCode, key: response.result[0]._key });
                return response.result[0]._key;
            }

            logger.warn('Stok kartı bulunamadı', { stockCode, barcode });
            return null;
        } catch (error) {
            logger.error('Stok kartı sorgulama hatası', {
                stockCode,
                barcode,
                error: error.message,
                stack: error.stack
            });
            return null;
        }
    }

    /**
     * Stok kartı birim key'ini getirir
     */
    async getStockUnitKey(stockKey) {
        try {
            logger.info('Stok birim key sorgulanıyor', { stockKey });
            
            const sessionId = await this.loginAsync();
            if (!sessionId) {
                throw new Error('Session ID alınamadı');
            }

            const request = {
                scf_stokkart_birimleri_listele: {
                    session_id: sessionId,
                    firma_kodu: this.firmaKodu,
                    donem_kodu: this.donemKodu,
                    filters: [
                        {
                            field: "_key_scf_stokkart",
                            operator: "=",
                            value: stockKey
                        }
                    ],
                    sorts: [],
                    params: {},
                    limit: 10,
                    offset: 0
                }
            };

            const response = await this.sendRequestAsync('/api/v3/scf/json', request);
            if (response?.code === "200" && response.result && response.result.length > 0) {
                logger.info('Stok birim key bulundu', { stockKey, unitKey: response.result[0]._key });
                return response.result[0]._key;
            }

            logger.warn('Stok kartı birimi bulunamadı', { stockKey });
            return null;
        } catch (error) {
            logger.error('Stok kartı birimi sorgulama hatası', {
                stockKey,
                error: error.message,
                stack: error.stack
            });
            return null;
        }
    }

    /**
     * Sipariş firmasından ürün adına göre stok key'ini sorgular
     */
    async queryStockKeyByProductName(productName, sessionId) {
        try {
            // Sipariş KAYIT firması: firma 2 / dönem 2 kullanılacak
            const firmaKoduForOrder = 2;
            const donemKoduForOrder = 2;

            logger.info('Sipariş firmasından stok key sorgulanıyor', { 
                productName, 
                firmaKodu: firmaKoduForOrder, 
                donemKodu: donemKoduForOrder 
            });

            const requestPayload = {
                scf_stokkart_listele: {
                    session_id: sessionId,
                    firma_kodu: firmaKoduForOrder,
                    donem_kodu: donemKoduForOrder,
                    filters: [
                        { field: "aciklama", operator: "=", value: productName }
                    ],
                    sorts: [{ field: "stokkartkodu", sorttype: "ASC" }],
                    params: { selectedcolumns: ["stokkartkodu", "_key", "aciklama", "anabirimkey"] },
                    limit: 10,
                    offset: 0
                }
            };

            logger.info('DIA stok key sorgusu gönderiliyor', {
                productName,
                payload: JSON.stringify(requestPayload, null, 2)
            });

            const response = await this.sendRequestAsync('/api/v3/scf/json', requestPayload);
            
            logger.info('DIA stok key sorgu yanıtı', {
                productName,
                responseCode: response?.code,
                resultCount: response?.result?.length || 0,
                results: response?.result
            });

            if (response?.code === "200" && response?.result && response.result.length > 0) {
                // İlk sonucu al (en uygun olan)
                const firstStock = response.result[0];
                
                logger.info('Sipariş firmasından stok key bulundu', {
                    productName,
                    stockKey: firstStock._key,
                    stokkartkodu: firstStock.stokkartkodu,
                    anabirimkey: firstStock.anabirimkey
                });

                return {
                    stockKey: firstStock._key,
                    unitKey: firstStock.anabirimkey,
                    stokkartkodu: firstStock.stokkartkodu,
                    aciklama: firstStock.aciklama
                };
            } else {
                logger.warn('Sipariş firmasında stok bulunamadı', {
                    productName,
                    response: response
                });
                return null;
            }
        } catch (error) {
            logger.error('Sipariş firması stok key sorgu hatası', {
                productName,
                error: error.message,
                stack: error.stack
            });
            return null;
        }
    }

    /**
     * Sipariş kalemlerinin stok bilgilerini hazırlar
     */
    async prepareStockInfo(items, sessionId = null) {
        const stockInfo = {};
        
        logger.info('Stok bilgileri hazırlanıyor', { itemCount: items.length });
        
        // MongoDB'den DiaStock koleksiyonunu kullan
        const DiaStock = require('../models/DiaStock');
        
        for (const item of items) {
            const productCode = item.sku || item.productCode || item.subProductCode || item.barcode || item.productId;
            const productName = item.name || item.productName || item.title;
            
            logger.info('Stok arama yapılıyor', { 
                productCode, 
                productName,
                itemKeys: Object.keys(item),
                sku: item.sku,
                productCode: item.productCode,
                subProductCode: item.subProductCode,
                barcode: item.barcode,
                productId: item.productId,
                name: item.name
            });
            
            if (productCode && !stockInfo[productCode]) {
                try {
                    // 1) ÖNCE: Siparişi kaydedeceğimiz firmadan ürün adına göre stok key sorgula
                    if (productName && sessionId) {
                        const orderFirmStock = await this.queryStockKeyByProductName(productName, sessionId);

                        if (orderFirmStock) {
                            stockInfo[productCode] = {
                                stockKey: orderFirmStock.stockKey,
                                unitKey: orderFirmStock.unitKey,
                                stokkartkodu: orderFirmStock.stokkartkodu,
                                birimadi: 'AD'
                            };

                            logger.info('Öncelik: Sipariş firmasından stok key bulundu ve kullanılacak', {
                                productCode,
                                productName,
                                stockKey: orderFirmStock.stockKey,
                                stokkartkodu: orderFirmStock.stokkartkodu
                            });

                            // Sipariş firması sonucu bulunduysa DB fallback'ine gerek yok
                            continue;
                        }
                    }

                    // 2) FALLBACK: DiaStock tablosundan stokkartkodu veya _key ile ara
                    const stockRecord = await DiaStock.findOne({
                        $or: [
                            { stokkartkodu: productCode },
                            { _key: productCode }
                        ],
                        isActive: true
                    });

                    if (stockRecord) {
                        stockInfo[productCode] = {
                            stockKey: stockRecord._key,
                            unitKey: stockRecord.anabirimkey,
                            stokkartkodu: stockRecord.stokkartkodu,
                            birimadi: stockRecord.birimadi
                        };

                        logger.info('Fallback: DiaStock\'tan stok bilgisi bulundu', {
                            productCode,
                            stockKey: stockRecord._key,
                            unitKey: stockRecord.anabirimkey,
                            birimadi: stockRecord.birimadi
                        });
                    } else {
                        logger.error('Stok bulunamadı (sipariş firması ve DiaStock başarısız)', {
                            productCode,
                            productName
                        });
                        
                        // Alternatif aramalar (debug için)
                        const anyStock = await DiaStock.findOne({ isActive: true });
                        if (anyStock) {
                            logger.info('Test: DiaStock\'ta aktif kayıt mevcut', {
                                sampleStokkartkodu: anyStock.stokkartkodu,
                                sampleKey: anyStock._key
                            });
                        }
                        
                        const similarStocks = await DiaStock.find({
                            stokkartkodu: { $regex: productCode, $options: 'i' },
                            isActive: true
                        }).limit(3);
                        if (similarStocks.length > 0) {
                            logger.info('Benzer stok kartları bulundu', {
                                productCode,
                                similarStocks: similarStocks.map(s => s.stokkartkodu)
                            });
                        }
                    }
                } catch (error) {
                    logger.error('Stok bilgisi hazırlama hatası', {
                        productCode,
                        productName,
                        error: error.message,
                        stack: error.stack
                    });
                }
            }
        }
        
        return stockInfo;
    }

    /**
     * Decimal değeri formatlar
     */
    formatDecimal(value) {
        if (!value && value !== 0) return "0.000000";
        
        const numValue = typeof value === 'string' ? 
            parseFloat(value.replace(',', '.')) : 
            parseFloat(value);
            
        return isNaN(numValue) ? "0.000000" : numValue.toFixed(6);
    }

    /**
     * Sipariş JSON'unu oluşturur
     */
    async createOrderJson(order, diaCustomer, sessionId, stockInfo) {
        try {
            logger.info('Sipariş JSON oluşturuluyor', {
                orderCode: order.orderNumber,
                customerKey: diaCustomer.Key,
                itemCount: order.items.length
            });

            // Sipariş tarihi güvenli hesaplanır (orderDate yoksa createdAt ya da şimdi)
            let orderDateSource = order?.orderDate || order?.createdAt || Date.now();
            let orderDate = new Date(orderDateSource);
            if (isNaN(orderDate.getTime())) {
                orderDate = new Date();
            }
            const orderDateStr = orderDate.toISOString().slice(0, 10);
            const orderTimeStr = orderDate.toTimeString().slice(0, 8);

            // Platform ve ödeme yöntemine göre kodlar
            let finalKod = 0;
            let planId = 0;
            // DIA gereği 'onay' alanını zorunlu KABUL gönderiyoruz
            const onayDegeri = 'KABUL';

            if (order.sourcePlatform === 'parfumevi') finalKod = 578955;
            else if (order.sourcePlatform === 'esans') finalKod = 578957;
            else if (order.sourcePlatform === 'Trendyol') finalKod = 578961;

            if (order.paymentMethod === 'Kredi Kartı' || order.sourcePlatform === 'Trendyol') {
                if (order.bankTransactionVendor === 'PosFix Garanti Pos') planId = 579340;
                else if (order.bankTransactionVendor === 'PosFix Vakıf Pos') planId = 579340;
                else if (order.bankTransactionVendor === 'Garanti Yeni Pos') planId = 579552;
                else if (order.sourcePlatform === 'Trendyol') planId = 685674;
            } else if (order.paymentMethod === 'Havale / EFT') {
                planId = 579216;
            }

            // Exchange rate
            const exchangeRate = this.formatDecimal(order.exchangeRate || '1');

            // Sipariş kalemleri
            const orderItems = this.createOrderItems(order.items, diaCustomer, order, stockInfo, planId);

            // DIA fisno: AL + 12 haneli zaman damgası (noktalama/kısaltma yok)
            const fisNo = `AL${Date.now().toString().slice(-12)}`;

            const diaOrder = {
                scf_siparis_ekle: {
                    session_id: sessionId,
                    firma_kodu: 2,
                    donem_kodu: 2,
                    kart: {
                        _key_krg_firma: 0,
                        _key_scf_carikart: parseInt(diaCustomer.Key),
                        _key_scf_odeme_plani: 17522467,
                        _key_scf_satiselemani: 7383794,
                        _key_sis_depo_source: this.siparisDepoKey,
                        // Döviz keyleri sabit 2026
                        _key_sis_doviz: 2026,
                        _key_sis_doviz_raporlama: 2026,
                        _key_sis_ozelkod1: finalKod,
                        _key_sis_ozelkod2: 0,
                        _key_sis_sube_source: this.siparisSubeKey,
                        depokodu: this.siparisDepoKodu,
                        subekodu: this.siparisSubeKodu,
                        aciklama1: order.orderNumber,
                        aciklama2: "",
                        aciklama3: "",
                        dovizkuru: exchangeRate,
                        ekalan1: order.cargoCode || "",
                        ekalan2: order.cargo || "",
                        onay: onayDegeri,
                        fisno: fisNo,
                        m_kalemler: orderItems,
                        net: this.formatDecimal(order.pricing.total),
                        netdvz: this.formatDecimal(order.pricing.total),
                        ortalamavade: orderDateStr,
                        raporlamadovizkuru: "1.000000",
                        saat: orderTimeStr,
                        sevkadresi1: order.shipping.address.address1 || "",
                        sevkadresi2: "",
                        sevkadresi3: `${order.shipping.address.city || ""} ${order.shipping.address.state || ""}`.trim(),
                        tarih: orderDateStr,
                        teslimat_adres1: order.shipping.address.address1 || "",
                        teslimat_adres2: "",
                        teslimat_adsoyad: `${order.shipping.address.firstName || ""} ${order.shipping.address.lastName || ""}`.trim(),
                        teslimat_ceptel: order.shipping.address.phone || "",
                        teslimat_ilce: order.shipping.address.city || "",
                        teslimat_key_sis_sehirler: 0,
                        teslimat_telefon: order.shipping.address.phone || "",
                        toplam: this.formatDecimal(order.pricing.subtotal),
                        toplamdvz: this.formatDecimal(order.pricing.subtotal),
                        toplamindirim: this.formatDecimal(order.pricing.discountAmount || '0'),
                        toplamindirimdvz: this.formatDecimal(order.pricing.discountAmount || '0'),
                        toplamkdv: this.formatDecimal(order.pricing.vatAmount),
                        toplamkdvdvz: this.formatDecimal(order.pricing.vatAmount),
                        toplammasraf: "0.000000",
                        toplammasrafdvz: "0.000000",
                        turu: 2
                    }
                }
            };

            // Alan eşlemesi (mapping) logu - örnek 5 kalem
            try {
                const mappedItems = orderItems.slice(0, 5).map((kalem, idx) => ({
                    index: idx + 1,
                    dia: {
                        _key_sis_depo_source: kalem._key_sis_depo_source,
                        anamiktar: kalem.anamiktar,
                        birimfiyati: kalem.birimfiyati,
                        kdv: kalem.kdv,
                        kalemturu: kalem.kalemturu,
                    },
                    local: {
                        sku: order.items[idx]?.sku || order.items[idx]?.productCode || order.items[idx]?.subProductCode,
                        quantity: order.items[idx]?.quantity,
                        unitPrice: order.items[idx]?.unitPrice,
                        vatRate: order.items[idx]?.vatRate,
                        name: order.items[idx]?.name || order.items[idx]?.productName
                    }
                }));

                const mappingLog = {
                    orderNumber: order.orderNumber,
                    diaHeader: {
                        _key_scf_carikart: diaOrder.scf_siparis_ekle.kart._key_scf_carikart,
                        _key_sis_sube_source: diaOrder.scf_siparis_ekle.kart._key_sis_sube_source,
                        _key_sis_depo_source: diaOrder.scf_siparis_ekle.kart._key_sis_depo_source,
                        depokodu: diaOrder.scf_siparis_ekle.kart.depokodu,
                        subekodu: diaOrder.scf_siparis_ekle.kart.subekodu,
                        doviz: diaOrder.scf_siparis_ekle.kart._key_sis_doviz?.adi,
                        onay: diaOrder.scf_siparis_ekle.kart.onay,
                        fisno: diaOrder.scf_siparis_ekle.kart.fisno,
                        net: diaOrder.scf_siparis_ekle.kart.net,
                        toplam: diaOrder.scf_siparis_ekle.kart.toplam,
                        tarih: diaOrder.scf_siparis_ekle.kart.tarih,
                    },
                    localHeader: {
                        userId: order.userId,
                        pricing: order.pricing,
                        currency: order.pricing?.currency || order.currency || 'TL',
                        shippingAddress: order.shipping?.address,
                    },
                    itemsSample: mappedItems,
                    counts: { localItems: order.items.length, diaItems: orderItems.length }
                };
                logger.info('=== [DIA][ORDER_MAPPING] ===', mappingLog);
            } catch (mapErr) {
                logger.warn('DIA mapping log oluşturulamadı', { error: mapErr.message });
            }

            logger.info('Sipariş JSON oluşturuldu', {
                orderCode: order.orderNumber,
                itemCount: orderItems.length,
                total: this.formatDecimal(order.pricing.total),
                teklifResult: onayDegeri,
                planId
            });

            return diaOrder;
        } catch (error) {
            logger.error('Sipariş JSON oluşturulurken hata meydana geldi', {
                orderCode: order.orderNumber,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Sipariş kalemlerini oluşturur
     */
    createOrderItems(items, diaCustomer, order, stockInfo, planId) {
        const orderItems = [];
        let siraNo = 1;

        for (const item of items) {
            const productCode = item.sku || item.productCode || item.subProductCode || item.barcode || item.productId;
            const exchangeRate = this.formatDecimal(item.exchangeRate || '1');
            const unitPrice = parseFloat(item.unitPrice || 0);
            const vatRate = parseFloat(item.vatRate || 20);
            const vatAmount = unitPrice * (vatRate / 100);

            let orderItem;

            if (stockInfo[productCode]) {
                // Stok bilgisi bulundu, normal kalem oluştur
                const info = stockInfo[productCode];
                orderItem = {
                    _key_scf_carikart: diaCustomer.Key,
                    _key_scf_kalem_birimleri: info.unitKey ? parseInt(info.unitKey) : (parseInt(info.stockKey) + 1),
                    _key_kalemturu: parseInt(info.stockKey),
                    _key_scf_odeme_plani: 17522467,
                    _key_sis_depo_source: this.siparisDepoKey,
                    _key_sis_doviz: 2026,
                    anamiktar: this.formatDecimal(item.quantity),
                    birimfiyati: this.formatDecimal(item.unitPrice),
                    daraadet: "0.000000",
                    dovizkuru: exchangeRate,
                    kalemturu: item.kalemturu || "MLZM",
                    kdv: this.formatDecimal(vatRate),
                    kdvdurumu: "D",
                    kdvtutari: this.formatDecimal(vatAmount),
                    miktar: this.formatDecimal(item.quantity),
                    note: item.note || item.name || item.productName || "",
                    note2: "",
                    onay: 'KABUL',
                    rezervasyon: "H",
                    siptarih: new Date().toISOString().slice(0, 10),
                    sirano: siraNo,
                    sonbirimfiyati: this.formatDecimal(item.unitPrice),
                    tutari: this.formatDecimal(item.unitPrice),
                    yerelbirimfiyati: this.formatDecimal(item.unitPrice)
                };
                
                logger.info('Normal kalem oluşturuldu', { productCode, stockKey: info.stockKey, unitKey: info.unitKey });
            } else {
                // Stok bilgisi bulunamadı, bu kalemi atla
                logger.warn('Stok bilgisi bulunamadı, kalem atlanıyor', { productCode });
                continue;
            }

            orderItems.push(orderItem);
            siraNo++;

            logger.info('Sipariş kalemi eklendi', {
                productCode,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                siraNo: siraNo - 1
            });
        }

        // Kargo ücreti eklenmeyecek, sadece stok kalemleri

        return orderItems;
    }

    /**
     * Sipariş gönderme ana metodu
     */
    async sendOrder(order, diaCustomer) {
        try {
            logger.info('DIA sipariş gönderimi başlatılıyor', {
                orderId: order._id,
                orderCode: order.orderNumber,
                customerId: order.customerId,
                customerKey: diaCustomer?.Key
            });
            
            // Yıl kontrolü - 2024 yılı siparişleri gönderilmez
            const orderYear = new Date(order.orderDate).getFullYear();
            if (orderYear === 2024) {
                logger.info('2024 yılı siparişi DIA\'ya gönderilmeyecek', {
                    orderId: order._id,
                    orderDate: order.orderDate
                });
                return {
                    code: "200",
                    message: "2024 yılına ait sipariş, DIA'ya gönderilmedi",
                    key: "SKIPPED_2024"
                };
            }
            
            // Önce siparişin DIA'da olup olmadığını kontrol et
            const orderCheck = await this.checkOrderExistsInDia(order.orderNumber);
            if (orderCheck.exists) {
                logger.info('Sipariş zaten DIA\'da mevcut', {
                    orderCode: order.orderNumber,
                    diaKey: orderCheck.diaKey
                });
                return {
                    code: "200",
                    message: "Sipariş zaten DIA'da mevcut",
                    key: orderCheck.diaKey
                };
            }

            // Session kontrolü
            const sessionId = await this.ensureValidSessionAsync();
            if (!sessionId) {
                throw new Error('Session ID alınamadı');
            }

            // Stok bilgilerini hazırla (sessionId ile birlikte)
            const stockInfo = await this.prepareStockInfo(order.items, sessionId);
            logger.info('Stok bilgileri hazırlandı', {
                orderCode: order.orderNumber,
                stockCount: Object.keys(stockInfo).length
            });

            // Müşteri kontrolü
            if (!diaCustomer) {
                logger.error('DIA müşteri bilgisi bulunamadı', {
                    orderId: order._id
                });
                throw new Error('Müşteri bilgisi bulunamadı');
            }

            // Sipariş JSON'unu oluştur
            const orderJson = await this.createOrderJson(order, diaCustomer, sessionId, stockInfo);
            
            logger.info('Sipariş JSON\'u oluşturuldu, DIA\'ya gönderiliyor', {
                orderCode: order.orderNumber
            });

            // DIA'ya gönder
            const response = await this.sendRequestAsync('/api/v3/scf/json', orderJson);

            logger.info('DIA sipariş yanıtı alındı', {
                orderCode: order.orderNumber,
                responseCode: response?.code,
                responseMessage: response?.msg,
                responseKey: response?.key
            });

            return response;
        } catch (error) {
            logger.error('Sipariş gönderme hatası:', {
                orderId: order._id,
                orderCode: order.orderNumber,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

// Export edilecek ana fonksiyon
async function syncOrderToDia(order) {
    try {
        const diaService = new DiaService();
        
        // DIA konfigürasyonu kontrol et
        if (!diaService.baseURL) {
            logger.warn('DIA_BASE_URL ayarlanmamış, DIA senkronizasyonu atlanıyor');
            return { skipped: true, message: 'DIA_BASE_URL not configured' };
        }

        logger.info('DIA sipariş senkronizasyonu başlatılıyor', {
            orderNumber: order.orderNumber,
            customerId: order.customerId
        });

        // 1) Kullanıcıda diaKey varsa kullan; 2) yoksa oluştur ve kullanıcıya kaydet
        const User = require('../models/User');
        let diaCustomer;
        let userDoc = null;
        try { if (order.userId) userDoc = await User.findById(order.userId).select('profile firstName lastName diaKey diaAddressKey'); } catch {}

        if (userDoc?.diaKey) {
            diaCustomer = { Key: String(userDoc.diaKey) };
            logger.info('Kullanıcıda mevcut DIA cari bulundu, kullanılacak', { userId: order.userId, diaKey: diaCustomer.Key });
        } else {
            const ship = order?.shipping?.address || {};
            const custName = (userDoc?.profile?.firstName || userDoc?.firstName || ship.firstName || '').toString().trim() + ' ' + (userDoc?.profile?.lastName || userDoc?.lastName || ship.lastName || '').toString().trim();
            const mapped = {
                customerId: String(order.userId || ''),
                customerName: custName.trim() || (ship.fullName || 'Müşteri'),
                customerUsername: '',
                customerEmail: '',
                customerPhone: ship.phone || userDoc?.profile?.phone || '',
                isCommercial: !!ship.companyName || false,
                invoiceCompany: ship.companyName || '',
                invoiceTaxNumber: ship.taxNumber || '',
                invoiceTaxOffice: ship.taxOffice || '',
                invoiceAddress: ship.addressLine || ship.address1 || '',
                invoiceCity: ship.city || '',
                invoiceTown: ship.district || '',
                deliveryAddress: ship.addressLine || ship.address1 || '',
                deliveryCity: ship.city || '',
                deliveryTown: ship.district || '',
                sourcePlatform: 'web'
            };

            const resolvedCustomer = await diaService.getOrCreateCustomer(mapped);
            if (!resolvedCustomer?.Key) {
                throw new Error('DIA müşteri işlemi başarısız');
            }
            diaCustomer = resolvedCustomer;
            try {
                const update = { diaKey: diaCustomer.Key };
                if (Array.isArray(diaCustomer.AddressKeys) && diaCustomer.AddressKeys.length > 0) {
                    update.diaAddressKey = String(diaCustomer.AddressKeys[0]);
                }
                if (order.userId) {
                    await User.updateOne({ _id: order.userId }, { $set: update });
                    logger.info('Kullanıcı DIA key bilgileri güncellendi', { userId: order.userId, update });
                }
            } catch (e) {
                logger.warn('Kullanıcı DIA key güncellenemedi', { error: e.message });
            }
        }

        // Siparişi gönder
        const result = await diaService.sendOrder(order, diaCustomer);
        
        if (result?.code === "200") {
            logger.info('DIA sipariş senkronizasyonu tamamlandı', {
                orderNumber: order.orderNumber,
                diaKey: result.key,
                message: result.message
            });
            return { 
                success: true, 
                message: result.message || 'Sipariş başarıyla DIA\'ya gönderildi',
                diaKey: result.key 
            };
        } else {
            throw new Error(result?.msg || 'DIA sipariş oluşturma başarısız');
        }
    } catch (error) {
        logger.error('DIA sipariş senkronizasyonu hatası', {
            orderNumber: order.orderNumber,
            error: error.message,
            stack: error.stack
        });
        return { 
            success: false, 
            error: error.message 
        };
    }
}

module.exports = {
    syncOrderToDia,
    DiaService
};
