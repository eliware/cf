# Live CLI tests

These tests are intentionally excluded from `npm test` and CI. They use the
active local `cf` credential profile and may contact Cloudflare.

Run the authenticated read/help smoke tests with:

```sh
npm run test:live:dry
```

The suite discovers a zone and account from `cf zones list`. Set
`CF_LIVE_ZONE_ID` and `CF_LIVE_ACCOUNT_ID` to select explicit fixtures.

The wet command runs a complete disposable DNS record lifecycle: list, create,
read, update, read, delete, and final deletion confirmation. It requires a
selected zone and is the only command that mutates Cloudflare:

```sh
npm run test:live:wet
```

The test uses a unique DNS name and an RFC 5737 documentation IP, then always
attempts cleanup in a `finally` block. Set `CF_LIVE_ZONE_ID` to choose the
disposable test zone.
