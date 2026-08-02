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
      <div style={{ fontSize: 12, opacity: 0.6, letterSpacing: 1 }}>{nombre.toUpperCase()}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{valor}</div>
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
    <main style={{ minHeight: '100vh', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      <nav style={{ width: '100%', maxWidth: 700 }}>
        <Link href={`/partidas/${campaniaId}`} style={{ color: '#8ab4f8', fontSize: 14 }}>
          ← Volver a la partida
        </Link>
      </nav>

      {error ? <div style={{ color: '#e74c3c' }}>{error}</div> : null}

      {detalle ? (
        <>
          <h1 style={{ margin: 0, textAlign: 'center' }}>{detalle.campania.titulo}</h1>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 700 }}>
            {detalle.personajes.map((p) => (
              <div
                key={p.id}
                style={{
                  border: '1px solid #333',
                  borderRadius: 12,
                  padding: 20,
                  width: 300,
                  background: '#181818',
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.5, letterSpacing: 1 }}>{p.jugador.toUpperCase()}</div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>{p.nombre}</div>
                <div style={{ opacity: 0.7, marginBottom: 12 }}>{obtenerArquetipo(p.arquetipo)?.nombre ?? p.arquetipo}</div>

                <div style={{ marginBottom: 12 }}>
                  {'♥'.repeat(p.hp)}
                  <span style={{ opacity: 0.3 }}>{'♥'.repeat(Math.max(0, p.hp_max - p.hp))}</span>{' '}
                  <span style={{ fontSize: 13, opacity: 0.6 }}>
                    HP {p.hp}/{p.hp_max}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 16 }}>
                  <Atributo nombre="Fuerza" valor={p.fuerza} />
                  <Atributo nombre="Astucia" valor={p.astucia} />
                  <Atributo nombre="Corazón" valor={p.corazon} />
                </div>

                {p.debilidad ? (
                  <div style={{ marginBottom: 12, fontSize: 14 }}>
                    <span style={{ opacity: 0.6 }}>Debilidad: </span>
                    {p.debilidad}
                  </div>
                ) : null}

                <div style={{ fontSize: 14 }}>
                  <div style={{ opacity: 0.6, marginBottom: 4 }}>Inventario</div>
                  {p.items.length === 0 ? (
                    <div style={{ opacity: 0.4 }}>(vacío)</div>
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

                <div style={{ marginTop: 12, fontSize: 12, opacity: 0.4 }}>
                  Capítulos jugados: {p.capitulos_jugados}
                </div>
              </div>
            ))}
          </div>

          {detalle.personajes.length === 0 ? (
            <div style={{ opacity: 0.6 }}>Todavía no hay personajes en esta campaña.</div>
          ) : null}
        </>
      ) : !error ? (
        <div style={{ opacity: 0.6 }}>Cargando…</div>
      ) : null}
    </main>
  );
}
