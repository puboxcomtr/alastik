/**
 * Lastik ürünleri için sahte yorum oluşturma scripti
 * Çalıştır: node apps/api/src/scripts/products/generateReviews.js
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin';
const USER_ID = '69737e403c1cdbe6de298b68';

// ============================================
// TÜRK İSİM HAVUZU
// ============================================
const firstNames = [
    'Ahmet', 'Mehmet', 'Ali', 'Mustafa', 'Hasan', 'Hüseyin', 'İbrahim', 'Ömer',
    'Burak', 'Emre', 'Fatih', 'Serkan', 'Murat', 'Oğuz', 'Cenk', 'Tolga',
    'Gökhan', 'Cem', 'Onur', 'Kerem', 'Barış', 'Volkan', 'Taner', 'Uğur',
    'Hakan', 'Selim', 'Yusuf', 'Okan', 'Erkan', 'Koray', 'Berk', 'Kaan',
    'Deniz', 'Arda', 'Furkan', 'Enes', 'Yasin', 'Caner', 'Erdem', 'Umut',
    'Tuncay', 'Sinan', 'Halil', 'Recep', 'Orhan', 'Levent', 'Adem', 'Süleyman',
    'Kadir', 'Ferhat', 'Soner', 'Alper', 'Serdar', 'Engin', 'Taylan', 'Bilal',
    'Ayşe', 'Fatma', 'Elif', 'Zeynep', 'Merve', 'Seda', 'Esra', 'Derya',
    'Sibel', 'Gamze', 'Pınar', 'Özlem', 'Canan', 'Tuğba', 'Büşra', 'Betül',
    'Emine', 'Hatice', 'Sevgi', 'Gülşen', 'Dilek', 'Aslı', 'Ebru', 'Nurgül',
    'Sevda', 'Meltem', 'Burcu', 'İrem', 'Yasemin', 'Nilüfer', 'Gözde', 'Sinem',
    'Ramazan', 'Osman', 'Ertuğrul', 'Turgut', 'Şenol', 'Rıza', 'Necati', 'Gülay'
];

const lastNames = [
    'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Yıldırım', 'Öztürk',
    'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara',
    'Koç', 'Kurt', 'Özkan', 'Şimşek', 'Polat', 'Korkmaz', 'Çakır', 'Erdoğan',
    'Akın', 'Aksoy', 'Bulut', 'Güneş', 'Tekin', 'Uçar', 'Acar', 'Taş',
    'Türk', 'Sarı', 'Bayram', 'Kaplan', 'Güler', 'Karaca', 'Aktaş', 'Tuncer',
    'Sönmez', 'Durmaz', 'Karakaya', 'Keskin', 'Ünal', 'Bozkurt', 'Ateş', 'Karagöz',
    'Çiftçi', 'Toprak', 'Eroğlu', 'Genç', 'Ceylan', 'Bal', 'Pala', 'Koçak',
    'Ekinci', 'Duman', 'Başaran', 'Yalçın', 'Sezer', 'Tan', 'Özer', 'Çolak',
    'Uysal', 'Karataş', 'Gündüz', 'Avcı', 'Işık', 'Elmas', 'Baran', 'Uslu'
];

// ============================================
// YORUM HAVUZU (comment DB'de zorunlu, frontend'de gizlenecek)
// ============================================
const commentPool = [
    'Yol tutuşu gayet iyi, yağmurda bile güven veriyor.',
    'Fiyat performans açısından oldukça memnunum.',
    'Sessiz ve konforlu bir lastik, tavsiye ederim.',
    'Kuru zeminde mükemmel performans gösteriyor.',
    'Uzun yol konforunda çok başarılı buldum.',
    'Frenleme mesafesi kısa, güvenli hissettiriyor.',
    'Yakıt tüketiminde gözle görülür iyileşme oldu.',
    'Islak zeminde bile yol tutuşu tatmin edici.',
    'Gürültü seviyesi düşük, şehir içi kullanımda ideal.',
    'Aracıma taktığımdan beri sürüş keyfi arttı.',
    'Kaliteli bir lastik, fiyatına göre çok iyi.',
    'Virajlarda güven veriyor, yol tutuşu sağlam.',
    'Yumuşak yapısı sayesinde yol tutuşu çok iyi.',
    'Hem şehir içi hem uzun yolda başarılı.',
    'Aşınma direnci yüksek, uzun ömürlü bir lastik.',
    'Sürüş konforu beklentimin üzerinde çıktı.',
    'Islak yolda frenleme performansı tatmin edici.',
    'Sessiz yapısıyla uzun yolda konfor sağlıyor.',
    'Genel olarak memnunum, tekrar tercih ederim.',
    'Daha önce farklı marka kullanıyordum, bu daha iyi.'
];

// ============================================
// HELPER FONKSİYONLAR
// ============================================
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateDisplayName() {
    return `${randomItem(firstNames)} ${randomItem(lastNames)}`;
}

// 3-5 arası ağırlıklı rating
function generateRating() {
    const rand = Math.random();
    if (rand < 0.45) return 5;
    if (rand < 0.80) return 4;
    return 3;
}

// 7 alanın ortalaması 3-5 arası olacak şekilde rating seti üret
function generateRatingSet() {
    let ratings;
    do {
        ratings = {
            overallRating: generateRating(),
            drivingComfort: generateRating(),
            noise: generateRating(),
            braking: generateRating(),
            quality: generateRating(),
            fuelEfficiency: generateRating(),
            wetGrip: generateRating()
        };
        const values = Object.values(ratings);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        if (avg >= 3 && avg <= 5) return ratings;
    } while (true);
}

function generateOrderDate() {
    const now = Date.now();
    const sixMonthsAgo = now - (180 * 24 * 60 * 60 * 1000);
    return new Date(randomInt(sixMonthsAgo, now));
}

// ============================================
// ANA FONKSİYON
// ============================================
async function run() {
    try {
        console.log('MongoDB bağlantısı kuruluyor...');
        await mongoose.connect(MONGODB_URI);
        console.log('MongoDB bağlantısı başarılı.');

        const db = mongoose.connection.db;
        const webproducts = db.collection('webproducts');
        const webreviews = db.collection('webreviews');

        // 1. Mevcut yorumları sil
        const deleteResult = await webreviews.deleteMany({});
        console.log(`${deleteResult.deletedCount} mevcut yorum silindi.`);

        // 2. Tüm lastik ürünlerini çek
        const products = await webproducts.find({
            'diaData.ozelkod7kodu': 'LASTİK'
        }).project({
            _key: 1,
            'diaData.ozelkod3kodu': 1
        }).toArray();

        console.log(`${products.length} lastik ürünü bulundu.`);

        if (products.length === 0) {
            console.log('Lastik ürünü bulunamadı, çıkılıyor.');
            process.exit(0);
        }

        // 3. Yorumları oluştur
        const userId = new mongoose.Types.ObjectId(USER_ID);
        let totalReviews = 0;
        const bulkReviews = [];
        const bulkStats = [];

        for (const product of products) {
            const reviewCount = randomInt(1, 3);
            const tireSize = product.diaData?.ozelkod3kodu || '-';
            const overallRatings = [];

            for (let i = 0; i < reviewCount; i++) {
                const ratingSet = generateRatingSet();
                overallRatings.push(ratingSet.overallRating);

                bulkReviews.push({
                    insertOne: {
                        document: {
                            productKey: product._key,
                            userId: userId,
                            displayName: generateDisplayName(),
                            orderDate: generateOrderDate(),
                            ...ratingSet,
                            comment: randomItem(commentPool),
                            source: 'ALastik',
                            tireSize: tireSize,
                            mileage: randomInt(5, 80) * 1000,
                            status: 'active',
                            createdAt: generateOrderDate(),
                            updatedAt: new Date()
                        }
                    }
                });
            }

            // reviewStats hesapla
            const avg = overallRatings.reduce((a, b) => a + b, 0) / overallRatings.length;
            bulkStats.push({
                updateOne: {
                    filter: { _key: product._key },
                    update: {
                        $set: {
                            'customData.reviewStats.averageRating': parseFloat(avg.toFixed(1)),
                            'customData.reviewStats.reviewCount': reviewCount
                        }
                    }
                }
            });

            totalReviews += reviewCount;
        }

        // 4. Toplu yorum ekle
        console.log(`${totalReviews} yorum oluşturuluyor...`);
        const batchSize = 1000;
        for (let i = 0; i < bulkReviews.length; i += batchSize) {
            const batch = bulkReviews.slice(i, i + batchSize);
            await webreviews.bulkWrite(batch);
            console.log(`Yorum batch ${Math.floor(i / batchSize) + 1}: ${batch.length} yorum eklendi.`);
        }

        // 5. reviewStats güncelle
        console.log('reviewStats güncelleniyor...');
        for (let i = 0; i < bulkStats.length; i += batchSize) {
            const batch = bulkStats.slice(i, i + batchSize);
            await webproducts.bulkWrite(batch);
            console.log(`Stats batch ${Math.floor(i / batchSize) + 1}: ${batch.length} ürün güncellendi.`);
        }

        console.log('----------------------------');
        console.log(`Toplam ${products.length} ürüne ${totalReviews} yorum oluşturuldu.`);
        console.log('reviewStats güncellendi.');
        console.log('İşlem tamamlandı.');

        process.exit(0);
    } catch (err) {
        console.error('Hata:', err);
        process.exit(1);
    }
}

run();