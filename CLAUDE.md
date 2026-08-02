# CLAUDE.md — Agente Dungeon Master presencial

Contexto de proyecto. Reemplaza y reconcilia los specs v1–v4; donde haya conflicto, manda este documento.

---

## 0. Qué es esto

Un narrador de juego de rol para jugar **en persona** entre un padre y su hijo de 8 años. Se juega sentados a una mesa, con dados físicos y voz. La computadora narra en voz alta, escucha, y lleva las reglas y el estado del mundo.

**No es** una app de chat. La pantalla no es la superficie de juego: es una pantalla de DM que muestra tres datos y nada más.

### Principio rector

> **El modelo narra. El código resuelve.**

Ninguna tirada, HP, inventario, ritmo de escena ni progresión se decide en prosa. Todo pasa por tools que ejecutan contra la base de datos. Si el modelo puede decidirlo solo, va a decidirlo mal y de forma inconsistente.

---

## 1. Stack

| Capa | Elección | Motivo |
|---|---|---|
| App | Next.js (App Router), `output: 'standalone'` | Corre local con `next start`. `localhost` es secure context. |
| DB | SQLite + `better-sqlite3` | Filesystem persistente. Sin serverless, sin Turso. |
| Narración + tools | Gemini Flash vía API key de AI Studio | Free tier alcanza; tool calling confiable. |
| STT | `whisper.cpp`, modelo `medium`, `-l es` | Local. El audio del chico no sale de casa. |
| TTS | Piper, voz `es_AR-daniela-high` | CPU, tiempo real, MIT, acento rioplatense. |
| Resúmenes | Ollama + `qwen3:8b` local | Sin tools, sin latencia crítica. Gratis. |

**Nada de Vercel.** Se descartó: SQLite no funciona en serverless, hay cold starts, y el juego pasa en una mesa de la casa.

**Abstraé el proveedor de LLM detrás de una interfaz** (`LLMProvider` con método `complete`). Gemini, Groq y Ollama hablan formato OpenAI: una implementación con distinta `baseURL` cubre las tres. Los free tiers cambian; el cambio tiene que ser una variable de entorno.

---

## 2. Sistema de reglas (Cairn simplificado)

### Atributos
Tres, valor 8–14 al crear, tope 16. Se reparten 30 puntos.

- **Fuerza** — golpear, cargar, romper, aguantar
- **Astucia** — trepar, esconderse, abrir, notar
- **Corazón** — convencer, calmar animales, resistir el miedo

### Resolución
- Se tira **solo si hay riesgo real**. Sin consecuencia, la acción funciona.
- `1d20` físico. **Igual o menor** al atributo → éxito. (Contraintuitivo: hay que sacar bajo. La pantalla siempre muestra el objetivo.)
- Ventaja: 2d20, se toma el menor. Desventaja: 2d20, se toma el mayor.
- Sin grados de éxito. Pasa o no pasa.

### Daño
- HP base **6**. Daño 1d4 / 1d6 / 1d8 según amenaza.
- A 0 HP: **Fuera de Combate**, nunca muerto. Vuelve con 1 HP al final de la escena, o antes si el otro jugador lo ayuda (chequeo de Corazón).
- Descanso corto: 1d6 HP, una vez por escena.

### Progresión
Al cerrar capítulo, cada jugador elige UNA: +1 a un atributo (tope 16), +1 HP máximo, o un objeto especial. Es un formulario validado en código, **nunca una conversación** — si pasa por el chat, el modelo regala bonificaciones.

---

## 3. Estructura narrativa

```
CAMPAÑA          persiste siempre. Los personajes cuelgan de acá.
  └─ CAPÍTULO    unidad cerrada, con presupuesto de escenas
       └─ SESIÓN pausa física, sin significado narrativo
            └─ ESCENA
```

### Presupuesto de escenas

El presupuesto se fija **al abrir el capítulo**, no al empezar la sesión. 1 escena ≈ 7 minutos reales.

