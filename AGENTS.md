# AGENTS.md (/opt/cloudflare.js)

## Project Overview

This repository provides three CLI tools for managing a Cloudflare-backed IP ban list and a mirrored MySQL table:

- bin/cf_ban: add an IP to Cloudflare and the local database
- bin/cf_unban: remove an IP from Cloudflare and the local database
- bin/cf_list: print the Cloudflare list and resync the local database from it

The scripts load configuration from .env in the repository root.

## Important Files

- package.json: Node package metadata and dependencies
- bin/cf_ban: ban command
- bin/cf_unban: unban command
- bin/cf_list: list/resync command
- .env.example: required environment variables template
- .env: local runtime configuration; do not commit secrets

## Runtime Configuration

The scripts expect these environment variables:

- CLOUDFLARE_EMAIL
- CLOUDFLARE_API_KEY
- CLOUDFLARE_ACCOUNT_ID
- CLOUDFLARE_LIST_ID
- MYSQL_HOST
- MYSQL_USER
- MYSQL_PASSWORD
- MYSQL_DATABASE

The scripts automatically load .env if present, but only for missing variables.

## Current Behavior Notes

- cf_ban validates IPv4 and IPv6 input before sending it to Cloudflare.
- cf_ban has a hard-coded guard that refuses to ban 24.198.69.82.
- cf_unban searches the Cloudflare list by IP, then deletes the matching item by Cloudflare item id.
- cf_list truncates ip_bans and repopulates it from the Cloudflare list.
- The MySQL table is treated as a mirror of the Cloudflare list, not the source of truth.

## Development Guidance

- This repository is ESM-only. Use import/export syntax in all Node scripts and modules.
- Keep new or modified executable scripts compatible with package.json "type": "module".
- Preserve the existing plain Node.js style in the bin scripts.
- If changing Cloudflare API usage, verify the request shape against the installed cloudflare package.
- If changing database behavior, confirm the target table name and SQL statements match the current scripts.

## Validation

There is no automated test suite defined in package.json.

Recommended manual validation after changes:

- run bin/cf_list to confirm list retrieval and MySQL sync
- run bin/cf_ban <ip> on a known test IP
- run bin/cf_unban <ip> on the same IP
- confirm the IP appears and disappears from both Cloudflare and the ip_bans table as expected

## Cautions

- Do not commit .env or any secrets.
- Be careful with cf_list because it truncates the local ip_bans table.
- Be careful with Cloudflare API calls because bans are applied to the live list.
