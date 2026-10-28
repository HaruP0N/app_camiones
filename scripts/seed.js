// Recrea el esquema y carga datos de demostración.  Uso:  npm run seed
// ⚠ Borra y vuelve a crear todas las tablas.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const bcrypt = require('bcryptjs');

const pool = require('../src/db');
const { calcularResultado } = require('../src/rules');

// ---------------------------------------------------------------- catálogo (16 ítems)
const CATALOGO = [
  ['N1-01', 1, 'Frenos', 'Fugas de aire en frenos'],
  ['N1-02', 1, 'Frenos', 'Pastillas de freno dentro del límite de desgaste'],
  ['N1-03', 1, 'Neumáticos', 'Profundidad de banda de rodadura sobre el mínimo legal'],
  ['N1-04', 1, 'Acople', 'Quinta rueda sin holguras ni fisuras visibles'],
  ['N2-01', 2, 'Luces y señalización', 'Luces de freno y de posición operativas'],
  ['N2-02', 2, 'Suspensión', 'Amortiguadores sin fugas ni daños visibles'],
  ['N2-03', 2, 'Fluidos', 'Sin fugas visibles de aceite o combustible'],
  ['N2-04', 2, 'Seguridad', 'Extintor vigente y accesible'],
  ['N3-01', 3, 'Neumáticos', 'Presión de inflado correcta'],
  ['N3-02', 3, 'Cabina', 'Espejos y parabrisas sin daños'],
  ['N3-03', 3, 'Sistema eléctrico', 'Batería y bornes en buen estado'],
  ['N3-04', 3, 'Accesos', 'Peldaños y pasamanos firmes'],
  ['N4-01', 4, 'Estético', 'Pintura y carrocería sin daños mayores'],
  ['N4-02', 4, 'Cabina', 'Asientos y tapiz en buen estado'],
  ['N4-03', 4, 'Estético', 'Limpieza general del vehículo'],
  ['N4-04', 4, 'Estético', 'Patente y rotulado legibles'],
];

const USUARIOS = [
  ['Patricia Núñez', 'supervisor@inspeccamion.cl', 'supervisor123', 'supervisor'],
  ['Diego Contreras', 'inspector1@inspeccamion.cl', 'inspector123', 'inspector'],
  ['Camila Fuentes', 'inspector2@inspeccamion.cl', 'inspector123', 'inspector'],
];

const CAMIONES = [
  ['HXRT42', 'Volvo', 'FH 460', 2022, 'RIFER', 'Frutícola Maule'],
  ['JKPS17', 'Scania', 'R450', 2020, 'TRACTO', 'Transportes del Sur'],
  ['RGTL88', 'Mercedes-Benz', 'Actros 2645', 2021, 'PAQUETERO', 'Logística Talca'],
  ['BTNF05', 'Volvo', 'FH 540', 2019, 'CARRO', 'Frutícola Maule'],
  ['PLWC31', 'Freightliner', 'Cascadia', 2023, 'RIFER', 'Agrícola Curicó'],
  ['KSDV76', 'Scania', 'G410', 2018, 'PAQUETERO', 'Transportes del Sur'],
];

