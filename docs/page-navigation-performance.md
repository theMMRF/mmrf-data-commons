# Page navigation authentication performance

Switching between Analysis Center and a tool requests new page data. Previously, the middleware, its terms helper, the terms API, and the identity helper each fetched Fence's public key and verified the same token. This added four key lookups before the terms-status lookup.

The middleware now passes its verified login result to its terms helper. The terms API still independently authenticates its incoming request, then passes that result to its identity helper. No trusted identity is accepted from an HTTP header, and login results are not shared across requests.

Only Fence's public signing key is cached, for 60 seconds per runtime. Simultaneous lookups share an in-flight request. Token signature, algorithm and expiry are still checked for every incoming request using this helper. A signature mismatch can refresh the key early for rotation, with a five-second cooldown to avoid a lookup for every invalid token. A newly rotated key may therefore take up to five seconds to be retried. Cached public keys can remain usable for the remainder of their 60-second lifetime; once expired, a failed refresh denies access rather than using stale material.

Terms status remains `no-store` and is fetched on each page check. Missing acceptance still redirects to Terms Acceptance. A terms-service failure does not allow navigation, and a terms API 401 now redirects to login rather than continuing with an earlier login result. The status/acceptance API endpoints retain their own authentication.

## Validation

```sh
npm run test:navigation-auth
```

The focused tests use real signed JWTs for expiry, invalid signatures, key rotation, lookup coalescing and cache expiry during an outage. They also check request-local identity reuse, fresh terms lookups, failure handling and page redirects. The changed runtime files pass a focused TypeScript check.

A controlled comparison on 2026-09-22 used the actual Next.js 15.5.14/Turbopack page-data route (`/_next/data/development/index.json?app=ProteinPaint`) on main (`25a863a`) and this branch. Both used identical dependencies and synthetic loopback services, with 150 ms added to each Fence-key and terms-status response. After compilation/warm-up, five sequential requests gave:

| | Main | Navigation fix |
| --- | ---: | ---: |
| Median page-data request | 935 ms | 336 ms |
| Fence key lookups across five requests | 20 | 0 |
| Terms-status lookups across five requests | 5 | 5 |

These measurements isolate repeated authentication work, not real deployment latency. A cold runtime still needs a key lookup, and the cache refreshes after one minute. Manual comparison should use the same backend, browser settings and cohort; warm each page before recording `index.json?app=...` durations. ProteinPaint data-query forwarding is handled separately in PR #24; this change is based on main and does not depend on that PR.
