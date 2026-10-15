const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const WebMontagePoint = require('../../../models/web/content/WebMontagePoint');
const MediaService = require('../../../services/web/MediaService');
const AddressCity = require('../../../models/web/address/AddressCity');
const AddressDistrict = require('../../../models/web/address/AddressDistrict');
const WebMontageCommission = require('../../../models/web/content/WebMontageCommission');
const { KDV_ORANI, kdvEklenirMi, komisyonOnbellekTemizle } = require('../../../utils/montagePricing');

const excelUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

const ALLOWED_AMENITIES = ['wc', 'waiting_room', 'wifi', 'air_conditioning', 'refreshments', 'oil_change', 'headlight_check'];
const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Gün bazlı çalışma saatlerini normalize et (HH:MM dışındaki değerler boşa çekilir)
const cleanSchedule = (schedule) => {
    const isTime = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || ''));
    return WEEK_DAYS.reduce((acc, day) => {
        const d = schedule?.[day] || {};
        acc[day] = {
            open: isTime(d.open) ? d.open : '',
            close: isTime(d.close) ? d.close : ''
        };
        return acc;
    }, {});
};

// Hizmet ürünlerinin geldiği katalog kategorisi
const SERVICE_CATEGORY = 'Hizmetlerimiz';

// Hizmet listesini normalize et (price null/boş ise varsayılan fiyat geçerli)
const cleanServices = (services) =>
    Array.isArray(services)
        ? services
            .map(s => ({
                productKey: String(s?.productKey || '').trim(),
                sku: String(s?.sku || '').trim(),
                name: String(s?.name || '').trim(),
                defaultPrice: Number(s?.defaultPrice) || 0,
                price: s?.price === null || s?.price === undefined || s?.price === ''
                    ? null
                    : (Number(s.price) || 0)
            }))
            .filter(s => s.name)
        : [];

const cleanAmenities = (amenities) =>
    Array.isArray(amenities) ? amenities.filter(a => ALLOWED_AMENITIES.includes(a)) : [];

// Sözleşme/evrak listesini normalize et (ad ve url zorunlu)
const cleanDocuments = (documents) =>
    Array.isArray(documents)
        ? documents
            .map(d => ({
                name: String(d?.name || '').trim() || String(d?.originalName || '').trim(),
                url: String(d?.url || '').trim(),
                originalName: String(d?.originalName || '').trim(),
                uploadedAt: d?.uploadedAt ? new Date(d.uploadedAt) : new Date()
            }))
            .filter(d => d.name && d.url)
        : [];

const cleanRating = (value) => Math.min(5, Math.max(1, Number(value) || 5));

const cleanReviews = (reviews) =>
    Array.isArray(reviews)
        ? reviews
            .map(r => ({
                // Panelden eklenen yorumlarda üye "sistem" olarak geçer
                memberName: String(r?.memberName || '').trim() || 'sistem',
                comment: String(r?.comment || '').trim(),
                processRating: cleanRating(r?.processRating),
                locationRating: cleanRating(r?.locationRating),
                // Tarih otomatik: mevcut yorumun tarihi korunur, yenisine şimdi atanır
                createdAt: r?.createdAt ? new Date(r.createdAt) : new Date()
            }))
            .filter(r => r.comment)
        : [];

// Görsel yükleme - POST /admin/montage/upload
router.post('/upload', MediaService.createUploader('montage', 'image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Görsel dosyası yüklenmedi' });
        }

        const url = MediaService.getFileUrl('montage', req.file.filename);

        res.json({ success: true, data: { url } });
    } catch (error) {
        console.error('Montaj görseli yükleme hatası:', error);
        res.status(500).json({ success: false, message: 'Görsel yüklenemedi' });
    }
});

// Sözleşme/evrak yükleme - POST /admin/montage/upload-document
router.post('/upload-document', MediaService.createUploader('montageDocument', 'document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Evrak dosyası yüklenmedi' });
        }

        const url = MediaService.getFileUrl('montageDocument', req.file.filename);

        // Orijinal dosya adı latin1 gelebilir; Türkçe karakterler için utf8'e çevir
        const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

        res.json({ success: true, data: { url, originalName } });
    } catch (error) {
        console.error('Montaj evrakı yükleme hatası:', error);
        res.status(500).json({ success: false, message: 'Evrak yüklenemedi' });
    }
});

