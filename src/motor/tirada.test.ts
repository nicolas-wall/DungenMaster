import { describe, expect, it } from 'vitest';
import { elegirValorDesventaja, elegirValorVentaja, resolverTirada } from './tirada.js';

describe('resolverTirada', () => {
  it('es éxito cuando el valor es igual al objetivo', () => {
    expect(resolverTirada(11, 11)).toBe(true);
  });

  it('es éxito cuando el valor es menor al objetivo', () => {
    expect(resolverTirada(5, 11)).toBe(true);
  });

  it('es fracaso cuando el valor supera el objetivo', () => {
    expect(resolverTirada(12, 11)).toBe(false);
  });

  it('un 20 solo tiene éxito si el objetivo es 20', () => {
    expect(resolverTirada(20, 20)).toBe(true);
    expect(resolverTirada(20, 19)).toBe(false);
  });

  it('rechaza valores fuera del rango de un d20', () => {
    expect(() => resolverTirada(0, 10)).toThrow();
    expect(() => resolverTirada(21, 10)).toThrow();
    expect(() => resolverTirada(1.5, 10)).toThrow();
  });
});

describe('elegirValorVentaja', () => {
  it('toma el menor de los dos dados', () => {
    expect(elegirValorVentaja([15, 4])).toBe(4);
    expect(elegirValorVentaja([4, 15])).toBe(4);
  });
});

describe('elegirValorDesventaja', () => {
  it('toma el mayor de los dos dados', () => {
    expect(elegirValorDesventaja([15, 4])).toBe(15);
    expect(elegirValorDesventaja([4, 15])).toBe(15);
  });
});
