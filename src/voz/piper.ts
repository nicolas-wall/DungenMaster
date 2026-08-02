import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

function piperBin(): string {
  return process.env.PIPER_BIN ?? path.resolve('tools/piper/piper.exe');
}

function vocesDir(): string {
  return process.env.PIPER_VOCES_DIR ?? path.resolve('tools/piper/voces');
}

export function rutaModeloVoz(vozId: string): string {
  return path.join(vocesDir(), `${vozId}.onnx`);
}

/**
 * Sintetiza texto a WAV con Piper (proceso local, CPU, tiempo real).
 * Se escribe a un archivo temporal porque no todos los builds de Piper
 * soportan --output-raw a stdout de forma confiable en Windows.
 */
export async function sintetizar(texto: string, vozId: string): Promise<Buffer> {
  const dirTmp = await mkdtemp(path.join(tmpdir(), 'piper-'));
  const wavPath = path.join(dirTmp, `${randomUUID()}.wav`);

  try {
    await new Promise<void>((resolve, reject) => {
      const proceso = spawn(piperBin(), ['--model', rutaModeloVoz(vozId), '--output_file', wavPath]);

      let stderr = '';
      proceso.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      proceso.on('error', reject);
      proceso.on('close', (codigo) => {
        if (codigo === 0) resolve();
        else reject(new Error(`piper terminó con código ${codigo}: ${stderr}`));
      });

      proceso.stdin?.write(texto);
      proceso.stdin?.end();
    });

    return await readFile(wavPath);
  } finally {
    await rm(dirTmp, { recursive: true, force: true });
  }
}
