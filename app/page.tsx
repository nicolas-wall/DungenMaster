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

  useEffect(() => {
    fetch('/api/campanias')
      .then((r) => r.json())
      .then((datos) => setCampanias(datos.campanias))
      .catch((err) => setError(String(err)));
  }, []);

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
          <Link
            key={c.id}
            href={`/partidas/${c.id}`}
            style={{
              display: 'block',
              border: '1px solid #333',
              borderRadius: 12,
              padding: 16,
              textDecoration: 'none',
              color: 'inherit',
              background: '#181818',
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
        ))}
      </div>
    </main>
  );
}