| Capítulo | Escenas | Sesiones de 45 min |
|---|---|---|
| Corto | 8 | 1–2 |
| Normal | 12 | 2 |
| Largo | 18 | 3 |

Fases proporcionales, calculadas en código:

```ts
function faseDeEscena(n: number, total: number) {
  const p = n / total;
  if (p <= 0.15) return 'apertura';
  if (p <= 0.60) return 'desarrollo';
  if (p <= 0.85) return 'escalada';
  if (p <= 0.95) return 'climax';
  return 'cierre';
}
```

Cada llamada al modelo incluye un bloque generado por código:

```
ESTADO DE RITMO
Escena 9 de 12. Fase: escalada.
Directiva: subí la presión. Cerrá una trama secundaria. NO abras hilos nuevos.
Escenas restantes: 3.
```

Directivas por fase:
- **apertura** — presentá lugar y problema. El gancho sale del hilo semilla. Terminá con una decisión clara.
- **desarrollo** — dejá explorar. Dos caminos posibles. Registrá hilos cuando haya decisiones con consecuencia.
- **escalada** — subí la presión. Cerrá una trama secundaria. Que algo les cueste algo real.
- **climax** — confrontación. El resultado depende de decisiones ya tomadas, no de una tirada nueva.
- **cierre** — resolvé. Mostrá qué cambió en el mundo. Sembrá un hilo. Llamá a `cerrar_capitulo()`.

**Guard duro, no negociable:** `registrar_hilo` devuelve error si la fase no es `desarrollo`. Un prompt que diga "no abras tramas" se ignora alrededor de la escena 10. El bloqueo va en código.

El contador de escenas lo avanza **el servidor**, no el modelo. Si el modelo controla el ritmo, estira el capítulo indefinidamente.

### Hilos: emergencia dirigida

Tabla `hilo` con `origen: 'jugador' | 'dm'`. Máximo 3 por capítulo.

Al abrir capítulo, **el código elige el hilo semilla**, no el modelo: prioridad a hilos de origen jugador, más antiguos primero. Se inyecta como obligatorio en la apertura.

Efecto: el capítulo 4 arranca porque el chico perdonó a un duende en el capítulo 1. La historia se siente construida por ellos sin que el modelo planifique nada.

---

## 4. Esquema de datos

