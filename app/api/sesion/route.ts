import { db } from '../../../src/db/singleton.js';
import * as repo from '../../../src/db/repo.js';
import { crearLLMProvider } from '../../../src/llm/provider.js';
import { generarRecap } from '../../../src/llm/loop.js';
import { sintetizarNarracion } from '../../../src/voz/sintesis.js';

export const runtime = 'nodejs';

/**
 * Se llama una vez al abrir la app (sesión = pausa física, sin significado
 * narrativo). Cierra cualquier sesión que haya quedado abierta, abre una
 * nueva, y si el capítulo ya tenía turnos jugados, genera el recap de
 * "la última vez..." con voz.
 */
export async function POST(): Promise<Response> {
  const database = db();

  const campania = repo.campaniaMasReciente(database);
  if (!campania) {
    return Response.json({ error: 'No hay ninguna campaña creada todavía. Corré "npm run seed" primero.' }, { status: 400 });
  }

  const capitulo = repo.capituloEnCursoDeCampania(database, campania.id);
  if (!capitulo) {
    return Response.json({ error: 'La campaña no tiene ningún capítulo en curso.' }, { status: 400 });
  }

  const huboTurnosAntes = repo.ultimosTurnos(database, capitulo.id, 1).length > 0;

  const sesionPrevia = repo.sesionAbierta(database, capitulo.id);
  if (sesionPrevia) repo.cerrarSesion(database, sesionPrevia.id);
  repo.abrirSesion(database, capitulo.id);

  if (!huboTurnosAntes) {
    return Response.json({ narracion: null, audio: [], recap: false });
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
    const resultado = await generarRecap(provider, { db: database, campaniaId: campania.id, capituloId: capitulo.id });

    const audio: { voz: string; texto: string; audioBase64: string }[] = [];
    try {
      for await (const segmento of sintetizarNarracion(database, campania.id, resultado.narracion)) {
        audio.push(segmento);
      }
    } catch (err) {
      console.error('TTS del recap falló, se devuelve solo texto:', err);
    }

    return Response.json({
      narracion: resultado.narracion,
      audio,
      recap: true,
      proveedor: resultado.proveedor,
      tokens: { in: resultado.tokensIn, out: resultado.tokensOut },
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
