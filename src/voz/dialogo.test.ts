import { describe, expect, it } from 'vitest';
import { segmentarDialogo } from './dialogo.js';

describe('segmentarDialogo', () => {
  it('separa texto narrado de diálogo etiquetado', () => {
    const segmentos = segmentarDialogo('El duende grita: [voz:pispo] ¡Eso es mío! [/voz] y sale corriendo.', 'narrador');
    expect(segmentos).toEqual([
      { voz: 'narrador', texto: 'El duende grita:' },
      { voz: 'pispo', texto: '¡Eso es mío!' },
      { voz: 'narrador', texto: 'y sale corriendo.' },
    ]);
  });

  it('texto sin etiquetas es todo narrador', () => {
    expect(segmentarDialogo('Todo esto es narración.', 'narrador')).toEqual([
      { voz: 'narrador', texto: 'Todo esto es narración.' },
    ]);
  });

  it('soporta múltiples NPCs distintos en el mismo texto', () => {
    const segmentos = segmentarDialogo(
      '[voz:pispo] Hola. [/voz] dice uno. [voz:alcalde] Y adiós. [/voz]',
      'narrador',
    );
    expect(segmentos.map((s) => s.voz)).toEqual(['pispo', 'narrador', 'alcalde']);
  });
});
