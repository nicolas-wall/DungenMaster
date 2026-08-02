/**
 * Corta un stream de tokens por oración para poder mandar cada oración a
 * TTS apenas está completa, en vez de esperar a que termine todo el turno.
 * No es una optimización: en serie el silencio percibido es ~7s por turno,
 * con chunking baja a ~2.5s.
 */
export async function* porOracion(stream: AsyncIterable<string>): AsyncGenerator<string> {
  let buf = '';
  for await (const tok of stream) {
    buf += tok;
    let m: RegExpExecArray | null;
    while ((m = /[.!?…]["»]?\s/.exec(buf))) {
      const corte = m.index + m[0].length;
      const oracion = buf.slice(0, corte).trim();
      buf = buf.slice(corte);
      if (oracion.length > 3) yield oracion;
    }
  }
  if (buf.trim()) yield buf.trim();
}

/** Wrapper para cortar por oración un texto ya completo (no streameado). */
export async function* porOracionDeTexto(texto: string): AsyncGenerator<string> {
  async function* unico() {
    yield texto;
  }
  yield* porOracion(unico());
}
