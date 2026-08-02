// "un" se excluye a propósito: es el artículo indefinido en frases como
// "me salió un dieciséis", no un dígito. "uno" sí es un número válido.
const PALABRA_A_NUMERO: Record<string, number> = {
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
};

const VOCALES_ACENTUADAS: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
  ü: 'u',
  ñ: 'ñ',
};

function sacarAcentos(texto: string): string {
  let resultado = '';
  for (const char of texto) {
    resultado += VOCALES_ACENTUADAS[char] ?? char;
  }
  return resultado;
}

function normalizar(texto: string): string {
  return sacarAcentos(texto.toLowerCase()).trim();
}

/**
 * Parsea un número 1-20 dicho por voz ("catorce", "un dieciséis", "14").
 * Devuelve null si no encuentra un número válido en el rango del d20.
 */
export function parseNumeroHablado(texto: string): number | null {
  const normalizado = normalizar(texto);
  const tokens = normalizado.split(/[^a-z0-9]+/).filter(Boolean);

  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      const n = Number.parseInt(token, 10);
      if (n >= 1 && n <= 20) return n;
      continue;
    }
    const n = PALABRA_A_NUMERO[token];
    if (n !== undefined) return n;
  }

  return null;
}
