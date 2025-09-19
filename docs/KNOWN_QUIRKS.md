# Known Quirks

## Social Share containers (preview vs dist)
- Preview server may not render AddToAny containers immediately; postbuild dist does.
- Our DOM validator treats count differences as MATCH when both sides are PASS.

## PUBLIC_SITE_URL
- Must be set for canonical/hreflang/OG URL generation (build/test).

## Iframe allowlist
- Config: `src/config/iframe-allowlist.ts`
- Sandbox adds `allow-same-origin` only for whitelisted hostnames or their subdomains.

