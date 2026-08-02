import { db } from '../../../src/db/singleton.js';
import * as repo from '../../../src/db/repo.js';

export const runtime = 'nodejs';

const ESCENAS_VALIDAS = [8, 12, 18];

export async function GET(): Promise<Response> {
  const campanias = repo.listarCampanias(db());
  return Response.json({ campanias });
}

export async function POST(request: Request): Promise<Response> {
  const cuerpo = (await request.json()) as { titulo?: string; escenasTotal?: number };
  const titulo = cuerpo.titulo?.trim();

  if (!titulo || titulo.length < 2 || titulo.length > 60) {
    return Response.json({ error: 'el título de la campaña debe tener entre 2 y 60 caracteres' }, { status: 400 });
  }

  const escenasTotal = cuerpo.escenasTotal ?? 12;
  if (!ESCENAS_VALIDAS.includes(escenasTotal)) {
    return Response.json({ error: `escenasTotal debe ser uno de ${ESCENAS_VALIDAS.join(', ')}` }, { status: 400 });
  }

  const database = db();
  const campania = repo.crearCampania(database, titulo);
  const capitulo = repo.crearCapitulo(database, { campaniaId: campania.id, numero: 1, escenasTotal });

  return Response.json({ campania, capitulo }, { status: 201 });
}
