# Deployment Guide

This project includes Rust/WASM components that need to be built during CI/CD and deployment.

## CI/CD Setup

### GitHub Actions

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that:

- Sets up Rust and wasm-pack
- Builds the WASM module in release mode
- Builds the Next.js application
- Verifies WASM artifacts are present

### Vercel Deployment

Vercel is configured via `vercel.json` to:

- Use a custom build script (`vercel-build.sh`) that installs Rust/wasm-pack if needed
- Build the WASM module before building Next.js
- Handle Rust toolchain installation automatically

#### Vercel Build Process

1. **Install Command**: `npm install` (installs Node.js dependencies)
2. **Build Command**: `npm run vercel-build` (runs `vercel-build.sh`)
   - Installs Rust if not available
   - Installs wasm-pack if not available
   - Builds WASM module in release mode
   - Builds Next.js application

#### Troubleshooting Vercel Builds

If WASM builds fail on Vercel:

1. **Check build logs** for Rust/wasm-pack installation errors
2. **Verify Rust version** - Vercel should install stable Rust automatically
3. **Check WASM artifacts** - Ensure `wasm/pkg/knucklebones_ai_bg.wasm` exists after build
4. **Build timeout** - WASM builds can take 2-5 minutes; ensure Vercel build timeout is sufficient

#### Manual Vercel Configuration

If the automatic setup doesn't work, you can configure Vercel manually:

1. Go to Vercel Dashboard → Project Settings → Build & Development Settings
2. Set **Build Command** to: `npm run vercel-build`
3. Set **Install Command** to: `npm install`
4. Ensure **Framework Preset** is set to "Next.js"

## Local Development

For local development, ensure Rust and wasm-pack are installed:

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Build WASM module
npm run build:wasm

# Run development server
npm run dev
```

## Build Scripts

- `npm run build:wasm` - Build WASM module (debug mode)
- `npm run build:wasm:release` - Build WASM module (release/optimized mode)
- `npm run build` - Build WASM + Next.js (production)
- `npm run vercel-build` - Vercel-specific build script

## WASM Artifacts

After building, the following files should exist in `wasm/pkg/`:

- `knucklebones_ai_bg.wasm` - Compiled WASM binary
- `knucklebones_ai.js` - JavaScript bindings
- `knucklebones_ai.d.ts` - TypeScript definitions
- `package.json` - Package metadata

These files are gitignored but should be present after build and included in deployments.
