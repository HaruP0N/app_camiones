require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const pool = require('./db');
const { firmarToken, auth, requireRol } = require('./auth');
const { calcularResultado, validarDetalles } = require('./rules');

const app = express();
app.use(cors());
app.use(express.json({ limit: '30mb' })); // las fotos viajan en base64

const fail = (res, status, error, extra = {}) => res.status(status).json({ ok: false, error, ...extra });

// Convierte el id de la URL a entero positivo (o null si es inválido)
const toId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// SELECT base de inspecciones con datos del camión y del inspector
const SELECT_INSPECCIONES = `
  SELECT i.id, i.estado, i.resultado, i.nota_final, i.lugar, i.observaciones,
         i.fecha_programada, i.fecha_completacion,
         c.id AS camion_id, c.patente, c.marca, c.modelo, c.anio, c.carroceria, c.empresa,
         u.id AS inspector_id, u.nombre AS inspector_nombre
  FROM inspecciones i
  JOIN camiones c ON c.id = i.camion_id
  JOIN usuarios u ON u.id = i.inspector_id`;

// ---------------------------------------------------------------- salud
app.get('/health', (_req, res) => res.json({ ok: true, servicio: 'inspeccamion-api' }));

// ---------------------------------------------------------------- auth
app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return fail(res, 400, 'Ingresa tu correo y contraseña');

    const r = await pool.query(
      'SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE LOWER(TRIM(email)) = $1',
      [email]
    );
    const u = r.rows[0];
    if (!u || !u.activo || !(await bcrypt.compare(password, u.password_hash))) {
      return fail(res, 401, 'Correo o contraseña incorrectos');
    }
    const usuario = { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol };
    res.json({ ok: true, token: firmarToken(usuario), usuario });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    fail(res, 500, 'Error interno del servidor');
  }
});

app.get('/api/me', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT id, nombre, email, rol FROM usuarios WHERE id = $1 AND activo', [req.user.id]);
    if (!r.rows[0]) return fail(res, 401, 'Sesión inválida');
    res.json({ ok: true, usuario: r.rows[0] });
  } catch (err) {
    console.error('GET /api/me error:', err);
    fail(res, 500, 'Error interno del servidor');
  }
});

// ---------------------------------------------------------------- catálogo
app.get('/api/catalogo', auth, async (_req, res) => {
  try {
    const r = await pool.query('SELECT id, nivel, seccion, titulo FROM items_catalogo ORDER BY nivel, id');
    res.json({ ok: true, items: r.rows });
  } catch (err) {
    console.error('GET /api/catalogo error:', err);
    fail(res, 500, 'Error interno del servidor');
  }
});

// ---------------------------------------------------------------- inspecciones (lectura)
// Inspector: solo las suyas. Supervisor: todas.
// Filtros: ?estado=PROGRAMADA,EN_PROGRESO  ?q=patente
app.get('/api/inspecciones', auth, async (req, res) => {
  try {
    const where = [];
    const params = [];

    if (req.user.rol === 'inspector') {
      params.push(req.user.id);
      where.push(`i.inspector_id = $${params.length}`);
    }
    if (req.query.estado) {
      const estados = String(req.query.estado).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
      params.push(estados);
      where.push(`i.estado = ANY($${params.length})`);
    }
    if (req.query.q) {
      params.push(`%${String(req.query.q).trim().toUpperCase()}%`);
      where.push(`UPPER(c.patente) LIKE $${params.length}`);
    }

    const sql = `${SELECT_INSPECCIONES}
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY (i.estado = 'COMPLETADA'), i.fecha_programada ASC, i.id ASC`;
    const r = await pool.query(sql, params);
    res.json({ ok: true, inspecciones: r.rows });
  } catch (err) {
    console.error('GET /api/inspecciones error:', err);
    fail(res, 500, 'Error interno del servidor');
  }
});

app.get('/api/inspecciones/:id', auth, async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) return fail(res, 400, 'Id inválido');

    const r = await pool.query(`${SELECT_INSPECCIONES} WHERE i.id = $1`, [id]);
    const insp = r.rows[0];
    if (!insp) return fail(res, 404, 'Inspección no encontrada');
    if (req.user.rol === 'inspector' && insp.inspector_id !== req.user.id) {
      return fail(res, 403, 'Esta inspección no está asignada a ti');
    }

    const d = await pool.query(
      `SELECT d.item_id, c.nivel, c.seccion, c.titulo, d.estado, d.descripcion_falla, d.motivo_no_aplica,
              COALESCE((SELECT json_agg(f.id ORDER BY f.id) FROM fotos_inspeccion f WHERE f.detalle_id = d.id), '[]'::json) AS fotos
       FROM detalle_inspeccion d
       JOIN items_catalogo c ON c.id = d.item_id
       WHERE d.inspeccion_id = $1
       ORDER BY c.nivel, c.id`,
      [id]
    );
    res.json({ ok: true, inspeccion: insp, detalles: d.rows });
  } catch (err) {
    console.error('GET /api/inspecciones/:id error:', err);
    fail(res, 500, 'Error interno del servidor');
  }
});

