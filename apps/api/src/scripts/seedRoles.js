require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('../models/Role');

const MONGODB_URI = process.env.MONGODB_URI;

async function seedRoles() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB bağlantısı başarılı');

        // Mevcut rolleri kontrol et
        const existingRoles = await Role.find();
        console.log(`📋 Mevcut ${existingRoles.length} rol bulundu`);

        // Super Admin Rolü
        let superAdminRole = await Role.findOne({ name: 'Super Admin' });
        if (!superAdminRole) {
            superAdminRole = await Role.create({
                name: 'Super Admin',
                description: 'Tüm yetkilere sahip sistem yöneticisi',
                permissions: [
                    { module: 'products', view: true, create: true, edit: true, delete: true },
                    { module: 'categories', view: true, create: true, edit: true, delete: true },
                    { module: 'brands', view: true, create: true, edit: true, delete: true },
                    { module: 'tags', view: true, create: true, edit: true, delete: true }
                ],
                isSystem: true,
                status: 'active'
            });
            console.log('✅ Super Admin rolü oluşturuldu');
        } else {
            console.log('ℹ️  Super Admin rolü zaten mevcut');
        }

        // Admin Rolü
        let adminRole = await Role.findOne({ name: 'Admin' });
        if (!adminRole) {
            adminRole = await Role.create({
                name: 'Admin',
                description: 'Genel yönetici yetkisi',
                permissions: [
                    { module: 'products', view: true, create: true, edit: true, delete: false },
                    { module: 'categories', view: true, create: true, edit: true, delete: false },
                    { module: 'brands', view: true, create: true, edit: true, delete: false },
                    { module: 'tags', view: true, create: true, edit: true, delete: false }
                ],
                isSystem: false,
                status: 'active'
            });
            console.log('✅ Admin rolü oluşturuldu');
        } else {
            console.log('ℹ️  Admin rolü zaten mevcut');
        }

        // Editor Rolü
        let editorRole = await Role.findOne({ name: 'Editor' });
        if (!editorRole) {
            editorRole = await Role.create({
                name: 'Editor',
                description: 'İçerik düzenleme yetkisi',
                permissions: [
                    { module: 'products', view: true, create: true, edit: true, delete: false },
                    { module: 'categories', view: true, create: false, edit: true, delete: false },
                    { module: 'brands', view: true, create: false, edit: true, delete: false },
                    { module: 'tags', view: true, create: true, edit: true, delete: false }
                ],
                isSystem: false,
                status: 'active'
            });
            console.log('✅ Editor rolü oluşturuldu');
        } else {
            console.log('ℹ️  Editor rolü zaten mevcut');
        }

        // Viewer Rolü
        let viewerRole = await Role.findOne({ name: 'Viewer' });
        if (!viewerRole) {
            viewerRole = await Role.create({
                name: 'Viewer',
                description: 'Sadece görüntüleme yetkisi',
                permissions: [
                    { module: 'products', view: true, create: false, edit: false, delete: false },
                    { module: 'categories', view: true, create: false, edit: false, delete: false },
                    { module: 'brands', view: true, create: false, edit: false, delete: false },
                    { module: 'tags', view: true, create: false, edit: false, delete: false }
                ],
                isSystem: false,
                status: 'active'
            });
            console.log('✅ Viewer rolü oluşturuldu');
        } else {
            console.log('ℹ️  Viewer rolü zaten mevcut');
        }

        console.log('\n📋 Tüm Roller:');
        const allRoles = await Role.find();
        allRoles.forEach(role => {
            const permCount = role.permissions.length;
            const activePerms = role.permissions.filter(p => p.view || p.create || p.edit || p.delete).length;
            console.log(`   - ${role.name} (${role.status}) - ${activePerms}/${permCount * 4} yetki`);
        });

        await mongoose.disconnect();
        console.log('\n✅ Seed işlemi tamamlandı');
        process.exit(0);

    } catch (error) {
        console.error('❌ Seed hatası:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

seedRoles();