import type Database from 'better-sqlite3';
import * as repo from '../db/repo.js';
import { porOracionDeTexto } from './oraciones.js';
import { segmentarDialogo } from './dialogo.js';
import { sintetizar } from './piper.js';
import { vozNarrador } from './voces.js';

export interface SegmentoAudio {
  voz: string;
  texto: string;
  audioBase64: string;
}

/** El modelo etiqueta diálogo con el nombre del NPC; acá se resuelve a un voz_id real de Piper. */
function resolverVozId(db: Database.Database, campaniaId: string, etiqueta: string): string {
  const narrador = vozNarrador();
  if (etiqueta.toLowerCase() === 'narrador') return narrador;

  const npcs = repo.npcsVivosDeCampania(db, campaniaId);
  const encontrado = npcs.find(
    (n) => n.nombre.toLowerCase() === etiqueta.toLowerCase() || n.id === etiqueta,
  );
  return encontrado?.voz_id ?? narrador;
}

/**
 * Recorre la narración oración por oración (para latencia percibida baja),
 * separa diálogo de NPC de narración, resuelve la voz real de cada tramo,
 * y sintetiza con Piper. Cada yield es un tramo de audio listo para
 * reproducir en orden — la cola de reproducción del cliente.
 */
export async function* sintetizarNarracion(
  db: Database.Database,
  campaniaId: string,
  texto: string,
): AsyncGenerator<SegmentoAudio> {
  const narrador = vozNarrador();

  for await (const oracion of porOracionDeTexto(texto)) {
    for (const segmento of segmentarDialogo(oracion, narrador)) {
      const vozId = segmento.voz === narrador ? narrador : resolverVozId(db, campaniaId, segmento.voz);
      const audio = await sintetizar(segmento.texto, vozId);
      yield { voz: vozId, texto: segmento.texto, audioBase64: audio.toString('base64') };
    }
  }
}
