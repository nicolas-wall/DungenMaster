'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Personaje {
  id: string;
  nombre: string;
  hp: number;
  hp_max: number;
}

interface EstadoPantalla {
  lista: boolean;
  campania?: { id: string; titulo: string };
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

export default function PaginaPartida() {
  const { id: campaniaId } = useParams<{ id: string }>();

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
      const r = await fetch(`/api/estado?campaniaId=${campaniaId}`);
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
      const r = await fetch('/api/sesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaniaId }),
      });
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
  }, [campaniaId]);

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
        body: JSON.stringify({ texto, autorId, campaniaId }),
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
        form.append('campaniaId', String(campaniaId));
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
    <main className="page">
      <nav className="nav-bar page-narrow">
        <Link href="/" className="nav-link">← Partidas</Link>
        <Link href={`/partidas/${campaniaId}/personajes`} className="nav-link">Ver personajes</Link>
      </nav>

      <section style={{ textAlign: 'center' }}>
        {estado.campania ? <div className="faint" style={{ marginBottom: 6 }}>{estado.campania.titulo}</div> : null}
        <div className="eyebrow">Turno</div>
        <div style={{ fontSize: 46, fontWeight: 800, marginTop: 2 }}>{personajeTurno?.nombre ?? '—'}</div>

        {estado.tirada_pendiente ? (
          <div
            className="card"
            style={{
              marginTop: 18,
              display: 'inline-block',
              borderColor: 'var(--accent)',
              boxShadow: '0 0 0 3px rgba(255, 182, 72, 0.15)',
              padding: '14px 36px',
            }}
          >
            <div className="eyebrow" style={{ color: 'var(--accent)' }}>Objetivo</div>
            <div style={{ fontSize: 60, fontWeight: 800, color: 'var(--accent)' }}>≤ {estado.tirada_pendiente}</div>
          </div>
        ) : null}

        <div style={{ marginTop: 18, display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {estado.personajes?.map((p) => (
            <div key={p.id} style={{ fontWeight: 700 }}>
              {p.nombre}{' '}
              <span className="hearts-full">{'♥'.repeat(p.hp)}</span>
              <span className="hearts-empty">{'♥'.repeat(Math.max(0, p.hp_max - p.hp))}</span>
            </div>
          ))}
        </div>

        {estado.capitulo ? (
          <div className="faint" style={{ marginTop: 10, fontSize: 12 }}>
            escena {estado.capitulo.escena_actual} / {estado.capitulo.escenas_total}
          </div>
        ) : (
          <div className="subtle" style={{ marginTop: 10, fontSize: 14 }}>Cargando partida…</div>
        )}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <select value={autorId} onChange={(e) => setAutorId(e.target.value)} className="input" style={{ width: 'auto', minWidth: 160, textAlign: 'center', fontWeight: 700 }}>
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
          className="btn-ptt"
          style={{
            background: grabando ? 'var(--danger)' : procesando ? 'var(--bg-elevated)' : 'var(--primary)',
            color: grabando ? '#3a0d0d' : procesando ? 'var(--text-dim)' : 'var(--primary-ink)',
            border: procesando ? '2px solid var(--border-strong)' : 'none',
            cursor: procesando ? 'wait' : 'pointer',
            boxShadow: grabando ? '0 0 0 10px rgba(255, 107, 107, 0.18)' : '0 8px 24px rgba(53, 208, 160, 0.25)',
          }}
        >
          {grabando ? '🎙️\nSOLTÁ PARA\nENVIAR' : procesando ? 'PENSANDO…' : '🎙️\nMANTENÉ\nAPRETADO'}
        </button>

        <div style={{ display: 'flex', gap: 8, marginTop: 4, width: '100%', maxWidth: 420 }}>
          <input
            value={textoInput}
            onChange={(e) => setTextoInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviarTexto()}
            placeholder="…o escribí acá para probar sin voz"
            disabled={procesando}
            className="input"
          />
          <button onClick={enviarTexto} disabled={procesando || !textoInput.trim()} className="btn btn-primary">
            Enviar
          </button>
        </div>

        {error ? <div className="error-box">{error}</div> : null}
      </section>

      <section className="page-narrow">
        <div className="eyebrow" style={{ marginBottom: 8 }}>Transcripción</div>
        <div
          ref={transcripcionRef}
          className="card"
          style={{ maxHeight: 260, overflowY: 'auto', fontSize: 14, lineHeight: 1.5 }}
        >
          {log.length === 0 ? (
            <div className="faint">Todavía no pasó nada.</div>
          ) : (
            log.map((entrada, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <strong style={{ color: entrada.quien === 'dm' ? 'var(--primary)' : 'var(--accent)' }}>
                  {entrada.quien === 'dm' ? 'DM' : 'Jugador'}:
                </strong>{' '}
                {entrada.texto}
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
