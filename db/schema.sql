-- InspecCamión · esquema PostgreSQL
-- Se ejecuta con: npm run seed  (ojo: borra y recrea las tablas)

DROP TABLE IF EXISTS fotos_inspeccion CASCADE;
DROP TABLE IF EXISTS detalle_inspeccion CASCADE;
DROP TABLE IF EXISTS inspecciones CASCADE;
DROP TABLE IF EXISTS items_catalogo CASCADE;
DROP TABLE IF EXISTS camiones CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

CREATE TABLE usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(150) NOT NULL,
  email         VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol           VARCHAR(20)  NOT NULL CHECK (rol IN ('inspector', 'supervisor')),
  activo        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE camiones (
  id         SERIAL PRIMARY KEY,
  patente    VARCHAR(15)  NOT NULL UNIQUE,
  marca      VARCHAR(50)  NOT NULL,
  modelo     VARCHAR(50)  NOT NULL,
  anio       INT,
  carroceria VARCHAR(30)  NOT NULL,
  empresa    VARCHAR(150),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Catálogo de ítems del checklist (nivel 1 = crítico ... 4 = bajo)
CREATE TABLE items_catalogo (
  id      VARCHAR(10)  PRIMARY KEY,
  nivel   SMALLINT     NOT NULL CHECK (nivel BETWEEN 1 AND 4),
  seccion VARCHAR(80)  NOT NULL,
  titulo  VARCHAR(200) NOT NULL
);

CREATE TABLE inspecciones (
  id                 SERIAL PRIMARY KEY,
  camion_id          INT         NOT NULL REFERENCES camiones(id),
  inspector_id       INT         NOT NULL REFERENCES usuarios(id),
  fecha_programada   TIMESTAMPTZ NOT NULL,
  fecha_completacion TIMESTAMPTZ,
  lugar              VARCHAR(150),
  estado             VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADA'
                     CHECK (estado IN ('PROGRAMADA', 'EN_PROGRESO', 'COMPLETADA')),
  resultado          VARCHAR(20) CHECK (resultado IN ('APROBADO', 'OBSERVACION', 'RECHAZADO')),
  nota_final         INT CHECK (nota_final BETWEEN 0 AND 100),
  observaciones      TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE detalle_inspeccion (
  id                SERIAL PRIMARY KEY,
  inspeccion_id     INT         NOT NULL REFERENCES inspecciones(id) ON DELETE CASCADE,
  item_id           VARCHAR(10) NOT NULL REFERENCES items_catalogo(id),
  estado            VARCHAR(20) NOT NULL CHECK (estado IN ('cumple', 'no_cumple', 'no_aplica')),
  descripcion_falla TEXT,
  motivo_no_aplica  TEXT,
  UNIQUE (inspeccion_id, item_id)
);

CREATE TABLE fotos_inspeccion (
  id         SERIAL PRIMARY KEY,
  detalle_id INT         NOT NULL REFERENCES detalle_inspeccion(id) ON DELETE CASCADE,
  mime       VARCHAR(50) NOT NULL,
  datos      BYTEA       NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insp_inspector ON inspecciones(inspector_id);
CREATE INDEX idx_insp_camion    ON inspecciones(camion_id);
CREATE INDEX idx_insp_estado    ON inspecciones(estado);
CREATE INDEX idx_det_insp       ON detalle_inspeccion(inspeccion_id);
CREATE INDEX idx_fotos_detalle  ON fotos_inspeccion(detalle_id);
