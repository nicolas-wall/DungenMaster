import { describe, expect, it } from 'vitest';
import { validarAtributosCreacion } from './personaje.js';

describe('validarAtributosCreacion', () => {
  it('acepta un reparto válido de 30 puntos entre 8 y 14', () => {
    expect(validarAtributosCreacion({ fuerza: 12, astucia: 10, corazon: 8 })).toEqual([]);
  });

  it('acepta el reparto parejo', () => {
    expect(validarAtributosCreacion({ fuerza: 10, astucia: 10, corazon: 10 })).toEqual([]);
  });

  it('rechaza un atributo fuera de 8-14', () => {
    const errores = validarAtributosCreacion({ fuerza: 16, astucia: 8, corazon: 6 });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza si la suma no da 30', () => {
    const errores = validarAtributosCreacion({ fuerza: 10, astucia: 10, corazon: 9 });
    expect(errores.some((e) => e.includes('suma'))).toBe(true);
  });
});
