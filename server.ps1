# Smart Society Management System - PowerShell Web Server & REST API
param (
    [int]$Port = 8080
)

$prefix = "http://localhost:$Port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " Smart Society Management System Server Started!" -ForegroundColor Cyan
    Write-Host " Server listening at: http://localhost:$Port/" -ForegroundColor Yellow
    Write-Host " Access Role Dashboards:" -ForegroundColor White
    Write-Host "   - Universal Login: http://localhost:$Port/index.html" -ForegroundColor Gray
    Write-Host " Press Ctrl+C in terminal to stop server." -ForegroundColor Red
    Write-Host "==========================================================" -ForegroundColor Green
} catch {
    Write-Error "Failed to start HttpListener: $_"
    exit 1
}

$publicDir = Join-Path $PSScriptRoot "public"
$dataDir = Join-Path $PSScriptRoot "data"
$seedPath = Join-Path $dataDir "seed.json"

function Get-MimeType($filePath) {
    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
    switch ($ext) {
        ".html" { return "text/html" }
        ".css"  { return "text/css" }
        ".js"   { return "application/javascript" }
        ".json" { return "application/json" }
        ".png"  { return "image/png" }
        ".jpg"  { return "image/jpeg" }
        ".svg"  { return "image/svg+xml" }
        default { return "application/octet-stream" }
    }
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    
    $urlPath = $request.Url.AbsolutePath
    if ($urlPath -eq "/" -or $urlPath -eq "") {
        $urlPath = "/index.html"
    }

    # Standard static file serving
    $localPath = Join-Path $PSScriptRoot ($urlPath.TrimStart('/') -replace '/', '\')
    if (-not (Test-Path $localPath)) {
        # Check inside public directory
        $localPath = Join-Path $publicDir ($urlPath.TrimStart('/') -replace '/', '\')
    }

    if (Test-Path $localPath -PathType Leaf) {
        $mime = Get-MimeType $localPath
        $bytes = [System.IO.File]::ReadAllBytes($localPath)
        $response.ContentType = $mime
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.Close()
    } else {
        $response.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
        $response.OutputStream.Write($msg, 0, $msg.Length)
        $response.Close()
    }
}
