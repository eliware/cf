# Live CLI tests

These tests are intentionally excluded from `npm test` and CI. They use the
active local `cf` credential profile and may contact Cloudflare.

Run the authenticated read/help smoke tests with:

```sh
CF_LIVE_TESTS=1 npm run test:live
```

The suite discovers a zone and account from `cf zones list`. Set
`CF_LIVE_ZONE_ID` and `CF_LIVE_ACCOUNT_ID` to select explicit fixtures.

Actual CRUD mutations are disabled unless both settings below are supplied:

```sh
CF_LIVE_TESTS=1 \
CF_LIVE_MUTATIONS=1 \
CF_LIVE_CRUD_FIXTURES='[{"create":["..."],"update":["..."],"delete":["..."]}]' \
npm run test:live
```

Fixture commands must target disposable resources and include any required
confirmation flags. The suite does not invent production-safe create or delete
payloads.
