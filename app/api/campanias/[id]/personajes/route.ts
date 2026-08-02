import { db } from '../../../../../src/db/singleton.js';
import * as repo from '../../../../../src/db/repo.js';
import { validarAtributosCreacion, validarNombrePersonaje } from '../../../../../src/motor/personaje.js';
import { esArquetipoValido, esDebilidadValida, esItemDeArquetipoValido } from '../../../../../src/motor/arquetipos.js';

export const runtime = 'nodejs';

interface CuerpoPersonaje {
  jugador?: 'papa' | 'hijo';
  nombre?: string;
  arquetipo?: string;
  fuerza?: number;
  astucia?: number;
  corazon?: number;
  objetoElegido?: string;
  debilidad?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: campaniaId } = await params;
  const database = db();

  let campania;
  try {
    campania = repo.obtenerCampania(database, campaniaId);
  } catch {
    return Response.json({ error: `campaña no encontrada: ${campaniaId}` }, { status: 404 });
  }

  const cuerpo = (await request.json()) as CuerpoPersonaje;
  const errores: string[] = [];

  if (cuerpo.jugador !== 'papa' && cuerpo.jugador !== 'hijo') {
    errores.push('jugador debe ser "papa" o "hijo"');
  } else if (repo.personajesDeCampania(database, campaniaId).some((p) => p.jugador === cuerpo.jugador)) {
    errores.push(`ya existe un personaje para "${cuerpo.jugador}" en esta campaña`);
  }

  if (typeof cuerpo.nombre !== 'string') {
    errores.push('falta nombre');
  } else {
    errores.push(...validarNombrePersonaje(cuerpo.nombre));
  }

  if (typeof cuerpo.arquetipo !== 'string' || !esArquetipoValido(cuerpo.arquetipo)) {
    errores.push('arquetipo inválido');
  }

  if (
    typeof cuerpo.fuerza !== 'number' ||
    typeof cuerpo.astucia !== 'number' ||
    typeof cuerpo.corazon !== 'number'
  ) {
    errores.push('faltan atributos (fuerza, astucia, corazon)');
  } else {
    errores.push(...validarAtributosCreacion({ fuerza: cuerpo.fuerza, astucia: cuerpo.astucia, corazon: cuerpo.corazon }));
  }

  if (
    typeof cuerpo.arquetipo === 'string' &&
    typeof cuerpo.objetoElegido === 'string' &&
    !esItemDeArquetipoValido(cuerpo.arquetipo, cuerpo.objetoElegido)
  ) {
    errores.push('el objeto elegido no pertenece a ese arquetipo');
  } else if (typeof cuerpo.objetoElegido !== 'string') {
    errores.push('falta objetoElegido');
  }

  if (typeof cuerpo.debilidad !== 'string' || !esDebilidadValida(cuerpo.debilidad)) {
    errores.push('debilidad inválida');
  }

  if (errores.length > 0) {
    return Response.json({ error: errores.join('; ') }, { status: 400 });
  }

  const personaje = repo.crearPersonaje(database, {
    campaniaId: campania.id,
    jugador: cuerpo.jugador!,
    nombre: cuerpo.nombre!.trim(),
    arquetipo: cuerpo.arquetipo!,
    fuerza: cuerpo.fuerza!,
    astucia: cuerpo.astucia!,
    corazon: cuerpo.corazon!,
    debilidad: cuerpo.debilidad,
  });
  repo.darItem(database, { personajeId: personaje.id, nombre: cuerpo.objetoElegido! });

  // El hijo arranca el turno por convención (ver scripts/seed.ts) — se fija
  // acá para que la pantalla nunca quede sin "TURNO" mientras el modelo
  // no llamó a pasar_turno todavía.
  if (personaje.jugador === 'hijo') {
    const capitulo = repo.capituloEnCursoDeCampania(database, campania.id);
    if (capitulo) repo.pasarTurno(database, capitulo.id, personaje.id);
  }

  return Response.json({ personaje }, { status: 201 });
}