const DOCUMENT_URL_PREFIX = '/montage-docs/';

const DOCUMENT_MIME_TYPES = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
};

// Evraklar private dizindedir; yalnızca bu auth'lu endpoint ile okunur
// GET /admin/montage/document-file?file=/montage-docs/dosya.pdf
router.get('/document-file', async (req, res) => {
    try {
        const path = require('path');
        const fs = require('fs');
        const { getUploadDir } = require('../../../config/media');

        const fileUrl = String(req.query.file || '');
        if (!fileUrl.startsWith(DOCUMENT_URL_PREFIX)) {
            return res.status(400).json({ success: false, message: 'Geçersiz evrak adresi' });
        }

        // Path traversal engeli: yalnızca dosya adı kullanılır
        const filename = path.basename(fileUrl);
        const fullPath = path.join(getUploadDir('montageDocument'), filename);

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ success: false, message: 'Evrak bulunamadı' });
        }

        const ext = path.extname(filename).toLowerCase();

        res.json({
            success: true,
            data: {
                filename,
                mime: DOCUMENT_MIME_TYPES[ext] || 'application/octet-stream',
                base64: fs.readFileSync(fullPath).toString('base64')
            }
        });
    } catch (error) {
        console.error('Montaj evrakı okuma hatası:', error);
        res.status(500).json({ success: false, message: 'Evrak okunamadı' });
    }
});

// Kayıttan çıkarılan evrak dosyalarını diskten siler
const removeDeletedDocumentFiles = (oldDocuments, newDocuments) => {
    const kept = new Set((newDocuments || []).map(d => d.url));
    (oldDocuments || [])
        .filter(d => d.url && d.url.startsWith(DOCUMENT_URL_PREFIX) && !kept.has(d.url))
        .forEach(d => MediaService.deleteFile(d.url));
};

// Liste - GET /admin/montaj (seçili sitenin montaj noktaları)
router.get('/', async (req, res) => {
    try {
        const { search, city, isActive } = req.query;

        const filter = { site: req.site };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { city: { $regex: search, $options: 'i' } },
                { district: { $regex: search, $options: 'i' } }
            ];
        }

        if (city) filter.city = city;
        if (isActive !== undefined && isActive !== '') {
            filter.isActive = isActive === 'true';
        }

        const points = await WebMontagePoint.find(filter)
            .sort({ city: 1, order: 1, name: 1 })
            .lean();

        res.json({ success: true, data: points });
    } catch (error) {
        console.error('Montaj noktası listesi hatası:', error);
        res.status(500).json({ success: false, message: 'Montaj noktaları yüklenemedi' });
    }
});

