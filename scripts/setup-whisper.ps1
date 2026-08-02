# Setup script para whisper.cpp en Windows
# Descarga binario prebuilt y modelo ggml-small.bin
# Idempotente: si los archivos ya existen, no los vuelve a bajar

param(
    [switch]$Force = $false
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# Rutas base
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$whisperDir = Join-Path $projectRoot "tools\whisper"
$modelDir = Join-Path $whisperDir "modelos"
$releaseDir = Join-Path $whisperDir "Release"

# Archivos esperados (whisper-cli.exe es el binario recomendado, main.exe está deprecado)
$whisperCli = Join-Path $releaseDir "whisper-cli.exe"
$modelPath = Join-Path $modelDir "ggml-small.bin"

Write-Host "Configurando whisper.cpp..."
Write-Host "Directorio del proyecto: $projectRoot"

# Crear directorios
if (-not (Test-Path $modelDir)) {
    New-Item -ItemType Directory -Path $modelDir -Force | Out-Null
    Write-Host "✓ Directorio creado: $modelDir"
}

# Descargar binario si no existe
if (-not (Test-Path $whisperCli) -or $Force) {
    Write-Host "Descargando binario whisper.cpp v1.9.1 para Windows x64..."

    $zipPath = Join-Path $whisperDir "whisper-bin-x64.zip"
    $url = "https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.1/whisper-bin-x64.zip"

    try {
        Invoke-WebRequest -Uri $url -OutFile $zipPath -ErrorAction Stop
        Expand-Archive -Path $zipPath -DestinationPath $whisperDir -Force
        Remove-Item $zipPath -Force
        Write-Host "✓ Binario descargado y extraído"
    }
    catch {
        Write-Host "✗ Error descargando binario: $_"
        exit 1
    }
} else {
    Write-Host "✓ Binario ya existe: $whisperCli"
}

# Descargar modelo si no existe
if (-not (Test-Path $modelPath) -or $Force) {
    Write-Host "Descargando modelo ggml-small.bin desde HuggingFace (~488MB)..."

    $url = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"

    try {
        Invoke-WebRequest -Uri $url -OutFile $modelPath -ErrorAction Stop
        $sizeMB = [math]::Round((Get-Item $modelPath).Length / 1MB, 1)
        Write-Host "✓ Modelo descargado: $sizeMB MB"
    }
    catch {
        Write-Host "✗ Error descargando modelo: $_"
        exit 1
    }
} else {
    $sizeMB = [math]::Round((Get-Item $modelPath).Length / 1MB, 1)
    Write-Host "✓ Modelo ya existe: $modelPath ($sizeMB MB)"
}

# Verificar que el binario funciona
Write-Host "Verificando binario..."
try {
    $output = & $whisperCli --help 2>&1 | Select-Object -First 10 | Where-Object { $_ -match 'usage:|supported' }
    if ($output) {
        Write-Host "✓ Binario funciona correctamente"
    } else {
        Write-Host "✗ El binario no responde correctamente"
        exit 1
    }
}
catch {
    Write-Host "✗ Error ejecutando binario: $_"
    exit 1
}

Write-Host ""
Write-Host "✓ Setup completado"
Write-Host "  Binario: $whisperCli"
Write-Host "  Modelo: $modelPath"
Write-Host ""
Write-Host "Ejemplos de uso:"
Write-Host "  Transcribir en español:"
Write-Host "    & '$whisperCli' -m '$modelPath' -f audio.wav -l es"
Write-Host ""
Write-Host "  Transcribir en inglés:"
Write-Host "    & '$whisperCli' -m '$modelPath' -f audio.wav -l en"
