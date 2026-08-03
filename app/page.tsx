'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CampaniaResumen {
  id: string;
  titulo: string;
  creadaEn: number;
  capitulo: { numero: number; escenaActual: number; escenasTotal: number } | null;
  personajes: { id: string; nombre: string; arquetipo: string; hp: number; hpMax: number }[];
}

function Corazones({ hp, hpMax }: { hp: number; hpMax: number }) {
  return (
    <span>
      <span className="hearts-full">{'♥'.repeat(hp)}</span>
      <span className="hearts-empty">{'♥'.repeat(Math.max(0, hpMax - hp))}</span>
    </span>
  );
}

export default function Lobby() {
  const [campanias, setCampanias] = useState<CampaniaResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);

  function cargarCampanias() {
    fetch('/api/campanias')
      .then((r) => r.json())
      .then((datos) => setCampanias(datos.campanias))
      .catch((err) => setError(String(err)));
  }

  useEffect(() => {
    cargarCampanias();
  }, []);

  async function confirmarBorrado(id: string) {
    setBorrando(id);
    setConfirmando(null);
    setError(null);
    try {
      const r = await fetch(`/api/campanias/${id}`, { method: 'DELETE' });
      const datos = await r.json();
      if (!r.ok) throw new Error(datos.error ?? 'no se pudo borrar');
      setCampanias((prev) => prev?.filter((c) => c.id !== id) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBorrando(null);
    }
  }

  return (
    <main className="page">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, lineHeight: 1 }}>🐉</div>
        <h1 style={{ fontSize: 32, marginTop: 8 }}>Tus aventuras</h1>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Link href="/partidas/nueva" className="btn btn-primary">
          ✨ Nueva partida
        </Link>
        <Link href="/personajes" className="nav-link">
          Ver personajes
        </Link>
      </div>

      {error ? <div className="error-box">{error}</div> : null}

      <div className="page-wide" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {campanias === null && !error ? <div className="subtle" style={{ textAlign: 'center' }}>Cargando…</div> : null}

        {campanias?.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📜</div>
            <div className="subtle">Todavía no hay ninguna partida. ¡Creá la primera arriba!</div>
          </div>
        ) : null}

        {campanias?.map((c) => (
          <div
            key={c.id}
            className="card"
            style={{
              display: 'flex',
              alignItems: 'stretch',
              gap: 8,
              padding: 0,
              opacity: borrando === c.id ? 0.5 : 1,
            }}
          >
            <Link href={`/partidas/${c.id}`} className="card-link" style={{ flex: 1, padding: '18px 20px', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: 21, fontWeight: 800 }}>{c.titulo}</div>
              <div className="subtle" style={{ fontSize: 14, marginTop: 4 }}>
                {c.personajes.map((p) => p.nombre).join(' y ') || 'sin personajes'}
                {c.capitulo ? ` · capítulo ${c.capitulo.numero}, escena ${c.capitulo.escenaActual}/${c.capitulo.escenasTotal}` : ''}
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 20 }}>
                {c.personajes.map((p) => (
                  <span key={p.id} style={{ fontSize: 14 }}>
                    <strong>{p.nombre}</strong> <Corazones hp={p.hp} hpMax={p.hpMax} />
                  </span>
                ))}
              </div>
            </Link>

            {confirmando === c.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px' }}>
                <span className="subtle" style={{ fontSize: 13 }}>¿Borrar?</span>
                <button onClick={() => confirmarBorrado(c.id)} disabled={borrando === c.id} className="btn btn-danger" style={{ padding: '8px 16px', fontSize: 14 }}>
                  Sí, borrar
                </button>
                <button onClick={() => setConfirmando(null)} className="btn btn-outline" style={{ padding: '8px 16px', fontSize: 14 }}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmando(c.id)}
                disabled={borrando === c.id}
                title="Borrar esta partida"
                className="btn-icon"
                style={{ margin: '0 8px' }}
              >
                🗑
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
