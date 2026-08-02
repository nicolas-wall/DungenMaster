export interface AtributosCreacion {
  fuerza: number;
  astucia: number;
  corazon: number;
}

const PUNTOS_TOTALES = 30;
const MIN_CREACION = 8;
const MAX_CREACION = 14;

/**
 * Reparto de 30 puntos entre 3 atributos, 8-14 cada uno al crear personaje.
 * Devuelve la lista de errores; vacía significa que el reparto es válido.
 */
export function validarAtributosCreacion(atributos: AtributosCreacion): string[] {
  const errores: string[] = [];
  const { fuerza, astucia, corazon } = atributos;

  for (const [nombre, valor] of Object.entries({ fuerza, astucia, corazon })) {
    if (!Number.isInteger(valor) || valor < MIN_CREACION || valor > MAX_CREACION) {
      errores.push(`${nombre} debe estar entre ${MIN_CREACION} y ${MAX_CREACION}, recibido ${valor}`);
    }
  }

  const suma = fuerza + astucia + corazon;
  if (suma !== PUNTOS_TOTALES) {
    errores.push(`la suma de atributos debe ser ${PUNTOS_TOTALES}, recibido ${suma}`);
  }

  return errores;
}

const NOMBRE_MIN = 2;
const NOMBRE_MAX = 20;

/** Nombre de personaje: 2-20 caracteres (CLAUDE.md sección 6). */
export function validarNombrePersonaje(nombre: string): string[] {
  const limpio = nombre.trim();
  if (limpio.length < NOMBRE_MIN || limpio.length > NOMBRE_MAX) {
    return [`el nombre debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres, recibido ${limpio.length}`];
  }
  return [];
}
