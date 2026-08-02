import { db } from '../../../../src/db/singleton.js';
import * as repo from '../../../../src/db/repo.js';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;

  try {
    const detalle = repo.detalleCampania(db(), id);
    return Response.json(detalle);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 404 });
  }
}
