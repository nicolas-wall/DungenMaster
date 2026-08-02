import { describe, expect, it } from 'vitest';
import {
  ARQUETIPOS,
  DEBILIDADES,
  esArquetipoValido,
  esDebilidadValida,
  esItemDeArquetipoValido,
  obtenerArquetipo,
} from './arquetipos.js';

describe('arquetipos', () => {
  it('tiene los 4 arquetipos del spec, cada uno con 3 items', () => {
    expect(ARQUETIPOS).toHaveLength(4);
    for (const a of ARQUETIPOS) {
      expect(a.items).toHaveLength(3);
    }
  });

  it('obtenerArquetipo encuentra por id', () => {
    expect(obtenerArquetipo('guardian')?.nombre).toBe('Guardián');
    expect(obtenerArquetipo('inexistente')).toBeUndefined();
  });

  it('esArquetipoValido', () => {
    expect(esArquetipoValido('explorador')).toBe(true);
    expect(esArquetipoValido('mago')).toBe(false);
  });

  it('esItemDeArquetipoValido solo acepta items de ESE arquetipo', () => {
    expect(esItemDeArquetipoValido('guardian', 'Escudo de madera pintado')).toBe(true);
    expect(esItemDeArquetipoValido('guardian', 'Cuerda de 15 metros')).toBe(false);
  });
});

describe('debilidades', () => {
  it('tiene 5 debilidades', () => {
    expect(DEBILIDADES).toHaveLength(5);
  });

  it('esDebilidadValida rechaza texto libre', () => {
    expect(esDebilidadValida('Le tiene miedo a la oscuridad')).toBe(true);
    expect(esDebilidadValida('Le tiene miedo a los payasos')).toBe(false);
  });
});
