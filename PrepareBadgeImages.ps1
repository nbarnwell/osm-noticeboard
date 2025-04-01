
Set-Location (Join-Path (Split-Path $PSCommandPath -Parent) 'public' 'images' 'badges')

Get-ChildItem -Directory |
    Foreach-Object {
        Remove-Item (Join-Path $_ "*.jpg") 
        Remove-Item (Join-Path $_ "*.eps") 
        Remove-Item (Join-Path $_ "*.log") 
    }

Get-ChildItem -Recurse |
    Foreach-Object {
        rename-item -Path $_ -NewName ( $_.name -replace '^(Activity-Badges|Challenge-Awards)-(Be|Cu|Sc|Ex)-','' )
    }
Get-ChildItem -Recurse |
    Foreach-Object {
        rename-item -Path $_ -NewName ( $_.name -replace '^(Staged-Activities)-','' )
    }
Get-ChildItem -Recurse |
    Foreach-Object {
        rename-item -Path $_ -NewName ( $_.name -replace '-RGB','' )
    }
Get-ChildItem -Recurse |
    Foreach-Object {
        rename-item -Path $_ -NewName ( $_.name -replace '-',' ' )
    }
Get-ChildItem -Recurse |
    Foreach-Object {
        rename-item -Path $_ -NewName ( $_.name -replace 'Backwooks','Backwoods' )
    }


<#

gci | foreach-object { rename-item -Path $_ -NewName ( $_.name -replace '-RBG','' ) }
PS D:\Activity Badges-Cubs> gci | foreach-object { rename-item -Path $_ -NewName ( $_.name -replace '-RGB','' ) }
PS D:\Activity Badges-Cubs> gci | foreach-object { rename-item -Path $_ -NewName ( $_.name -replace '-',' ' ) }
PS D:\Activity Badges-Cubs> gci | foreach-object { rename-item -Path $_ -NewName ( $_.name -replace 'Backwooks','Backwoods' ) }

#>