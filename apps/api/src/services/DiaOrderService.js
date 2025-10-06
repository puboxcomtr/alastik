const axios = require('axios');
const winston = require('winston');

/* Order Modeli */
const Order = require('../models/Order');

/* WebOrder Modeli */
const WebOrder = require('../models/WebOrder');

/* Order Filter Config */
const { getOrderFilters, getOrderFields } = require('../config/diaOrderFilters');

/* Sync Service */
const UserSyncService = require('./UserSyncService');

class DiaOrderService {
    constructor() {
        this.userSyncService = new UserSyncService();
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: { service: 'dia-order-sync' },
            transports: [
                new winston.transports.File({ filename: 'logs/dia-order-sync.log' }),
                new winston.transports.Console()
            ]
        });

        // DIA API konfigürasyonu
        this.diaApiConfig = {
            baseURL: process.env.DIA_BASE_URL || 'https://artlastik.ws.dia.com.tr',
            apiKey: process.env.DIA_API_KEY || 'eda23858-0e9b-4a81-b7e2-4c9f03d30078',
            username: process.env.DIA_USERNAME || 'Ws_alastik_B2C',
            password: process.env.DIA_PASSWORD || 'Ws_alastik_B2C',
            firmaKodu: 2,
            donemKodu: 2,
            timeout: 600000
        };

        // Session yönetimi
        this.cachedSessionId = null;
        this.sessionExpireTime = null;

        this.axiosInstance = axios.create({
            timeout: this.diaApiConfig.timeout,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    isSessionValid() {
        return this.cachedSessionId &&
            this.sessionExpireTime &&
            new Date() < this.sessionExpireTime;
    }

    async loginAsync() {
        if (this.isSessionValid()) {
            this.logger.info('Cached session kullanılıyor');
            return this.cachedSessionId;
        }

        try {
            this.logger.info('DIA Login başlatılıyor...');

            const loginRequest = {
                login: {
                    username: this.diaApiConfig.username,
                    password: this.diaApiConfig.password,
                    disconnect_same_user: "True",
                    params: {
                        apikey: this.diaApiConfig.apiKey
                    }
                }
            };

            const endpoint = `${this.diaApiConfig.baseURL}/api/v3/sis/json`;
            const response = await this.axiosInstance.post(endpoint, loginRequest);

            if (response.data.code === "200") {
                this.cachedSessionId = response.data.msg;
                this.sessionExpireTime = new Date(Date.now() + 60 * 60 * 1000);

                this.logger.info('DIA Login başarılı');
                return this.cachedSessionId;
            }

            this.logger.error('DIA Login başarısız:', response.data);
            return null;

        } catch (error) {
            this.logger.error('DIA Login hatası:', error.message);
            return null;
        }
    }

    async fetchOrdersFromDia(params = {}) {
        try {
            const sessionId = await this.loginAsync();
            if (!sessionId) {
                throw new Error('DIA login başarısız');
            }

            const defaultParams = {
                session_id: sessionId,
                firma_kodu: this.diaApiConfig.firmaKodu,
                donem_kodu: this.diaApiConfig.donemKodu,
                filters: getOrderFilters(),
                sorts: [{ field: "tarih", sorttype: "DESC" }],
                params: {},
                limit: params.limit || 100,
                offset: params.offset || 0,
                fields: getOrderFields()
            };

            const requestPayload = {
                scf_siparis_listele: {
                    ...defaultParams,
                    ...params
                }
            };

            const endpoint = `${this.diaApiConfig.baseURL}/api/v3/scf/json`;

            this.logger.info('DIA sipariş listesi çekiliyor', {
                limit: defaultParams.limit,
                offset: defaultParams.offset
            });

            const response = await this.axiosInstance.post(endpoint, requestPayload);

            if (response.data.code !== '200') {
                throw new Error(`DIA API Error: ${response.data.msg}`);
            }

            const orders = response.data.result || [];

            this.logger.info('DIA sipariş listesi alındı', {
                count: orders.length
            });

            return orders;

        } catch (error) {
            this.logger.error('DIA sipariş listesi hatası:', error.message);
            throw error;
        }
    }

    async fetchOrderDetailFromDia(orderKey) {
        try {
            const sessionId = await this.loginAsync();
            if (!sessionId) {
                throw new Error('DIA login başarısız');
            }

            const requestPayload = {
                scf_siparis_getir: {
                    session_id: sessionId,
                    firma_kodu: this.diaApiConfig.firmaKodu,
                    donem_kodu: this.diaApiConfig.donemKodu,
                    key: parseInt(orderKey)
                }
            };

            const endpoint = `${this.diaApiConfig.baseURL}/api/v3/scf/json`;

            this.logger.info('DIA sipariş detayı çekiliyor', { orderKey });

            const response = await this.axiosInstance.post(endpoint, requestPayload);

            if (response.data.code !== '200') {
                throw new Error(`DIA API Error: ${response.data.msg}`);
            }

            const orderDetail = response.data.result;
            this.logger.info('=== DIA SİPARİŞ HAM VERİSİ ===', {
                __cariunvan: orderDetail.__cariunvan,
                __cariceptel: orderDetail.__cariceptel,
                __cariverginumarasi: orderDetail.__cariverginumarasi,
                _key_scf_carikart: orderDetail._key_scf_carikart,
                _key_scf_carikart_type: typeof orderDetail._key_scf_carikart
            });

            this.logger.info('DIA sipariş detayı alındı', {
                orderKey,
                itemCount: orderDetail.m_kalemler?.length || 0
            });

            return orderDetail;

        } catch (error) {
            this.logger.error('DIA sipariş detayı hatası:', error.message);
            throw error;
        }
    }

    transformDiaOrderToMongoOrder(diaOrder) {
        const customerCard = diaOrder._key_scf_carikart;
        const customerKey = typeof customerCard === 'object' && customerCard !== null
            ? customerCard._key?.toString()
            : customerCard?.toString();

        const customerName = typeof customerCard === 'object' && customerCard !== null
            ? customerCard.unvan
            : diaOrder.__cariunvan;

        const customerPhone = typeof customerCard === 'object' && customerCard !== null
            ? customerCard.cep || customerCard.tel || ''
            : diaOrder.__cariceptel;

        return {
            orderNumber: diaOrder.fisno,
            integration: {
                diaSync: {
                    status: 'synced',
                    diaOrderKey: diaOrder._key?.toString(),
                    diaOrderNumber: diaOrder.fisno,
                    diaCustomerKey: customerKey,
                    syncedAt: new Date()
                }
            },
            billing: {
                address: {
                    firstName: customerName || '',
                    address: diaOrder.sevkadresi1 || '',
                    city: diaOrder.sevkadresi3 || '',
                    phone: customerPhone || ''
                },
                taxNumber: diaOrder.__cariverginumarasi || '',
                isCompany: !!diaOrder.__cariverginumarasi
            },
            shipping: {
                address: {
                    address: diaOrder.sevkadresi1 || '',
                    city: diaOrder.sevkadresi3 || '',
                    phone: customerPhone || ''
                }
            },
            pricing: {
                subtotal: parseFloat(diaOrder.toplam || 0),
                vatAmount: parseFloat(diaOrder.toplamkdv || 0),
                total: parseFloat(diaOrder.net || 0),
                currency: diaOrder.dovizturu || 'TRY'
            },
            status: this.mapDiaStatusToOrderStatus(diaOrder.onay),
            paymentStatus: 'pending',
            createdAt: new Date(diaOrder.tarih || Date.now()),
            source: 'dia_sync'
        };
    }

    transformDiaOrderItems(diaKalemler) {
        if (!diaKalemler || diaKalemler.length === 0) return [];

        return diaKalemler.map(kalem => ({
            productId: kalem._key_kalemturu?._key?.toString() || kalem._key_kalemturu?.toString(),
            name: kalem._key_kalemturu?.aciklama || 'Ürün',
            brand: kalem._key_kalemturu?.marka || '',
            quantity: parseFloat(kalem.anamiktar || kalem.miktar || 1),
            unitPrice: parseFloat(kalem.birimfiyati || 0),
            totalPrice: parseFloat(kalem.tutari || 0),
            vatRate: parseFloat(kalem.kdv || 18),
            vatAmount: parseFloat(kalem.kdvtutari || 0)
        }));
    }

    mapDiaStatusToOrderStatus(diaOnay) {
        const statusMap = {
            'KABUL': 'confirmed',
            'RED': 'cancelled',
            'BEKLEMEDE': 'pending'
        };
        return statusMap[diaOnay] || 'pending';
    }

    mapStatusToDiaOnay(status) {
        const statusMap = {
            'pending': 'BEKLEMEDE',
            'confirmed': 'KABUL',
            'processing': 'KABUL',
            'shipped': 'KABUL',
            'delivered': 'KABUL',
            'cancelled': 'RED',
            'returned': 'RED',
            'refunded': 'RED'
        };
        return statusMap[status] || 'BEKLEMEDE';
    }

    transformOrderToWebOrder(order) {
        try {
            const webOrder = {
                _key: order.integration?.diaSync?.diaOrderKey || null,

                diaData: {
                    _key: order.integration?.diaSync?.diaOrderKey,
                    fisno: order.orderNumber,
                    tarih: order.createdAt,
                    onay: this.mapStatusToDiaOnay(order.status),
                    turu: 'A',
                    _key_scf_carikart: order.integration?.diaSync?.diaCustomerKey || '',
                    __cariunvan: [
                        order.billing?.address?.firstName,
                        order.billing?.address?.lastName
                    ].filter(Boolean).join(' ') || '',
                    __cariceptel: order.billing?.address?.phone || order.shipping?.address?.phone || '',
                    __cariverginumarasi: order.billing?.taxNumber || '',
                    sevkadresi1: order.shipping?.address?.address || '',
                    sevkadresi2: order.shipping?.address?.district || '',
                    sevkadresi3: order.shipping?.address?.city || '',
                    toplam: order.pricing?.subtotal || 0,
                    toplamkdv: order.pricing?.vatAmount || 0,
                    net: order.pricing?.total || 0,
                    dovizturu: order.pricing?.currency || 'TRY',
                    aciklama: order.notes?.customer || '',
                    odemesekli: order.payment?.method || '',
                    sevktarihi: order.shippedAt || null,
                    teslimtarihi: order.deliveredAt || null,
                    m_kalemler: (order.items || []).map(item => ({
                        _key: item._id?.toString(),
                        _key_kalemturu: item.productId,
                        miktar: item.quantity,
                        anamiktar: item.quantity,
                        birimfiyati: item.unitPrice,
                        tutari: item.totalPrice,
                        kdv: item.vatRate,
                        kdvtutari: item.vatAmount,
                        indirim: item.discount || 0,
                        aciklama: item.name,
                        birimadi: 'ADET'
                    }))
                },

                customData: {
                    customer: {
                        name: order.billing?.address?.firstName || '',
                        email: order.billing?.email || '',
                        phone: order.billing?.address?.phone || order.shipping?.address?.phone || ''
                    },
                    shippingAddress: null,
                    billingAddress: null,
                    items: [],
                    payment: null,
                    pricing: null,
                    internalNotes: order.notes?.internal || null,
                    customerNotes: order.notes?.customer || null,
                    tags: [],
                    priority: 'normal',
                    assignedTo: null,
                    customStatus: null,
                    webOrderNumber: null
                },

                syncInfo: {
                    direction: 'dia_to_web',
                    diaStatus: 'synced',
                    webStatus: 'confirmed',
                    lastDiaSync: new Date(),
                    lastWebUpdate: order.updatedAt,
                    syncErrors: [],
                    syncSource: 'dia_api'
                }
            };

            return webOrder;

        } catch (error) {
            this.logger.error('Order transform hatası:', {
                orderId: order._id,
                error: error.message
            });
            throw error;
        }
    }

    async syncOrdersToWebOrders() {
        const operationId = `sync_to_weborders_${Date.now()}`;
        const startTime = Date.now();

        try {
            this.logger.info('=== ORDERS → WEBORDERS SENKRONİZASYONU BAŞLANGICI ===', { operationId });

            // TÜM siparişleri al (filtre yok)
            const diaOrders = await Order.find({}).lean();

            this.logger.info('Tüm siparişler bulundu', {
                operationId,
                count: diaOrders.length
            });

            let created = 0;
            let updated = 0;
            let skipped = 0;
            let errors = [];

            for (const order of diaOrders) {
                try {
                    // WebOrder'da benzersiz key oluştur
                    const orderKey = order.integration?.diaSync?.diaOrderKey || order._id.toString();

                    const existingWebOrder = await WebOrder.findOne({ _key: orderKey });

                    if (existingWebOrder) {
                        const webOrderData = this.transformOrderToWebOrder(order);

                        await WebOrder.updateOne(
                            { _key: orderKey },
                            {
                                $set: {
                                    diaData: webOrderData.diaData,
                                    customData: webOrderData.customData,
                                    'syncInfo.lastDiaSync': new Date(),
                                    'syncInfo.diaStatus': 'synced'
                                }
                            }
                        );

                        updated++;

                        this.logger.info('WebOrder güncellendi', {
                            operationId,
                            orderKey,
                            orderNumber: order.orderNumber
                        });

                    } else {
                        const webOrderData = this.transformOrderToWebOrder(order);
                        webOrderData._key = orderKey; // Benzersiz key ata

                        await WebOrder.create(webOrderData);

                        created++;

                        this.logger.info('WebOrder oluşturuldu', {
                            operationId,
                            orderKey,
                            orderNumber: order.orderNumber
                        });
                    }

                } catch (orderError) {
                    this.logger.error('Sipariş işleme hatası:', {
                        operationId,
                        orderId: order._id,
                        error: orderError.message
                    });

                    errors.push({
                        orderId: order._id,
                        orderNumber: order.orderNumber,
                        error: orderError.message
                    });
                }
            }

            const duration = Date.now() - startTime;

            this.logger.info('=== ORDERS → WEBORDERS SENKRONİZASYONU TAMAMLANDI ===', {
                operationId,
                created,
                updated,
                skipped,
                errorCount: errors.length,
                duration: `${duration}ms`
            });

            return {
                success: true,
                created,
                updated,
                skipped,
                errors,
                duration: `${duration}ms`
            };

        } catch (error) {
            this.logger.error('Orders → WebOrders sync hatası:', {
                operationId,
                error: error.message
            });
            throw error;
        }
    }

    async syncOrdersToDatabase(limit = 100, offset = 0) {
        try {
            this.logger.info('Sipariş senkronizasyonu başlatılıyor', { limit, offset });

            const diaOrders = await this.fetchOrdersFromDia({ limit, offset });

            let synced = 0;
            let skipped = 0;
            let errors = [];

            for (const diaOrder of diaOrders) {
                try {
                    const existingOrder = await Order.findOne({
                        'integration.diaSync.diaOrderKey': diaOrder._key?.toString()
                    });

                    if (existingOrder) {
                        this.logger.info('Sipariş zaten mevcut, atlanıyor', {
                            orderNumber: diaOrder.fisno
                        });
                        skipped++;
                        continue;
                    }

                    const orderDetail = await this.fetchOrderDetailFromDia(diaOrder._key);
                    const mongoOrder = this.transformDiaOrderToMongoOrder(orderDetail);
                    const orderItems = this.transformDiaOrderItems(orderDetail.m_kalemler);

                    mongoOrder.items = orderItems;

                    const newOrder = new Order(mongoOrder);
                    await newOrder.save();

                    this.logger.info('Sipariş kaydedildi', {
                        orderNumber: mongoOrder.orderNumber,
                        itemCount: orderItems.length
                    });

                    synced++;

                    await new Promise(resolve => setTimeout(resolve, 500));

                } catch (orderError) {
                    this.logger.error('Sipariş işleme hatası:', {
                        orderKey: diaOrder._key,
                        error: orderError.message
                    });
                    errors.push({
                        orderKey: diaOrder._key,
                        error: orderError.message
                    });
                }
            }

            this.logger.info('Sipariş senkronizasyonu tamamlandı', {
                synced,
                skipped,
                errorCount: errors.length
            });

            return {
                success: true,
                synced,
                skipped,
                errors
            };

        } catch (error) {
            this.logger.error('Sipariş senkronizasyonu hatası:', error.message);
            throw error;
        }
    }

    async fullSync() {
        const limit = 50;
        let offset = 0;
        let hasMore = true;
        let totalSynced = 0;
        let totalSkipped = 0;

        this.logger.info('Tam sipariş senkronizasyonu başlatılıyor');

        while (hasMore) {
            const result = await this.syncOrdersToDatabase(limit, offset);

            totalSynced += result.synced;
            totalSkipped += result.skipped;

            if (result.synced === 0) {
                hasMore = false;
            } else {
                offset += limit;
            }
        }

        this.logger.info('Tam sipariş senkronizasyonu tamamlandı', {
            totalSynced,
            totalSkipped
        });

        return {
            success: true,
            totalSynced,
            totalSkipped
        };
    }
}

module.exports = DiaOrderService;