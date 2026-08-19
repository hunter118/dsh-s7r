# Contributing to S7R

Issues and pull requests are welcome. S7R is intentionally compact: contributions should improve a real DSH workflow, preserve the coherent System 7-era visual language, or strengthen the compatibility boundary.

## Development setup

Requirements:

- Node.js 22.19+ or 24+
- pnpm 11.19.0
- DeepSeek Harness 0.1.0-rc.7 for installed browser testing

```sh
git clone https://github.com/hunter118/dsh-s7r.git
cd dsh-s7r
pnpm install --frozen-lockfile
pnpm check
```

Install a checkout into the DSH Web profile for UI testing:

```sh
pnpm build
dsh plugin --profile web add .
dsh web
```

Do not use a profile containing private conversations or credentials for screenshots or fixtures.

## Pull requests

- Keep DSH-version-specific code under `src/dsh-compat/`.
- Use the existing System primitives and integer layout metrics; do not introduce modern native controls into the desktop.
- Add deterministic tests for reducers, transforms, parsing, metrics, and persistence.
- Run `pnpm check` and `pnpm pack` before submitting.
- Update `COMPATIBILITY.md` when an upstream seam changes.
- Update `CHANGELOG.md` for user-visible changes.
- Never commit API keys, tokens, personal paths, real conversation logs, or private screenshots.

## Assets and licensing

Do not contribute copied Apple artwork, fonts, sounds, screenshots, or extracted system resources. New third-party assets must permit redistribution and include their copyright and full license under `THIRD_PARTY_LICENSES/` plus an entry in `THIRD_PARTY_NOTICES.md`.

## Conduct

Be respectful, specific, and patient. Harassment, discriminatory language, and publication of another person's private data are not accepted. Maintainers may remove contributions or participation that undermine a safe, constructive project.
