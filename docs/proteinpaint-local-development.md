# ProteinPaint development proxy

Restart Next after changing environment variables. In development the browser uses `/protein-paint` on the frontend origin; Next forwards the request server-side. These PP requests do not require Chrome --disable-web-security or a separate TLS proxy. Other application routes and login configuration are unchanged.

## Local frontend and local PP backend

Start your normal PP backend on localhost port 3000, then start Virtual Lab on port 3333:

```sh
PROTEINPAINT_API=http://localhost:3000 \
NEXT_PUBLIC_PROTEINPAINT_API=/protein-paint \
NEXT_PUBLIC_GEN3_API=http://localhost:3333 \
NEXT_PUBLIC_GEN3_API_TARGET=https://dev-virtuallab.themmrf.org \
PORT=3333 npm run dev -- --hostname 127.0.0.1
```

Open http://localhost:3333 and use the usual Virtual Lab login. PROTEINPAINT_API is a server-only setting; it accepts an HTTP or HTTPS localhost origin (localhost, 127.0.0.1 or [::1]) with an optional port, not an arbitrary remote server or URL path. It takes precedence over the remote commons target for PP requests only. `/protein-paint/genomes` becomes `/genomes` on your local backend. Request bodies and query strings are preserved. Gen3 cookies and Authorization headers are removed before forwarding locally. The local PP backend must use its own approved API authentication when calling protected dev analysis endpoints.

The local PP route does not require a Gen3 token; keep both development servers bound to localhost. It is unavailable outside NODE_ENV=development. For live client-library edits, the existing src/features/proteinpaint/dev.sh script still supports npm linking and now selects this proxy path. The separate Next/Turbopack compatibility of a developer's linked library build is not established by proxy tests.

## Local frontend and deployed dev PP backend

Leave PROTEINPAINT_API unset (including in .env.local), then run:

```sh
env -u PROTEINPAINT_API \
NEXT_PUBLIC_PROTEINPAINT_API=/protein-paint \
NEXT_PUBLIC_GEN3_API=http://localhost:3333 \
NEXT_PUBLIC_GEN3_API_TARGET=https://dev-virtuallab.themmrf.org \
PORT=3333 npm run dev -- --hostname 127.0.0.1
```

Sign in with your dev user credentials. The proxy requires a bearer token or an access_token/credentials_token cookie and forwards a bearer token to the HTTPS commons `/protein-paint` service. It never substitutes the PP service account. A malformed header does not fall back to a cookie. The hosted deployment is unchanged by this development-only route.

## What can be tested without St. Jude's full backend

`npm run test:metadata-auth` tests remote credential forwarding with a mocked transport, streaming-error handling, and real HTTP communication between temporary local servers for local mode. It verifies paths, JSON bodies, query strings and credential stripping, plus rejection of non-local overrides and production use. A focused TypeScript check and the Next rewrite configuration were also checked.

These checks do not run the real PP datasets, linked client builds, browser login, or the full Next server. Full tool validation still needs St. Jude's running backend/data or the deployed dev service. For a routing-only manual check, a localhost mock server can return a simple JSON response for `/genomes`; it will confirm routing but will not provide a valid dataset for rendering a tool.
