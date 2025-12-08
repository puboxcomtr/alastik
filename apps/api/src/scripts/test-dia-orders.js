// apps/api/src/scripts/test-dia-orders.js
const axios = require('axios');

const DIA_CONFIG = {
    baseURL: process.env.DIA_BASE_URL || 'https://artlastik.ws.dia.com.tr',
    apiKey: process.env.DIA_API_KEY || 'eda23858-0e9b-4a81-b7e2-4c9f03d30078',
    username: process.env.DIA_USERNAME || 'Ws_alastik_B2C',
    password: process.env.DIA_PASSWORD || 'Ws_alastik_B2C',
    firmaKodu: 2,
    donemKodu: 2
};

async function testDiaOrders() {
    try {
        console.log('=== DIA SİPARİŞ KONTROL BAŞLIYOR ===\n');

        // 1. Login
        console.log('1️⃣ DIA Login yapılıyor...');
        const loginResponse = await axios.post(
            `${DIA_CONFIG.baseURL}/api/v3/sis/json`,
            {
                login: {
                    username: DIA_CONFIG.username,
                    password: DIA_CONFIG.password,
                    disconnect_same_user: "True",
                    params: { apikey: DIA_CONFIG.apiKey }
                }
            }
        );

        if (loginResponse.data.code !== "200") {
            console.error('❌ Login başarısız:', loginResponse.data);
            return;
        }

        const sessionId = loginResponse.data.msg;
        console.log('✅ Login başarılı\n');

        // 2. Sipariş Listesini Çek (ÖNCE LİSTE)
        console.log('2️⃣ Siparişler çekiliyor...');
        const ordersListResponse = await axios.post(
            `${DIA_CONFIG.baseURL}/api/v3/scf/json`,
            {
                scf_siparis_listele: {
                    session_id: sessionId,
                    firma_kodu: DIA_CONFIG.firmaKodu,
                    donem_kodu: DIA_CONFIG.donemKodu,
                    filters: [],
                    sorts: [{ field: "tarih", sorttype: "DESC" }],
                    params: {},
                    limit: 5,
                    offset: 0
                }
            }
        );

        if (ordersListResponse.data.code !== "200") {
            console.error('❌ Sipariş listesi çekme başarısız:', ordersListResponse.data);
            return;
        }

        const ordersList = ordersListResponse.data.result || [];
        console.log(`✅ Toplam ${ordersList.length} sipariş bulundu\n`);

        if (ordersList.length === 0) {
            console.log('ℹ️ DIA\'da hiç sipariş kaydı yok\n');
            return;
        }

        // 3. Siparişleri Özet Göster
        console.log('=== SİPARİŞ LİSTESİ ===\n');
        ordersList.forEach((order, index) => {
            console.log(`${index + 1}. Sipariş:`);
            console.log(`   Fiş No: ${order.fisno || 'Yok'}`);
            console.log(`   Tarih: ${order.tarih || 'Yok'}`);
            console.log(`   Müşteri: ${order.__cariunvan || 'Yok'}`);
            console.log(`   Toplam: ${order.net || 0} TL`);
            console.log(`   Key: ${order._key}`);
            console.log('');
        });

        // 4. İlk Siparişin DETAYINI Çek (ÜRÜNLERLE BİRLİKTE)
        console.log('\n3️⃣ İlk siparişin detayı çekiliyor...\n');
        const orderDetailResponse = await axios.post(
            `${DIA_CONFIG.baseURL}/api/v3/scf/json`,
            {
                scf_siparis_getir: {
                    session_id: sessionId,
                    firma_kodu: DIA_CONFIG.firmaKodu,
                    donem_kodu: DIA_CONFIG.donemKodu,
                    key: parseInt(ordersList[0]._key) // İLK SİPARİŞİN KEY'İ
                }
            }
        );

        if (orderDetailResponse.data.code !== "200") {
            console.error('❌ Sipariş detayı çekme başarısız:', orderDetailResponse.data);
            return;
        }

        const orderDetail = orderDetailResponse.data.result;
        
        // 5. Ürünleri Göster
        if (orderDetail.m_kalemler && orderDetail.m_kalemler.length > 0) {
            console.log('=== SİPARİŞ ÜRÜNLERİ ===\n');
            orderDetail.m_kalemler.forEach((kalem, idx) => {
                console.log(`${idx + 1}. Ürün:`);
                console.log(`   Stok Kodu: ${kalem._key_kalemturu?.stokkartkodu || 'Yok'}`);
                console.log(`   Açıklama: ${kalem._key_kalemturu?.aciklama || 'Yok'}`);
                console.log(`   Miktar: ${kalem.anamiktar || kalem.miktar || 0}`);
                console.log(`   Birim Fiyat: ${kalem.birimfiyati || 0} TL`);
                console.log(`   Tutar: ${kalem.tutari || 0} TL`);
                console.log(`   KDV: %${kalem.kdv || 0}`);
                console.log(`   KDV Tutarı: ${kalem.kdvtutari || 0} TL`);
                console.log('');
            });
            
            console.log(`Sipariş Toplamı: ${orderDetail.toplam} TL`);
            console.log(`KDV Toplamı: ${orderDetail.toplamkdv} TL`);
            console.log(`Genel Toplam: ${orderDetail.net} TL\n`);
        } else {
            console.log('⚠️ Sipariş detayında ürün bulunamadı\n');
        }

        console.log('=== TEST TAMAMLANDI ===');

    } catch (error) {
        console.error('❌ Hata oluştu:', error.message);
        if (error.response) {
            console.error('Yanıt:', error.response.data);
        }
    }
}

testDiaOrders();