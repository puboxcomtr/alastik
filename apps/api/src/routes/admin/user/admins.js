const express = require('express');
const router = express.Router();
const Admin = require('../../../models/admin/user/Admin');
const Role = require('../../../models/admin/user/Role');
const ActivityLog = require('../../../models/admin/user/ActivityLog');
const { authenticateAdmin, authorize, getClientIP } = require('../../../middleware/auth');

router.use(authenticateAdmin);

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

    const filter = { sites: req.site };

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

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const admins = await Admin.find(filter)
      .populate('role')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Admin.countDocuments(filter);

    const stats = {
      total: await Admin.countDocuments({ sites: req.site }),
      active: await Admin.countDocuments({ status: 'active', sites: req.site }),
      inactive: await Admin.countDocuments({ status: 'inactive', sites: req.site }),
      blocked: await Admin.countDocuments({ status: 'blocked', sites: req.site })
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

router.get('/:id', async (req, res) => {
  try {
    const admin = await Admin.findOne({ _id: req.params.id, sites: req.site }).populate('role');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin bulunamadı'
      });
    }

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
      sites,
      status = 'active'
    } = req.body;

    const name = `${firstName} ${lastName}`.trim();

    const { isValidSite } = require('../../../config/sites');
    const requestedSites = Array.isArray(sites) ? sites.filter(s => isValidSite(s)) : [];
    if (Array.isArray(sites) && requestedSites.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'En az bir geçerli site seçilmelidir'
      });
    }

    if (!name || !username || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Tüm zorunlu alanları doldurunuz'
      });
    }

    const existingEmail = await Admin.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Bu email adresi zaten kullanılıyor'
      });
    }

    const existingUsername = await Admin.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Bu kullanıcı adı zaten kullanılıyor'
      });
    }

    const roleDoc = await Role.findById(role);
    if (!roleDoc) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz rol'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Şifre en az 6 karakter olmalıdır'
      });
    }

    const isActive = status === 'active';

    const admin = new Admin({
      name,
      username,
      email,
      password,
      role,
      permissions,
      sites: requestedSites.length > 0 ? requestedSites : [req.site],
      isActive
    });

    await admin.save();
    await admin.populate('role');

    await ActivityLog.logActivity({
      site: req.site,
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

router.put('/:id', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      role,
      permissions,
      status,
      profile,
      sites
    } = req.body;

    const admin = await Admin.findOne({ _id: req.params.id, sites: req.site });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin bulunamadı'
      });
    }

    if (req.adminId.toString() === admin._id.toString() && status === 'inactive') {
      return res.status(400).json({
        success: false,
        message: 'Kendi hesabınızı devre dışı bırakamazsınız'
      });
    }

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

    if (firstName || lastName) {
      const newFirstName = firstName || admin.firstName;
      const newLastName = lastName || admin.lastName;
      admin.name = `${newFirstName} ${newLastName}`.trim();
    }

    if (role) admin.role = role;
    if (permissions) admin.permissions = permissions;
    if (status) admin.status = status;
    if (profile) admin.profile = { ...admin.profile, ...profile };
    if (Array.isArray(sites)) {
      const { isValidSite } = require('../../../config/sites');
      const validSites = sites.filter(s => isValidSite(s));
      if (validSites.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'En az bir geçerli site seçilmelidir'
        });
      }
      if (req.adminId.toString() === admin._id.toString() && !validSites.includes(req.site)) {
        return res.status(400).json({
          success: false,
          message: 'Kendi hesabınızın aktif site erişimini kaldıramazsınız'
        });
      }
      admin.sites = validSites;
    }

    await admin.save();
    await admin.populate('role');

    await ActivityLog.logActivity({
      site: req.site,
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

router.delete('/:id', async (req, res) => {
  try {
    const admin = await Admin.findOne({ _id: req.params.id, sites: req.site });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin bulunamadı'
      });
    }

    if (req.adminId.toString() === admin._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Kendi hesabınızı silemezsiniz'
      });
    }

    await admin.deleteOne();

    await ActivityLog.logActivity({
      site: req.site,
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