const jwt = require('jsonwebtoken');
const WebSalesperson = require('../models/web/user/WebSalesperson');

const salespersonAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme token bulunamadı' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'salesperson') {
            return res.status(401).json({ success: false, message: 'Geçersiz plasiyer oturumu' });
        }

        const sp = await WebSalesperson.findOne({ _id: decoded.id, site: req.site });
        if (!sp || !sp.canLogin()) {
            return res.status(401).json({ success: false, message: 'Plasiyer bulunamadı veya erişim kapalı' });
        }

        req.salesperson = sp;
        next();
    } catch (error) {
        console.error('Plasiyer auth middleware hatası:', error);
        res.status(401).json({ success: false, message: 'Geçersiz token' });
    }
};

const salespersonOrImpersonationAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme token bulunamadı' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type === 'salesperson') return salespersonAuth(req, res, next);
        if (decoded.type !== 'member' || !decoded.impersonatedBy) {
            return res.status(403).json({ success: false, message: 'Bu bilgi yalnız plasiyere gösterilir.' });
        }
        const sp = await WebSalesperson.findOne({ _id: decoded.impersonatedBy, site: req.site });
        if (!sp || !sp.canLogin()) {
            return res.status(401).json({ success: false, message: 'Plasiyer bulunamadı veya erişim kapalı' });
        }
        req.salesperson = sp;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Geçersiz token' });
    }
};

module.exports = salespersonAuth;
module.exports.salespersonOrImpersonationAuth = salespersonOrImpersonationAuth;
