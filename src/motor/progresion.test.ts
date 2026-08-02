import { describe, expect, it } from 'vitest';
import { aplicarProgresion, type StatsPersonaje } from './progresion.js';

const base: StatsPersonaje = { fuerza: 10, astucia: 10, corazon: 10, hpMax: 6 };

describe('aplicarProgresion', () => {
  it('sube un atributo en 1', () => {
    const resultado = aplicarProgresion(base, { tipo: 'atributo', atributo: 'fuerza' });
    expect(resultado.fuerza).toBe(11);
    expect(resultado.astucia).toBe(10);
  });

  it('sube el HP máximo en 1', () => {
    const resultado = aplicarProgresion(base, { tipo: 'hp_max' });
    expect(resultado.hpMax).toBe(7);
  });

  it('no permite subir un atributo más allá de 16', () => {
    const stats: StatsPersonaje = { ...base, fuerza: 16 };
    expect(() => aplicarProgresion(stats, { tipo: 'atributo', atributo: 'fuerza' })).toThrow();
  });

  it('la elección "objeto" no toca stats', () => {
    expect(aplicarProgresion(base, { tipo: 'objeto' })).toEqual(base);
  });
});
