require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('../models/admin/user/Role');
const { getAllModuleKeys } = require('../config/modules');

const MONGODB_URI = process.env.MONGODB_URI;

async function seedRoles() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB bağlantısı başarılı');

        await Role.deleteMany({ isSystem: false });
        console.log('🗑️  Eski roller temizlendi');

        const allModules = getAllModuleKeys();

        let superAdminRole = await Role.findOne({ name: 'Super Admin' });
        if (!superAdminRole) {
            const superAdminPermissions = allModules.map(module => ({
                module,
                view: true,
                create: true,
                edit: true,
                delete: true,
                sync: true
            }));

            superAdminRole = await Role.create({
                name: 'Super Admin',
                description: 'Tüm yetkilere sahip sistem yöneticisi',
                permissions: superAdminPermissions,
                isSystem: true,
                status: 'active'
            });
            console.log('✅ Super Admin rolü oluşturuldu');
        } else {
            console.log('ℹ️  Super Admin rolü zaten mevcut');
        }

        const adminPermissions = [
            { module: 'catalog.products', view: true, edit: true, sync: true },
            { module: 'catalog.categories', view: true, edit: true, sync: true },
            { module: 'catalog.brands', view: true, edit: true, sync: true },
            { module: 'catalog.tags', view: true, create: true, edit: true, delete: false },
            { module: 'catalog.features', view: true, edit: true },

            { module: 'orders', view: true, edit: true },

            { module: 'content.pages', view: true, create: true, edit: true, delete: false },
            { module: 'content.blogs', view: true, create: true, edit: true, delete: false },
            { module: 'content.forms', view: true, create: true, edit: true, delete: false },

            { module: 'members.users', view: true, create: true, edit: true, delete: false },
            { module: 'members.support', view: true, create: true, edit: true, delete: false },

            { module: 'campaigns', view: true, create: true, edit: true, delete: false },

            { module: 'settings.general', view: true, edit: true },
            { module: 'settings.design', view: true, edit: true },
            { module: 'settings.queue', view: true }
        ];

        await Role.create({
            name: 'Admin',
            description: 'Genel yönetim yetkisi (silme hariç)',
            permissions: adminPermissions,
            isSystem: false,
            status: 'active'
        });
        console.log('✅ Admin rolü oluşturuldu');

        const editorPermissions = [
            { module: 'catalog.products', view: true, edit: true },
            { module: 'catalog.categories', view: true },
            { module: 'catalog.brands', view: true },
            { module: 'catalog.tags', view: true, create: true, edit: true },
            { module: 'catalog.features', view: true, edit: true },
            { module: 'content.pages', view: true, create: true, edit: true },
            { module: 'content.blogs', view: true, create: true, edit: true },
            { module: 'content.forms', view: true, create: true, edit: true },
            { module: 'campaigns', view: true, create: true, edit: true }
        ];

        await Role.create({
            name: 'Editor',
            description: 'İçerik düzenleme yetkisi',
            permissions: editorPermissions,
            isSystem: false,
            status: 'active'
        });
        console.log('✅ Editor rolü oluşturuldu');

        const viewerPermissions = allModules.map(module => ({
            module,
            view: true,
            create: false,
            edit: false,
            delete: false,
            sync: false
        }));

        await Role.create({
            name: 'Viewer',
            description: 'Sadece görüntüleme yetkisi',
            permissions: viewerPermissions,
            isSystem: false,
            status: 'active'
        });
        console.log('✅ Viewer rolü oluşturuldu');

        const supportPermissions = [
            { module: 'orders', view: true, edit: true },
            { module: 'members.users', view: true, edit: true },
            { module: 'members.support', view: true, create: true, edit: true, delete: true }
        ];

        await Role.create({
            name: 'Support',
            description: 'Müşteri destek yetkisi',
            permissions: supportPermissions,
            isSystem: false,
            status: 'active'
        });
        console.log('✅ Support rolü oluşturuldu');

        console.log('\n📋 Oluşturulan Roller:');
        const allRoles = await Role.find();
        allRoles.forEach(role => {
            const totalPerms = role.permissions.reduce((sum, p) => {
                return sum + (p.view ? 1 : 0) + (p.create ? 1 : 0) + (p.edit ? 1 : 0) + (p.delete ? 1 : 0) + (p.sync ? 1 : 0);
            }, 0);
            console.log(`   ✅ ${role.name} - ${role.permissions.length} modül, ${totalPerms} aktif yetki`);
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