/**
 * Cloudflare Worker: GitHub OAuth Proxy for Decap CMS
 *
 * 目标：给 Decap CMS 的 GitHub backend 提供 /auth 与 /callback
 *
 * 重要：不要把 Client Secret 写进仓库。
 * 在 Worker 的 Settings -> Variables 里设置：
 * - GITHUB_CLIENT_ID (Text)
 * - GITHUB_CLIENT_SECRET (Secret)
 */

const DEFAULT_ALLOWED_ORIGINS = [
  'https://www.playfiddlebops.com',
  'https://fb-jf.pages.dev',
  'http://localhost:4321',
];

function parseCookie(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function cookie(name, value, opts = {}) {
  const pieces = [`${name}=${value}`];
  if (opts.maxAge !== undefined) pieces.push(`Max-Age=${opts.maxAge}`);
  pieces.push(`Path=${opts.path ?? '/'}`);
  if (opts.httpOnly) pieces.push('HttpOnly');
  if (opts.secure) pieces.push('Secure');
  pieces.push(`SameSite=${opts.sameSite ?? 'Lax'}`);
  return pieces.join('; ');
}

function isAllowedOrigin(origin, allowed) {
  return Boolean(origin) && allowed.includes(origin);
}

async function handleAuth(request, env) {
  const url = new URL(request.url);

  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response('Missing GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET', { status: 500 });
  }

  const provider = url.searchParams.get('provider') || 'github';
  // 目前只支持 GitHub（Decap CMS GitHub backend 就是这个）
  if (provider !== 'github') {
    return new Response('Unsupported provider', { status: 400 });
  }

  const scope = url.searchParams.get('scope') || 'repo,user';

  // 用 cookie 保存 state，回调时校验
  const state = crypto.randomUUID();

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', `${url.origin}/callback`);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);

  // Decap CMS 需要一个 handshake：先 postMessage('authorizing:github')，再等 opener 回同样的消息
  // 否则 CMS 不会进入 authorizeCallback，最终的 success 消息会被忽略。
  const handshakeMsg = `authorizing:${provider}`;

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <title>Authorization</title>
  </head>
  <body>
    <script>
      (function () {
        var msg = ${JSON.stringify(handshakeMsg)};
        var next = ${JSON.stringify(authUrl.toString())};
        var started = false;

        function start() {
          if (started) return;
          started = true;
          window.location.href = next;
        }

        try {
          if (window.opener) {
            // 通知 CMS：auth window 已就绪
            window.opener.postMessage(msg, '*');
          }
        } catch (e) {}

        window.addEventListener('message', function (e) {
          if (e && e.data === msg) {
            start();
          }
        }, false);

        // 兜底：如果有人直接打开 /auth，不会卡死
        setTimeout(start, 10000);
      })();
    </script>
  </body>
</html>`;

  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', cookie('__cms_oauth_state', state, { httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 300 }));

  return new Response(html, { status: 200, headers });
}

async function handleCallback(request, env) {
  const url = new URL(request.url);

  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response('Missing GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET', { status: 500 });
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code) return new Response('Missing code parameter', { status: 400 });

  const cookies = parseCookie(request.headers.get('Cookie') || '');
  const expectedState = cookies.__cms_oauth_state;
  if (!expectedState || !state || expectedState !== state) {
    return new Response('Invalid state', { status: 400 });
  }

  const originCookie = cookies.__cms_oauth_origin ? decodeURIComponent(cookies.__cms_oauth_origin) : '';

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (tokenData.error) {
    return new Response(`Error: ${tokenData.error_description || tokenData.error}`, { status: 400 });
  }

  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return new Response('Missing access_token in GitHub response', { status: 400 });
  }

  // Decap CMS 约定的回调消息格式
  const msg = `authorization:github:success:${JSON.stringify({ token: accessToken, provider: 'github' })}`;
  const targetOrigin = originCookie || '*';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="robots" content="noindex" />
  <title>OAuth Callback</title>
</head>
<body>
  <script>
    (function () {
      try {
        if (window.opener) {
          window.opener.postMessage(${JSON.stringify(msg)}, ${JSON.stringify(targetOrigin)});
          window.close();
          return;
        }
      } catch (e) {}
      document.body.textContent = 'Authentication successful. You can close this window.';
    })();
  </script>
</body>
</html>`;

  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8' });
  // 清 cookie
  headers.append('Set-Cookie', cookie('__cms_oauth_state', '', { httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 0 }));
  headers.append('Set-Cookie', cookie('__cms_oauth_origin', '', { httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 0 }));

  return new Response(html, { status: 200, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/auth' || url.pathname === '/auth/') {
      return handleAuth(request, env);
    }
    if (url.pathname === '/callback' || url.pathname === '/callback/') {
      return handleCallback(request, env);
    }

    return new Response(
      JSON.stringify(
        {
          ok: true,
          service: 'decap-github-oauth-proxy',
          endpoints: {
            auth: '/auth?provider=github&scope=repo,user',
            callback: '/callback',
          },
        },
        null,
        2,
      ),
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  },
};
