const express = require('express');
const router = express.Router();
const Role = require('../../../models/Role');
const Admin = require('../../../models/Admin');
const ActivityLog = require('../../../models/ActivityLog');
const { authenticateAdmin, authorize, getClientIP } = require('../../../middleware/auth');

// Tüm route'lar admin authentication gerektirir
router.use(authenticateAdmin);

/**
 * @route   GET /api/admin/user/roles
 * @desc    Rol listesi
 * @access  Private
 */
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

        // Filtreler
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

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        // Query
        const roles = await Role.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Role.countDocuments(filter);

        // Her rol için kullanıcı sayısını hesapla
        const rolesWithCount = await Promise.all(
            roles.map(async (role) => {
                const userCount = await Admin.countDocuments({ role: role._id });
                return {
                    ...role.toObject(),
                    userCount
                };
            })
        );

        // İstatistikler
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

/**
 * @route   GET /api/admin/user/roles/:id
 * @desc    Rol detayı
 * @access  Private
 */
router.get('/:id', async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Rol bulunamadı'
            });
        }

        // Bu role sahip kullanıcıları getir
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

/**
 * @route   POST /api/admin/user/roles
 * @desc    Yeni rol oluştur
 * @access  Private
 */
router.post('/', async (req, res) => {
    try {
        const {
            name,
            description,
            permissions,
            status = 'active'
        } = req.body;

        // Validasyon
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Rol adı gereklidir'
            });
        }

        // Aynı isimde rol var mı kontrol et
        const existingRole = await Role.findByName(name);
        if (existingRole) {
            return res.status(400).json({
                success: false,
                message: 'Bu isimde bir rol zaten mevcut'
            });
        }

        // Rol oluştur
        const role = new Role({
            name,
            description,
            permissions: permissions || [],
            status,
            isSystem: false
        });

        await role.save();

        // Activity log
        await ActivityLog.logActivity({
            user: req.adminId,
            action: 'create',
            module: 'roles',
            targetId: role._id.toString(),
            targetType: 'Role',
            details: {
                roleName: name,
                permissionCount: permissions?.length || 0
            },
            ipAddress: getClientIP(req),
            userAgent: req.get('user-agent'),
            status: 'success'
        });

        res.status(201).json({
            success: true,
            message: 'Rol başarıyla oluşturuldu',
            data: { role }
        });

    } catch (error) {
        console.error('Create role error:', error);
        res.status(500).json({
            success: false,
            message: 'Rol oluşturulurken bir hata oluştu'
        });
    }
});

/**
 * @route   PUT /api/admin/user/roles/:id
 * @desc    Rol güncelle
 * @access  Private
 */
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

        // Sistem rollerini güncelleme engeli
        if (role.isSystem) {
            return res.status(400).json({
                success: false,
                message: 'Sistem rolleri güncellenemez'
            });
        }

        // İsim değişikliği kontrolü
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

        // Güncelle
        if (description !== undefined) role.description = description;
        if (permissions) role.permissions = permissions;
        if (status) role.status = status;

        await role.save();

        // Activity log
        await ActivityLog.logActivity({
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

/**
 * @route   DELETE /api/admin/user/roles/:id
 * @desc    Rol sil
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Rol bulunamadı'
            });
        }

        // Sistem rollerini silme engeli
        if (role.isSystem) {
            return res.status(400).json({
                success: false,
                message: 'Sistem rolleri silinemez'
            });
        }

        // Bu role sahip kullanıcı var mı kontrol et
        const userCount = await Admin.countDocuments({ role: role._id });
        if (userCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Bu role sahip ${userCount} kullanıcı var. Önce bu kullanıcıları başka bir role atayın.`
            });
        }

        await role.deleteOne();

        // Activity log
        await ActivityLog.logActivity({
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