```sql
CREATE TABLE campania (
  id TEXT PRIMARY KEY, titulo TEXT NOT NULL,
  cronica TEXT DEFAULT '',              -- ≤200 palabras, reescrita al cerrar capítulo
  creada_en INTEGER NOT NULL
);

CREATE TABLE capitulo (
  id TEXT PRIMARY KEY,
  campania_id TEXT NOT NULL REFERENCES campania(id),
  numero INTEGER NOT NULL, titulo TEXT,
  escenas_total INTEGER NOT NULL,
  escena_actual INTEGER NOT NULL DEFAULT 1,
  resumen TEXT DEFAULT '',              -- ≤300 palabras, cada 10 turnos
  estado TEXT NOT NULL DEFAULT 'en_curso',   -- en_curso | cerrado
  hilo_semilla_id TEXT REFERENCES hilo(id),
  turno_actual TEXT REFERENCES personaje(id),
  escena_desc TEXT,
  cerrado_en INTEGER
);

CREATE TABLE sesion (
  id TEXT PRIMARY KEY,
  capitulo_id TEXT NOT NULL REFERENCES capitulo(id),
  inicio INTEGER NOT NULL, fin INTEGER,
  escena_inicio INTEGER NOT NULL, escena_fin INTEGER
);

CREATE TABLE personaje (
  id TEXT PRIMARY KEY,
  campania_id TEXT NOT NULL REFERENCES campania(id),
  jugador TEXT NOT NULL,                -- 'papa' | 'hijo'
  nombre TEXT NOT NULL, arquetipo TEXT NOT NULL,
  fuerza INTEGER NOT NULL CHECK (fuerza BETWEEN 8 AND 16),
  astucia INTEGER NOT NULL CHECK (astucia BETWEEN 8 AND 16),
  corazon INTEGER NOT NULL CHECK (corazon BETWEEN 8 AND 16),
  hp INTEGER NOT NULL, hp_max INTEGER NOT NULL DEFAULT 6,
  debilidad TEXT,
  capitulos_jugados INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE item (
  id TEXT PRIMARY KEY,
  personaje_id TEXT NOT NULL REFERENCES personaje(id),
  nombre TEXT NOT NULL, descripcion TEXT, usos INTEGER
);

CREATE TABLE npc (
  id TEXT PRIMARY KEY,
  campania_id TEXT NOT NULL REFERENCES campania(id),
  nombre TEXT NOT NULL, descripcion TEXT,
  estado TEXT NOT NULL DEFAULT 'vivo',  -- vivo | huido | derrotado | aliado
  hp INTEGER,
  voz_id TEXT                           -- voz Piper asignada, persiste entre capítulos
);

CREATE TABLE hilo (
  id TEXT PRIMARY KEY,
  campania_id TEXT NOT NULL REFERENCES campania(id),
  descripcion TEXT NOT NULL,
  origen TEXT NOT NULL,                 -- 'jugador' | 'dm'
  personaje_id TEXT REFERENCES personaje(id),
  estado TEXT NOT NULL DEFAULT 'abierto',  -- abierto | usado | cerrado
  creado_cap INTEGER NOT NULL
);

CREATE TABLE flag (
  campania_id TEXT NOT NULL REFERENCES campania(id),
  clave TEXT NOT NULL, valor TEXT NOT NULL,
  PRIMARY KEY (campania_id, clave)
);

CREATE TABLE turno (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  capitulo_id TEXT NOT NULL REFERENCES capitulo(id),
  autor TEXT NOT NULL,                  -- 'dm' | personaje.id
  texto TEXT NOT NULL,
  proveedor TEXT, tokens_in INTEGER, tokens_out INTEGER,
  creado_en INTEGER NOT NULL
);
```

`npc.estado`, `flag` e `hilo` son lo que impide el bug clásico: el NPC muerto que reaparece, la puerta que se vuelve a cerrar sola.

Instrumentá `proveedor`, `tokens_in` y `tokens_out` desde el día 1. Sin eso no vas a poder diagnosticar si un problema es de cuota, de latencia o de contexto inflado.

---

## 5. Tools

```ts
// ritmo y estado
marcar_fin_de_escena()
mover_escena({ nueva_escena })
pasar_turno()

// dados — el jugador tira un d20 FÍSICO
pedir_tirada({ personaje_id, atributo, ventaja? })
  → { objetivo, texto }        // el objetivo va a la pantalla, en grande
resolver_tirada({ valor })
  → { exito, objetivo }        // el código compara; el modelo recibe el veredicto

// personajes
aplicar_daño({ objetivo_id, cantidad, fuente }) → { hp_nuevo, fuera_de_combate }
curar({ objetivo_id, cantidad })
dar_item({ personaje_id, nombre, descripcion, usos? })
gastar_item({ item_id })

// mundo
registrar_npc({ nombre, descripcion, hp?, voz_id? })
actualizar_npc({ npc_id, estado?, hp? })
set_flag({ clave, valor })
tirar_tabla({ tabla })         // 'complicacion' | 'tesoro' | 'nombre_npc' | 'monstruo'

// narrativa
registrar_hilo({ descripcion, personaje_id? })   // ERROR si fase !== 'desarrollo' o ya hay 3
cerrar_hilo({ hilo_id })
cerrar_capitulo({ titulo, que_cambio_en_el_mundo, hilo_nuevo })  // ERROR si fase !== 'cierre'
```

Sobre los dados: en juego presencial el dado es físico y está a la vista, así que **no** hace falta que el servidor lo tire. Lo que sí es obligatorio es que el **objetivo** lo calcule el código y el **veredicto** lo emita el código. El modelo nunca decide si pasaste.

Parseo de números hablados ("catorce" → 14): mapa 1–20 en español, en código. No se lo pidas al modelo.

---

## 6. Creación de personaje

