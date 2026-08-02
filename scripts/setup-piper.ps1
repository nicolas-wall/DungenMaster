# Setup idempotente para Piper TTS y modelos de voz en español
# Uso: .\setup-piper.ps1
# Reutilizable: puede ejecutarse múltiples veces sin problemas

param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"

# Rutas
$toolsPath = Join-Path $ProjectRoot "tools\piper"
$voicesPath = Join-Path $toolsPath "voces"
$testPath = Join-Path $toolsPath "test-output"

# URLs
$pipperDownloadUrl = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip"
$zipPath = Join-Path $toolsPath "piper_windows_amd64.zip"

# Modelos de voz: VoiceId -> (ONNX path in HF, .json path in HF)
$voices = @{
    "es_AR-daniela-high" = "es/es_AR/daniela/high"
    "es_ES-davefx-medium" = "es/es_ES/davefx/medium"
    "es_MX-claude-high" = "es/es_MX/claude/high"
}

Write-Host "Piper TTS Setup" -ForegroundColor Cyan
Write-Host "===============`n"

# 1. Crear directorios
Write-Host "1. Creando directorios..."
foreach ($dir in @($toolsPath, $voicesPath, $testPath)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "   ✓ Creado: $dir"
    } else {
        Write-Host "   - Existe: $dir"
    }
}

# 2. Descargar binario de Piper
Write-Host "`n2. Descargando binario de Piper para Windows x64..."
$pipeExe = Join-Path $toolsPath "piper.exe"

if (Test-Path $pipeExe) {
    Write-Host "   - piper.exe ya existe, omitiendo descarga"
} else {
    Write-Host "   Descargando desde: $pipperDownloadUrl"
    try {
        Invoke-WebRequest -Uri $pipperDownloadUrl -OutFile $zipPath -UseBasicParsing -TimeoutSec 300
        Write-Host "   Extrayendo..."
        Expand-Archive -Path $zipPath -DestinationPath $toolsPath -Force

        # Reorganizar si se extrajo en subdirectorio
        $subPiperPath = Join-Path $toolsPath "piper"
        if ((Test-Path $subPiperPath) -and (Test-Path (Join-Path $subPiperPath "piper.exe"))) {
            Get-ChildItem -Path $subPiperPath | Move-Item -Destination $toolsPath -Force
            Remove-Item -Path $subPiperPath -Force -ErrorAction SilentlyContinue
        }

        if (Test-Path $pipeExe) {
            Write-Host "   ✓ piper.exe instalado"
        } else {
            Write-Host "   ✗ Error: piper.exe no encontrado después de extracción"
            exit 1
        }
    } catch {
        Write-Host "   ✗ Error descargando Piper: $_"
        exit 1
    }
}

# 3. Descargar modelos de voz
Write-Host "`n3. Descargando modelos de voz..."
$hfBaseUrl = "https://huggingface.co/rhasspy/piper-voices/resolve/main"
$failedVoices = @()

foreach ($voiceId in $voices.Keys) {
    $hfPath = $voices[$voiceId]
    $onnxPath = Join-Path $voicesPath "$voiceId.onnx"
    $jsonPath = Join-Path $voicesPath "$voiceId.onnx.json"

    if ((Test-Path $onnxPath) -and (Test-Path $jsonPath)) {
        Write-Host "   - $voiceId ya existe"
        continue
    }

    Write-Host "   Descargando $voiceId..."

    # Descargar .onnx
    if (-not (Test-Path $onnxPath)) {
        $onnxUrl = "$hfBaseUrl/$hfPath/$voiceId.onnx"
        try {
            Invoke-WebRequest -Uri $onnxUrl -OutFile $onnxPath -UseBasicParsing -TimeoutSec 600
            Write-Host "     ✓ ONNX descargado"
        } catch {
            Write-Host "     ✗ Error descargando ONNX: $_"
            $failedVoices += $voiceId
            continue
        }
    }

    # Descargar .onnx.json
    if (-not (Test-Path $jsonPath)) {
        $jsonUrl = "$hfBaseUrl/$hfPath/$voiceId.onnx.json"
        try {
            Invoke-WebRequest -Uri $jsonUrl -OutFile $jsonPath -UseBasicParsing -TimeoutSec 300
            Write-Host "     ✓ JSON descargado"
        } catch {
            Write-Host "     ✗ Error descargando JSON: $_"
            $failedVoices += $voiceId
        }
    }
}

if ($failedVoices.Count -gt 0) {
    Write-Host "`n   ✗ Error: No se pudieron descargar las siguientes voces: $($failedVoices -join ', ')"
    exit 1
}

# 4. Verificación final
Write-Host "`n4. Verificando instalación..."

$checks = @(
    @{ Path = $pipeExe; Name = "piper.exe" },
    @{ Path = (Join-Path $voicesPath "es_AR-daniela-high.onnx"); Name = "es_AR-daniela-high.onnx" },
    @{ Path = (Join-Path $voicesPath "es_ES-davefx-medium.onnx"); Name = "es_ES-davefx-medium.onnx" },
    @{ Path = (Join-Path $voicesPath "es_MX-claude-high.onnx"); Name = "es_MX-claude-high.onnx" }
)

$allOk = $true
foreach ($check in $checks) {
    if (Test-Path $check.Path) {
        $size = Get-Item $check.Path | Select-Object -ExpandProperty Length
        if ($size -gt 1KB) {
            Write-Host "   ✓ $($check.Name) ($(([math]::Round($size/1MB, 2))) MB)"
        } else {
            Write-Host "   ✗ $($check.Name) (archivo vacío)"
            $allOk = $false
        }
    } else {
        Write-Host "   ✗ $($check.Name) (no encontrado)"
        $allOk = $false
    }
}

if (-not $allOk) {
    Write-Host "`n✗ Setup incompleto"
    exit 1
}

Write-Host "`n✓ Setup de Piper completado exitosamente"
Write-Host "`nRutas:"
Write-Host "  Ejecutable: $pipeExe"
Write-Host "  Voces: $voicesPath"
Write-Host "  Tests: $testPath"
