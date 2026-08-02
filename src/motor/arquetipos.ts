export interface Arquetipo {
  id: string;
  nombre: string;
  desc: string;
  items: readonly string[];
}

// Contenido fijo del MVP (CLAUDE.md sección 7). El corpus completo en YAML
// queda para la Fase 7; esto alcanza para armar personajes desde ya.
export const ARQUETIPOS: readonly Arquetipo[] = [
  {
    id: 'explorador',
    nombre: 'Explorador',
    desc: 'Conoce los caminos y lee las huellas',
    items: ['Cuerda de 15 metros', 'Catalejo rayado', 'Mapa incompleto'],
  },
  {
    id: 'guardian',
    nombre: 'Guardián',
    desc: 'Se pone adelante cuando hay peligro',
    items: ['Escudo de madera pintado', 'Casco abollado', 'Silbato de alarma'],
  },
  {
    id: 'curioso',
    nombre: 'Curioso',
    desc: 'Siempre quiere saber cómo funcionan las cosas',
    items: ['Bolsa de herramientas', 'Frasco con luciérnagas', 'Libreta de secretos'],
  },
  {
    id: 'amigo_de_bestias',
    nombre: 'Amigo de bestias',
    desc: 'Los animales lo escuchan',
    items: ['Silbato de hueso', 'Bolsa de semillas', 'Pluma gigante'],
  },
] as const;

export const DEBILIDADES: readonly string[] = [
  'Le tiene miedo a la oscuridad',
  'No sabe nadar',
  'Nunca puede quedarse callado',
  'Se distrae con cualquier cosa que brille',
  'No puede decir que no a un desafío',
] as const;

export function obtenerArquetipo(id: string): Arquetipo | undefined {
  return ARQUETIPOS.find((a) => a.id === id);
}

export function esArquetipoValido(id: string): boolean {
  return obtenerArquetipo(id) !== undefined;
}

export function esDebilidadValida(texto: string): boolean {
  return DEBILIDADES.includes(texto);
}

export function esItemDeArquetipoValido(arquetipoId: string, item: string): boolean {
  return obtenerArquetipo(arquetipoId)?.items.includes(item) ?? false;
}
