export interface ResultadoDano {
  hpNuevo: number;
  fueraDeCombate: boolean;
}

/** HP nunca baja de 0. A 0 HP: Fuera de Combate, nunca muerto. */
export function aplicarDano(hpActual: number, cantidad: number): ResultadoDano {
  if (cantidad < 0) throw new Error('la cantidad de daño no puede ser negativa');
  const hpNuevo = Math.max(0, hpActual - cantidad);
  return { hpNuevo, fueraDeCombate: hpNuevo === 0 };
}

/** HP nunca supera hpMax. */
export function curar(hpActual: number, cantidad: number, hpMax: number): number {
  if (cantidad < 0) throw new Error('la cantidad de curación no puede ser negativa');
  return Math.min(hpMax, hpActual + cantidad);
}

/** Fuera de Combate vuelve con 1 HP: al cierre de escena, o antes por chequeo de Corazón ajeno. */
export function revivirFueraDeCombate(hpActual: number): number {
  return hpActual === 0 ? 1 : hpActual;
}
