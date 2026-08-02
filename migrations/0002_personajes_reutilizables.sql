-- Los personajes dejan de pertenecer a una sola campaña: ahora son una
-- identidad reutilizable ("Bruno, el guardián de mi hijo") que se puede
-- llevar a distintas partidas, acumulando capitulos_jugados y progresión.
-- Lo que sigue siendo específico de cada partida (npc, hilo, flag, capitulo)
-- no se toca.

CREATE TABLE campania_personaje (
  campania_id TEXT NOT NULL REFERENCES campania(id),
  personaje_id TEXT NOT NULL REFERENCES personaje(id),
  PRIMARY KEY (campania_id, personaje_id)
);

INSERT INTO campania_personaje (campania_id, personaje_id)
SELECT campania_id, id FROM personaje;

ALTER TABLE personaje DROP COLUMN campania_id;
