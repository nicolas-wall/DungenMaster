// Medido por F0 (pitch) sobre las 3 voces descargadas: davefx ronda 134Hz
// (rango masculino), daniela y claude-high rondan 176-179Hz (femenino).
const VOZ_NARRADOR_DEFAULT = 'es_ES-davefx-medium';
const VOCES_NPC_DEFAULT = ['es_AR-daniela-high', 'es_MX-claude-high'];

export function vozNarrador(): string {
  return process.env.VOZ_NARRADOR ?? VOZ_NARRADOR_DEFAULT;
}

function vocesNpcDisponibles(): string[] {
  const env = process.env.VOCES_NPC;
  return env ? env.split(',').map((v) => v.trim()) : VOCES_NPC_DEFAULT;
}

/**
 * Asigna una voz determinística a un NPC nuevo cuando no se le dio una
 * explícita. Mismo nombre siempre da la misma voz dentro de una sesión.
 */
export function asignarVozNpc(nombre: string): string {
  const voces = vocesNpcDisponibles();
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = (hash * 31 + nombre.charCodeAt(i)) >>> 0;
  }
  return voces[hash % voces.length];
}
