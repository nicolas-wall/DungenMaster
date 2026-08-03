'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { obtenerArquetipo } from '../../../../src/motor/arquetipos.js';

interface Item {
  id: string;
  nombre: string;
  descripcion: string | null;
  usos: number | null;
}

interface PersonajeDetalle {
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
}

interface CampaniaDetalle {
  campania: { id: string; titulo: string };
  capitulo: { numero: number; titulo: string | null; escena_actual: number; escenas_total: number } | null;
  personajes: PersonajeDetalle[];
}

function Atributo({ nombre, valor }: { nombre: string; valor: number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="eyebrow" style={{ fontSize: 10 }}>{nombre}</div>
      <div style={{ fontSize: 26, fontWeight: 800 }}>{valor}</div>
    </div>
  );
}

export default function PaginaPersonajes() {
  const { id: campaniaId } = useParams<{ id: string }>();
  const [detalle, setDetalle] = useState<CampaniaDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/campanias/${campaniaId}`)
      .then((r) => r.json())
      .then((datos) => {
        if (datos.error) setError(datos.error);
        else setDetalle(datos);
      })
      .catch((err) => setError(String(err)));
  }, [campaniaId]);

  return (
    <main className="page">
      <nav className="nav-bar page-wide">
        <Link href={`/partidas/${campaniaId}`} className="nav-link">← Volver a la partida</Link>
        <span />
      </nav>

      {error ? <div className="error-box">{error}</div> : null}

      {detalle ? (
        <>
          <h1 style={{ textAlign: 'center', fontSize: 28 }}>{detalle.campania.titulo}</h1>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 700 }}>
            {detalle.personajes.map((p) => (
              <div key={p.id} className="card" style={{ width: 300 }}>
                <span className="badge">{p.jugador === 'hijo' ? 'Hijo' : 'Papá'}</span>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>{p.nombre}</div>
                <div className="subtle" style={{ marginBottom: 14 }}>{obtenerArquetipo(p.arquetipo)?.nombre ?? p.arquetipo}</div>

                <div style={{ marginBottom: 16 }}>
                  <span className="hearts-full">{'♥'.repeat(p.hp)}</span>
                  <span className="hearts-empty">{'♥'.repeat(Math.max(0, p.hp_max - p.hp))}</span>{' '}
                  <span className="faint" style={{ fontSize: 13 }}>
                    HP {p.hp}/{p.hp_max}
                  </span>
                </div>

                <div className="card" style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 16, background: 'var(--bg-elevated)' }}>
                  <Atributo nombre="Fuerza" valor={p.fuerza} />
                  <Atributo nombre="Astucia" valor={p.astucia} />
                  <Atributo nombre="Corazón" valor={p.corazon} />
                </div>

                {p.debilidad ? (
                  <div style={{ marginBottom: 12, fontSize: 14 }}>
                    <span className="faint">Debilidad: </span>
                    {p.debilidad}
                  </div>
                ) : null}

                <div style={{ fontSize: 14 }}>
                  <div className="faint" style={{ marginBottom: 4 }}>Inventario</div>
                  {p.items.length === 0 ? (
                    <div className="faint">(vacío)</div>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {p.items.map((item) => (
                        <li key={item.id}>
                          {item.nombre}
                          {item.usos !== null ? ` (${item.usos})` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="faint" style={{ marginTop: 14, fontSize: 12 }}>
                  Capítulos jugados: {p.capitulos_jugados}
                </div>
              </div>
            ))}
          </div>

          {detalle.personajes.length === 0 ? (
            <div className="subtle">Todavía no hay personajes en esta campaña.</div>
          ) : null}
        </>
      ) : !error ? (
        <div className="subtle">Cargando…</div>
      ) : null}
    </main>
  );
}
