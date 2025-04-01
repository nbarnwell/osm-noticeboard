
Set-Location (Join-Path $PSScriptRoot 'images' 'badges')

Get-ChildItem -Recurse |
    Foreach-Object {
        rename-item -Path $_ -NewName ( $_.name -replace '^(Activity|Challenge)-Badges-Cu-','' )
        rename-item -Path $_ -NewName ( $_.name -replace '-RGB','' )
        rename-item -Path $_ -NewName ( $_.name -replace '-',' ' )
        rename-item -Path $_ -NewName ( $_.name -replace 'Backwooks','Backwoods' )
    }

Get-ChildItem -Directory |
    Foreach-Object {
        Remove-Item (Join-Path $_ "*.jpg") 
        Remove-Item (Join-Path $_ "*.eps") 
        Remove-Item (Join-Path $_ "*.log") 
    }

<#

gci | foreach-object { rename-item -Path $_ -NewName ( $_.name -replace '-RBG','' ) }
PS D:\Activity Badges-Cubs> gci | foreach-object { rename-item -Path $_ -NewName ( $_.name -replace '-RGB','' ) }
PS D:\Activity Badges-Cubs> gci | foreach-object { rename-item -Path $_ -NewName ( $_.name -replace '-',' ' ) }
PS D:\Activity Badges-Cubs> gci | foreach-object { rename-item -Path $_ -NewName ( $_.name -replace 'Backwooks','Backwoods' ) }

#>