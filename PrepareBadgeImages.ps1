
$badgeImagesPath = (Join-Path (Split-Path $PSCommandPath -Parent) 'public' 'images' 'badges')

Get-ChildItem -Path $badgeImagesPath -Recurse -Include *.zip | 
    Expand-Archive -DestinationPath $badgeImagesPath -Force

Get-ChildItem -Path $badgeImagesPath -Recurse -Include '*.jpg','*.eps','*.log' |
    Remove-Item

Get-ChildItem -Path $badgeImagesPath -File -Recurse |
    Foreach-Object {
        Rename-Item -Path $_ -NewName ( $_.name -replace 'Backwooks','Backwoods' )
    }