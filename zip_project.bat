@echo off
setlocal

rem ZIPファイル名の設定
set ZIPFILE=project.zip
rem 一時フォルダの設定
set TEMP_DIR=temp_zip

rem 既存のZIPファイルと一時フォルダを削除
if exist %ZIPFILE% del %ZIPFILE%
if exist %TEMP_DIR% rd /s /q %TEMP_DIR%

rem 一時フォルダを作成
mkdir %TEMP_DIR%

rem PowerShellを使って必要なファイルをコピー
powershell -Command "Get-ChildItem -Path . -Exclude *.iml*, *.bat*, *.sh*, *.sample.json*, *.zip*, *.git*, *.idea*, *.DS_Store, *.md*, docs, %TEMP_DIR% | ForEach-Object { if ($_.FullName -ne '%TEMP_DIR%') { Copy-Item -Path $_.FullName -Destination '%TEMP_DIR%' -Recurse } }"

rem 一時フォルダをZIP化
powershell Compress-Archive -Path %TEMP_DIR%\* -DestinationPath %ZIPFILE% -Force

rem 一時フォルダの削除
rd /s /q %TEMP_DIR%

echo プロジェクトがZIP化されました：%ZIPFILE%
