// createAdmin.js

const mongoose = require('mongoose');
const AdminUser = require('../../models/admin/user/AdminUser');
require('dotenv').config({ path: __dirname + '/../../../.env' });

async function createNewAdmin() {
    try {
        // MongoDB bağlantısı
        console.log("Mongo URI:", process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);

        // Email kontrolü
        const existingUser = await AdminUser.findOne({ email: 'emir@alastik.com' });
        if (existingUser) {
            console.log('❌ Bu email ile kullanıcı zaten mevcut.');
            await mongoose.disconnect();
            process.exit(1);
        }

        // Yeni admin oluştur
        const newAdmin = new AdminUser({
            email: 'emir@alastik.com',
            name: 'Emir',
            password: '242-enes',
            role: 'admin',
            isActive: true
        });

        await newAdmin.save();
        console.log('✅ Yeni admin oluşturuldu: emir@alastik.com / 242-enes');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Hata:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

createNewAdmin();
