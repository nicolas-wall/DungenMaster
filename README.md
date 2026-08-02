# Agente Dungeon Master presencial

MVP: narrador de rol con tool-calling, voz local (Piper TTS + whisper.cpp STT)
y pantalla de DM. Ver `CLAUDE.md` para el diseño completo del proyecto.

## Estado

- ✅ Fase 0: esquema de DB, migraciones, motor de reglas puro (61 tests).
- ✅ MVP: loop de turno con tools, Piper (3 voces distintas), whisper.cpp,
  pantalla con botón de push-to-talk.
- ⏳ Pendiente de validar con una key real: el turno completo hablando con
  el modelo (Gemini).

## Setup

```bash
npm install
cp .env.example .env.local   # completá LLM_API_KEY con tu key de https://aistudio.google.com/apikey
npm run seed                 # crea una campaña + 2 personajes de prueba
npm run dev                  # http://localhost:3000
```

Si el puerto 3000 ya está ocupado, Next.js va a avisar y usar otro
automáticamente (mirá la salida de `npm run dev`).

### Voz (ya descargada en este repo vía `tools/`, no versionada)

`tools/` no se sube al repo por peso (~750MB). Si clonás el proyecto en otra
máquina, recreala con:

```powershell
./scripts/setup-piper.ps1
./scripts/setup-whisper.ps1
```

Requiere `ffmpeg` en el PATH (usado para convertir el audio del micrófono a
16kHz mono antes de mandarlo a whisper.cpp).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Server de desarrollo |
| `npm run build` / `npm start` | Build de producción (`output: standalone`) |
| `npm test` | Corre los 61 tests (motor + voz + loop con LLM simulado) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run seed` | Crea una campaña de prueba en `data/campania.db` |

## Estructura

```
migrations/       esquema SQL versionado
src/db/           migraciones + repositorio (better-sqlite3)
src/motor/        reglas puras: tiradas, daño, fases, hilos, tablas — sin I/O
src/llm/          LLMProvider (OpenAI-compatible), tools, loop de turno
src/voz/          Piper (TTS), whisper.cpp (STT), chunking por oración
app/              Next.js App Router: pantalla de DM + /api/turno + /api/estado
scripts/          seed.ts, setup-piper.ps1, setup-whisper.ps1
```
