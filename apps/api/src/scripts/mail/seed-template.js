
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '../../../.env.production') })

const mongoose = require('mongoose')
const fs = require('fs')

const { SITES } = require('../../config/sites')

const TEMPLATE = {
    templateKey: 'havale_bildirim_formu',
    name: 'Havale Bildirim Formu',
    category: 'genel',
    categoryName: 'Genel',
    contentFile: 'havale-bildirim-formu.html',
    order: 4,
    isActive: true
}

const WebMailTemplate = require('../../models/admin/mail/Template')

const run = async () => {
    try {
        console.log('MongoDB bağlantısı kuruluyor...')
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('MongoDB bağlandı')

        const htmlPath = path.join(__dirname, TEMPLATE.contentFile)

        if (!fs.existsSync(htmlPath)) {
            throw new Error(`HTML dosyası bulunamadı: ${htmlPath}`)
        }

        const htmlContent = fs.readFileSync(htmlPath, 'utf-8')

        console.log(`HTML dosyası okundu: ${htmlContent.length} karakter`)

        for (const site of Object.keys(SITES)) {
            const existing = await WebMailTemplate.findOne({ site, templateKey: TEMPLATE.templateKey })

            if (existing) {
                console.log(`[${site}] Mevcut kayıt bulundu (ID: ${existing._id})`)
                console.log(`[${site}] Sadece defaultContent güncellenecek (kullanıcı edit'leri korunacak)...`)

                existing.defaultContent = htmlContent

                if (!existing.content || existing.content === existing.defaultContent) {
                    existing.content = htmlContent
                }

                existing.name = TEMPLATE.name
                existing.category = TEMPLATE.category
                existing.categoryName = TEMPLATE.categoryName
                existing.order = TEMPLATE.order
                existing.isActive = TEMPLATE.isActive

                await existing.save()

                console.log(`[${site}] Şablon güncellendi`)
            } else {
                console.log(`[${site}] Yeni şablon ekleniyor...`)

                await WebMailTemplate.create({
                    site,
                    templateKey: TEMPLATE.templateKey,
                    name: TEMPLATE.name,
                    category: TEMPLATE.category,
                    categoryName: TEMPLATE.categoryName,
                    content: htmlContent,
                    defaultContent: htmlContent,
                    order: TEMPLATE.order,
                    isActive: TEMPLATE.isActive
                })

                console.log(`[${site}] Şablon başarıyla eklendi`)
            }
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
