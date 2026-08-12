_cf_complete() {
  local cur="${COMP_WORDS[COMP_CWORD]}"
  COMPREPLY=( $(compgen -W "auth zone zones dns setting rules list api ssl cache health audit inventory origin-ca load-balancer tunnel workers pages r2 d1 queues stream images ai access extension alias config --help --json --jq --template --web --dry-run --force --quiet --pager --no-pager --color --width" -- "$cur") )
}
complete -F _cf_complete cf
