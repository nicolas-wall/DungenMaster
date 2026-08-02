import { describe, expect, it } from 'vitest';
import { asignarVozNpc, vozNarrador } from './voces.js';

describe('asignarVozNpc', () => {
  it('es determinística: el mismo nombre siempre da la misma voz', () => {
    expect(asignarVozNpc('Pispo')).toBe(asignarVozNpc('Pispo'));
  });

  it('nombres distintos pueden dar voces distintas dentro del pool', () => {
    const voces = new Set(['Pispo', 'Doña Berta', 'El alcalde Tobías', 'Cuco'].map(asignarVozNpc));
    expect(voces.size).toBeGreaterThan(1);
  });
});

describe('vozNarrador', () => {
  it('devuelve un id de voz no vacío', () => {
    expect(vozNarrador().length).toBeGreaterThan(0);
  });
});