Máquina de estados en el frontend, validada en código. **No** un prompt libre.

```
1 nombre           string, 2-20 chars
2 arquetipo        enum de tabla
3 atributos        30 puntos entre 3 stats, cada uno 8-14, validar suma
4 objeto especial  1 de la tabla del arquetipo
5 debilidad        1 de tabla
6 confirmación     escribe a DB
```

Intro leída en voz alta, guion fijo, no generado:

> Vamos a jugar una aventura juntos. Yo cuento la historia y ustedes deciden qué hacen sus personajes. No hay respuestas incorrectas: pueden intentar cualquier cosa.
> Cuando algo sea difícil o peligroso, van a tirar el dado de veinte caras. Si sacan un número **igual o menor** a su atributo, les sale bien.
> Primero vamos a crear a sus héroes. Son seis preguntas cortas. ¿Empezamos?

El paso 3 necesita botones +/- en pantalla, no voz ni texto.

---

## 7. Contenido: tablas, no corpus

YAML estático, ~250 entradas totales. **No armes un RAG.** El agente no falla por falta de contenido, falla por inconsistencia de estado.

```yaml
arquetipos:
  - id: explorador
    desc: "Conoce los caminos y lee las huellas"
    items: ["Cuerda de 15 metros", "Catalejo rayado", "Mapa incompleto"]
  - id: guardian
    desc: "Se pone adelante cuando hay peligro"
    items: ["Escudo de madera pintado", "Casco abollado", "Silbato de alarma"]
  - id: curioso
    desc: "Siempre quiere saber cómo funcionan las cosas"
    items: ["Bolsa de herramientas", "Frasco con luciérnagas", "Libreta de secretos"]
  - id: amigo_de_bestias
    desc: "Los animales lo escuchan"
    items: ["Silbato de hueso", "Bolsa de semillas", "Pluma gigante"]

debilidades:
  - "Le tiene miedo a la oscuridad"
  - "No sabe nadar"
  - "Nunca puede quedarse callado"
  - "Se distrae con cualquier cosa que brille"
  - "No puede decir que no a un desafío"

complicaciones:
  - "Se rompe algo que traían"
  - "El ruido atrae a alguien"
  - "Quedan atrapados de este lado"
  - "Pierden de vista al otro jugador"
  - "Aparece la debilidad del personaje justo ahora"

monstruos:
  - { nombre: "Duende gruñón",  hp: 3, daño: "1d4", truco: "Roba y sale corriendo" }
  - { nombre: "Lobo de niebla", hp: 5, daño: "1d6", truco: "Aparece y desaparece" }
  - { nombre: "Golem de hojas", hp: 8, daño: "1d6", truco: "Se rearma si queda una hoja" }
```

---

## 8. Gestión de contexto

Sin esto, a las dos horas de juego el prompt pesa 40k tokens y cada turno cuesta y tarda el triple.

Se manda en cada llamada:
1. System prompt (fijo)
2. `campania.cronica` — ≤200 palabras
3. `capitulo.resumen` — ≤300 palabras
4. Estado serializado: personajes, HP, inventario, escena, NPCs no derrotados, flags — ~500 tokens
5. Bloque `ESTADO DE RITMO`
6. Últimos **6 turnos** literales

Compactación:
- `capitulo.resumen` se reescribe cada 10 turnos con el modelo local. Job aparte, no bloquea el turno.
- `campania.cronica` se reescribe solo al cerrar capítulo.

Los detalles que tienen que sobrevivir intactos viven en `hilo`, `npc`, `flag` e `item` — tablas, no prosa resumida. La compresión con pérdida solo afecta al color narrativo.

---

## 9. Voz

### Setup físico

Notebook sobre la mesa, parlantes, micrófono, bandeja de dados. Opcional pero recomendado: botón USB físico grande para push-to-talk — para un chico de 8 años, apretar un botón para hablarle al narrador es medio juego.

### Pantalla de DM

Solo tres datos, tipografía enorme. **Nunca la narración** — si la muestran, la leen en vez de escucharla.

