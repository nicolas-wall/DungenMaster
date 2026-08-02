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
    <main style={{ minHeight: '100vh', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      <h1 style={{ marginBottom: 0 }}>Partidas</h1>

      <Link
        href="/partidas/nueva"
        style={{
          background: '#2ecc71',
          color: '#111',
          fontWeight: 700,
          padding: '12px 28px',
          borderRadius: 8,
          textDecoration: 'none',
        }}
      >
        + Nueva partida
      </Link>

      {error ? <div style={{ color: '#e74c3c' }}>{error}</div> : null}

      <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {campanias === null && !error ? <div style={{ opacity: 0.6, textAlign: 'center' }}>Cargando…</div> : null}

        {campanias?.length === 0 ? (
          <div style={{ opacity: 0.6, textAlign: 'center' }}>Todavía no hay ninguna partida. Creá la primera.</div>
        ) : null}

        {campanias?.map((c) => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'stretch',
              gap: 8,
              border: '1px solid #333',
              borderRadius: 12,
              background: '#181818',
              opacity: borrando === c.id ? 0.5 : 1,
            }}
          >
            <Link
              href={`/partidas/${c.id}`}
              style={{
                display: 'block',
                flex: 1,
                padding: 16,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700 }}>{c.titulo}</div>
              <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>
                {c.personajes.map((p) => p.nombre).join(' y ') || 'sin personajes'}
                {c.capitulo ? ` — capítulo ${c.capitulo.numero}, escena ${c.capitulo.escenaActual}/${c.capitulo.escenasTotal}` : ''}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
                {c.personajes.map((p) => (
                  <span key={p.id} style={{ fontSize: 13 }}>
                    {p.nombre} {'♥'.repeat(p.hp)}
                    <span style={{ opacity: 0.3 }}>{'♥'.repeat(Math.max(0, p.hpMax - p.hp))}</span>
                  </span>
                ))}
              </div>
            </Link>

            {confirmando === c.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px' }}>
                <span style={{ fontSize: 13, opacity: 0.8 }}>¿Borrar?</span>
                <button
                  onClick={() => confirmarBorrado(c.id)}
                  disabled={borrando === c.id}
                  style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}
                >
                  Sí, borrar
                </button>
                <button
                  onClick={() => setConfirmando(null)}
                  style={{ background: 'transparent', color: '#aaa', border: '1px solid #444', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmando(c.id)}
                disabled={borrando === c.id}
                title="Borrar esta partida"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#e74c3c',
                  fontSize: 18,
                  padding: '0 18px',
                  cursor: borrando === c.id ? 'wait' : 'pointer',
                }}
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
