import { describe, expect, it } from 'vitest';
import { elegirHiloSemilla, puedeCerrarCapitulo, puedeRegistrarHilo, type HiloCandidato } from './hilos.js';

describe('puedeRegistrarHilo', () => {
  it('permite registrar en fase desarrollo con menos de 3 hilos', () => {
    expect(puedeRegistrarHilo('desarrollo', 1)).toEqual([]);
  });

  it('bloquea fuera de fase desarrollo', () => {
    const errores = puedeRegistrarHilo('escalada', 0);
    expect(errores.length).toBeGreaterThan(0);
  });

  it('bloquea al llegar a 3 hilos abiertos', () => {
    const errores = puedeRegistrarHilo('desarrollo', 3);
    expect(errores.length).toBeGreaterThan(0);
  });
});

describe('puedeCerrarCapitulo', () => {
  it('solo permite cerrar en fase cierre', () => {
    expect(puedeCerrarCapitulo('cierre')).toEqual([]);
    expect(puedeCerrarCapitulo('climax').length).toBeGreaterThan(0);
  });
});

describe('elegirHiloSemilla', () => {
  it('prioriza origen jugador sobre dm', () => {
    const hilos: HiloCandidato[] = [
      { id: 'dm-1', origen: 'dm', creadoCap: 1 },
      { id: 'jugador-1', origen: 'jugador', creadoCap: 2 },
    ];
    expect(elegirHiloSemilla(hilos)?.id).toBe('jugador-1');
  });

  it('entre hilos del mismo origen, el más antiguo primero', () => {
    const hilos: HiloCandidato[] = [
      { id: 'jugador-2', origen: 'jugador', creadoCap: 3 },
      { id: 'jugador-1', origen: 'jugador', creadoCap: 1 },
    ];
    expect(elegirHiloSemilla(hilos)?.id).toBe('jugador-1');
  });

  it('devuelve null si no hay hilos', () => {
    expect(elegirHiloSemilla([])).toBeNull();
  });
});
