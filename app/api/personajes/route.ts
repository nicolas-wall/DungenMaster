import { db } from '../../../src/db/singleton.js';
import * as repo from '../../../src/db/repo.js';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const database = db();
  const personajes = repo.listarPersonajesGlobales(database).map((p) => ({
    ...p,
    items: repo.itemsDePersonaje(database, p.id),
    campanias: repo.campaniasDePersonaje(database, p.id).map((c) => ({ id: c.id, titulo: c.titulo })),
  }));
  return Response.json({ personajes });
}
