import AuditLog from '../models/AuditLog.js';

export function requireAdminPermission(permission) {
  return (req, res, next) => {
    const role = req.user?.role === 'admin' ? 'super_admin' : req.user?.role;
    if (!['super_admin', 'sub_admin'].includes(role)) return res.status(403).json({ message: 'You do not have permission to do that.' });
    if (role === 'sub_admin' && !req.user.permissions?.includes(permission)) return res.status(403).json({ message: 'You do not have permission to do that.' });
    req.adminRole = role;
    return next();
  };
}

export function enforceAdminPermissionWhenAdmin(permission) {
  return (req, res, next) => {
    const role = req.user?.role === 'admin' ? 'super_admin' : req.user?.role;
    if (!['super_admin', 'sub_admin'].includes(role)) return next();
    if (role === 'sub_admin' && !req.user.permissions?.includes(permission)) return res.status(403).json({ message: 'You do not have permission to do that.' });
    req.adminRole = role;
    return next();
  };
}

export function auditAdminAction(req, res, next) {
  res.on('finish', () => {
    if (!req.user?._id) return;
    if (!['admin', 'super_admin', 'sub_admin'].includes(req.user.role)) return;
    const target = req.params.userId || req.params.taskId || req.params.reviewId || req.params.reportId || req.params.id || req.params.messageId;
    AuditLog.create({ actor: req.user._id, action: `${req.method} ${req.route?.path || req.path}`.slice(0, 80), targetType: 'admin', targetId: target || undefined, metadata: { status: res.statusCode, role: req.adminRole || req.user.role } }).catch(() => {});
  });
  next();
}
