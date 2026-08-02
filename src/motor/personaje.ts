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
