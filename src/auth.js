const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'secreto-solo-para-desarrollo';

function firmarToken(usuario) {
  return jwt.sign({ id: usuario.id, rol: usuario.rol, nombre: usuario.nombre }, SECRET, { expiresIn: '7d' });
}

// Lee el token del header Authorization: Bearer xxx (o ?t=xxx, útil para cargar imágenes)
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : req.query.t;
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ ok: false, error: 'No autorizado' });
  }
}

function requireRol(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ ok: false, error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

module.exports = { firmarToken, auth, requireRol };
