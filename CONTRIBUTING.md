# CONTRIBUTING

Thank you for your interest in contributing to **Clash Verge Rev**! This guide provides instructions to help you set up your development environment and start contributing effectively.

## Internationalization (i18n)

We welcome translations and improvements to existing locales. For details on contributing translations, please see [CONTRIBUTING_i18n.md](docs/CONTRIBUTING_i18n.md).

## Development Setup

Before contributing, you need to set up your development environment. Follow the steps below carefully.

### Prerequisites

1. **Install Rust and Node.js**  
   Follow the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your operating system. Use the Node.js version in [`.tool-versions`](.tool-versions); [`rust-toolchain.toml`](rust-toolchain.toml) selects the Rust version and required components when you run Cargo from this repository.

### macOS Users

Install Xcode (or its Command Line Tools) and open Xcode once to complete its
setup. Verify the selected developer directory and Rust toolchain:

```bash
xcode-select -p
rustc --version
cargo --version
```

Use the native Rust host target: `aarch64-apple-darwin` on Apple Silicon or
`x86_64-apple-darwin` on Intel. The Rust version must meet the `rust-version`
requirement in `src-tauri/Cargo.toml`. Do not apply the Windows toolchain steps
or Ubuntu package commands on macOS.

After installing dependencies, run `pnpm prebuild` to prepare the native core
binaries and resources, then `pnpm dev`. The first launch also builds isolated
development service tools under `target/development-service`; it can take time.
The service source is resolved through Cargo from the application's lockfile.
An adjacent `../clash-verge-service-ipc` checkout is optional and takes precedence
for service development. `CLASH_VERGE_DEV_SERVICE_SOURCE` can select another
checkout explicitly.

In WebStorm, create a Shell Script run configuration with script text
`pnpm dev`, working directory set to the project root, interpreter `/bin/zsh`,
and **Execute in terminal** enabled. Ensure that the IDE terminal can find
`node`, `pnpm`, `cargo`, and `rustc`. Stop the session with Ctrl+C in that
terminal so the development app can clean up its child processes.

`pnpm dev:sidecar` starts the development app with the core as a child process.
`pnpm dev:service` prepares and installs the isolated development service and
may ask for administrator authorization. Normal UI development does not require
installing the development service.

For frontend-only work, use `pnpm web:preview` and open
`http://127.0.0.1:3001/`; this mode uses synthetic data and no native backend.

### Windows Users

> [!NOTE]  
> **Windows ARM users must also install [LLVM](https://github.com/llvm/llvm-project/releases) (including clang) and set the corresponding environment variables.**  
> The `ring` crate depends on `clang` when building on Windows ARM.

Additional steps for Windows:

- Ensure Rust and Node.js are added to your system `PATH`.

- Install the GNU `patch` tool.

- Use the MSVC toolchain for Rust:

```bash
rustup target add x86_64-pc-windows-msvc
rustup set default-host x86_64-pc-windows-msvc
```

### Install Node.js Package Manager

[Corepack is no longer bundled with Node.js starting with Node.js 25](https://nodejs.org/api/corepack.html). Install it globally if it is not already available, then enable it:

```bash
npm install --global corepack
corepack enable
```

Run pnpm from this repository so Corepack selects the version pinned by `packageManager` in [`package.json`](package.json).

### Install Project Dependencies

Node.js dependencies:

```bash
pnpm install --frozen-lockfile
```

Ubuntu-only system packages:

```bash
sudo apt-get install -y libxslt1.1 libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf
```

### Download the Mihomo Core Binary (Automatic)

```bash
pnpm run prebuild
```

To re-download and overwrite the core and service binaries:

```bash
pnpm run prebuild --force
```

### Prepare the Development Service Source

`pnpm dev` builds the development service from a sibling checkout of [`clash-verge-service-ipc`](https://github.com/clash-verge-rev/clash-verge-service-ipc). The binaries downloaded by `pnpm prebuild` do not replace this source checkout.

Check the `clash_verge_service_ipc` dependency in [`src-tauri/Cargo.toml`](src-tauri/Cargo.toml), then clone the service repository alongside `clash-verge-rev` and check out the matching tag. If the sibling directory already exists, reuse it and check its version rather than overwriting it. Without this checkout, `pnpm dev` fails when it tries to access `../clash-verge-service-ipc/Cargo.toml`.

### Run the Development Server

Run these commands from the root of `clash-verge-rev`:

```bash
pnpm dev           # Build the development service and start the desktop app
pnpm dev:diff      # Alias of pnpm dev
pnpm dev:tauri     # Run Tauri directly with the tauri-dev feature
```

For frontend-only development, use `pnpm web:dev`. It does not start the Rust backend or build the development service.

### Build the Project

Standard build:

```bash
pnpm build
```

Fast build for testing:

```bash
pnpm build:fast
```

## Contributing Your Changes

### Before Committing

**Code quality checks:**

```bash
# Rust backend
cargo clippy-all
# Frontend
pnpm lint
```

**Code formatting:**

```bash
# Rust backend
cargo fmt
# Frontend
pnpm format
```
