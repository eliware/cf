# Release

Releases run through `.github/workflows/nodejs.yml` on a Git tag.

Before tagging:

```sh
npm ci
npm test
npm run lint
npm run test:gaps
npm run pack
```

Then create and push the version tag according to `/docs/operations/skills/release.md`. The workflow installs dependencies, runs tests, and publishes the package with npm provenance.
