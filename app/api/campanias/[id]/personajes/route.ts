import { db } from '../../../../../src/db/singleton.js';
import * as repo from '../../../../../src/db/repo.js';
import { validarAtributosCreacion, validarNombrePersonaje } from '../../../../../src/motor/personaje.js';
import { esArquetipoValido, esDebilidadValida, esItemDeArquetipoValido } from '../../../../../src/motor/arquetipos.js';

export const runtime = 'nodejs';

interface CuerpoPersonaje {
  personajeId?: string;
  jugador?: 'papa' | 'hijo';
  nombre?: string;
  arquetipo?: string;
  fuerza?: number;
  astucia?: number;
  corazon?: number;
  objetoElegido?: string;
  debilidad?: string;
}

function fijarTurnoInicial(database: ReturnType<typeof db>, campaniaId: string, personaje: repo.Personaje) {
  // El hijo arranca el turno por convención (ver scripts/seed.ts) — se fija
  // acá para que la pantalla nunca quede sin "TURNO" mientras el modelo
  // no llamó a pasar_turno todavía.
  if (personaje.jugador === 'hijo') {
    const capitulo = repo.capituloEnCursoDeCampania(database, campaniaId);
    if (capitulo) repo.pasarTurno(database, capitulo.id, personaje.id);
  }
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

  // --- Modo "usar un personaje ya creado" ---
  if (cuerpo.personajeId) {
    let personaje;
    try {
      personaje = repo.obtenerPersonaje(database, cuerpo.personajeId);
    } catch {
      return Response.json({ error: `personaje no encontrado: ${cuerpo.personajeId}` }, { status: 404 });
    }

    if (repo.personajesDeCampania(database, campaniaId).some((p) => p.jugador === personaje.jugador)) {
      return Response.json({ error: `ya existe un personaje para "${personaje.jugador}" en esta campaña` }, { status: 400 });
    }

    try {
      repo.vincularPersonajeACampania(database, campaniaId, personaje.id);
    } catch {
      return Response.json({ error: 'ese personaje ya está en esta campaña' }, { status: 400 });
    }

    const personajeCurado = repo.curarCompletamente(database, personaje.id);
    fijarTurnoInicial(database, campania.id, personajeCurado);

    return Response.json({ personaje: personajeCurado }, { status: 201 });
  }

  // --- Modo "crear un personaje nuevo" ---
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
    jugador: cuerpo.jugador!,
    nombre: cuerpo.nombre!.trim(),
    arquetipo: cuerpo.arquetipo!,
    fuerza: cuerpo.fuerza!,
    astucia: cuerpo.astucia!,
    corazon: cuerpo.corazon!,
    debilidad: cuerpo.debilidad,
  });
  repo.darItem(database, { personajeId: personaje.id, nombre: cuerpo.objetoElegido! });
  repo.vincularPersonajeACampania(database, campania.id, personaje.id);
  fijarTurnoInicial(database, campania.id, personaje);

  return Response.json({ personaje }, { status: 201 });
}
