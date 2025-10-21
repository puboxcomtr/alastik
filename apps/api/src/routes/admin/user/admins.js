const express = require('express');
const router = express.Router();
const Admin = require('../../../models/Admin');
const Role = require('../../../models/Role');
const ActivityLog = require('../../../models/ActivityLog');
const { authenticateAdmin, authorize, getClientIP } = require('../../../middleware/auth');

// Tüm route'lar admin authentication gerektirir
router.use(authenticateAdmin);

/**
 * @route   GET /api/admin/user/admins
 * @desc    Admin listesi
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      role,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Filtreler
    const filter = {};

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (role) {
      filter.role = role;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Query
    const admins = await Admin.find(filter)
      .populate('role')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Admin.countDocuments(filter);

    // İstatistikler
    const stats = {
      total: await Admin.countDocuments(),
      active: await Admin.countDocuments({ status: 'active' }),
      inactive: await Admin.countDocuments({ status: 'inactive' }),
      blocked: await Admin.countDocuments({ status: 'blocked' })
    };

    res.json({
      success: true,
      data: {
        admins,
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
    console.error('Get admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin listesi alınırken bir hata oluştu'
    });
  }
});

/**
 * @route   GET /api/admin/user/admins/:id
 * @desc    Admin detayı
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).populate('role');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin bulunamadı'
      });
    }

    // Son aktiviteleri getir
    const recentActivities = await ActivityLog.getUserActivities(admin._id, 10);

    res.json({
      success: true,
      data: {
        admin,
        recentActivities
      }
    });

  } catch (error) {
    console.error('Get admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin bilgileri alınırken bir hata oluştu'
    });
  }
});

/**
 * @route   POST /api/admin/user/admins
 * @desc    Yeni admin oluştur
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      username,
      email,
      password,
      role,
      permissions,
      status = 'active'
    } = req.body;

    const name = `${firstName} ${lastName}`.trim();

    // Validasyon
    if (!name || !username || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Tüm zorunlu alanları doldurunuz'
      });
    }

    // Email kontrolü
    const existingEmail = await Admin.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Bu email adresi zaten kullanılıyor'
      });
    }

    // Username kontrolü
    const existingUsername = await Admin.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Bu kullanıcı adı zaten kullanılıyor'
      });
    }

    // Rol kontrolü
    const roleDoc = await Role.findById(role);
    if (!roleDoc) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz rol'
      });
    }

    // Şifre uzunluğu kontrolü
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Şifre en az 6 karakter olmalıdır'
      });
    }

    const isActive = status === 'active';

    // Admin oluştur
    const admin = new Admin({
      name,
      username,
      email,
      password,
      role,
      permissions,
      isActive  
    });

    await admin.save();
    await admin.populate('role');

    // Activity log
    await ActivityLog.logActivity({
      user: req.adminId,
      action: 'create',
      module: 'users',
      targetId: admin._id.toString(),
      targetType: 'Admin',
      details: {
        adminEmail: email,
        role: roleDoc.name
      },
      ipAddress: getClientIP(req),
      userAgent: req.get('user-agent'),
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: 'Admin başarıyla oluşturuldu',
      data: { admin }
    });

  } catch (error) {

    console.error('=== HATA ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin oluşturulurken bir hata oluştu'
    });
  }
});

/**
 * @route   PUT /api/admin/user/admins/:id
 * @desc    Admin güncelle
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      role,
      permissions,
      status,
      profile
    } = req.body;

    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin bulunamadı'
      });
    }

    // Kendi kendini devre dışı bırakmayı engelle
    if (req.adminId.toString() === admin._id.toString() && status === 'inactive') {
      return res.status(400).json({
        success: false,
        message: 'Kendi hesabınızı devre dışı bırakamazsınız'
      });
    }

    // Email değişikliği kontrolü
    if (email && email !== admin.email) {
      const existingEmail = await Admin.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Bu email adresi zaten kullanılıyor'
        });
      }
      admin.email = email;
    }

    // firstName ve lastName varsa name'e çevir
    if (firstName || lastName) {
      const newFirstName = firstName || admin.firstName;
      const newLastName = lastName || admin.lastName;
      admin.name = `${newFirstName} ${newLastName}`.trim();
    }

    if (role) admin.role = role;
    if (permissions) admin.permissions = permissions;
    if (status) admin.status = status;
    if (profile) admin.profile = { ...admin.profile, ...profile };

    await admin.save();
    await admin.populate('role');

    // Activity log
    await ActivityLog.logActivity({
      user: req.adminId,
      action: 'update',
      module: 'users',
      targetId: admin._id.toString(),
      targetType: 'Admin',
      details: {
        updatedFields: Object.keys(req.body)
      },
      ipAddress: getClientIP(req),
      userAgent: req.get('user-agent'),
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Admin başarıyla güncellendi',
      data: { admin }
    });

  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin güncellenirken bir hata oluştu'
    });
  }
});

/**
 * @route   DELETE /api/admin/user/admins/:id
 * @desc    Admin sil
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin bulunamadı'
      });
    }

    // Kendi kendini silmeyi engelle
    if (req.adminId.toString() === admin._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Kendi hesabınızı silemezsiniz'
      });
    }

    await admin.deleteOne();

    // Activity log
    await ActivityLog.logActivity({
      user: req.adminId,
      action: 'delete',
      module: 'users',
      targetId: admin._id.toString(),
      targetType: 'Admin',
      details: {
        deletedAdmin: {
          email: admin.email,
          fullName: admin.fullName
        }
      },
      ipAddress: getClientIP(req),
      userAgent: req.get('user-agent'),
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Admin başarıyla silindi'
    });

  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin silinirken bir hata oluştu'
    });
  }
});


module.exports = router;