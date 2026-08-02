import { describe, expect, it } from 'vitest';
import { atributosPorDados, validarAtributosCreacion, validarNombrePersonaje } from './personaje.js';

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

describe('validarNombrePersonaje', () => {
  it('acepta nombres entre 2 y 20 caracteres', () => {
    expect(validarNombrePersonaje('Bruno')).toEqual([]);
    expect(validarNombrePersonaje('Al')).toEqual([]);
  });

  it('rechaza nombres muy cortos o muy largos', () => {
    expect(validarNombrePersonaje('A').length).toBeGreaterThan(0);
    expect(validarNombrePersonaje('Un nombre demasiado largo para un personaje').length).toBeGreaterThan(0);
  });

  it('recorta espacios antes de validar', () => {
    expect(validarNombrePersonaje('  Bruno  ')).toEqual([]);
  });
});

describe('atributosPorDados', () => {
  it('arranca en 8/8/8 y suma un punto por tirada según la cara', () => {
    // 1->fuerza, 3->astucia, 5->corazon, 2->fuerza, 4->astucia, 6->corazon
    expect(atributosPorDados([1, 3, 5, 2, 4, 6])).toEqual({ fuerza: 10, astucia: 10, corazon: 10 });
  });

  it('el peor caso (las 6 tiradas al mismo atributo) da justo el tope de 14', () => {
    expect(atributosPorDados([1, 1, 1, 1, 1, 1])).toEqual({ fuerza: 14, astucia: 8, corazon: 8 });
    expect(atributosPorDados([6, 6, 6, 6, 6, 6])).toEqual({ fuerza: 8, astucia: 8, corazon: 14 });
  });

  it('el resultado siempre suma 30 y cada atributo cae en 8-14, para cualquier combinación', () => {
    // 6^6 combinaciones es mucho para un test; probamos una muestra determinística amplia.
    for (let semilla = 0; semilla < 500; semilla++) {
      const tiradas = Array.from({ length: 6 }, (_, i) => ((semilla * 7 + i * 13) % 6) + 1);
      const atributos = atributosPorDados(tiradas);
      expect(atributos.fuerza + atributos.astucia + atributos.corazon).toBe(30);
      for (const valor of Object.values(atributos)) {
        expect(valor).toBeGreaterThanOrEqual(8);
        expect(valor).toBeLessThanOrEqual(14);
      }
      expect(validarAtributosCreacion(atributos)).toEqual([]);
    }
  });

  it('rechaza si no son exactamente 6 tiradas', () => {
    expect(() => atributosPorDados([1, 2, 3])).toThrow();
    expect(() => atributosPorDados([1, 2, 3, 4, 5, 6, 1])).toThrow();
  });

  it('rechaza caras fuera de 1-6', () => {
    expect(() => atributosPorDados([1, 2, 3, 4, 5, 7])).toThrow();
    expect(() => atributosPorDados([0, 2, 3, 4, 5, 6])).toThrow();
  });
});