// Foto de evidencia (binario). Acepta Authorization o ?t=token
app.get('/api/fotos/:id', auth, async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) return fail(res, 400, 'Id inválido');
    const r = await pool.query(
      `SELECT f.mime, f.datos, i.inspector_id
       FROM fotos_inspeccion f
       JOIN detalle_inspeccion d ON d.id = f.detalle_id
       JOIN inspecciones i ON i.id = d.inspeccion_id
       WHERE f.id = $1`,
      [id]
    );
    const f = r.rows[0];
    if (!f) return fail(res, 404, 'Foto no encontrada');
    if (req.user.rol === 'inspector' && f.inspector_id !== req.user.id) return fail(res, 403, 'Sin acceso');
    res.set('Content-Type', f.mime);
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(f.datos);
  } catch (err) {
    console.error('GET /api/fotos/:id error:', err);
    fail(res, 500, 'Error interno del servidor');
  }
});

// ---------------------------------------------------------------- inspector: iniciar y completar
app.post('/api/inspecciones/:id/iniciar', auth, requireRol('inspector'), async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) return fail(res, 400, 'Id inválido');
    const r = await pool.query(
      `UPDATE inspecciones SET estado = 'EN_PROGRESO'
       WHERE id = $1 AND inspector_id = $2 AND estado = 'PROGRAMADA' RETURNING id, estado`,
      [id, req.user.id]
    );
    // Si ya estaba en progreso (o no corresponde) simplemente no cambia nada
    res.json({ ok: true, actualizada: r.rowCount > 0 });
  } catch (err) {
    console.error('POST /api/inspecciones/:id/iniciar error:', err);
    fail(res, 500, 'Error interno del servidor');
  }
});

/**
 * Finaliza una inspección.
 * Body: { observaciones?, detalles: [{ item_id, estado, descripcion_falla?, motivo_no_aplica?,
 *         fotos?: [{ mime, base64 }] }] }
 * La nota y el resultado SIEMPRE se calculan en el servidor.
 */
app.post('/api/inspecciones/:id/completar', auth, requireRol('inspector'), async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return fail(res, 400, 'Id inválido');

  const detalles = Array.isArray(req.body.detalles) ? req.body.detalles : [];
  const observaciones = req.body.observaciones ? String(req.body.observaciones).slice(0, 2000) : null;

  const client = await pool.connect();
  try {
    const catalogo = (await client.query('SELECT id, nivel FROM items_catalogo')).rows;

    const errores = validarDetalles(detalles, catalogo);
    if (errores.length) return fail(res, 400, 'La inspección está incompleta', { detalles: errores });

    await client.query('BEGIN');

    const lock = await client.query(
      'SELECT id, inspector_id, estado FROM inspecciones WHERE id = $1 FOR UPDATE',
      [id]
    );
    const insp = lock.rows[0];
    if (!insp) {
      await client.query('ROLLBACK');
      return fail(res, 404, 'Inspección no encontrada');
    }
    if (insp.inspector_id !== req.user.id) {
      await client.query('ROLLBACK');
      return fail(res, 403, 'Esta inspección no está asignada a ti');
    }
    if (insp.estado === 'COMPLETADA') {
      await client.query('ROLLBACK');
      return fail(res, 409, 'La inspección ya fue completada');
    }

    const validos = new Set(catalogo.map((i) => i.id));
    for (const d of detalles) {
      if (!validos.has(d.item_id)) continue; // ignora ítems que no existen en el catálogo

      const ins = await client.query(
        `INSERT INTO detalle_inspeccion (inspeccion_id, item_id, estado, descripcion_falla, motivo_no_aplica)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          id,
          d.item_id,
          d.estado,
          d.estado === 'no_cumple' ? d.descripcion_falla.trim() : null,
          d.estado === 'no_aplica' ? d.motivo_no_aplica.trim() : null,
        ]
      );
      const detalleId = ins.rows[0].id;

      if (d.estado === 'no_cumple') {
        for (const foto of d.fotos) {
          const raw = String(foto.base64 || '').replace(/^data:[^;]+;base64,/, '');
          const buf = Buffer.from(raw, 'base64');
          if (!buf.length) throw Object.assign(new Error('Foto vacía'), { status: 400 });
          if (buf.length > 6 * 1024 * 1024) throw Object.assign(new Error('Foto demasiado pesada (máx. 6 MB)'), { status: 400 });
          await client.query(
            'INSERT INTO fotos_inspeccion (detalle_id, mime, datos) VALUES ($1, $2, $3)',
            [detalleId, foto.mime || 'image/jpeg', buf]
          );
        }
      }
    }

    const { nota, resultado, fallasPorNivel } = calcularResultado(detalles, catalogo);
    await client.query(
      `UPDATE inspecciones
       SET estado = 'COMPLETADA', resultado = $1, nota_final = $2, observaciones = $3, fecha_completacion = NOW()
       WHERE id = $4`,
      [resultado, nota, observaciones, id]
    );

    await client.query('COMMIT');
    res.json({ ok: true, nota, resultado, fallasPorNivel });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('POST /api/inspecciones/:id/completar error:', err);
    fail(res, err.status || 500, err.status ? err.message : 'Error interno del servidor');
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------- supervisor
app.get('/api/camiones', auth, requireRol('supervisor'), async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.id, c.patente, c.marca, c.modelo, c.anio, c.carroceria, c.empresa,
              EXISTS (SELECT 1 FROM inspecciones i
                      WHERE i.camion_id = c.id AND i.estado IN ('PROGRAMADA', 'EN_PROGRESO')) AS tiene_pendiente
       FROM camiones c ORDER BY c.patente`
    );
    res.json({ ok: true, camiones: r.rows });
  } catch (err) {
    console.error('GET /api/camiones error:', err);
    fail(res, 500, 'Error interno del servidor');
  }
});

