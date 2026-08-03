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
    <main className="page">
      <nav className="nav-bar page-wide">
        <Link href="/" className="nav-link">← Partidas</Link>
        <span />
      </nav>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36 }}>🧑‍🤝‍🧑</div>
        <h1 style={{ fontSize: 28, marginTop: 6 }}>Personajes</h1>
        <p className="subtle" style={{ maxWidth: 360 }}>
          Se pueden reusar en varias partidas. Borrar acá es definitivo.
        </p>
      </div>

      {error ? <div className="error-box">{error}</div> : null}

      <div className="page-wide" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {personajes === null && !error ? <div className="subtle" style={{ textAlign: 'center' }}>Cargando…</div> : null}

        {personajes?.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="subtle">Todavía no hay ningún personaje creado.</div>
          </div>
        ) : null}

        {personajes?.map((p) => (
          <div key={p.id} className="card" style={{ opacity: borrando === p.id ? 0.5 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge">{p.jugador === 'hijo' ? 'Hijo' : 'Papá'}</span>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{p.nombre}</div>
                <div className="subtle">{obtenerArquetipo(p.arquetipo)?.nombre ?? p.arquetipo}</div>
              </div>

              {confirmando !== p.id ? (
                <button
                  onClick={() => setConfirmando(p.id)}
                  disabled={borrando === p.id}
                  title="Borrar este personaje"
                  className="btn-icon"
                >
                  🗑
                </button>
              ) : null}
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 20, fontWeight: 700 }}>
              <span>Fuerza {p.fuerza}</span>
              <span>Astucia {p.astucia}</span>
              <span>Corazón {p.corazon}</span>
            </div>
            <div className="subtle" style={{ marginTop: 8, fontSize: 14 }}>
              <span className="hearts-full">{'♥'.repeat(p.hp)}</span>
              <span className="hearts-empty">{'♥'.repeat(Math.max(0, p.hp_max - p.hp))}</span>
              {' · '}
              {p.capitulos_jugados} {p.capitulos_jugados === 1 ? 'capítulo jugado' : 'capítulos jugados'}
            </div>
            {p.items.length > 0 ? (
              <div className="subtle" style={{ marginTop: 4, fontSize: 14 }}>Inventario: {p.items.map((i) => i.nombre).join(', ')}</div>
            ) : null}
            {p.debilidad ? <div className="subtle" style={{ marginTop: 4, fontSize: 14 }}>Debilidad: {p.debilidad}</div> : null}
            {p.campanias.length > 0 ? (
              <div className="faint" style={{ marginTop: 4, fontSize: 13 }}>
                Jugando en: {p.campanias.map((c) => c.titulo).join(', ')}
              </div>
            ) : null}

            {confirmando === p.id ? (
              <div style={{ marginTop: 14, padding: 14, background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 14, marginBottom: 10 }}>
                  ¿Borrar a {p.nombre} para siempre?
                  {p.campanias.length > 0
                    ? ` Está jugando en ${p.campanias.length === 1 ? 'esta partida' : 'estas partidas'}: ${p.campanias.map((c) => c.titulo).join(', ')}. También sale de ahí.`
                    : ''}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => confirmarBorrado(p.id)} className="btn btn-danger" style={{ padding: '8px 16px', fontSize: 14 }}>
                    Sí, borrar
                  </button>
                  <button onClick={() => setConfirmando(null)} className="btn btn-outline" style={{ padding: '8px 16px', fontSize: 14 }}>
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