```
        TURNO: BRUNO
    ┌─────────────────┐
    │   ASTUCIA  ≤ 11 │   ← solo con tirada pendiente
    └─────────────────┘
   Bruno ♥♥♥♥♡♡   Papá ♥♥♥♥♥♥
```

### Pipeline

```
botón presionado → MediaRecorder → POST /api/turno (blob)
  → whisper.cpp → texto
  → LLM (estado + ritmo + tools) → stream de tokens
  → corte por oración → Piper → cola de reproducción
```

**El chunking por oración no es optimización, es requisito.** En serie son ~7s de silencio por turno; con chunking, ~2,5s percibidos.

```ts
async function* porOracion(stream: AsyncIterable<string>) {
  let buf = '';
  for await (const tok of stream) {
    buf += tok;
    let m: RegExpExecArray | null;
    while ((m = /[.!?…]["»]?\s/.exec(buf))) {
      const corte = m.index + m[0].length;
      const oracion = buf.slice(0, corte).trim();
      buf = buf.slice(corte);
      if (oracion.length > 3) yield oracion;
    }
  }
  if (buf.trim()) yield buf.trim();
}
```

Sonido ambiente suave y continuo (fuego, viento). Un silencio de 2,5s con fondo se percibe como pausa dramática; sin fondo, como que se colgó.

### Push-to-talk, obligatorio

Micrófono abierto con dos personas conversando en la misma habitación genera turnos basura. No hay prompt que lo arregle. El botón muestra de quién es el turno y se deshabilita cuando no le toca — así el sistema sabe quién habló sin resolver diarización de locutores.

El botón también se deshabilita mientras el narrador habla. Sin barge-in en v1.

### Voces por NPC

Piper tiene múltiples voces. `npc.voz_id` se asigna al crear el NPC y persiste entre capítulos.

```ts
const VOCES = {
  narrador: 'es_AR-daniela-high',
  pispo:    'es_ES-davefx-medium',
  alcalde:  'es_MX-claude-high',
  default:  'es_AR-daniela-high',
};
```

El modelo etiqueta el diálogo: `[voz:pispo] ¡Eso es mío! [/voz]`. Fuera de las etiquetas, narrador.

---

## 10. System prompt

```
Sos el narrador de un juego de rol presencial para dos jugadores: un adulto y
un niño de 8 años. Te escuchan en voz alta. No leen nada.

NARRACIÓN
- Máximo 120 palabras por turno. Frases cortas. Vocabulario simple.
- Escribís para ser escuchado: sin listas, sin viñetas, sin markdown, sin
  paréntesis. Prosa hablada.
- Terminá SIEMPRE preguntando qué hace el jugador de turno, y ofrecé 3
  opciones concretas como ejemplo, aclarando que pueden hacer otra cosa.
- Nunca dos turnos seguidos del mismo jugador. Respetá turno_actual.
- Si el niño propone algo imposible, no digas "no": pedile una tirada difícil
  o mostrale qué necesitaría para lograrlo.

TRANSCRIPCIÓN DE VOZ
- Antes de resolver cualquier acción, reformulá en una frase corta lo que el
  jugador dijo que hace.
- Si la transcripción no tiene sentido en el contexto, interpretá la opción
  más plausible y reformulala igual.
- NUNCA digas que no entendiste ni pidas que repitan.

MECÁNICA (no negociable)
- Nunca decidas si una tirada tuvo éxito. Llamá a pedir_tirada() y esperá
  resolver_tirada().
- Nunca menciones HP, daño o inventario sin haber llamado a la tool.
- Nunca contradigas el estado que recibís. Si un NPC está 'derrotado', no aparece.

RITMO
- El bloque ESTADO DE RITMO es autoridad absoluta. Seguí la directiva de la
  fase aunque tengas otra idea mejor.
- Nunca menciones "capítulo", "fase", "escena" ni cuántas faltan. Ellos ven
  una historia, no una estructura.

CONTINUIDAD
- El hilo semilla del capítulo es obligatorio: la aventura arranca de ahí.
- Cuando una decisión vaya a tener consecuencias más adelante, llamá a
  registrar_hilo().
- Diálogo de NPC: [voz:ID] texto [/voz].

INICIO DE SESIÓN
- Tu primer mensaje de cada sesión es un recap de máximo 60 palabras que
  empieza con "La última vez..." y termina preguntando qué hace el jugador
  de turno.

CONTENIDO
- Sin muerte de personajes jugadores. Sin sangre. Sin crueldad hacia animales
  o niños.
- Los villanos son ridículos, torpes o tristes — nunca aterradores de verdad.
- Tono: aventura luminosa. Miedo momentáneo sí; angustia no.
```

