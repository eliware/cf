# Live CLI tests

These tests are intentionally excluded from `npm test` and CI. They use the
active local `cf` credential profile and may contact Cloudflare.

Run the authenticated read/help smoke tests with:

```sh
npm run test:live:dry
```

The suite discovers a zone and account from `cf zones list`. Set
`CF_LIVE_ZONE_ID` and `CF_LIVE_ACCOUNT_ID` to select explicit fixtures.

The wet command runs complete disposable DNS and health-check lifecycles. DNS
is listed, created, read, updated, read again, deleted, and confirmed gone.
The health workflow creates an HTTPS monitor for `eliware.org/health`, reads
it, deletes it, and confirms it is gone. It requires a selected zone and is
the only command that mutates Cloudflare:

The wet suite also creates a temporary IP list, verifies an empty item list,
adds an item, replaces it with an updated value, deletes the item, and then
deletes and verifies the list. Cloudflare does not expose an in-place list-item
update endpoint, so the update step is implemented as delete-and-recreate.

```sh
npm run test:live:wet
```

The test uses a unique DNS name and an RFC 5737 documentation IP, then always
attempts cleanup in a `finally` block. Set `CF_LIVE_ZONE_ID` to choose the
disposable test zone.
