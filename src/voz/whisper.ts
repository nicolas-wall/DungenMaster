import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

function whisperBin(): string {
  return process.env.WHISPER_BIN ?? path.resolve('tools/whisper/Release/whisper-cli.exe');
}

function whisperModelo(): string {
  return process.env.WHISPER_MODELO ?? path.resolve('tools/whisper/modelos/ggml-small.bin');
}

function ejecutar(comando: string, args: string[], entrada?: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proceso = spawn(comando, args);
    const salida: Buffer[] = [];
    let stderr = '';

    proceso.stdout?.on('data', (chunk) => salida.push(chunk));
    proceso.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proceso.on('error', reject);
    proceso.on('close', (codigo) => {
      if (codigo === 0) resolve(Buffer.concat(salida));
      else reject(new Error(`${comando} terminó con código ${codigo}: ${stderr}`));
    });

    if (entrada) {
      proceso.stdin?.write(entrada);
      proceso.stdin?.end();
    }
  });
}

/**
 * Transcribe un blob de audio del micrófono (MediaRecorder, típicamente
 * WebM/Opus) a texto en español usando whisper.cpp local. El audio no
 * sale de la máquina.
 */
export async function transcribir(audioBlob: Buffer, idioma = 'es'): Promise<string> {
  const dirTmp = await mkdtemp(path.join(tmpdir(), 'whisper-'));
  const wavPath = path.join(dirTmp, 'entrada.wav');

  try {
    // whisper.cpp espera WAV 16kHz mono PCM16; convertimos con ffmpeg.
    await ejecutar('ffmpeg', ['-y', '-i', 'pipe:0', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wavPath], audioBlob);

    const salida = await ejecutar(whisperBin(), [
      '-m',
      whisperModelo(),
      '-f',
      wavPath,
      '-l',
      idioma,
      '-nt', // sin timestamps
      '-np', // sin barra de progreso
    ]);

    return salida
      .toString('utf-8')
      .split('\n')
      .map((linea) => linea.trim())
      .filter((linea) => linea.length > 0 && !linea.startsWith('['))
      .join(' ')
      .trim();
  } finally {
    await rm(dirTmp, { recursive: true, force: true });
  }
}