// ---------------------------------------------------------------- imagen de evidencia de ejemplo (PNG generado)
function crc32(buf) {
  let c;
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function pngPlaceholder(w = 320, h = 220) {
  const row = Buffer.alloc(1 + w * 3);
  const raw = Buffer.alloc(row.length * h);
  for (let y = 0; y < h; y++) {
    const off = y * row.length;
    raw[off] = 0; // filtro "none"
    for (let x = 0; x < w; x++) {
      const t = y / h;
      const stripe = Math.floor((x + y) / 16) % 2 === 0;
      raw[off + 1 + x * 3] = Math.round(43 + t * 20 + (stripe ? 12 : 0)); // R
      raw[off + 2 + x * 3] = Math.round(53 + t * 20 + (stripe ? 12 : 0)); // G
      raw[off + 3 + x * 3] = Math.round(66 + t * 20 + (stripe ? 12 : 0)); // B
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // profundidad
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- helpers
const dias = (n, hora = 9) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hora, 0, 0, 0);
  return d.toISOString();
};

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('✔ Esquema creado');

  for (const [id, nivel, seccion, titulo] of CATALOGO) {
    await pool.query('INSERT INTO items_catalogo (id, nivel, seccion, titulo) VALUES ($1,$2,$3,$4)', [id, nivel, seccion, titulo]);
  }

  const ids = {};
  for (const [nombre, email, pass, rol] of USUARIOS) {
    const r = await pool.query(
      'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1,$2,$3,$4) RETURNING id',
      [nombre, email, await bcrypt.hash(pass, 10), rol]
    );
    ids[email] = r.rows[0].id;
  }
  const insp1 = ids['inspector1@inspeccamion.cl'];
  const insp2 = ids['inspector2@inspeccamion.cl'];

  const cam = {};
  for (const [patente, marca, modelo, anio, carroceria, empresa] of CAMIONES) {
    const r = await pool.query(
      'INSERT INTO camiones (patente, marca, modelo, anio, carroceria, empresa) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [patente, marca, modelo, anio, carroceria, empresa]
    );
    cam[patente] = r.rows[0].id;
  }

  // Inspecciones pendientes (para la demo del inspector)
  const pendientes = [
    [cam.HXRT42, insp1, dias(0, 8), 'Planta Talca', 'PROGRAMADA'],
    [cam.JKPS17, insp1, dias(0, 10), 'Bodega Curicó', 'PROGRAMADA'],
    [cam.RGTL88, insp1, dias(1, 9), 'Planta Talca', 'PROGRAMADA'],
    [cam.PLWC31, insp2, dias(1, 11), 'Packing Molina', 'PROGRAMADA'],
  ];
  for (const [camion, inspector, fecha, lugar, estado] of pendientes) {
    await pool.query(
      'INSERT INTO inspecciones (camion_id, inspector_id, fecha_programada, lugar, estado) VALUES ($1,$2,$3,$4,$5)',
      [camion, inspector, fecha, lugar, estado]
    );
  }

  // Inspecciones completadas (historial) con distintos resultados
  const catalogoRows = CATALOGO.map(([id, nivel]) => ({ id, nivel }));
  const png = pngPlaceholder();
  const completadas = [
    // [camión, inspector, días atrás, lugar, { itemFalla: descripción }, observaciones]
    [cam.BTNF05, insp1, -3, 'Planta Talca', {}, 'Vehículo en buen estado general.'],
    [cam.KSDV76, insp2, -5, 'Bodega Curicó', { 'N2-01': 'Luz de freno izquierda intermitente', 'N3-01': 'Presión baja en neumáticos del eje trasero' }, 'Corregir luces antes de la próxima ruta.'],
    [cam.HXRT42, insp1, -9, 'Planta Talca', { 'N1-03': 'Neumático trasero derecho bajo el mínimo legal', 'N4-03': 'Cabina con suciedad acumulada' }, 'No debe circular hasta cambiar el neumático.'],
  ];

  for (const [camion, inspector, offset, lugar, fallas, obs] of completadas) {
    const detalles = CATALOGO.map(([item]) => ({
      item_id: item,
      estado: fallas[item] ? 'no_cumple' : item === 'N1-04' && camion === cam.BTNF05 ? 'no_aplica' : 'cumple',
    }));
    const { nota, resultado } = calcularResultado(detalles, catalogoRows);
    const fecha = dias(offset, 9);
    const r = await pool.query(
      `INSERT INTO inspecciones (camion_id, inspector_id, fecha_programada, fecha_completacion, lugar, estado, resultado, nota_final, observaciones)
       VALUES ($1,$2,$3,$3,$4,'COMPLETADA',$5,$6,$7) RETURNING id`,
      [camion, inspector, fecha, lugar, resultado, nota, obs]
    );
    const inspId = r.rows[0].id;
    for (const d of detalles) {
      const dr = await pool.query(
        `INSERT INTO detalle_inspeccion (inspeccion_id, item_id, estado, descripcion_falla, motivo_no_aplica)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [inspId, d.item_id, d.estado, fallas[d.item_id] || null, d.estado === 'no_aplica' ? 'Vehículo sin quinta rueda (carro rígido)' : null]
      );
      if (d.estado === 'no_cumple') {
        await pool.query('INSERT INTO fotos_inspeccion (detalle_id, mime, datos) VALUES ($1,$2,$3)', [dr.rows[0].id, 'image/png', png]);
      }
    }
  }

  console.log('✔ Datos de demostración cargados');
  console.log('\nUsuarios de prueba:');
  for (const [nombre, email, pass, rol] of USUARIOS) console.log(`  ${rol.padEnd(10)} ${email}  /  ${pass}   (${nombre})`);
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error('✖ Error en el seed:', err.message);
    pool.end();
    process.exit(1);
  });
