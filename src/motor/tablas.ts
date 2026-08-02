export interface Monstruo {
  nombre: string;
  hp: number;
  dano: string;
  truco: string;
}

// Contenido mínimo del MVP. Ver CLAUDE.md sección 7 — el corpus completo
// (~250 entradas en YAML) queda para la Fase 7, fuera de alcance ahora.
export const TABLAS = {
  complicacion: [
    'Se rompe algo que traían',
    'El ruido atrae a alguien',
    'Quedan atrapados de este lado',
    'Pierden de vista al otro jugador',
    'Aparece la debilidad del personaje justo ahora',
  ],
  tesoro: [
    'Una moneda antigua con un símbolo raro',
    'Un frasco de vidrio con humo de colores adentro',
    'Un mapa a medio dibujar',
    'Una piedra lisa y tibia al tacto',
    'Una llave que no abre nada... todavía',
  ],
  nombre_npc: [
    'Pispo',
    'Doña Berta',
    'El alcalde Tobías',
    'Cuco',
    'Ferni',
    'La tejedora Mora',
  ],
  monstruo: [
    { nombre: 'Duende gruñón', hp: 3, dano: '1d4', truco: 'Roba y sale corriendo' },
    { nombre: 'Lobo de niebla', hp: 5, dano: '1d6', truco: 'Aparece y desaparece' },
    { nombre: 'Golem de hojas', hp: 8, dano: '1d6', truco: 'Se rearma si queda una hoja' },
  ] satisfies Monstruo[],
} as const;

export type NombreTabla = keyof typeof TABLAS;

/** Inyectable para tests: por defecto usa Math.random. */
export function tirarTabla(
  tabla: NombreTabla,
  azar: () => number = Math.random,
): (typeof TABLAS)[NombreTabla][number] {
  const entradas = TABLAS[tabla];
  const indice = Math.floor(azar() * entradas.length);
  return entradas[Math.min(indice, entradas.length - 1)];
}
