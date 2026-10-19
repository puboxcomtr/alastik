const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin';

async function createTestAdmin() {
    try {
        console.log('🔄 MongoDB bağlanıyor...');
        console.log('🔗 URI:', MONGODB_URI.replace(/:[^:@]+@/, ':****@'));

        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB bağlantısı başarılı');
        console.log('📊 Database:', mongoose.connection.db.databaseName);

        const AdminUsers = mongoose.connection.collection('adminusers');

        console.log('🔍 Mevcut kayıtları kontrol ediliyor...');
        const allUsers = await AdminUsers.find({}).toArray();
        console.log(`📋 Toplam ${allUsers.length} kullanıcı bulundu`);

        const existingUser = await AdminUsers.findOne({ email: 'test@alastik.com' });

        if (existingUser) {
            console.log('ℹ️  test@alastik.com kullanıcısı zaten mevcut');
            console.log('📧 Email: test@alastik.com');
            console.log('🔑 Şifre: Test123!');
            await mongoose.disconnect();
            process.exit(0);
        }

        console.log('🔐 Şifre hash\'leniyor...');
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash('Test123!', salt);
        console.log('✅ Şifre hash\'lendi');

        const newUser = {
            email: 'test@alastik.com',
            name: 'Test Admin',
            password: hashedPassword,
            role: 'admin',
            isActive: true,
            avatar: null,
            lastLogin: null,
            twoFactorSecret: null,
            twoFactorEnabled: false,
            preferences: {
                theme: 'light',
                language: 'tr',
                timezone: 'Europe/Istanbul',
                emailNotifications: true
            },
            metadata: {
                createdBy: null,
                lastModifiedBy: null
            },
            permissions: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            __v: 0
        };

        console.log('💾 Kullanıcı kaydediliyor...');
        const result = await AdminUsers.insertOne(newUser);
        console.log('✅ Kayıt başarılı! ID:', result.insertedId);

        const savedUser = await AdminUsers.findOne({ email: 'test@alastik.com' });
        if (savedUser) {
            console.log('✅ Kayıt doğrulandı!');
            console.log('📧 Email:', savedUser.email);
            console.log('👤 İsim:', savedUser.name);
            console.log('🔑 Şifre: Test123!');
        }

        await mongoose.disconnect();
        console.log('✅ İşlem tamamlandı');
        process.exit(0);

    } catch (error) {
        console.error('❌ Hata:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

createTestAdmin();