import { describe, expect, it } from 'vitest';
import { porOracion, porOracionDeTexto } from './oraciones.js';

async function* fake(tokens: string[]) {
  for (const t of tokens) yield t;
}

describe('porOracion', () => {
  it('corta en cada oración completa', async () => {
    const oraciones: string[] = [];
    for await (const o of porOracion(fake(['Hola', ' mundo.', ' ¿Cómo', ' estás?']))) {
      oraciones.push(o);
    }
    expect(oraciones).toEqual(['Hola mundo.', '¿Cómo estás?']);
  });

  it('entrega el resto del buffer al final aunque no termine en puntuación', async () => {
    const oraciones: string[] = [];
    for await (const o of porOracion(fake(['Una.', ' Y esto queda suelto']))) {
      oraciones.push(o);
    }
    expect(oraciones).toEqual(['Una.', 'Y esto queda suelto']);
  });

  it('ignora fragmentos de menos de 4 caracteres', async () => {
    const oraciones: string[] = [];
    for await (const o of porOracion(fake(['Sí. ', 'Bien.']))) {
      oraciones.push(o);
    }
    expect(oraciones).toEqual(['Bien.']);
  });
});

describe('porOracionDeTexto', () => {
  it('corta un texto ya completo por oración', async () => {
    const oraciones: string[] = [];
    for await (const o of porOracionDeTexto('Primera oración. Segunda oración.')) {
      oraciones.push(o);
    }
    expect(oraciones).toEqual(['Primera oración.', 'Segunda oración.']);
  });
});
