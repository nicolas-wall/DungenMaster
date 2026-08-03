'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { atributosPorDados } from '../../../src/motor/personaje.js';

const ARQUETIPOS = [
  { id: 'explorador', nombre: 'Explorador', desc: 'Conoce los caminos y lee las huellas', emoji: '🧭', items: ['Cuerda de 15 metros', 'Catalejo rayado', 'Mapa incompleto'] },
  { id: 'guardian', nombre: 'Guardián', desc: 'Se pone adelante cuando hay peligro', emoji: '🛡️', items: ['Escudo de madera pintado', 'Casco abollado', 'Silbato de alarma'] },
  { id: 'curioso', nombre: 'Curioso', desc: 'Siempre quiere saber cómo funcionan las cosas', emoji: '🔍', items: ['Bolsa de herramientas', 'Frasco con luciérnagas', 'Libreta de secretos'] },
  { id: 'amigo_de_bestias', nombre: 'Amigo de bestias', desc: 'Los animales lo escuchan', emoji: '🐾', items: ['Silbato de hueso', 'Bolsa de semillas', 'Pluma gigante'] },
] as const;

const DEBILIDADES = [
  'Le tiene miedo a la oscuridad',
  'No sabe nadar',
  'Nunca puede quedarse callado',
  'Se distrae con cualquier cosa que brille',
  'No puede decir que no a un desafío',
];

const ESCENAS_OPCIONES = [
  { valor: 8, nombre: 'Corto', desc: '1-2 sesiones' },
  { valor: 12, nombre: 'Normal', desc: '2 sesiones' },
  { valor: 18, nombre: 'Largo', desc: '3 sesiones' },
];

const CARA_A_ATRIBUTO: Record<number, 'fuerza' | 'astucia' | 'corazon'> = {
  1: 'fuerza',
  2: 'fuerza',
  3: 'astucia',
  4: 'astucia',
  5: 'corazon',
  6: 'corazon',
};

type Paso =
  | 'intro'
  | 'campania'
  | 'jugador'
  | 'elegirModo'
  | 'nombre'
  | 'arquetipo'
  | 'atributos'
  | 'objeto'
  | 'debilidad'
  | 'confirmarPersonaje'
  | 'confirmarExistente'
  | 'confirmarTodo';

interface PersonajeExistente {
  id: string;
  jugador: 'papa' | 'hijo';
  nombre: string;
  arquetipo: string;
  fuerza: number;
  astucia: number;
  corazon: number;
  hp: number;
  hp_max: number;
  debilidad: string | null;
  capitulos_jugados: number;
  items: { id: string; nombre: string }[];
}

type PersonajeParaCrear =
  | {
      modo: 'nuevo';
      jugador: 'papa' | 'hijo';
      nombre: string;
      arquetipo: string;
      fuerza: number;
      astucia: number;
      corazon: number;
      objetoElegido: string;
      debilidad: string;
    }
  | { modo: 'existente'; personajeId: string; jugador: 'papa' | 'hijo'; nombre: string };

const PUNTOS_TOTALES = 30;
const MIN_ATRIB = 8;
const MAX_ATRIB = 14;

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 24, textAlign: 'center' }}>{children}</h2>
  );
}

