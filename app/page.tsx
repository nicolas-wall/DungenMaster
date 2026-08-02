'use client';

import { useEffect, useRef, useState } from 'react';

interface Personaje {
  id: string;
  nombre: string;
  hp: number;
  hp_max: number;
}

interface EstadoPantalla {
  lista: boolean;
  capitulo?: { escena_actual: number; escenas_total: number; turno_actual: string | null };
  personajes?: Personaje[];
  tirada_pendiente?: number | null;
}

interface SegmentoAudio {
  voz: string;
  texto: string;
  audioBase64: string;
}

interface EntradaLog {
  quien: string;
  texto: string;
}

async function reproducirCola(segmentos: SegmentoAudio[]): Promise<void> {
  for (const seg of segmentos) {
    await new Promise<void>((resolve) => {
      const audio = new Audio(`data:audio/wav;base64,${seg.audioBase64}`);
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    });
  }
}

export default function PaginaDM() {
  const [estado, setEstado] = useState<EstadoPantalla>({ lista: false });
  const [autorId, setAutorId] = useState<string>('');
  const [textoInput, setTextoInput] = useState('');
  const [grabando, setGrabando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [log, setLog] = useState<EntradaLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sesionIniciadaRef = useRef(false);
  const transcripcionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (transcripcionRef.current) {
      transcripcionRef.current.scrollTop = transcripcionRef.current.scrollHeight;
    }
  }, [log]);

  async function refrescarEstado() {
    try {
      const r = await fetch('/api/estado');
      const datos = (await r.json()) as EstadoPantalla;
      setEstado(datos);
      if (!autorId && datos.personajes?.length) {
        setAutorId(datos.capitulo?.turno_actual ?? datos.personajes[0].id);
      }
      return datos;
    } catch {
      // el poll de estado no es crítico, se reintenta solo
      return null;
    }
  }

  async function iniciarSesion() {
    if (sesionIniciadaRef.current) return;
    sesionIniciadaRef.current = true;
    try {
      const r = await fetch('/api/sesion', { method: 'POST' });
      const datos = await r.json();
      if (!r.ok) {
        setError(datos.error ?? 'no se pudo iniciar la sesión');
        return;
      }
      if (datos.narracion) {
        setLog((prev) => [...prev, { quien: 'dm', texto: datos.narracion }]);
        if (datos.audio?.length) await reproducirCola(datos.audio);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    (async () => {
      const datos = await refrescarEstado();
      if (datos?.lista) await iniciarSesion();
    })();
    const id = setInterval(refrescarEstado, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function manejarRespuesta(respuestaFetch: Response, textoJugadorFallback: string) {
    const datos = await respuestaFetch.json();
    if (!respuestaFetch.ok) {
      setError(datos.error ?? 'error desconocido');
      setProcesando(false);
      return;
    }
    setLog((prev) => [
      ...prev,
      { quien: 'jugador', texto: datos.texto_jugador ?? textoJugadorFallback },
      { quien: 'dm', texto: datos.narracion },
    ]);
    setProcesando(false);
    await refrescarEstado();
    if (datos.audio?.length) {
      await reproducirCola(datos.audio);
    }
  }

  async function enviarTexto() {
    if (!textoInput.trim() || !autorId) return;
    setError(null);
    setProcesando(true);
    const texto = textoInput;
    setTextoInput('');
    try {
      const r = await fetch('/api/turno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, autorId }),
      });
      await manejarRespuesta(r, texto);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setProcesando(false);
    }
  }

  async function empezarGrabacion() {
    if (!autorId || grabando) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setProcesando(true);
        const form = new FormData();
        form.append('audio', blob, 'turno.webm');
        form.append('autorId', autorId);
        try {
          const r = await fetch('/api/turno', { method: 'POST', body: form });
          await manejarRespuesta(r, '(audio)');
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
          setProcesando(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setGrabando(true);
    } catch (err) {
      setError('No se pudo acceder al micrófono: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  function terminarGrabacion() {
    mediaRecorderRef.current?.stop();
    setGrabando(false);
  }

  const personajeTurno = estado.personajes?.find((p) => p.id === estado.capitulo?.turno_actual);

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 24, gap: 24 }}>
      <section style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 18, opacity: 0.7, letterSpacing: 2 }}>TURNO</div>
        <div style={{ fontSize: 48, fontWeight: 700 }}>{personajeTurno?.nombre ?? '—'}</div>

        {estado.tirada_pendiente ? (
          <div
            style={{
              marginTop: 16,
              display: 'inline-block',
              border: '4px solid #eee',
              borderRadius: 12,
              padding: '12px 32px',
            }}
          >
            <div style={{ fontSize: 16, opacity: 0.7 }}>OBJETIVO</div>
            <div style={{ fontSize: 64, fontWeight: 800 }}>≤ {estado.tirada_pendiente}</div>
          </div>
        ) : null}

        <div style={{ marginTop: 16, display: 'flex', gap: 24, justifyContent: 'center' }}>
          {estado.personajes?.map((p) => (
            <div key={p.id}>
              {p.nombre} {'♥'.repeat(p.hp)}
              <span style={{ opacity: 0.3 }}>{'♥'.repeat(Math.max(0, p.hp_max - p.hp))}</span>
            </div>
          ))}
        </div>

        {estado.capitulo ? (
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.5 }}>
            escena {estado.capitulo.escena_actual} / {estado.capitulo.escenas_total}
          </div>
        ) : (
          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.7 }}>
            No hay campaña activa todavía — corré <code>npm run seed</code>.
          </div>
        )}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <select value={autorId} onChange={(e) => setAutorId(e.target.value)} style={{ padding: 8 }}>
          {estado.personajes?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>

        <button
          onMouseDown={empezarGrabacion}
          onMouseUp={terminarGrabacion}
          onMouseLeave={() => grabando && terminarGrabacion()}
          disabled={procesando || !autorId}
          style={{
            width: 160,
            height: 160,
            borderRadius: '50%',
            fontSize: 18,
            fontWeight: 700,
            background: grabando ? '#c0392b' : procesando ? '#555' : '#2ecc71',
            color: '#fff',
            border: 'none',
            cursor: procesando ? 'wait' : 'pointer',
          }}
        >
          {grabando ? 'SOLTÁ PARA\nENVIAR' : procesando ? 'PENSANDO…' : 'MANTENÉ\nAPRETADO\nPARA HABLAR'}
        </button>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            value={textoInput}
            onChange={(e) => setTextoInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviarTexto()}
            placeholder="…o escribí acá para probar sin voz"
            disabled={procesando}
            style={{ padding: 8, width: 320 }}
          />
          <button onClick={enviarTexto} disabled={procesando || !textoInput.trim()}>
            Enviar
          </button>
        </div>

        {error ? <div style={{ color: '#e74c3c' }}>{error}</div> : null}
      </section>

      <section style={{ width: '100%', maxWidth: 640 }}>
        <div style={{ opacity: 0.5, marginBottom: 8, fontSize: 13, letterSpacing: 1 }}>TRANSCRIPCIÓN</div>
        <div
          ref={transcripcionRef}
          style={{
            maxHeight: 260,
            overflowY: 'auto',
            border: '1px solid #333',
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
          }}
        >
          {log.length === 0 ? (
            <div style={{ opacity: 0.4 }}>Todavía no pasó nada.</div>
          ) : (
            log.map((entrada, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <strong>{entrada.quien === 'dm' ? 'DM' : 'Jugador'}:</strong> {entrada.texto}
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
