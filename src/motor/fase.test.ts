import { describe, expect, it } from 'vitest';
import { estadoRitmo, faseDeEscena } from './fase.js';

describe('faseDeEscena', () => {
  it('capítulo de 12 escenas sigue las proporciones del spec', () => {
    // 1/12 = 0.083 -> apertura ; 2/12 = 0.166 -> desarrollo
    expect(faseDeEscena(1, 12)).toBe('apertura');
    expect(faseDeEscena(2, 12)).toBe('desarrollo');
    expect(faseDeEscena(7, 12)).toBe('desarrollo'); // 0.583
    expect(faseDeEscena(8, 12)).toBe('escalada'); // 0.666
    expect(faseDeEscena(10, 12)).toBe('escalada'); // 0.833
    expect(faseDeEscena(11, 12)).toBe('climax'); // 0.916
    expect(faseDeEscena(12, 12)).toBe('cierre'); // 1.0
  });

  it('capítulo corto de 8 escenas', () => {
    expect(faseDeEscena(1, 8)).toBe('apertura');
    expect(faseDeEscena(4, 8)).toBe('desarrollo'); // 0.5
    expect(faseDeEscena(5, 8)).toBe('escalada'); // 0.625
    expect(faseDeEscena(7, 8)).toBe('climax'); // 0.875
    expect(faseDeEscena(8, 8)).toBe('cierre');
  });

  it('respeta los límites exactos de cada corte', () => {
    expect(faseDeEscena(15, 100)).toBe('apertura'); // 0.15
    expect(faseDeEscena(16, 100)).toBe('desarrollo');
    expect(faseDeEscena(60, 100)).toBe('desarrollo'); // 0.60
    expect(faseDeEscena(61, 100)).toBe('escalada');
    expect(faseDeEscena(85, 100)).toBe('escalada'); // 0.85
    expect(faseDeEscena(86, 100)).toBe('climax');
    expect(faseDeEscena(95, 100)).toBe('climax'); // 0.95
    expect(faseDeEscena(96, 100)).toBe('cierre');
  });

  it('rechaza escena o total inválidos', () => {
    expect(() => faseDeEscena(0, 12)).toThrow();
    expect(() => faseDeEscena(1, 0)).toThrow();
  });
});

describe('estadoRitmo', () => {
  it('arma el bloque de ritmo con fase, directiva y escenas restantes', () => {
    const estado = estadoRitmo(9, 12);
    expect(estado.fase).toBe('escalada');
    expect(estado.escenasRestantes).toBe(3);
    expect(estado.directiva.length).toBeGreaterThan(0);
  });

  it('escenas restantes nunca es negativo', () => {
    expect(estadoRitmo(12, 12).escenasRestantes).toBe(0);
  });
});
