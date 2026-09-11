import type { IncomingMessage, ServerResponse } from 'http';
import {
  getOwnerProfile,
  updateOwnerProfile,
  addOwnerMemory,
  deleteOwnerMemory,
  resetOwnerProfile,
} from './profileStore.ts';

// Helper to read body safely across Express and raw Vite middleware
function readRequestBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    // If Express already parsed the body
    if ((req as any).body && typeof (req as any).body === 'object') {
      return resolve((req as any).body);
    }
    if ((req as any).body && typeof (req as any).body === 'string') {
      try {
        return resolve(JSON.parse((req as any).body));
      } catch {
        return resolve({});
      }
    }

    const chunks: Buffer[] = [];
    req.on('data', (chunk) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    });

    req.on('end', () => {
      const bodyStr = Buffer.concat(chunks).toString('utf-8');
      try {
        const parsed = JSON.parse(bodyStr || '{}');
        resolve(parsed);
      } catch {
        resolve({});
      }
    });

    req.on('error', () => {
      resolve({});
    });
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export async function handleProfileRequest(req: IncomingMessage, res: ServerResponse) {
  const url = req.url || '';
  const method = req.method?.toUpperCase();

  // GET /api/profile -> retrieve current profile
  if (method === 'GET' && (url === '/api/profile' || url.startsWith('/api/profile?'))) {
    const profile = getOwnerProfile();
    return sendJson(res, 200, { success: true, profile });
  }

  // PUT or POST /api/profile/remember -> remember explicit fact
  if (
    (method === 'POST' || method === 'PUT') &&
    url.startsWith('/api/profile/remember')
  ) {
    const body = await readRequestBody(req);
    const fact = typeof body.fact === 'string' ? body.fact.trim() : '';
    if (!fact) {
      return sendJson(res, 400, {
        success: false,
        error: 'Fact text is required to remember.',
      });
    }
    const category = body.category || 'general';
    const profile = addOwnerMemory(fact, category);
    return sendJson(res, 200, { success: true, profile, message: 'Fact remembered' });
  }

  // DELETE /api/profile/memory/:id or /api/profile/memory?id=...
  if (method === 'DELETE' && url.includes('/api/profile/memory')) {
    let id = '';
    const urlObj = new URL(url, 'http://localhost');
    id = urlObj.searchParams.get('id') || '';

    if (!id) {
      const body = await readRequestBody(req);
      id = body.id || '';
    }

    if (!id) {
      // Check trailing path: /api/profile/memory/:id
      const parts = urlObj.pathname.split('/');
      id = parts[parts.length - 1];
    }

    if (!id || id === 'memory') {
      return sendJson(res, 400, {
        success: false,
        error: 'Memory ID is required for deletion.',
      });
    }

    const profile = deleteOwnerMemory(id);
    return sendJson(res, 200, { success: true, profile, message: 'Memory deleted' });
  }

  // POST /api/profile/reset -> reset to Anurag defaults
  if (method === 'POST' && url.startsWith('/api/profile/reset')) {
    const profile = resetOwnerProfile();
    return sendJson(res, 200, { success: true, profile, message: 'Profile reset to defaults' });
  }

  // PUT or PATCH or POST /api/profile -> update profile fields
  if (
    (method === 'PUT' || method === 'PATCH' || method === 'POST') &&
    (url === '/api/profile' || url.startsWith('/api/profile?'))
  ) {
    const body = await readRequestBody(req);
    const updated = updateOwnerProfile(body);
    return sendJson(res, 200, { success: true, profile: updated });
  }

  // Not handled
  return sendJson(res, 404, { success: false, error: 'Endpoint not found' });
}
