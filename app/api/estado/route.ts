import { db } from '../../../src/db/singleton.js';
import * as repo from '../../../src/db/repo.js';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  const database = db();

  const campaniaIdParam = new URL(request.url).searchParams.get('campaniaId');
  let campania: repo.Campania | null;
  if (campaniaIdParam) {
    try {
      campania = repo.obtenerCampania(database, campaniaIdParam);
    } catch {
      campania = null;
    }
  } else {
    campania = repo.campaniaMasReciente(database);
  }

  if (!campania) return Response.json({ lista: false });

  const capitulo = repo.capituloEnCursoDeCampania(database, campania.id);
  if (!capitulo) return Response.json({ lista: false });

  const personajes = repo.personajesDeCampania(database, campania.id);
  const flags = repo.obtenerFlags(database, campania.id);
  const objetivoPendiente = flags['_tirada_pendiente_objetivo'];

  return Response.json({
    lista: true,
    campania: { id: campania.id, titulo: campania.titulo },
    capitulo: { escena_actual: capitulo.escena_actual, escenas_total: capitulo.escenas_total, turno_actual: capitulo.turno_actual },
    personajes: personajes.map((p) => ({ id: p.id, nombre: p.nombre, hp: p.hp, hp_max: p.hp_max })),
    tirada_pendiente: objetivoPendiente ? Number.parseInt(objetivoPendiente, 10) : null,
  });
}
