function Get-CurrentReleaseDocProblem {
    [CmdletBinding()]
    param([Parameter(Mandatory)][AllowEmptyCollection()][hashtable]$Documents)
    if($Documents.Count -eq 0){[pscustomobject]@{document='';problem='Empty document inventory'};return}
    $subjects=@(
        'WORDPAIRS_ADMIN_PROFILE_IDS',
        '/admin/users',
        '(?<!/admin)/manifest\.webmanifest',
        '(?:OpenAI|ChatGPT).{0,120}(?:sign.?in|log.?in|OIDC|registration|identity)',
        '(?:public (?:game|PWA|installation).{0,100}install|install.{0,100}(?:public (?:game|PWA)|wordpairs.{0,50}(?:phone|public))|installed launches use\s*`?/play|add to home screen)'
    )
    $qualified='\b(historical|historically|history|inactive|superseded|former|earlier|retired|replaced|does not|do not|cannot|no |not |disabled)\b'
    foreach($name in $Documents.Keys){
        $text=[string]$Documents[$name]
        if(-not $text.Contains('admin_pwa_release.md')){[pscustomobject]@{document=$name;problem='Missing current release reference'}}
        $paragraphs=[regex]::Split($text,'\r?\n\s*\r?\n')
        foreach($paragraph in $paragraphs){
            $units=@($paragraph -split '(?<=\S[.!?;])\s+|\r?\n(?=\|)')
            foreach($unit in $units){
                foreach($subject in $subjects){
                    if($unit -notmatch "(?is)$subject"){continue}
                    $historicalLead=$unit -match '(?is)^\s*[-*#\s]*(historical(?:ly)?|formerly|previously|superseded)\b'
                    $activeInstruction=$false
                    foreach($action in [regex]::Matches($unit,'(?i)\b(configure|set|enable|install|serve|manage)\b')){
                        $prefix=$unit.Substring(0,$action.Index)
                        if($prefix -notmatch '(?is)\b(?:do not|does not|cannot|never|no|not)\s+(?:[a-z-]+\s+){0,5}$'){$activeInstruction=$true}
                    }
                    if(($activeInstruction -and -not $historicalLead) -or $unit -notmatch "(?is)$qualified"){
                        [pscustomobject]@{document=$name;problem="Unqualified superseded subject: $subject"}
                        break
                    }
                }
            }
        }
    }
}
Export-ModuleMember -Function Get-CurrentReleaseDocProblem
