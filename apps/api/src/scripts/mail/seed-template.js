/**
 * Mail şablonu DB'ye ekleme/güncelleme scripti
 * Kullanım: node seed-template.js
 *
 * Bu dosyayı her şablon için kopyalayıp template verisini değiştir,
 * sonra çalıştır.
 */

const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')

const MONGO_URI = 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin'

// =============================================
// ŞABLON BİLGİLERİ - HER YENİ ŞABLON İÇİN BURAYI DÜZENLE
// =============================================
const TEMPLATE = {
    templateKey: 'havale_bildirim_formu',
    name: 'Havale Bildirim Formu',
    category: 'genel',
    categoryName: 'Genel',
    contentFile: 'havale-bildirim-formu.html',
    order: 4,
    isActive: true
}
// =============================================

const WebMailTemplate = require('../../models/admin/mail/Template')

const run = async () => {
    try {
        console.log('MongoDB bağlantısı kuruluyor...')
        await mongoose.connect(MONGO_URI)
        console.log('MongoDB bağlandı')

        // HTML dosyasını oku
        const htmlPath = path.join(__dirname, TEMPLATE.contentFile)

        if (!fs.existsSync(htmlPath)) {
            throw new Error(`HTML dosyası bulunamadı: ${htmlPath}`)
        }

        const htmlContent = fs.readFileSync(htmlPath, 'utf-8')

        console.log(`HTML dosyası okundu: ${htmlContent.length} karakter`)

        // Var olan kaydı kontrol et
        const existing = await WebMailTemplate.findOne({ templateKey: TEMPLATE.templateKey })

        if (existing) {
            console.log(`Mevcut kayıt bulundu (ID: ${existing._id})`)
            console.log('Sadece defaultContent güncellenecek (kullanıcı edit\'leri korunacak)...')

            existing.defaultContent = htmlContent

            // Eğer content boşsa veya defaultContent ile aynıysa content'i de güncelle
            if (!existing.content || existing.content === existing.defaultContent) {
                existing.content = htmlContent
            }

            existing.name = TEMPLATE.name
            existing.category = TEMPLATE.category
            existing.categoryName = TEMPLATE.categoryName
            existing.order = TEMPLATE.order
            existing.isActive = TEMPLATE.isActive

            await existing.save()

            console.log('Şablon güncellendi')
        } else {
            console.log('Yeni şablon ekleniyor...')

            await WebMailTemplate.create({
                templateKey: TEMPLATE.templateKey,
                name: TEMPLATE.name,
                category: TEMPLATE.category,
                categoryName: TEMPLATE.categoryName,
                content: htmlContent,
                defaultContent: htmlContent,
                order: TEMPLATE.order,
                isActive: TEMPLATE.isActive
            })

            console.log('Şablon başarıyla eklendi')
        }

        await mongoose.disconnect()
        console.log('İşlem tamamlandı')
        process.exit(0)
    } catch (error) {
        console.error('Hata:', error.message)
        await mongoose.disconnect().catch(() => { })
        process.exit(1)
    }
}

run()