Register-ArgumentCompleter -CommandName cf -ScriptBlock {
  param($wordToComplete, $commandAst, $cursorPosition)
  'auth','zone','zones','dns','setting','rules','list','api','ssl','cache','health','audit','inventory','origin-ca','load-balancer','tunnel','workers','pages','r2','d1','queues','stream','images','ai','access','extension','alias','config','--help','--json','--jq','--template','--web','--dry-run','--force','--quiet','--pager','--no-pager','--color','--width' |
    Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterName', $_) }
}
