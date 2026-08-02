export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface Mensaje {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: ToolCall[];
}

export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ResultadoCompletar {
  mensaje: Mensaje;
  tokensIn: number | null;
  tokensOut: number | null;
}

export interface LLMProvider {
  readonly nombre: string;
  /** Llamada no-streameada: necesaria para poder inspeccionar tool_calls completos antes de ejecutarlos. */
  completar(args: { mensajes: Mensaje[]; tools?: ToolSchema[] }): Promise<ResultadoCompletar>;
  /** Llamada streameada: solo se usa para la narración final, sin tools, habilita el corte por oración. */
  completarStream(args: { mensajes: Mensaje[] }): AsyncGenerator<string>;
}

interface OpenAICompatConfig {
  nombre: string;
  baseUrl: string;
  apiKey: string;
  modelo: string;
}

/**
 * Gemini, Groq y Ollama hablan el mismo formato de Chat Completions de
 * OpenAI. Una sola implementación con distinta baseURL cubre las tres —
 * cambiar de proveedor es cambiar una variable de entorno, no código.
 */
export class OpenAICompatProvider implements LLMProvider {
  readonly nombre: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly modelo: string;

  constructor(config: OpenAICompatConfig) {
    this.nombre = config.nombre;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.modelo = config.modelo;
  }

  async completar(args: { mensajes: Mensaje[]; tools?: ToolSchema[] }): Promise<ResultadoCompletar> {
    const respuesta = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelo,
        messages: args.mensajes,
        tools: args.tools,
        stream: false,
      }),
    });

    if (!respuesta.ok) {
      const texto = await respuesta.text();
      throw new Error(`${this.nombre} respondió ${respuesta.status}: ${texto}`);
    }

    const datos = await respuesta.json();
    const mensaje = datos.choices?.[0]?.message as Mensaje | undefined;
    if (!mensaje) throw new Error(`${this.nombre} no devolvió un mensaje válido: ${JSON.stringify(datos)}`);

    return {
      mensaje,
      tokensIn: datos.usage?.prompt_tokens ?? null,
      tokensOut: datos.usage?.completion_tokens ?? null,
    };
  }

  async *completarStream(args: { mensajes: Mensaje[] }): AsyncGenerator<string> {
    const respuesta = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelo,
        messages: args.mensajes,
        stream: true,
      }),
    });

    if (!respuesta.ok || !respuesta.body) {
      const texto = respuesta.body ? '' : await respuesta.text().catch(() => '');
      throw new Error(`${this.nombre} respondió ${respuesta.status} en modo stream: ${texto}`);
    }

    const lector = respuesta.body.getReader();
    const decodificador = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await lector.read();
      if (done) break;
      buffer += decodificador.decode(value, { stream: true });

      const lineas = buffer.split('\n');
      buffer = lineas.pop() ?? '';

      for (const linea of lineas) {
        const dataLinea = linea.trim();
        if (!dataLinea.startsWith('data:')) continue;
        const payload = dataLinea.slice(5).trim();
        if (payload === '[DONE]') return;
        if (!payload) continue;

        try {
          const evento = JSON.parse(payload);
          const delta: string | undefined = evento.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // línea SSE incompleta/parcial: se ignora, el buffer la reintenta en el próximo chunk
        }
      }
    }
  }
}

export function crearLLMProvider(): LLMProvider {
  const proveedor = process.env.LLM_PROVEEDOR ?? 'gemini';
  const apiKey = process.env.LLM_API_KEY ?? '';
  if (!apiKey) throw new Error('Falta LLM_API_KEY en el entorno');

  const baseUrl =
    process.env.LLM_BASE_URL ??
    (proveedor === 'gemini'
      ? 'https://generativelanguage.googleapis.com/v1beta/openai'
      : proveedor === 'groq'
        ? 'https://api.groq.com/openai/v1'
        : 'http://localhost:11434/v1');

  const modelo = process.env.LLM_MODELO ?? (proveedor === 'gemini' ? 'gemini-2.5-flash' : 'llama-3.3-70b-versatile');

  return new OpenAICompatProvider({ nombre: proveedor, baseUrl, apiKey, modelo });
}
