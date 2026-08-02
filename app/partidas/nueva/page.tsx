'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const ARQUETIPOS = [
  { id: 'explorador', nombre: 'Explorador', desc: 'Conoce los caminos y lee las huellas', items: ['Cuerda de 15 metros', 'Catalejo rayado', 'Mapa incompleto'] },
  { id: 'guardian', nombre: 'Guardián', desc: 'Se pone adelante cuando hay peligro', items: ['Escudo de madera pintado', 'Casco abollado', 'Silbato de alarma'] },
  { id: 'curioso', nombre: 'Curioso', desc: 'Siempre quiere saber cómo funcionan las cosas', items: ['Bolsa de herramientas', 'Frasco con luciérnagas', 'Libreta de secretos'] },
  { id: 'amigo_de_bestias', nombre: 'Amigo de bestias', desc: 'Los animales lo escuchan', items: ['Silbato de hueso', 'Bolsa de semillas', 'Pluma gigante'] },
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

function BotonPaso({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '10px 24px',
        borderRadius: 8,
        border: 'none',
        background: disabled ? '#333' : '#2ecc71',
        color: disabled ? '#777' : '#111',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
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

  useEffect(() => {
    fetch('/api/personajes')
      .then((r) => r.json())
      .then((datos) => setPersonajesExistentes(datos.personajes ?? []))
      .catch(() => {
        // si falla, el wizard simplemente no ofrece reusar personajes
      });
  }, []);

  const puntosUsados = atributos.fuerza + atributos.astucia + atributos.corazon;
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
    <main style={{ minHeight: '100vh', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        {paso === 'intro' && (
          <>
            <h1>Nueva aventura</h1>
            <p style={{ lineHeight: 1.6, textAlign: 'center' }}>
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
            <BotonPaso onClick={() => setPaso('campania')}>Empezamos</BotonPaso>
          </>
        )}

        {paso === 'campania' && (
          <>
            <h2>¿Cómo se llama la aventura?</h2>
            <input
              value={tituloCampania}
              onChange={(e) => setTituloCampania(e.target.value)}
              placeholder="La cueva del duende"
              style={{ padding: 10, width: '100%', fontSize: 16 }}
            />
            <h3 style={{ marginBottom: 4 }}>¿Cuánto querés que dure?</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              {ESCENAS_OPCIONES.map((op) => (
                <button
                  key={op.valor}
                  onClick={() => setEscenasTotal(op.valor)}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: escenasTotal === op.valor ? '2px solid #2ecc71' : '1px solid #333',
                    background: '#181818',
                    color: '#eee',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{op.nombre}</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{op.desc}</div>
                </button>
              ))}
            </div>
            <BotonPaso onClick={() => setPaso('jugador')} disabled={tituloCampania.trim().length < 2}>
              Siguiente
            </BotonPaso>
          </>
        )}

        {paso === 'jugador' && (
          <>
            <h2>Personaje {personajesCreados.length + 1} de 2</h2>
            <p>¿Quién juega este personaje?</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <BotonPaso
                onClick={() => {
                  setJugador(jugadorDisponible);
                  const hayExistentes = personajesExistentes.some(
                    (p) => p.jugador === jugadorDisponible && !personajesCreados.some((c) => c.modo === 'existente' && c.personajeId === p.id),
                  );
                  setPaso(hayExistentes ? 'elegirModo' : 'nombre');
                }}
              >
                {jugadorDisponible === 'hijo' ? 'El hijo' : 'El papá'}
              </BotonPaso>
            </div>
          </>
        )}

        {paso === 'elegirModo' && (
          <>
            <h2>¿Quién va a jugar {jugador === 'hijo' ? 'el hijo' : 'el papá'}?</h2>
            <p style={{ opacity: 0.7 }}>Podés retomar un personaje que ya jugó otra aventura, o armar uno nuevo.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              {candidatosExistentes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPersonajeExistenteElegido(p);
                    setPaso('confirmarExistente');
                  }}
                  style={{
                    padding: 14,
                    borderRadius: 8,
                    border: '1px solid #333',
                    background: '#181818',
                    color: '#eee',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{p.nombre}</div>
                  <div style={{ fontSize: 13, opacity: 0.7 }}>
                    {ARQUETIPOS.find((a) => a.id === p.arquetipo)?.nombre ?? p.arquetipo} — HP {p.hp}/{p.hp_max} —{' '}
                    {p.capitulos_jugados} {p.capitulos_jugados === 1 ? 'capítulo jugado' : 'capítulos jugados'}
                  </div>
                </button>
              ))}
            </div>
            <BotonPaso onClick={() => setPaso('nombre')}>+ Crear un personaje nuevo</BotonPaso>
          </>
        )}

        {paso === 'confirmarExistente' && personajeExistenteElegido && (
          <>
            <h2>{personajeExistenteElegido.nombre}</h2>
            <div style={{ border: '1px solid #333', borderRadius: 12, padding: 16, width: '100%' }}>
              <div>
                {personajeExistenteElegido.jugador === 'hijo' ? 'El hijo' : 'El papá'} —{' '}
                {ARQUETIPOS.find((a) => a.id === personajeExistenteElegido.arquetipo)?.nombre ?? personajeExistenteElegido.arquetipo}
              </div>
              <div style={{ marginTop: 8 }}>
                Fuerza {personajeExistenteElegido.fuerza} · Astucia {personajeExistenteElegido.astucia} · Corazón{' '}
                {personajeExistenteElegido.corazon}
              </div>
              {personajeExistenteElegido.items.length > 0 ? (
                <div style={{ marginTop: 8, opacity: 0.8 }}>
                  Inventario: {personajeExistenteElegido.items.map((i) => i.nombre).join(', ')}
                </div>
              ) : null}
              {personajeExistenteElegido.debilidad ? (
                <div style={{ marginTop: 4, opacity: 0.8 }}>Debilidad: {personajeExistenteElegido.debilidad}</div>
              ) : null}
              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.6 }}>Arranca esta aventura con el HP completo.</div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <BotonPaso onClick={confirmarPersonajeExistente}>Confirmar a {personajeExistenteElegido.nombre}</BotonPaso>
              <button onClick={() => setPaso('elegirModo')} style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', borderRadius: 8, padding: '10px 20px' }}>
                Volver
              </button>
            </div>
          </>
        )}

        {paso === 'nombre' && (
          <>
            <h2>¿Cómo se llama tu personaje?</h2>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre (2-20 letras)"
              style={{ padding: 10, width: '100%', fontSize: 16 }}
              autoFocus
            />
            <BotonPaso onClick={() => setPaso('arquetipo')} disabled={nombre.trim().length < 2 || nombre.trim().length > 20}>
              Siguiente
            </BotonPaso>
          </>
        )}

        {paso === 'arquetipo' && (
          <>
            <h2>¿Qué tipo de héroe es {nombre}?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
              {ARQUETIPOS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setArquetipo(a.id)}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: arquetipo === a.id ? '2px solid #2ecc71' : '1px solid #333',
                    background: '#181818',
                    color: '#eee',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{a.nombre}</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{a.desc}</div>
                </button>
              ))}
            </div>
            <BotonPaso onClick={() => setPaso('atributos')} disabled={!arquetipo}>
              Siguiente
            </BotonPaso>
          </>
        )}

        {paso === 'atributos' && (
          <>
            <h2>Repartí 30 puntos</h2>
            <p style={{ opacity: 0.7 }}>Cada atributo entre 8 y 14. Te quedan: {puntosRestantes}</p>
            <div style={{ display: 'flex', gap: 24 }}>
              {(['fuerza', 'astucia', 'corazon'] as const).map((clave) => (
                <div key={clave} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, opacity: 0.6, letterSpacing: 1, marginBottom: 4 }}>{clave.toUpperCase()}</div>
                  <button onClick={() => ajustarAtributo(clave, 1)} disabled={atributos[clave] >= MAX_ATRIB || puntosRestantes <= 0} style={{ width: 32 }}>
                    +
                  </button>
                  <div style={{ fontSize: 28, fontWeight: 700, margin: '4px 0' }}>{atributos[clave]}</div>
                  <button onClick={() => ajustarAtributo(clave, -1)} disabled={atributos[clave] <= MIN_ATRIB} style={{ width: 32 }}>
                    −
                  </button>
                </div>
              ))}
            </div>
            <BotonPaso onClick={() => setPaso('objeto')} disabled={puntosRestantes !== 0}>
              Siguiente
            </BotonPaso>
          </>
        )}

        {paso === 'objeto' && arquetipoElegido && (
          <>
            <h2>Elegí un objeto especial</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              {arquetipoElegido.items.map((item) => (
                <button
                  key={item}
                  onClick={() => setObjetoElegido(item)}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: objetoElegido === item ? '2px solid #2ecc71' : '1px solid #333',
                    background: '#181818',
                    color: '#eee',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
            <BotonPaso onClick={() => setPaso('debilidad')} disabled={!objetoElegido}>
              Siguiente
            </BotonPaso>
          </>
        )}

        {paso === 'debilidad' && (
          <>
            <h2>¿Cuál es su debilidad?</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              {DEBILIDADES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDebilidad(d)}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: debilidad === d ? '2px solid #2ecc71' : '1px solid #333',
                    background: '#181818',
                    color: '#eee',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
            <BotonPaso onClick={() => setPaso('confirmarPersonaje')} disabled={!debilidad}>
              Siguiente
            </BotonPaso>
          </>
        )}

        {paso === 'confirmarPersonaje' && arquetipoElegido && (
          <>
            <h2>{nombre}</h2>
            <div style={{ border: '1px solid #333', borderRadius: 12, padding: 16, width: '100%' }}>
              <div>
                {jugador === 'hijo' ? 'El hijo' : 'El papá'} — {arquetipoElegido.nombre}
              </div>
              <div style={{ marginTop: 8 }}>
                Fuerza {atributos.fuerza} · Astucia {atributos.astucia} · Corazón {atributos.corazon}
              </div>
              <div style={{ marginTop: 8, opacity: 0.8 }}>Objeto: {objetoElegido}</div>
              <div style={{ marginTop: 4, opacity: 0.8 }}>Debilidad: {debilidad}</div>
            </div>
            <BotonPaso onClick={confirmarPersonajeNuevo}>Confirmar a {nombre}</BotonPaso>
          </>
        )}

        {paso === 'confirmarTodo' && (
          <>
            <h2>{tituloCampania}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              {personajesCreados.map((p) => (
                <div key={p.nombre} style={{ border: '1px solid #333', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontWeight: 700 }}>
                    {p.nombre} ({p.jugador === 'hijo' ? 'el hijo' : 'el papá'})
                    {p.modo === 'existente' ? <span style={{ opacity: 0.5, fontWeight: 400 }}> — personaje ya creado</span> : null}
                  </div>
                  {p.modo === 'nuevo' ? (
                    <>
                      <div style={{ fontSize: 14, opacity: 0.8 }}>
                        {ARQUETIPOS.find((a) => a.id === p.arquetipo)?.nombre} — Fuerza {p.fuerza}, Astucia {p.astucia}, Corazón{' '}
                        {p.corazon}
                      </div>
                      <div style={{ fontSize: 14, opacity: 0.6 }}>
                        {p.objetoElegido} · {p.debilidad}
                      </div>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
            {error ? <div style={{ color: '#e74c3c' }}>{error}</div> : null}
            <BotonPaso onClick={crearPartida} disabled={enviando}>
              {enviando ? 'Creando…' : 'Empezar la aventura'}
            </BotonPaso>
          </>
        )}
      </div>
    </main>
  );
}
