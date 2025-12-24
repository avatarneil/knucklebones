# KnuckleTrainer

Master Knucklebones - the dice game from Cult of the Lamb. Train against AI opponents with 5 difficulty levels and win probability analysis.

**Play at [knuckletrainer.com](https://knuckletrainer.com)**

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm/bun
- Rust and wasm-pack (for building the high-performance AI engine)

To install Rust and wasm-pack:

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

### Development

First, build the WASM AI engine (one-time setup):

```bash
npm run build:wasm
```

Then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production

The production build automatically includes the WASM module:

```bash
npm run build
```

For optimized WASM builds:

```bash
npm run build:wasm:release
npm run build
```

## Performance

The AI engine uses Rust/WASM for maximum performance. The WASM module provides:

- **10-100x faster** expectimax search compared to JavaScript
- Optimized transposition tables with efficient hashing
- Zero-copy data structures for minimal overhead
- Automatic fallback to JavaScript if WASM fails to load

## Deployment

The project is configured for automatic WASM builds in CI/CD:

- **GitHub Actions**: Automatically builds WASM on push/PR (see `.github/workflows/ci.yml`)
- **Vercel**: Automatically builds WASM during deployment (see `vercel.json` and `vercel-build.sh`)

For detailed deployment instructions, see [README-DEPLOYMENT.md](README-DEPLOYMENT.md).
