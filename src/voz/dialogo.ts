export interface SegmentoDialogo {
  voz: string;
  texto: string;
}

const TAG_VOZ = /\[voz:([a-zA-Z0-9_-]+)\]([\s\S]*?)\[\/voz\]/g;

/**
 * El modelo etiqueta diálogo de NPC con [voz:ID] texto [/voz]. Todo lo
 * demás es narración, con la voz del narrador.
 */
export function segmentarDialogo(texto: string, vozNarrador: string): SegmentoDialogo[] {
  const segmentos: SegmentoDialogo[] = [];
  let cursor = 0;
  let m: RegExpExecArray | null;

  TAG_VOZ.lastIndex = 0;
  while ((m = TAG_VOZ.exec(texto))) {
    const antes = texto.slice(cursor, m.index).trim();
    if (antes) segmentos.push({ voz: vozNarrador, texto: antes });

    const dialogo = m[2].trim();
    if (dialogo) segmentos.push({ voz: m[1], texto: dialogo });

    cursor = m.index + m[0].length;
  }

  const resto = texto.slice(cursor).trim();
  if (resto) segmentos.push({ voz: vozNarrador, texto: resto });

  return segmentos;
}
