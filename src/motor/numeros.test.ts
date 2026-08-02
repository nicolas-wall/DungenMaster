import { describe, expect, it } from 'vitest';
import { parseNumeroHablado } from './numeros.js';

describe('parseNumeroHablado', () => {
  it('parsea números en dígitos', () => {
    expect(parseNumeroHablado('14')).toBe(14);
    expect(parseNumeroHablado('1')).toBe(1);
    expect(parseNumeroHablado('20')).toBe(20);
  });

  it('parsea números en palabras', () => {
    expect(parseNumeroHablado('catorce')).toBe(14);
    expect(parseNumeroHablado('Catorce')).toBe(14);
    expect(parseNumeroHablado('uno')).toBe(1);
    expect(parseNumeroHablado('veinte')).toBe(20);
  });

  it('ignora acentos', () => {
    expect(parseNumeroHablado('dieciséis')).toBe(16);
    expect(parseNumeroHablado('dieciseis')).toBe(16);
  });

  it('extrae el número de una frase completa', () => {
    expect(parseNumeroHablado('saqué catorce')).toBe(14);
    expect(parseNumeroHablado('me salió un dieciséis en el dado')).toBe(16);
    expect(parseNumeroHablado('creo que fue un 7')).toBe(7);
  });

  it('devuelve null si no encuentra un número válido', () => {
    expect(parseNumeroHablado('no sé qué me salió')).toBeNull();
    expect(parseNumeroHablado('')).toBeNull();
    expect(parseNumeroHablado('treinta')).toBeNull(); // fuera del rango de un d20
    expect(parseNumeroHablado('0')).toBeNull();
    expect(parseNumeroHablado('25')).toBeNull();
  });
});
