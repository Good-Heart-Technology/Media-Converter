# Create lib directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "lib"

# Download FFmpeg files
$files = @{
    "lib/ffmpeg.min.js" = "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.0/dist/ffmpeg.min.js"
    "lib/ffmpeg-core.js" = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js"
    "lib/ffmpeg-core.wasm" = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.wasm"
    "lib/ffmpeg-core.worker.js" = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.worker.js"
}

foreach ($file in $files.GetEnumerator()) {
    Write-Host "Downloading $($file.Key)..."
    try {
        $response = Invoke-WebRequest -Uri $file.Value -OutFile $file.Key -ErrorAction Stop
        Write-Host "Successfully downloaded $($file.Key)"
    } catch {
        Write-Host "Failed to download $($file.Key): $_"
    }
}

Write-Host "Download complete!" 