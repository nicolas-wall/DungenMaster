import { db } from '../../../src/db/singleton.js';
import * as repo from '../../../src/db/repo.js';
import { crearLLMProvider } from '../../../src/llm/provider.js';
import { correrTurno } from '../../../src/llm/loop.js';
import { sintetizarNarracion } from '../../../src/voz/sintesis.js';
import { transcribir } from '../../../src/voz/whisper.js';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  const database = db();

  let texto: string;
  let autorId: string;
  let campaniaIdParam: string | undefined;

  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const cuerpo = (await request.json()) as { texto?: string; autorId?: string; campaniaId?: string };
    if (!cuerpo.texto || !cuerpo.autorId) {
      return Response.json({ error: 'faltan "texto" y "autorId" en el body' }, { status: 400 });
    }
    texto = cuerpo.texto;
    autorId = cuerpo.autorId;
    campaniaIdParam = cuerpo.campaniaId;
  } else if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const audio = form.get('audio');
    autorId = String(form.get('autorId') ?? '');
    campaniaIdParam = form.get('campaniaId') ? String(form.get('campaniaId')) : undefined;
    if (!(audio instanceof Blob) || !autorId) {
      return Response.json({ error: 'faltan "audio" y "autorId" en el form-data' }, { status: 400 });
    }
    const buffer = Buffer.from(await audio.arrayBuffer());
    const transcripcion = await transcribir(buffer, 'es');
    texto = transcripcion || '(dijo algo que no se entendió del todo, interpretá la opción más plausible)';
  } else {
    return Response.json({ error: `content-type no soportado: ${contentType}` }, { status: 400 });
  }

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

  if (!campania) {
    return Response.json(
      { error: 'No hay ninguna campaña creada todavía. Corré "npm run seed" primero.' },
      { status: 400 },
    );
  }

  const capitulo = repo.capituloEnCursoDeCampania(database, campania.id);
  if (!capitulo) {
    return Response.json({ error: 'La campaña no tiene ningún capítulo en curso.' }, { status: 400 });
  }

  let provider;
  try {
    provider = crearLLMProvider();
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'no se pudo crear el proveedor LLM' },
      { status: 500 },
    );
  }

  try {
    const resultado = await correrTurno(
      provider,
      { db: database, campaniaId: campania.id, capituloId: capitulo.id },
      texto,
      autorId,
    );

    const audio: { voz: string; texto: string; audioBase64: string }[] = [];
    try {
      for await (const segmento of sintetizarNarracion(database, campania.id, resultado.narracion)) {
        audio.push(segmento);
      }
    } catch (err) {
      // La síntesis de voz es una capa adicional sobre el texto: si Piper
      // no está disponible todavía, el turno sigue siendo válido en texto.
      console.error('TTS falló, se devuelve solo texto:', err);
    }

    const capituloActualizado = repo.obtenerCapitulo(database, capitulo.id);

    return Response.json({
      texto_jugador: texto,
      narracion: resultado.narracion,
      audio,
      tools_ejecutadas: resultado.toolsEjecutadas,
      turno_actual: capituloActualizado.turno_actual,
      proveedor: resultado.proveedor,
      tokens: { in: resultado.tokensIn, out: resultado.tokensOut },
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
