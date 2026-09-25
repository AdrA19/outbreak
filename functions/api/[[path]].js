export async function onRequest(context) {
  const { request, params, env } = context;

  const TUNNEL_URL = env.TUNNEL_URL;
  if (!TUNNEL_URL) {
    return new Response(
      JSON.stringify({ error: 'TUNNEL_URL not set in Pages environment variables' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const path = params.path ? '/' + params.path.join('/') : '/';
  const url = new URL(request.url);
  const target = new URL(TUNNEL_URL + path + url.search);

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ipcountry');
  headers.delete('cf-ray');
  headers.delete('cf-visitor');
  headers.delete('x-forwarded-proto');
  headers.delete('x-real-ip');

  const method = request.method.toUpperCase();
  const body = (method === 'GET' || method === 'HEAD') ? undefined : request.body;

  try {
    const upstream = await fetch(target.toString(), {
      method,
      headers,
      body,
      redirect: 'manual',
    });

    const respHeaders = new Headers(upstream.headers);
    respHeaders.delete('content-encoding');
    respHeaders.delete('content-length');
    respHeaders.delete('transfer-encoding');

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: respHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Tunnel unreachable', detail: String(err) }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
