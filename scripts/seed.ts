import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { abrirDb } from '../src/db/client.js';
import { crearCampania, crearCapitulo, crearPersonaje, pasarTurno } from '../src/db/repo.js';

const rutaDb = process.env.DB_PATH ?? path.resolve('data/campania.db');
mkdirSync(path.dirname(rutaDb), { recursive: true });

const db = abrirDb(rutaDb);

const campania = crearCampania(db, 'La cueva del duende');

const capitulo = crearCapitulo(db, {
  campaniaId: campania.id,
  numero: 1,
  titulo: 'La cueva del duende',
  escenasTotal: 8,
});

const bruno = crearPersonaje(db, {
  campaniaId: campania.id,
  jugador: 'hijo',
  nombre: 'Bruno',
  arquetipo: 'guardian',
  fuerza: 12,
  astucia: 10,
  corazon: 8,
  debilidad: 'Le tiene miedo a la oscuridad',
});

const elian = crearPersonaje(db, {
  campaniaId: campania.id,
  jugador: 'papa',
  nombre: 'Elián',
  arquetipo: 'explorador',
  fuerza: 10,
  astucia: 12,
  corazon: 8,
  debilidad: 'No puede decir que no a un desafío',
});

pasarTurno(db, capitulo.id, bruno.id);

console.log('Campaña creada:', campania.titulo, `(${campania.id})`);
console.log('Capítulo:', capitulo.titulo, `— ${capitulo.escenas_total} escenas`);
console.log('Personajes:');
console.log(`  - ${bruno.nombre} (${bruno.id}) — HP ${bruno.hp}/${bruno.hp_max}`);
console.log(`  - ${elian.nombre} (${elian.id}) — HP ${elian.hp}/${elian.hp_max}`);
console.log('Turno inicial:', bruno.nombre);
console.log('DB en:', rutaDb);