---

## 11. Orden de construcción

**Construí en texto primero. La voz va al final.** Depurar un pipeline de audio con la lógica de juego sin probar es miserable: nunca sabés si el problema es el STT, el prompt o el motor de reglas.

### Fase 0 — Núcleo determinista
DB + migraciones. Motor de reglas puro (`chequeo`, `daño`, `faseDeEscena`, parseo de números en español). **Tests unitarios.** Sin LLM.
*Listo cuando:* podés simular un combate entero por código y el estado queda consistente.

### Fase 1 — Motor de turno en texto
Capa `LLMProvider`. Loop de tools. Página mínima con input de texto y respuesta en pantalla.
*Listo cuando:* jugás 20 turnos escribiendo, y HP, inventario y NPCs nunca se desincronizan.

### Fase 2 — Ritmo y capítulos
Presupuesto de escenas, directivas de fase, guard de `registrar_hilo`, cierre de capítulo, selección de hilo semilla, progresión.
*Listo cuando:* un capítulo de 8 escenas abre, escala y cierra solo, sin que estires ni cortes a mano.

### Fase 3 — Memoria
Resúmenes rodantes, crónica de campaña, recap de sesión.
*Listo cuando:* cerrás la app a mitad de capítulo, volvés al día siguiente y retoma sin perder nada.

### Fase 4 — Salida de voz
Servidor Piper local, chunking por oración, cola de reproducción, voces por NPC, sonido ambiente. Se sigue escribiendo el input.
*Listo cuando:* el silencio percibido entre acción y narración baja de 3 segundos.

### Fase 5 — Entrada de voz
whisper.cpp, push-to-talk, indicador de turno, parseo de tiradas habladas.
*Listo cuando:* jugás una sesión entera sin tocar el teclado.

### Fase 6 — Pantalla de mesa
Vista de DM: turno, objetivo de tirada, HP. Modo pantalla completa.

---

## 12. Validación previa

Antes de la Fase 5, **medí el STT con la voz real de tu hijo**: grabá 20 frases del estilo que va a decir jugando y compará `whisper small` vs `medium`. Si la tasa de acierto es mala, el proyecto no funciona en formato voz y conviene saberlo antes de construir las fases 4 y 5.

Y cada vez que cambies de modelo o proveedor: 20 requests con el set completo de tools, contando cuántas devuelven `tool_calls` válido. Menos de 19/20 y no lo uses. El modo de falla que importa no es un error visible — es un narrador que cuenta un combate hermoso y nunca llama a `aplicar_daño()`.

---

## 13. Fuera de alcance

Descartado por costo/beneficio, no por imposibilidad:
- Imágenes generadas por escena
- Mapas o grillas de combate
- Barge-in / interrumpir al narrador
- Diarización de locutores
- Cámara leyendo el dado por visión
- Dados Bluetooth
- Multi-partida, cuentas, auth
- Hechizos con listas, clases, niveles
- LLM local para narración (por debajo de 14B el tool calling falla en silencio)

Jugá cuatro sesiones antes de agregar cualquiera de estos.

---

## Créditos

Base mecánica derivada de **Cairn** (Yochai Gal) y **Mausritter** (Isaac Williams), ambos bajo licencias abiertas. Si más adelante importás monstruos o hechizos del SRD 5.2 de D&D, está bajo CC-BY-4.0 y requiere atribución explícita a Wizards of the Coast LLC.