app.get('/api/inspectores', auth, requireRol('supervisor'), async (_req, res) => {
  try {
    const r = await pool.query(
      "SELECT id, nombre, email FROM usuarios WHERE rol = 'inspector' AND activo ORDER BY nombre"
    );
    res.json({ ok: true, inspectores: r.rows });
  } catch (err) {
    console.error('GET /api/inspectores error:', err);
    fail(res, 500, 'Error interno del servidor');
  }
});

// Agendar una inspección
app.post('/api/inspecciones', auth, requireRol('supervisor'), async (req, res) => {
  try {
    const camionId = toId(req.body.camion_id);
    const inspectorId = toId(req.body.inspector_id);
    const fecha = new Date(req.body.fecha_programada);
    const lugar = req.body.lugar ? String(req.body.lugar).trim().slice(0, 150) : null;

    if (!camionId || !inspectorId) return fail(res, 400, 'Selecciona un camión y un inspector');
    if (Number.isNaN(fecha.getTime())) return fail(res, 400, 'La fecha no es válida');
    if (fecha.getTime() <= Date.now()) return fail(res, 400, 'La fecha de la inspección debe ser futura');

    const camion = await pool.query('SELECT id FROM camiones WHERE id = $1', [camionId]);
    if (!camion.rows[0]) return fail(res, 404, 'El camión no existe');

    const insp = await pool.query(
      "SELECT id FROM usuarios WHERE id = $1 AND rol = 'inspector' AND activo",
      [inspectorId]
    );
    if (!insp.rows[0]) return fail(res, 404, 'El inspector no existe o está inactivo');

    const dup = await pool.query(
      "SELECT id FROM inspecciones WHERE camion_id = $1 AND estado IN ('PROGRAMADA', 'EN_PROGRESO')",
      [camionId]
    );
    if (dup.rows[0]) return fail(res, 409, 'Este camión ya tiene una inspección pendiente');

    const r = await pool.query(
      `INSERT INTO inspecciones (camion_id, inspector_id, fecha_programada, lugar)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [camionId, inspectorId, fecha.toISOString(), lugar]
    );
    res.status(201).json({ ok: true, id: r.rows[0].id });
  } catch (err) {
    console.error('POST /api/inspecciones error:', err);
    fail(res, 500, 'Error interno del servidor');
  }
});

// Cancelar una inspección pendiente
app.delete('/api/inspecciones/:id', auth, requireRol('supervisor'), async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) return fail(res, 400, 'Id inválido');
    const r = await pool.query(
      "DELETE FROM inspecciones WHERE id = $1 AND estado = 'PROGRAMADA' RETURNING id",
      [id]
    );
    if (!r.rows[0]) return fail(res, 409, 'Solo se pueden cancelar inspecciones en estado PROGRAMADA');
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/inspecciones/:id error:', err);
    fail(res, 500, 'Error interno del servidor');
  }
});

// ---------------------------------------------------------------- 404 y arranque
app.use((_req, res) => fail(res, 404, 'Ruta no encontrada'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`InspecCamión API escuchando en el puerto ${PORT}`));