export default function NuevaPartida() {
  const router = useRouter();

  const [paso, setPaso] = useState<Paso>('intro');
  const [tituloCampania, setTituloCampania] = useState('');
  const [escenasTotal, setEscenasTotal] = useState(12);
  const [personajesCreados, setPersonajesCreados] = useState<PersonajeParaCrear[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [personajesExistentes, setPersonajesExistentes] = useState<PersonajeExistente[]>([]);
  const [personajeExistenteElegido, setPersonajeExistenteElegido] = useState<PersonajeExistente | null>(null);

  // borrador del personaje nuevo que se está armando ahora
  const [jugador, setJugador] = useState<'papa' | 'hijo' | null>(null);
  const [nombre, setNombre] = useState('');
  const [arquetipo, setArquetipo] = useState<string | null>(null);
  const [atributos, setAtributos] = useState({ fuerza: MIN_ATRIB, astucia: MIN_ATRIB, corazon: MIN_ATRIB });
  const [objetoElegido, setObjetoElegido] = useState<string | null>(null);
  const [debilidad, setDebilidad] = useState<string | null>(null);
  const [modoAtributos, setModoAtributos] = useState<'elegir' | 'dados' | 'manual'>('elegir');
  const [tiradasDados, setTiradasDados] = useState<number[]>([]);

  useEffect(() => {
    fetch('/api/personajes')
      .then((r) => r.json())
      .then((datos) => setPersonajesExistentes(datos.personajes ?? []))
      .catch(() => {
        // si falla, el wizard simplemente no ofrece reusar personajes
      });
  }, []);

  const puntosUsados = atributos.fuerza + atributos.astucia + atributos.corazon;
  const previewDados = tiradasDados.reduce(
    (acc, cara) => ({ ...acc, [CARA_A_ATRIBUTO[cara]]: acc[CARA_A_ATRIBUTO[cara]] + 1 }),
    { fuerza: MIN_ATRIB, astucia: MIN_ATRIB, corazon: MIN_ATRIB },
  );
  const puntosRestantes = PUNTOS_TOTALES - puntosUsados;
  const arquetipoElegido = ARQUETIPOS.find((a) => a.id === arquetipo);
  const jugadorDisponible: 'papa' | 'hijo' = personajesCreados.some((p) => p.jugador === 'hijo') ? 'papa' : 'hijo';
  const candidatosExistentes = personajesExistentes.filter(
    (p) => p.jugador === jugador && !personajesCreados.some((c) => c.modo === 'existente' && c.personajeId === p.id),
  );

  function reiniciarBorradorPersonaje() {
    setJugador(null);
    setNombre('');
    setArquetipo(null);
    setAtributos({ fuerza: MIN_ATRIB, astucia: MIN_ATRIB, corazon: MIN_ATRIB });
    setObjetoElegido(null);
    setDebilidad(null);
    setPersonajeExistenteElegido(null);
    setModoAtributos('elegir');
    setTiradasDados([]);
  }

  function agregarPersonaje(nuevo: PersonajeParaCrear) {
    const listaActualizada = [...personajesCreados, nuevo];
    setPersonajesCreados(listaActualizada);
    reiniciarBorradorPersonaje();
    setPaso(listaActualizada.length < 2 ? 'jugador' : 'confirmarTodo');
  }

  function ajustarAtributo(clave: 'fuerza' | 'astucia' | 'corazon', delta: number) {
    setAtributos((prev) => {
      const nuevo = prev[clave] + delta;
      if (nuevo < MIN_ATRIB || nuevo > MAX_ATRIB) return prev;
      if (delta > 0 && puntosRestantes <= 0) return prev;
      return { ...prev, [clave]: nuevo };
    });
  }

  function tirarDado(cara: number) {
    const nuevasTiradas = [...tiradasDados, cara];
    setTiradasDados(nuevasTiradas);
    if (nuevasTiradas.length === 6) {
      setAtributos(atributosPorDados(nuevasTiradas));
    }
  }

  function confirmarPersonajeNuevo() {
    if (!jugador || !nombre.trim() || !arquetipo || !objetoElegido || !debilidad) return;
    agregarPersonaje({
      modo: 'nuevo',
      jugador,
      nombre: nombre.trim(),
      arquetipo,
      fuerza: atributos.fuerza,
      astucia: atributos.astucia,
      corazon: atributos.corazon,
      objetoElegido,
      debilidad,
    });
  }

  function confirmarPersonajeExistente() {
    if (!personajeExistenteElegido) return;
    agregarPersonaje({
      modo: 'existente',
      personajeId: personajeExistenteElegido.id,
      jugador: personajeExistenteElegido.jugador,
      nombre: personajeExistenteElegido.nombre,
    });
  }

  async function crearPartida() {
    setEnviando(true);
    setError(null);
    try {
      const rCampania = await fetch('/api/campanias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: tituloCampania, escenasTotal }),
      });
      const datosCampania = await rCampania.json();
      if (!rCampania.ok) throw new Error(datosCampania.error ?? 'no se pudo crear la campaña');

      for (const p of personajesCreados) {
        const payload = p.modo === 'existente' ? { personajeId: p.personajeId } : p;
        const rPersonaje = await fetch(`/api/campanias/${datosCampania.campania.id}/personajes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const datosPersonaje = await rPersonaje.json();
        if (!rPersonaje.ok) throw new Error(datosPersonaje.error ?? `no se pudo agregar a ${p.nombre}`);
      }

      router.push(`/partidas/${datosCampania.campania.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setEnviando(false);
    }
  }

  return (
    <main className="page">
      <div className="page-narrow" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        {paso === 'intro' && (
          <>
            <div style={{ fontSize: 48 }}>🗺️</div>
            <h1 style={{ fontSize: 28, textAlign: 'center' }}>Nueva aventura</h1>
            <p className="subtle" style={{ lineHeight: 1.7, textAlign: 'center', fontSize: 16 }}>
              Vamos a jugar una aventura juntos. Yo cuento la historia y ustedes deciden qué hacen sus personajes. No
              hay respuestas incorrectas: pueden intentar cualquier cosa.
              <br />
              <br />
              Cuando algo sea difícil o peligroso, van a tirar el dado de veinte caras. Si sacan un número igual o
              menor a su atributo, les sale bien.
              <br />
              <br />
              Primero vamos a armar a sus héroes. ¿Empezamos?
            </p>
            <button onClick={() => setPaso('campania')} className="btn btn-primary">
              Empezamos →
            </button>
          </>
        )}

        {paso === 'campania' && (
          <>
            <Titulo>¿Cómo se llama la aventura?</Titulo>
            <input
              value={tituloCampania}
              onChange={(e) => setTituloCampania(e.target.value)}
              placeholder="La cueva del duende"
              className="input"
              autoFocus
            />
            <h3 style={{ fontSize: 15 }} className="subtle">¿Cuánto querés que dure?</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              {ESCENAS_OPCIONES.map((op) => (
                <button
                  key={op.valor}
                  onClick={() => setEscenasTotal(op.valor)}
                  className={`btn-choice ${escenasTotal === op.valor ? 'selected' : ''}`}
                  style={{ textAlign: 'center' }}
                >
                  <div className="btn-choice-title">{op.nombre}</div>
                  <div className="btn-choice-desc">{op.desc}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setPaso('jugador')} disabled={tituloCampania.trim().length < 2} className="btn btn-primary">
              Siguiente →
            </button>
          </>
        )}

        {paso === 'jugador' && (
          <>
            <span className="eyebrow">Personaje {personajesCreados.length + 1} de 2</span>
            <Titulo>¿Quién juega este personaje?</Titulo>
            <button
              onClick={() => {
                setJugador(jugadorDisponible);
                const hayExistentes = personajesExistentes.some(
                  (p) => p.jugador === jugadorDisponible && !personajesCreados.some((c) => c.modo === 'existente' && c.personajeId === p.id),
                );
                setPaso(hayExistentes ? 'elegirModo' : 'nombre');
              }}
              className="btn btn-primary"
              style={{ fontSize: 20, padding: '18px 36px' }}
            >
              {jugadorDisponible === 'hijo' ? '🧒 El hijo' : '🧑 El papá'}
            </button>
          </>
        )}

        {paso === 'elegirModo' && (
          <>
            <Titulo>¿Quién va a jugar {jugador === 'hijo' ? 'el hijo' : 'el papá'}?</Titulo>
            <p className="subtle" style={{ textAlign: 'center', marginTop: -12 }}>
              Podés retomar un personaje que ya jugó otra aventura, o armar uno nuevo.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              {candidatosExistentes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPersonajeExistenteElegido(p);
                    setPaso('confirmarExistente');
                  }}
                  className="btn-choice"
                >
                  <div className="btn-choice-title">{p.nombre}</div>
                  <div className="btn-choice-desc">
                    {ARQUETIPOS.find((a) => a.id === p.arquetipo)?.nombre ?? p.arquetipo} · HP {p.hp}/{p.hp_max} ·{' '}
                    {p.capitulos_jugados} {p.capitulos_jugados === 1 ? 'capítulo jugado' : 'capítulos jugados'}
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setPaso('nombre')} className="btn btn-primary">
              + Crear un personaje nuevo
            </button>
          </>
        )}

        {paso === 'confirmarExistente' && personajeExistenteElegido && (
          <>
            <h2 style={{ fontSize: 26 }}>{personajeExistenteElegido.nombre}</h2>
            <div className="card" style={{ width: '100%' }}>
              <div className="subtle">
                {personajeExistenteElegido.jugador === 'hijo' ? 'El hijo' : 'El papá'} —{' '}
                {ARQUETIPOS.find((a) => a.id === personajeExistenteElegido.arquetipo)?.nombre ?? personajeExistenteElegido.arquetipo}
              </div>
              <div style={{ marginTop: 10, fontWeight: 700 }}>
                Fuerza {personajeExistenteElegido.fuerza} · Astucia {personajeExistenteElegido.astucia} · Corazón{' '}
                {personajeExistenteElegido.corazon}
              </div>
              {personajeExistenteElegido.items.length > 0 ? (
                <div className="subtle" style={{ marginTop: 10 }}>
                  Inventario: {personajeExistenteElegido.items.map((i) => i.nombre).join(', ')}
                </div>
              ) : null}
              {personajeExistenteElegido.debilidad ? (
                <div className="subtle" style={{ marginTop: 4 }}>Debilidad: {personajeExistenteElegido.debilidad}</div>
              ) : null}
              <div className="faint" style={{ marginTop: 12, fontSize: 13 }}>✨ Arranca esta aventura con el HP completo.</div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={confirmarPersonajeExistente} className="btn btn-primary">
                Confirmar a {personajeExistenteElegido.nombre}
              </button>
              <button onClick={() => setPaso('elegirModo')} className="btn btn-outline">
                Volver
              </button>
            </div>
          </>
        )}

        {paso === 'nombre' && (
          <>
            <Titulo>¿Cómo se llama tu personaje?</Titulo>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre (2-20 letras)"
              className="input"
              autoFocus
            />
            <button onClick={() => setPaso('arquetipo')} disabled={nombre.trim().length < 2 || nombre.trim().length > 20} className="btn btn-primary">
              Siguiente →
            </button>
          </>
        )}

        {paso === 'arquetipo' && (
          <>
            <Titulo>¿Qué tipo de héroe es {nombre}?</Titulo>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
              {ARQUETIPOS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setArquetipo(a.id)}
                  className={`btn-choice ${arquetipo === a.id ? 'selected' : ''}`}
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{a.emoji}</div>
                  <div className="btn-choice-title">{a.nombre}</div>
                  <div className="btn-choice-desc">{a.desc}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setPaso('atributos')} disabled={!arquetipo} className="btn btn-primary">
              Siguiente →
            </button>
          </>
        )}

        {paso === 'atributos' && modoAtributos === 'elegir' && (
          <>
            <Titulo>¿Cómo repartimos los 30 puntos?</Titulo>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setModoAtributos('dados')} className="btn btn-primary">
                🎲 Tirar los dados
              </button>
              <button onClick={() => setModoAtributos('manual')} className="btn btn-outline">
                ✋ Elegir a mano
              </button>
            </div>
          </>
        )}

        {paso === 'atributos' && modoAtributos === 'dados' && tiradasDados.length < 6 && (
          <>
            <span className="eyebrow">Tirada {tiradasDados.length + 1} de 6</span>
            <Titulo>🎲 Tirá el dado de 6 caras</Titulo>
            <p className="subtle" style={{ textAlign: 'center', marginTop: -12 }}>
              Tocá el número que salió.
              <br />
              1-2 suma Fuerza · 3-4 suma Astucia · 5-6 suma Corazón
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              {[1, 2, 3, 4, 5, 6].map((cara) => (
                <button key={cara} onClick={() => tirarDado(cara)} className="btn-dice">
                  {cara}
                </button>
              ))}
            </div>
            <div className="card" style={{ display: 'flex', gap: 28, padding: '14px 24px' }}>
              {(['fuerza', 'astucia', 'corazon'] as const).map((clave) => (
                <div key={clave} style={{ textAlign: 'center' }}>
                  <div className="eyebrow" style={{ fontSize: 10 }}>{clave}</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{previewDados[clave]}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {paso === 'atributos' && modoAtributos === 'dados' && tiradasDados.length === 6 && (
          <>
            <div style={{ fontSize: 40 }}>🎉</div>
            <Titulo>¡Listo! Así quedaron</Titulo>
            <div className="card" style={{ display: 'flex', gap: 28, padding: '18px 28px' }}>
              {(['fuerza', 'astucia', 'corazon'] as const).map((clave) => (
                <div key={clave} style={{ textAlign: 'center' }}>
                  <div className="eyebrow" style={{ fontSize: 10 }}>{clave}</div>
                  <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--primary)' }}>{atributos[clave]}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button onClick={() => setPaso('objeto')} className="btn btn-primary">
                Siguiente →
              </button>
              <button onClick={() => setTiradasDados([])} className="btn btn-outline">
                🔄 Tirar de nuevo
              </button>
              <button onClick={() => setModoAtributos('manual')} className="btn btn-outline">
                ✋ Ajustar a mano
              </button>
            </div>
          </>
        )}

        {paso === 'atributos' && modoAtributos === 'manual' && (
          <>
            <Titulo>Repartí 30 puntos</Titulo>
            <p className="subtle" style={{ marginTop: -12 }}>Cada atributo entre 8 y 14. Te quedan: <strong>{puntosRestantes}</strong></p>
            <div className="card" style={{ display: 'flex', gap: 28, padding: '18px 28px' }}>
              {(['fuerza', 'astucia', 'corazon'] as const).map((clave) => (
                <div key={clave} style={{ textAlign: 'center' }}>
                  <div className="eyebrow" style={{ fontSize: 10, marginBottom: 6 }}>{clave}</div>
                  <button onClick={() => ajustarAtributo(clave, 1)} disabled={atributos[clave] >= MAX_ATRIB || puntosRestantes <= 0} className="btn-dice" style={{ width: 40, height: 40, fontSize: 18 }}>
                    +
                  </button>
                  <div style={{ fontSize: 26, fontWeight: 800, margin: '6px 0' }}>{atributos[clave]}</div>
                  <button onClick={() => ajustarAtributo(clave, -1)} disabled={atributos[clave] <= MIN_ATRIB} className="btn-dice" style={{ width: 40, height: 40, fontSize: 18 }}>
                    −
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setPaso('objeto')} disabled={puntosRestantes !== 0} className="btn btn-primary">
              Siguiente →
            </button>
          </>
        )}

        {paso === 'objeto' && arquetipoElegido && (
          <>
            <Titulo>Elegí un objeto especial</Titulo>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              {arquetipoElegido.items.map((item) => (
                <button
                  key={item}
                  onClick={() => setObjetoElegido(item)}
                  className={`btn-choice ${objetoElegido === item ? 'selected' : ''}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <button onClick={() => setPaso('debilidad')} disabled={!objetoElegido} className="btn btn-primary">
              Siguiente →
            </button>
          </>
        )}

        {paso === 'debilidad' && (
          <>
            <Titulo>¿Cuál es su debilidad?</Titulo>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              {DEBILIDADES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDebilidad(d)}
                  className={`btn-choice ${debilidad === d ? 'selected' : ''}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <button onClick={() => setPaso('confirmarPersonaje')} disabled={!debilidad} className="btn btn-primary">
              Siguiente →
            </button>
          </>
        )}

        {paso === 'confirmarPersonaje' && arquetipoElegido && (
          <>
            <div style={{ fontSize: 40 }}>{arquetipoElegido.emoji}</div>
            <h2 style={{ fontSize: 26 }}>{nombre}</h2>
            <div className="card" style={{ width: '100%' }}>
              <div className="subtle">
                {jugador === 'hijo' ? 'El hijo' : 'El papá'} — {arquetipoElegido.nombre}
              </div>
              <div style={{ marginTop: 10, fontWeight: 700 }}>
                Fuerza {atributos.fuerza} · Astucia {atributos.astucia} · Corazón {atributos.corazon}
              </div>
              <div className="subtle" style={{ marginTop: 10 }}>Objeto: {objetoElegido}</div>
              <div className="subtle" style={{ marginTop: 4 }}>Debilidad: {debilidad}</div>
            </div>
            <button onClick={confirmarPersonajeNuevo} className="btn btn-primary">
              Confirmar a {nombre}
            </button>
          </>
        )}

        {paso === 'confirmarTodo' && (
          <>
            <div style={{ fontSize: 40 }}>🚀</div>
            <h2 style={{ fontSize: 26, textAlign: 'center' }}>{tituloCampania}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              {personajesCreados.map((p) => (
                <div key={p.nombre} className="card">
                  <div style={{ fontWeight: 800, fontSize: 17 }}>
                    {p.nombre} ({p.jugador === 'hijo' ? 'el hijo' : 'el papá'})
                    {p.modo === 'existente' ? <span className="faint" style={{ fontWeight: 400 }}> — personaje ya creado</span> : null}
                  </div>
                  {p.modo === 'nuevo' ? (
                    <>
                      <div className="subtle" style={{ fontSize: 14, marginTop: 4 }}>
                        {ARQUETIPOS.find((a) => a.id === p.arquetipo)?.nombre} — Fuerza {p.fuerza}, Astucia {p.astucia}, Corazón{' '}
                        {p.corazon}
                      </div>
                      <div className="faint" style={{ fontSize: 14, marginTop: 2 }}>
                        {p.objetoElegido} · {p.debilidad}
                      </div>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
            {error ? <div className="error-box">{error}</div> : null}
            <button onClick={crearPartida} disabled={enviando} className="btn btn-primary" style={{ fontSize: 18, padding: '16px 32px' }}>
              {enviando ? (
                <>
                  <span className="spinner" /> Creando…
                </>
              ) : (
                '🚀 Empezar la aventura'
              )}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
