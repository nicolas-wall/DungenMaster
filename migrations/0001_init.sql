CREATE TABLE campania (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  cronica TEXT NOT NULL DEFAULT '',
  creada_en INTEGER NOT NULL
);

CREATE TABLE capitulo (
  id TEXT PRIMARY KEY,
  campania_id TEXT NOT NULL REFERENCES campania(id),
  numero INTEGER NOT NULL,
  titulo TEXT,
  escenas_total INTEGER NOT NULL,
  escena_actual INTEGER NOT NULL DEFAULT 1,
  resumen TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'en_curso' CHECK (estado IN ('en_curso', 'cerrado')),
  hilo_semilla_id TEXT REFERENCES hilo(id),
  turno_actual TEXT REFERENCES personaje(id),
  escena_desc TEXT,
  cerrado_en INTEGER
);

CREATE TABLE sesion (
  id TEXT PRIMARY KEY,
  capitulo_id TEXT NOT NULL REFERENCES capitulo(id),
  inicio INTEGER NOT NULL,
  fin INTEGER,
  escena_inicio INTEGER NOT NULL,
  escena_fin INTEGER
);

CREATE TABLE personaje (
  id TEXT PRIMARY KEY,
  campania_id TEXT NOT NULL REFERENCES campania(id),
  jugador TEXT NOT NULL CHECK (jugador IN ('papa', 'hijo')),
  nombre TEXT NOT NULL,
  arquetipo TEXT NOT NULL,
  fuerza INTEGER NOT NULL CHECK (fuerza BETWEEN 8 AND 16),
  astucia INTEGER NOT NULL CHECK (astucia BETWEEN 8 AND 16),
  corazon INTEGER NOT NULL CHECK (corazon BETWEEN 8 AND 16),
  hp INTEGER NOT NULL,
  hp_max INTEGER NOT NULL DEFAULT 6,
  debilidad TEXT,
  capitulos_jugados INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE item (
  id TEXT PRIMARY KEY,
  personaje_id TEXT NOT NULL REFERENCES personaje(id),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  usos INTEGER
);

CREATE TABLE npc (
  id TEXT PRIMARY KEY,
  campania_id TEXT NOT NULL REFERENCES campania(id),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT NOT NULL DEFAULT 'vivo' CHECK (estado IN ('vivo', 'huido', 'derrotado', 'aliado')),
  hp INTEGER,
  voz_id TEXT
);

CREATE TABLE hilo (
  id TEXT PRIMARY KEY,
  campania_id TEXT NOT NULL REFERENCES campania(id),
  descripcion TEXT NOT NULL,
  origen TEXT NOT NULL CHECK (origen IN ('jugador', 'dm')),
  personaje_id TEXT REFERENCES personaje(id),
  estado TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'usado', 'cerrado')),
  creado_cap INTEGER NOT NULL
);

CREATE TABLE flag (
  campania_id TEXT NOT NULL REFERENCES campania(id),
  clave TEXT NOT NULL,
  valor TEXT NOT NULL,
  PRIMARY KEY (campania_id, clave)
);

CREATE TABLE turno (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  capitulo_id TEXT NOT NULL REFERENCES capitulo(id),
  autor TEXT NOT NULL,
  texto TEXT NOT NULL,
  proveedor TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  creado_en INTEGER NOT NULL
);