// Hizmet ürünleri - GET /admin/montage/service-products
// "Hizmetlerimiz" kategorisindeki ürünleri döner.
// Hizmet fiyatları siteler arasında ortaktır; sync kuralları (ozelkod11) hizmetleri
// alastik sites dizisinden düşürebildiği için burada site filtresi uygulanmaz.
router.get('/service-products', async (req, res) => {
    try {
        const { search } = req.query;
        const db = require('mongoose').connection.db;

        const query = {
            'diaData.durum': 'A',
            'diaData.m_kategoriler.kategori_aciklama_1': SERVICE_CATEGORY
        };

        if (search) {
            query.$or = [
                { 'diaData.aciklama': { $regex: search, $options: 'i' } },
                { 'diaData.stokkartkodu': { $regex: search, $options: 'i' } }
            ];
        }

        const products = await db.collection('webproducts')
            .find(query, {
                projection: {
                    _key: 1,
                    'diaData.stokkartkodu': 1,
                    'diaData.aciklama': 1,
                    'diaData.m_birimler': 1,
                    'customData.webPrice': 1
                }
            })
            .sort({ 'diaData.aciklama': 1 })
            .limit(200)
            .toArray();

        const data = products.map(p => {
            const unit = p.diaData?.m_birimler?.[0] || {};
            const defaultPrice = p.customData?.webPrice || unit.fiyat4 || unit.fiyat1 || 0;

            return {
                productKey: p._key,
                sku: p.diaData?.stokkartkodu || '',
                name: p.diaData?.aciklama || p.diaData?.stokkartkodu || '',
                defaultPrice: Math.round(Number(defaultPrice) * 100) / 100
            };
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error('Hizmet ürünleri hatası:', error);
        res.status(500).json({ success: false, message: 'Hizmet ürünleri yüklenemedi' });
    }
});

// ---------------------------------------------------------------------------
// Excel içe aktarma (bayi/montaj noktası toplu yükleme)
// ---------------------------------------------------------------------------

const IMPORT_HEADERS = [
    'Bayi Adı', 'İl', 'İlçe', 'Adres', 'Telefon',
    'Hafta İçi Açılış', 'Hafta İçi Kapanış',
    'Cumartesi Açılış', 'Cumartesi Kapanış',
    'Pazar Açılış', 'Pazar Kapanış',
    'Hizmetler', 'Olanaklar', 'Enlem', 'Boylam', 'Sıra', 'Aktif'
];

// Başlık → alan eşlemesi (normalize edilmiş halleriyle)
const HEADER_FIELDS = {
    'bayi adı': 'name', 'il': 'city', 'ilçe': 'district', 'adres': 'address', 'telefon': 'phone',
    'hafta içi açılış': 'weekdayOpen', 'hafta içi kapanış': 'weekdayClose',
    'cumartesi açılış': 'saturdayOpen', 'cumartesi kapanış': 'saturdayClose',
    'pazar açılış': 'sundayOpen', 'pazar kapanış': 'sundayClose',
    'hizmetler': 'services', 'olanaklar': 'amenities',
    'enlem': 'lat', 'boylam': 'lng', 'sıra': 'order', 'aktif': 'isActive'
};

// Olanaklar: Türkçe etiket veya anahtar kabul edilir
const AMENITY_ALIASES = {
    'wc': 'wc', 'wc (kadın/erkek)': 'wc',
    'bekleme salonu': 'waiting_room', 'waiting_room': 'waiting_room',
    'wifi': 'wifi', 'wi-fi': 'wifi',
    'klima': 'air_conditioning', 'air_conditioning': 'air_conditioning',
    'ikram': 'refreshments', 'refreshments': 'refreshments',
    'yağ değişimi': 'oil_change', 'oil_change': 'oil_change',
    'far kontrol': 'headlight_check', 'far kontrolü': 'headlight_check', 'headlight_check': 'headlight_check'
};

// Türkçe duyarlı normalize (İ→i, büyük/küçük harf ve boşluk toleransı)
const trNorm = (v) => String(v ?? '')
    .replace(/İ/g, 'i').replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// Telefonu +90 XXX XXX XX XX biçimine çevirir; geçersizse null
const normalizePhone = (value) => {
    if (!String(value || '').trim()) return '';
    let digits = String(value).replace(/\D/g, '').replace(/^0+/, '');
    if (digits.startsWith('90')) digits = digits.slice(2);
    digits = digits.replace(/^0+/, '');
    if (digits.length !== 10) return null;
    return `+90 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
};

// "9:00" / "09:00" / "09:00:00" → "09:00"; geçersizse null
const normalizeTime = (value) => {
    const s = String(value || '').trim();
    if (!s) return '';
    const m = s.match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?$/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
};

// Türkçe/İngilizce sayı biçimlerini çözer ("1.500,50", "1.500", "37.0017", "37,0017")
const parseImportNumber = (value) => {
    const s = String(value ?? '').trim();
    if (!s) return null;
    let normalized = s;
    if (s.includes('.') && s.includes(',')) {
        normalized = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
        normalized = s.replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
        normalized = s.replace(/\./g, '');
    }
    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
};

// Aktif hizmet ürünlerini SKU ve ada göre eşleme tablosu olarak döner
const loadServiceCatalog = async () => {
    const db = require('mongoose').connection.db;
    const products = await db.collection('webproducts')
        .find(
            { 'diaData.durum': 'A', 'diaData.m_kategoriler.kategori_aciklama_1': SERVICE_CATEGORY },
            { projection: { _key: 1, 'diaData.stokkartkodu': 1, 'diaData.aciklama': 1, 'diaData.m_birimler': 1, 'customData.webPrice': 1 } }
        )
        .sort({ 'diaData.aciklama': 1 })
        .toArray();

    const catalog = products.map(p => {
        const unit = p.diaData?.m_birimler?.[0] || {};
        const defaultPrice = p.customData?.webPrice || unit.fiyat4 || unit.fiyat1 || 0;
        return {
            productKey: p._key,
            sku: p.diaData?.stokkartkodu || '',
            name: p.diaData?.aciklama || p.diaData?.stokkartkodu || '',
            defaultPrice: Math.round(Number(defaultPrice) * 100) / 100
        };
    });

    const bySku = new Map();
    const byName = new Map();
    catalog.forEach(s => {
        if (s.sku) bySku.set(trNorm(s.sku), s);
        if (s.name) byName.set(trNorm(s.name), s);
    });

    return { catalog, bySku, byName };
};

// Excel satırlarını doğrulanmış montaj noktası kayıtlarına çevirir
const parseImportRows = async (buffer, site) => {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) throw new Error('Excel dosyasında sayfa bulunamadı');

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    if (rows.length < 2) throw new Error('Dosyada başlık satırı dışında veri bulunamadı');

    // Başlık satırından kolon eşlemesi çıkar
    const colField = {};
    (rows[0] || []).forEach((cell, idx) => {
        const field = HEADER_FIELDS[trNorm(cell)];
        if (field) colField[idx] = field;
    });
    if (!Object.values(colField).includes('name') || !Object.values(colField).includes('city')) {
        throw new Error('Başlık satırında "Bayi Adı" ve "İl" sütunları bulunamadı — şablonu kullanın');
    }

    // Referans veriler
    const [cities, districts, serviceCatalog] = await Promise.all([
        AddressCity.find().lean(),
        AddressDistrict.find().lean(),
        loadServiceCatalog()
    ]);
    const cityByName = new Map(cities.map(c => [trNorm(c.cityName), c]));
    const districtsByCity = new Map();
    districts.forEach(d => {
        const key = String(d.cityId);
        if (!districtsByCity.has(key)) districtsByCity.set(key, new Map());
        districtsByCity.get(key).set(trNorm(d.districtName), d);
    });

    const existing = await WebMontagePoint.find({ site }, { name: 1 }).lean();
    const existingNames = new Set(existing.map(p => trNorm(p.name)));
    const seenInFile = new Set();

    const results = [];

    for (let r = 1; r < rows.length; r++) {
        const raw = {};
        (rows[r] || []).forEach((cell, idx) => {
            if (colField[idx]) raw[colField[idx]] = String(cell ?? '').trim();
        });

        // Tamamen boş satırları atla
        if (!Object.values(raw).some(v => v)) continue;

        const errors = [];
        const warnings = [];
        const doc = { site };

        // Bayi adı + mükerrer kontrolü
        doc.name = raw.name || '';
        if (!doc.name) errors.push('Bayi Adı boş olamaz');
        const nameKey = trNorm(doc.name);
        let duplicate = false;
        if (doc.name && existingNames.has(nameKey)) {
            duplicate = true;
            warnings.push('Bu isimde kayıt zaten mevcut, satır atlanacak');
        } else if (doc.name && seenInFile.has(nameKey)) {
            duplicate = true;
            warnings.push('Aynı isim dosyada birden fazla kez geçiyor, ilk satır esas alınacak');
        }
        if (doc.name) seenInFile.add(nameKey);

        // İl / ilçe (adres veritabanıyla eşleşmeli)
        const cityDoc = cityByName.get(trNorm(raw.city));
        if (!raw.city) {
            errors.push('İl boş olamaz');
        } else if (!cityDoc) {
            errors.push(`İl bulunamadı: "${raw.city}"`);
        } else {
            doc.city = cityDoc.cityName;
            doc.cityId = String(cityDoc.cityId);
        }
        doc.district = '';
        doc.districtId = '';
        if (raw.district && cityDoc) {
            const districtDoc = districtsByCity.get(String(cityDoc.cityId))?.get(trNorm(raw.district));
            if (!districtDoc) {
                errors.push(`İlçe bulunamadı: "${raw.district}" (${cityDoc.cityName})`);
            } else {
                doc.district = districtDoc.districtName;
                doc.districtId = String(districtDoc.districtId);
            }
        }

        doc.address = raw.address || '';

        // Telefon
        const phone = normalizePhone(raw.phone);
        if (phone === null) {
            errors.push(`Telefon geçersiz: "${raw.phone}" (10 haneli olmalı)`);
        } else {
            doc.phone = phone;
        }

        // Çalışma saatleri: hafta içi Pzt-Cum'a uygulanır
        doc.workingSchedule = WEEK_DAYS.reduce((acc, day) => {
            acc[day] = { open: '', close: '' };
            return acc;
        }, {});
        const applySchedule = (label, openRaw, closeRaw, days) => {
            const open = normalizeTime(openRaw);
            const close = normalizeTime(closeRaw);
            if (open === null || close === null) {
                errors.push(`${label} saati geçersiz (SS:DD biçiminde olmalı)`);
                return;
            }
            if ((open && !close) || (!open && close)) {
                errors.push(`${label} için açılış ve kapanış birlikte girilmeli`);
                return;
            }
            if (open && close) days.forEach(d => { doc.workingSchedule[d] = { open, close }; });
        };
        applySchedule('Hafta içi', raw.weekdayOpen, raw.weekdayClose, ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
        applySchedule('Cumartesi', raw.saturdayOpen, raw.saturdayClose, ['saturday']);
        applySchedule('Pazar', raw.sundayOpen, raw.sundayClose, ['sunday']);

        // Hizmetler: "SKU" / "Hizmet Adı", istenirse ":fiyat" ile manuel fiyat
        doc.services = [];
        if (raw.services) {
            // Virgülle böl; "X:1.500,50" gibi Türkçe ondalıklarda ",50" parçasını öncekiyle birleştir
            const tokens = [];
            raw.services.split(',').map(t => t.trim()).filter(Boolean).forEach(part => {
                const prev = tokens[tokens.length - 1];
                if (/^\d{1,2}$/.test(part) && prev && prev.includes(':')) {
                    tokens[tokens.length - 1] = `${prev},${part}`;
                } else {
                    tokens.push(part);
                }
            });
            tokens.forEach(token => {
                let key = token;
                let manualPrice = null;
                const colonIdx = token.lastIndexOf(':');
                if (colonIdx > 0) {
                    const pricePart = token.slice(colonIdx + 1).trim();
                    const parsed = parseImportNumber(pricePart);
                    if (parsed !== null) {
                        key = token.slice(0, colonIdx).trim();
                        manualPrice = parsed;
                    }
                }
                const service = serviceCatalog.bySku.get(trNorm(key)) || serviceCatalog.byName.get(trNorm(key));
                if (!service) {
                    errors.push(`Hizmet bulunamadı: "${key}"`);
                    return;
                }
                if (doc.services.some(s => s.productKey === service.productKey)) {
                    warnings.push(`Hizmet tekrarı yok sayıldı: "${service.name}"`);
                    return;
                }
                doc.services.push({ ...service, price: manualPrice });
            });
        }

        // Olanaklar: bilinmeyen değerler uyarıyla atlanır
        doc.amenities = [];
        if (raw.amenities) {
            raw.amenities.split(',').map(t => t.trim()).filter(Boolean).forEach(token => {
                const amenity = AMENITY_ALIASES[trNorm(token)];
                if (!amenity) {
                    warnings.push(`Bilinmeyen olanak yok sayıldı: "${token}"`);
                } else if (!doc.amenities.includes(amenity)) {
                    doc.amenities.push(amenity);
                }
            });
        }

        // Konum
        doc.location = { lat: null, lng: null };
        if (raw.lat || raw.lng) {
            const lat = parseImportNumber(raw.lat);
            const lng = parseImportNumber(raw.lng);
            if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
                errors.push('Enlem/Boylam geçersiz (ikisi birlikte ve sayısal olmalı)');
            } else {
                doc.location = { lat, lng };
            }
        }

        // Sıra + aktiflik
        doc.order = raw.order ? (parseImportNumber(raw.order) ?? 0) : 0;
        const activeNorm = trNorm(raw.isActive);
        doc.isActive = !['hayır', 'hayir', 'no', 'false', '0', 'pasif'].includes(activeNorm);

        results.push({
            row: r + 1,
            doc,
            status: errors.length ? 'error' : (duplicate ? 'skip' : 'ok'),
            errors,
            warnings
        });
    }

    if (!results.length) throw new Error('Dosyada okunabilir veri satırı bulunamadı');

    return results;
};

// Şablon - GET /admin/montage/import/template (base64 xlsx döner)
router.get('/import/template', async (req, res) => {
    try {
        const { catalog } = await loadServiceCatalog();

        const wb = XLSX.utils.book_new();

        const exampleRow = [
            'Yılmaz Oto Lastik', 'Adana', 'Seyhan', 'Atatürk Cad. No:12', '0532 741 12 98',
            '09:00', '20:00', '09:00', '18:00', '', '',
            catalog.slice(0, 2).map(s => s.sku).filter(Boolean).join(', '),
            'WC, WiFi, Klima', '37.0017', '35.3289', '10', 'Evet'
        ];
        const mainSheet = XLSX.utils.aoa_to_sheet([IMPORT_HEADERS, exampleRow]);
        mainSheet['!cols'] = IMPORT_HEADERS.map(h => ({ wch: Math.max(h.length + 2, 14) }));
        XLSX.utils.book_append_sheet(wb, mainSheet, 'Bayiler');

        // Yardımcı sayfa: geçerli hizmet listesi (SKU ile eşleştirme için)
        const serviceRows = [['SKU', 'Hizmet Adı', 'Varsayılan Fiyat (TL)']]
            .concat(catalog.map(s => [s.sku, s.name, s.defaultPrice]));
        const serviceSheet = XLSX.utils.aoa_to_sheet(serviceRows);
        serviceSheet['!cols'] = [{ wch: 14 }, { wch: 70 }, { wch: 22 }];
        XLSX.utils.book_append_sheet(wb, serviceSheet, 'Hizmet Listesi');

        // Yardımcı sayfa: geçerli olanak değerleri
        const amenityRows = [['Olanak (Excel\'e yazılacak değer)']]
            .concat(['WC', 'Bekleme Salonu', 'WiFi', 'Klima', 'İkram', 'Yağ Değişimi', 'Far Kontrol'].map(a => [a]));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(amenityRows), 'Olanaklar');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.json({
            success: true,
            data: {
                filename: 'montaj-noktalari-sablon.xlsx',
                base64: buffer.toString('base64')
            }
        });
    } catch (error) {
        console.error('Montaj şablonu oluşturma hatası:', error);
        res.status(500).json({ success: false, message: 'Şablon oluşturulamadı' });
    }
});

// İçe aktar - POST /admin/montage/import (confirm=1 ile kayıt, yoksa önizleme)
router.post('/import', excelUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Excel dosyası yüklenmedi' });
        }

        const results = await parseImportRows(req.file.buffer, req.site);
        const confirm = String(req.query.confirm || req.body?.confirm || '') === '1';

        const summary = {
            total: results.length,
            ok: results.filter(r => r.status === 'ok').length,
            skip: results.filter(r => r.status === 'skip').length,
            error: results.filter(r => r.status === 'error').length
        };

        const rows = results.map(r => ({
            row: r.row,
            name: r.doc.name,
            city: r.doc.city || '',
            district: r.doc.district || '',
            serviceCount: r.doc.services?.length || 0,
            status: r.status,
            errors: r.errors,
            warnings: r.warnings
        }));

        if (!confirm) {
            return res.json({ success: true, data: { preview: true, summary, rows } });
        }

        const toInsert = results.filter(r => r.status === 'ok').map(r => r.doc);
        if (toInsert.length) await WebMontagePoint.insertMany(toInsert);

        res.json({
            success: true,
            message: `${toInsert.length} montaj noktası içe aktarıldı`,
            data: { preview: false, summary: { ...summary, imported: toInsert.length }, rows }
        });
    } catch (error) {
        console.error('Montaj içe aktarma hatası:', error);
        res.status(400).json({ success: false, message: error.message || 'İçe aktarma başarısız' });
    }
});

// Komisyon oranları (seçili site) — GET/PUT /admin/montage/commission
// Anlaşmalı noktanın girdiği fiyatın üstüne eklenir; kendi şubelerimize (showPublicInfo) uygulanmaz.
router.get('/commission', async (req, res) => {
    try {
        const doc = await WebMontageCommission.findOne({ site: req.site }).lean();
        res.json({ success: true, data: { degisim: doc?.degisim || 0, diger: doc?.diger || 0, kdvOrani: KDV_ORANI, kdvEkle: kdvEklenirMi(req.site), updatedAt: doc?.updatedAt || null } });
    } catch (error) {
        console.error('Komisyon oranları alınamadı:', error);
        res.status(500).json({ success: false, message: 'Komisyon oranları alınamadı' });
    }
});

router.put('/commission', async (req, res) => {
    try {
        const oran = (v) => {
            const n = Number(String(v ?? '').replace(',', '.'));
            return Number.isFinite(n) && n >= 0 && n <= 200 ? Math.round(n * 100) / 100 : null;
        };
        const degisim = oran(req.body?.degisim);
        const diger = oran(req.body?.diger);
        if (degisim === null || diger === null) {
            return res.status(400).json({ success: false, message: 'Oranlar 0 ile 200 arasında sayı olmalı' });
        }
        const doc = await WebMontageCommission.findOneAndUpdate(
            { site: req.site },
            { $set: { degisim, diger, updatedBy: String(req.user?.email || req.user?.username || req.user?.name || '') } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).lean();
        komisyonOnbellekTemizle(req.site);
        res.json({ success: true, message: 'Komisyon oranları kaydedildi', data: { degisim: doc.degisim, diger: doc.diger, kdvOrani: KDV_ORANI, kdvEkle: kdvEklenirMi(req.site), updatedAt: doc.updatedAt } });
    } catch (error) {
        console.error('Komisyon oranları kaydedilemedi:', error);
        res.status(500).json({ success: false, message: 'Komisyon oranları kaydedilemedi' });
    }
});

// Bayi bilgi ve fiyat formu kayıtları (herkese açık formdan gelen cevaplar) — /admin/montage/dealer-forms
// '/:id' rotasından ÖNCE bağlanmalıdır.
router.use('/dealer-forms', require('./bayiFormlari'));

// Detay - GET /admin/montage/:id
router.get('/:id', async (req, res) => {
    try {
        const point = await WebMontagePoint.findOne({ _id: req.params.id, site: req.site }).lean();

        if (!point) {
            return res.status(404).json({ success: false, message: 'Montaj noktası bulunamadı' });
        }

        res.json({ success: true, data: point });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Montaj noktası yüklenemedi' });
    }
});

// Oluştur - POST /admin/montaj
router.post('/', async (req, res) => {
    try {
        const {
            name, city, cityId, district, districtId, address, phone, workingHours, workingSchedule,
            services, amenities, image, documents, reviews, location, isActive, order, showPublicInfo
        } = req.body || {};

        if (!name || !name.trim() || !city || !city.trim()) {
            return res.status(400).json({ success: false, message: 'Nokta adı ve il alanları zorunludur' });
        }

        const point = await WebMontagePoint.create({
            site: req.site,
            name: name.trim(),
            city: city.trim(),
            cityId: (cityId || '').trim(),
            district: (district || '').trim(),
            districtId: (districtId || '').trim(),
            address: (address || '').trim(),
            phone: (phone || '').trim(),
            workingHours: (workingHours || '').trim(),
            workingSchedule: cleanSchedule(workingSchedule),
            services: cleanServices(services),
            amenities: cleanAmenities(amenities),
            image: (image || '').trim(),
            documents: cleanDocuments(documents),
            reviews: cleanReviews(reviews),
            location: location || { lat: null, lng: null },
            isActive: isActive !== false,
            showPublicInfo: showPublicInfo === true,
            order: Number(order) || 0
        });

        res.status(201).json({ success: true, message: 'Montaj noktası eklendi', data: point });
    } catch (error) {
        console.error('Montaj noktası ekleme hatası:', error);
        res.status(500).json({ success: false, message: 'Montaj noktası eklenemedi' });
    }
});

// Güncelle - PUT /admin/montaj/:id
router.put('/:id', async (req, res) => {
    try {
        const {
            name, city, cityId, district, districtId, address, phone, workingHours, workingSchedule,
            services, amenities, image, documents, reviews, location, isActive, order, showPublicInfo
        } = req.body || {};

        const point = await WebMontagePoint.findOne({ _id: req.params.id, site: req.site });

        if (!point) {
            return res.status(404).json({ success: false, message: 'Montaj noktası bulunamadı' });
        }

        if (name !== undefined) point.name = name.trim();
        if (city !== undefined) point.city = city.trim();
        if (cityId !== undefined) point.cityId = String(cityId).trim();
        if (district !== undefined) point.district = district.trim();
        if (districtId !== undefined) point.districtId = String(districtId).trim();
        if (address !== undefined) point.address = address.trim();
        if (phone !== undefined) point.phone = phone.trim();
        if (workingHours !== undefined) point.workingHours = workingHours.trim();
        if (workingSchedule !== undefined) point.workingSchedule = cleanSchedule(workingSchedule);
        if (services !== undefined) point.services = cleanServices(services);
        if (amenities !== undefined) point.amenities = cleanAmenities(amenities);
        if (image !== undefined) point.image = String(image).trim();
        if (documents !== undefined) {
            const newDocuments = cleanDocuments(documents);
            removeDeletedDocumentFiles(point.documents, newDocuments);
            point.documents = newDocuments;
        }
        if (reviews !== undefined) point.reviews = cleanReviews(reviews);
        if (location !== undefined) point.location = location;
        if (isActive !== undefined) point.isActive = isActive;
        if (showPublicInfo !== undefined) point.showPublicInfo = showPublicInfo === true;
        if (order !== undefined) point.order = Number(order) || 0;

        await point.save();

        res.json({ success: true, message: 'Montaj noktası güncellendi', data: point });
    } catch (error) {
        console.error('Montaj noktası güncelleme hatası:', error);
        res.status(500).json({ success: false, message: 'Montaj noktası güncellenemedi' });
    }
});

// Aktif/Pasif - PATCH /admin/montaj/:id/toggle
router.patch('/:id/toggle', async (req, res) => {
    try {
        const point = await WebMontagePoint.findOne({ _id: req.params.id, site: req.site });

        if (!point) {
            return res.status(404).json({ success: false, message: 'Montaj noktası bulunamadı' });
        }

        point.isActive = !point.isActive;
        await point.save();

        res.json({
            success: true,
            message: `Montaj noktası ${point.isActive ? 'aktif' : 'pasif'} edildi`,
            data: point
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Durum güncellenemedi' });
    }
});

// Sil - DELETE /admin/montaj/:id
router.delete('/:id', async (req, res) => {
    try {
        const point = await WebMontagePoint.findOneAndDelete({ _id: req.params.id, site: req.site });

        if (!point) {
            return res.status(404).json({ success: false, message: 'Montaj noktası bulunamadı' });
        }

        // Noktaya ait evrak dosyalarını da diskten temizle
        removeDeletedDocumentFiles(point.documents, []);

        res.json({ success: true, message: 'Montaj noktası silindi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Montaj noktası silinemedi' });
    }
});

module.exports = router;

// Script/test kullanımı için (route dışından satır doğrulama)
module.exports.parseImportRows = parseImportRows;
