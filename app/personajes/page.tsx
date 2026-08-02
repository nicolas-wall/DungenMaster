'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { obtenerArquetipo } from '../../src/motor/arquetipos.js';

interface Item {
  id: string;
  nombre: string;
  usos: number | null;
}

interface PersonajeGlobal {
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
  items: Item[];
  campanias: { id: string; titulo: string }[];
}

export default function PaginaPersonajesGlobal() {
  const [personajes, setPersonajes] = useState<PersonajeGlobal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);

  function cargar() {
    fetch('/api/personajes')
      .then((r) => r.json())
      .then((datos) => setPersonajes(datos.personajes))
      .catch((err) => setError(String(err)));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function confirmarBorrado(id: string) {
    setBorrando(id);
    setConfirmando(null);
    setError(null);
    try {
      const r = await fetch(`/api/personajes/${id}`, { method: 'DELETE' });
      const datos = await r.json();
      if (!r.ok) throw new Error(datos.error ?? 'no se pudo borrar');
      setPersonajes((prev) => prev?.filter((p) => p.id !== id) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBorrando(null);
    }
  }

  return (
    <main style={{ minHeight: '100vh', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      <nav style={{ width: '100%', maxWidth: 700 }}>
        <Link href="/" style={{ color: '#8ab4f8', fontSize: 14 }}>
          ← Partidas
        </Link>
      </nav>

      <h1 style={{ margin: 0 }}>Personajes</h1>
      <p style={{ opacity: 0.6, marginTop: -16, textAlign: 'center' }}>
        Se pueden reusar en varias partidas. Borrar acá es definitivo.
      </p>

      {error ? <div style={{ color: '#e74c3c' }}>{error}</div> : null}

      <div style={{ width: '100%', maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {personajes === null && !error ? <div style={{ opacity: 0.6, textAlign: 'center' }}>Cargando…</div> : null}

        {personajes?.length === 0 ? (
          <div style={{ opacity: 0.6, textAlign: 'center' }}>Todavía no hay ningún personaje creado.</div>
        ) : null}

        {personajes?.map((p) => (
          <div
            key={p.id}
            style={{
              border: '1px solid #333',
              borderRadius: 12,
              padding: 16,
              background: '#181818',
              opacity: borrando === p.id ? 0.5 : 1,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.5, letterSpacing: 1 }}>{p.jugador.toUpperCase()}</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{p.nombre}</div>
                <div style={{ opacity: 0.7 }}>{obtenerArquetipo(p.arquetipo)?.nombre ?? p.arquetipo}</div>
              </div>

              {confirmando !== p.id ? (
                <button
                  onClick={() => setConfirmando(p.id)}
                  disabled={borrando === p.id}
                  title="Borrar este personaje"
                  style={{ background: 'transparent', border: 'none', color: '#e74c3c', fontSize: 18, cursor: 'pointer' }}
                >
                  🗑
                </button>
              ) : null}
            </div>

            <div style={{ marginTop: 10, display: 'flex', gap: 20 }}>
              <span>Fuerza {p.fuerza}</span>
              <span>Astucia {p.astucia}</span>
              <span>Corazón {p.corazon}</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 14, opacity: 0.7 }}>
              HP {p.hp}/{p.hp_max} · {p.capitulos_jugados} {p.capitulos_jugados === 1 ? 'capítulo jugado' : 'capítulos jugados'}
            </div>
            {p.items.length > 0 ? (
              <div style={{ marginTop: 4, fontSize: 14, opacity: 0.7 }}>Inventario: {p.items.map((i) => i.nombre).join(', ')}</div>
            ) : null}
            {p.debilidad ? <div style={{ marginTop: 4, fontSize: 14, opacity: 0.7 }}>Debilidad: {p.debilidad}</div> : null}
            {p.campanias.length > 0 ? (
              <div style={{ marginTop: 4, fontSize: 14, opacity: 0.5 }}>
                Jugando en: {p.campanias.map((c) => c.titulo).join(', ')}
              </div>
            ) : null}

            {confirmando === p.id ? (
              <div style={{ marginTop: 12, padding: 12, background: '#241414', borderRadius: 8 }}>
                <div style={{ fontSize: 14, marginBottom: 8 }}>
                  ¿Borrar a {p.nombre} para siempre?
                  {p.campanias.length > 0
                    ? ` Está jugando en ${p.campanias.length === 1 ? 'esta partida' : 'estas partidas'}: ${p.campanias.map((c) => c.titulo).join(', ')}. También sale de ahí.`
                    : ''}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => confirmarBorrado(p.id)}
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
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </main>
  );
}
