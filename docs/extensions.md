# `cf` extensions

Extensions are local packages installed below `~/.config/cf/extensions/<name>`.
Each package contains a `cf-extension.json` manifest:

```json
{
  "name": "hello",
  "version": "1.0.0",
  "commands": { "hello": "hello.mjs" }
}
```

The referenced module exports a default function (or `run`/`handler`) that
receives the normal command context: `cf`, `action`, `opts`, `body`, output
helpers, printer, and failure handling.

Install and use the example:

```sh
cf extension install --path examples/extensions/hello
cf hello --name Eli
cf extension list
cf extension remove --name hello --force
```

Extensions are intentionally separate from the core resource list. Kubernetes,
GitOps, VyOS, and certificate deployment integrations should be shipped as
separate extensions when those projects are ready.
