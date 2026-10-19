const express = require('express');
const router = express.Router();
const Role = require('../../../models/admin/user/Role');
const Admin = require('../../../models/admin/user/Admin');
const ActivityLog = require('../../../models/admin/user/ActivityLog');
const { authenticateAdmin, authorize, getClientIP } = require('../../../middleware/auth');

router.use(authenticateAdmin);

router.get('/modules', async (req, res) => {
    try {
        const { getModulesByCategory } = require('../../../config/modules');
        const modules = getModulesByCategory();

        res.json({
            success: true,
            data: { modules }
        });
    } catch (error) {
        console.error('Get modules error:', error);
        res.status(500).json({
            success: false,
            message: 'Modüller alınırken bir hata oluştu'
        });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            name,
            description,
            permissions,
            status = 'active'
        } = req.body;

        if (!name || name.trim() === '') {
            console.log('Validasyon hatası: Rol adı eksik');
            return res.status(400).json({
                success: false,
                message: 'Rol adı gereklidir'
            });
        }

        if (!permissions || permissions.length === 0) {
            console.log('Validasyon hatası: İzinler eksik');
            return res.status(400).json({
                success: false,
                message: 'En az bir izin seçmelisiniz'
            });
        }

        const existingRole = await Role.findByName(name.trim());
        if (existingRole) {
            console.log('Rol zaten mevcut:', name);
            return res.status(400).json({
                success: false,
                message: 'Bu isimde bir rol zaten mevcut'
            });
        }

        const cleanPermissions = permissions
            .filter(p => p.module)
            .map(p => ({
                module: p.module,
                view: p.view === true,
                create: p.create === true,
                edit: p.edit === true,
                delete: p.delete === true,
                sync: p.sync === true
            }));

        console.log('Temizlenmiş izinler:', cleanPermissions);

        const role = new Role({
            name: name.trim(),
            description: description?.trim() || '',
            permissions: cleanPermissions,
            status,
            isSystem: false
        });

        await role.save();
        console.log('Rol başarıyla oluşturuldu:', role._id);

        try {
            await ActivityLog.logActivity({
      site: req.site,
                user: req.adminId,
                action: 'create',
                module: 'roles',
                targetId: role._id.toString(),
                targetType: 'Role',
                details: {
                    roleName: name,
                    permissionCount: cleanPermissions.length
                },
                ipAddress: getClientIP(req),
                userAgent: req.get('user-agent'),
                status: 'success'
            });
        } catch (logError) {
            console.error('Activity log hatası:', logError);
        }

        res.status(201).json({
            success: true,
            message: 'Rol başarıyla oluşturuldu',
            data: { role }
        });

    } catch (error) {
        console.error('Rol oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Rol oluşturulurken bir hata oluştu',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            search,
            status,
            sortBy = 'name',
            sortOrder = 'asc'
        } = req.query;

        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (status) {
            filter.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        const roles = await Role.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Role.countDocuments(filter);

        const rolesWithCount = await Promise.all(
            roles.map(async (role) => {
                const userCount = await Admin.countDocuments({ role: role._id });
                return {
                    ...role.toObject(),
                    userCount
                };
            })
        );

        const stats = {
            total: await Role.countDocuments(),
            active: await Role.countDocuments({ status: 'active' }),
            inactive: await Role.countDocuments({ status: 'inactive' }),
            system: await Role.countDocuments({ isSystem: true })
        };

        res.json({
            success: true,
            data: {
                roles: rolesWithCount,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                },
                stats
            }
        });

    } catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({
            success: false,
            message: 'Rol listesi alınırken bir hata oluştu'
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Rol bulunamadı'
            });
        }

        const users = await Admin.find({ role: role._id })
            .select('firstName lastName email username status')
            .limit(10);

        const userCount = await Admin.countDocuments({ role: role._id });

        res.json({
            success: true,
            data: {
                role,
                users,
                userCount
            }
        });

    } catch (error) {
        console.error('Get role error:', error);
        res.status(500).json({
            success: false,
            message: 'Rol bilgileri alınırken bir hata oluştu'
        });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const {
            name,
            description,
            permissions,
            status
        } = req.body;

        const role = await Role.findById(req.params.id);

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Rol bulunamadı'
            });
        }

        if (role.isSystem) {
            return res.status(400).json({
                success: false,
                message: 'Sistem rolleri güncellenemez'
            });
        }

        if (name && name !== role.name) {
            const existingRole = await Role.findByName(name);
            if (existingRole) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu isimde bir rol zaten mevcut'
                });
            }
            role.name = name;
        }

        if (description !== undefined) role.description = description;
        if (permissions) role.permissions = permissions;
        if (status) role.status = status;

        await role.save();

        try {
            await ActivityLog.logActivity({
      site: req.site,
                user: req.adminId,
                action: 'update',
                module: 'roles',
                targetId: role._id.toString(),
                targetType: 'Role',
                details: {
                    updatedFields: Object.keys(req.body)
                },
                ipAddress: getClientIP(req),
                userAgent: req.get('user-agent'),
                status: 'success'
            });
        } catch (logError) {
            console.error('Activity log hatası:', logError);
        }

        res.json({
            success: true,
            message: 'Rol başarıyla güncellendi',
            data: { role }
        });

    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({
            success: false,
            message: 'Rol güncellenirken bir hata oluştu'
        });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Rol bulunamadı'
            });
        }

        if (role.isSystem) {
            return res.status(400).json({
                success: false,
                message: 'Sistem rolleri silinemez'
            });
        }

        const userCount = await Admin.countDocuments({ role: role._id });
        if (userCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Bu role sahip ${userCount} kullanıcı var. Önce bu kullanıcıları başka bir role atayın.`
            });
        }

        await role.deleteOne();

        try {
            await ActivityLog.logActivity({
      site: req.site,
                user: req.adminId,
                action: 'delete',
                module: 'roles',
                targetId: role._id.toString(),
                targetType: 'Role',
                details: {
                    deletedRole: {
                        name: role.name,
                        permissionCount: role.permissions.length
                    }
                },
                ipAddress: getClientIP(req),
                userAgent: req.get('user-agent'),
                status: 'success'
            });
        } catch (logError) {
            console.error('Activity log hatası:', logError);
        }

        res.json({
            success: true,
            message: 'Rol başarıyla silindi'
        });

    } catch (error) {
        console.error('Delete role error:', error);
        res.status(500).json({
            success: false,
            message: 'Rol silinirken bir hata oluştu'
        });
    }
});

module.exports = router;