# Glyph Explorer

A fast, readable explorer for public [Qubic](https://qubic.org/) network data. Glyph Explorer uses the official Qubic RPC packages to show network health, ticks, transactions, identities, tokens, generated contract metadata, and the rich list.

## What it supports

- Network overview and current tick quality
- Direct lookup of identities, transaction hashes, ticks, tokens, and contracts
- Identity balances, asset relationships, transaction history, QR sharing, and optional wallet-transfer preparation
- Transaction payloads and safe generated-contract procedure decoding
- Tick metadata and transaction lists
- Asset issuance catalogue and details
- Generated smart-contract catalogue
- Rich-list balances from the public Stats API

The explorer only presents public RPC responses. Archive and stats data can lag the live network.

## Requirements

- [Bun](https://bun.sh/) `1.3.14` or later
- A supported Node.js runtime for Next.js 16 when running outside Bun

## Local development

```bash
bun install
cp .env.example .env.local
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). The default public Qubic endpoints work without local configuration.

## Configuration

Copy `.env.example` to `.env.local` and set only the values needed for your deployment.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Recommended in production | Public canonical HTTPS URL, used for canonical URLs, sitemap, and sharing metadata. |
| `NEXT_PUBLIC_QUBIC_LIVE_RPC_URL` | No | Overrides the live RPC base URL. Defaults to `https://rpc.qubic.org/live/v1`. |
| `NEXT_PUBLIC_QUBIC_QUERY_RPC_URL` | No | Overrides the archive/query RPC base URL. Defaults to `https://rpc.qubic.org/query/v1`. |
| `NEXT_PUBLIC_GLYPH_DAPP_ORIGIN` | No | Canonical dapp origin for the optional Glyph transfer client when it cannot be derived automatically. |
| `NEXT_PUBLIC_GLYPH_WALLET_CALLBACK_PUBLIC_KEY` | No | Trusted wallet callback verification key. |
| `NEXT_PUBLIC_GLYPH_WALLET_CALLBACK_PUBLIC_KEYS` | No | Comma-separated trusted callback verification keys. Use instead of, or alongside, the singular value when rotating keys. |
| `NEXT_PUBLIC_EXPLORER_DIAGNOSTICS` | No | Set to `true` to retain minimal, local-only browser diagnostic events for debugging. No events are transmitted. |

Never put secrets, wallet private keys, relay capabilities, or credentials in `NEXT_PUBLIC_*` variables. They are bundled for the browser.

### Wallet security

Wallet functionality is intentionally opt-in. It requires a trusted callback public key before signed wallet callbacks are accepted. See [`lib/glyph/README.md`](lib/glyph/README.md) for the full verification model and current transfer API limitation.

## Quality commands

```bash
bun run lint       # ESLint and Next.js rules
bun test           # unit tests
bun run build      # production compilation and type checking
bun run test:e2e   # production-browser smoke tests
```

`test:e2e` builds the application and runs Playwright against `next start`. Install the browser once on a development machine with `bunx playwright install --with-deps chromium`.

## Architecture

- `app/` contains the Next.js App Router routes, metadata, `robots.txt`, and sitemap.
- `components/explorer/` contains explorer surfaces and display primitives.
- `components/shell/` contains navigation, command lookup, theme, and footer UI.
- `lib/rpc/` validates inputs, normalizes official RPC responses, gives requests a timeout/error boundary, and exposes React Query hooks.
- `lib/stats/` normalizes the public Stats API.
- `lib/glyph/` isolates optional wallet communication and callback verification.
- `e2e/` contains browser smoke coverage for public navigation and direct lookup.

## Data and availability

The default endpoint URLs are intentionally configurable for trusted mirrors or self-hosted infrastructure. The UI preserves official values rather than guessing missing data, and displays explicit unavailable/empty states when an upstream service does not return a result.

## Deployment

Run `bun run build` before deployment, configure `NEXT_PUBLIC_SITE_URL` with the public HTTPS origin, and provide any RPC or wallet values through the deployment environment. The included GitHub Actions workflow runs lint, unit tests, a production build, and Chromium smoke tests for each pull request and push to `main`.

## License

No license file is currently included. Add one before distributing this project as an open-source package.
