import { describe, expect, it } from 'vitest';
import { aplicarDano, curar, revivirFueraDeCombate } from './dano.js';

describe('aplicarDano', () => {
  it('resta el daño del HP actual', () => {
    expect(aplicarDano(6, 2)).toEqual({ hpNuevo: 4, fueraDeCombate: false });
  });

  it('nunca baja de 0', () => {
    expect(aplicarDano(3, 10)).toEqual({ hpNuevo: 0, fueraDeCombate: true });
  });

  it('marca fuera de combate exactamente en 0, nunca "muerto"', () => {
    expect(aplicarDano(4, 4)).toEqual({ hpNuevo: 0, fueraDeCombate: true });
  });

  it('rechaza daño negativo', () => {
    expect(() => aplicarDano(6, -1)).toThrow();
  });
});

describe('curar', () => {
  it('suma HP sin superar el máximo', () => {
    expect(curar(2, 3, 6)).toBe(5);
    expect(curar(4, 10, 6)).toBe(6);
  });

  it('rechaza curación negativa', () => {
    expect(() => curar(2, -1, 6)).toThrow();
  });
});

describe('revivirFueraDeCombate', () => {
  it('vuelve con 1 HP si estaba en 0', () => {
    expect(revivirFueraDeCombate(0)).toBe(1);
  });

  it('no toca el HP si no estaba fuera de combate', () => {
    expect(revivirFueraDeCombate(3)).toBe(3);
  });
});
