export type Fase = 'apertura' | 'desarrollo' | 'escalada' | 'climax' | 'cierre';

const DIRECTIVAS: Record<Fase, string> = {
  apertura: 'Presentá lugar y problema. El gancho sale del hilo semilla. Terminá con una decisión clara.',
  desarrollo: 'Dejá explorar. Dos caminos posibles. Registrá hilos cuando haya decisiones con consecuencia.',
  escalada: 'Subí la presión. Cerrá una trama secundaria. Que algo les cueste algo real.',
  climax: 'Confrontación. El resultado depende de decisiones ya tomadas, no de una tirada nueva.',
  cierre: 'Resolvé. Mostrá qué cambió en el mundo. Sembrá un hilo. Llamá a cerrar_capitulo().',
};

/**
 * Fases proporcionales al presupuesto de escenas del capítulo, calculadas en
 * código para que el modelo no pueda estirar el ritmo por su cuenta.
 */
export function faseDeEscena(n: number, total: number): Fase {
  if (!Number.isInteger(n) || n < 1) throw new Error(`escena inválida: ${n}`);
  if (!Number.isInteger(total) || total < 1) throw new Error(`escenas_total inválido: ${total}`);
  const p = n / total;
  if (p <= 0.15) return 'apertura';
  if (p <= 0.6) return 'desarrollo';
  if (p <= 0.85) return 'escalada';
  if (p <= 0.95) return 'climax';
  return 'cierre';
}

export function directivaDeFase(fase: Fase): string {
  return DIRECTIVAS[fase];
}

export interface EstadoRitmo {
  escena: number;
  total: number;
  fase: Fase;
  directiva: string;
  escenasRestantes: number;
}

export function estadoRitmo(escena: number, total: number): EstadoRitmo {
  return {
    escena,
    total,
    fase: faseDeEscena(escena, total),
    directiva: directivaDeFase(faseDeEscena(escena, total)),
    escenasRestantes: Math.max(0, total - escena),
  };
}
