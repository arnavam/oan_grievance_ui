import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { LAST_ACTIVITY_COOKIE } from '../src/lib/idleSession';

// A helper to send raw HTTP upgrade requests
function sendRawUpgrade(port: number, headers: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    import('node:net').then(({ createConnection }) => {
      const client = createConnection({ port }, () => {
        let req = 'GET / HTTP/1.1\r\n' +
                  'Host: localhost\r\n' +
                  'Connection: Upgrade\r\n' +
                  'Upgrade: websocket\r\n' +
                  'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n' +
                  'Sec-WebSocket-Version: 13\r\n';
        for (const [k, v] of Object.entries(headers)) {
          req += `${k}: ${v}\r\n`;
        }
        req += '\r\n';
        client.write(req);
      });

      let response = '';
      client.on('data', (data) => {
        response += data.toString();
        // Don't close immediately if we expect a 101, but we just want the headers
        if (response.includes('\r\n\r\n')) {
          client.end();
        }
      });

      client.on('end', () => {
        resolve(response);
      });

      client.on('error', reject);
    });
  });
}

describe('Realtime Gateway Server', () => {
  let gatewayPort: number;
  let upstreamPort: number;
  let upstreamServer: http.Server;
  let server: http.Server;
  
  beforeAll(async () => {
    // Start upstream mock
    upstreamServer = http.createServer();
    upstreamServer.on('upgrade', (req, socket, _head) => {
      socket.write('HTTP/1.1 101 Switching Protocols\r\n' +
                   'Upgrade: websocket\r\n' +
                   'Connection: Upgrade\r\n' +
                   `X-Echo-Auth: ${req.headers['authorization'] || 'none'}\r\n` +
                   `X-Echo-Origin: ${req.headers['origin'] || 'none'}\r\n` +
                   `X-Echo-Site: ${req.headers['x-frappe-site-name'] || 'none'}\r\n` +
                   '\r\n');
      socket.end();
    });
    
    await new Promise<void>((resolve) => {
      upstreamServer.listen(0, () => {
        const address = upstreamServer.address();
        upstreamPort = (address && typeof address === 'object') ? address.port : 0;
        resolve();
      });
    });

    process.env.REALTIME_UPSTREAM_URL = `ws://localhost:${upstreamPort}`;
    process.env.REALTIME_UPSTREAM_IS_FRAPPE = 'true';
    process.env.REALTIME_SITE = 'mysite.localhost';
    
    const gatewayModule = await import('./server');
    server = gatewayModule.server;
    
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        gatewayPort = (address && typeof address === 'object') ? address.port : 0;
        resolve();
      });
    });
  });

  afterAll(() => {
    server.close();
    upstreamServer.close();
  });

  it('rejects connection if origin is not allowed', async () => {
    const res = await sendRawUpgrade(gatewayPort, {
      'Origin': 'http://evil.com'
    });
    expect(res).toContain('403 Forbidden');
  });

  it('rejects connection if auth_token is missing', async () => {
    const res = await sendRawUpgrade(gatewayPort, {
      'Origin': 'http://localhost:3000'
    });
    expect(res).toContain('401 Unauthorized');
  });

  it('rejects connection if session is idle', async () => {
    // Generate a valid-looking JWT for decodeAccessToken
    const payload = { sub: 'user1', roles: ['Officer'], exp: Math.floor(Date.now() / 1000) + 3600 };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const validToken = `header.${payloadB64}.signature`;
    
    // Missing LAST_ACTIVITY_COOKIE means idle
    const res = await sendRawUpgrade(gatewayPort, {
      'Origin': 'http://localhost:3000',
      'Cookie': `auth_token=${validToken}`
    });
    
    expect(res).toContain('401 Unauthorized');
  });

  it('rejects connection if token is invalid', async () => {
    const nowStr = Date.now().toString();
    const res = await sendRawUpgrade(gatewayPort, {
      'Origin': 'http://localhost:3000',
      'Cookie': `auth_token=badtoken; ${LAST_ACTIVITY_COOKIE}=${nowStr}`
    });
    
    expect(res).toContain('401 Unauthorized');
  });

  it('proxies successful connections and injects Frappe headers', async () => {
    const payload = { sub: 'user1', roles: ['Officer'], exp: Math.floor(Date.now() / 1000) + 3600 };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const validToken = `header.${payloadB64}.signature`;
    const nowStr = Date.now().toString();
    
    // We expect the HTTP response to contain 101 Switching Protocols
    const res = await sendRawUpgrade(gatewayPort, {
      'Origin': 'http://localhost:3000',
      'Host': 'localhost:3000',
      'Cookie': `auth_token=${validToken}; ${LAST_ACTIVITY_COOKIE}=${nowStr}`
    });
    
    // In Frappe mode, origin is overwritten to match Host, and token is in Bearer
    // In Frappe mode, origin is overwritten to match Host, and token is in Bearer
    expect(res).toContain('101 Switching Protocols');
    expect(res).toContain(`x-echo-auth: Bearer ${validToken}`);
    expect(res).toContain('x-echo-origin: http://mysite.localhost:8000');
    expect(res).toContain('x-echo-site: mysite.localhost');
  });
});
