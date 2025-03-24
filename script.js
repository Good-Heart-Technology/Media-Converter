// Set current year in footer
document.getElementById('currentYear').textContent = new Date().getFullYear();

// Check if SheetJS is loaded
if (typeof XLSX === 'undefined') {
    console.error('SheetJS library not loaded!');
}

// File handling
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const conversionOptions = document.getElementById('conversionOptions');
let currentFile = null;

// Update SUPPORTED_MIME_TYPES for video formats
const SUPPORTED_MIME_TYPES = {
    'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml'],
    'audio': ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac'],
    'video': ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/x-matroska'],
    'archive': [
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed'
    ]
};

// Remove file size limits
const FILE_SIZE_LIMITS = {
    'default': Number.MAX_SAFE_INTEGER  // Effectively removes size limits
};

function getFileSizeLimit(fileType) {
    return FILE_SIZE_LIMITS.default;
}

function getSupportedFormats(fileType, fileExtension) {
    const formats = {
        'image': ['PNG', 'JPG', 'WEBP', 'GIF', 'SVG'],
        'audio': ['MP3', 'WAV', 'OGG'],
        'video': ['MP4', 'MOV', 'AVI', 'WMV', 'MKV'],
        'archive': ['ZIP', 'RAR', '7Z']
    };

    if (fileType.startsWith('image/')) return formats.image.filter(f => f.toLowerCase() !== fileExtension);
    if (fileType.startsWith('audio/')) return formats.audio.filter(f => f.toLowerCase() !== fileExtension);
    if (fileType.startsWith('video/')) return formats.video.filter(f => f.toLowerCase() !== fileExtension);
    if (fileType.includes('archive')) return formats.archive.filter(f => f.toLowerCase() !== fileExtension);
    return [];
}

// Event Listeners
dropZone.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults);
    document.body.addEventListener(eventName, preventDefaults);
});
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight);
});
['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight);
});

// Basic UI Functions
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    dropZone.classList.add('highlight');
}

function unhighlight(e) {
    dropZone.classList.remove('highlight');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateProgress(percent) {
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    if (progressFill && progressText) {
        progressFill.style.width = `${percent}%`;
        progressText.textContent = `Converting... ${percent}%`;
    }
}

// File Handling Functions
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (files.length === 0) return;
    
    const file = files[0];
    
    // Special handling for PDF files
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const warningMessage = document.createElement('div');
        warningMessage.className = 'warning-message';
        warningMessage.innerHTML = `
            <i class="fas fa-info-circle"></i>
            For PDF file conversions, we recommend using this tool, which can do pretty much anything with PDFs:
            <a href="http://pdf.nonprofittools.org/" target="_blank" style="color: inherit; text-decoration: underline;">PDF Tools (Stirling PDF)</a>
        `;
        document.querySelector('.upload-section').appendChild(warningMessage);
        return;
    }

    const validation = validateFileType(file);
    
    if (!validation.valid) {
        alert(`Unsupported file type: ${file.name}\nPlease check the supported formats list below.`);
        return;
    }

    const sizeLimit = getFileSizeLimit(file.type);
    if (file.size > sizeLimit) {
        alert(`File size exceeds the limit of ${formatFileSize(sizeLimit)}. Please choose a smaller file.`);
        return;
    }

    currentFile = file;
    showConversionOptions(file.type, validation.extension);
}

function validateFileType(file) {
    const fileType = file.type;
    const fileExtension = file.name.split('.').pop().toLowerCase();

    // Check MIME types first
    for (const category in SUPPORTED_MIME_TYPES) {
        if (SUPPORTED_MIME_TYPES[category].includes(fileType)) {
            return { valid: true, category, extension: fileExtension };
        }
    }

    // If MIME type is not recognized, check file extension
    const extensionMap = {
        'image': ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif', 'svg'],
        'audio': ['mp3', 'wav', 'ogg', 'flac', 'aac'],
        'video': ['mp4', 'mov', 'avi', 'wmv', 'mkv'],
        'archive': ['zip', 'rar', '7z']
    };

    for (const category in extensionMap) {
        if (extensionMap[category].includes(fileExtension)) {
            return { valid: true, category, extension: fileExtension };
        }
    }

    return { valid: false, category: null, extension: fileExtension };
}

function showConversionOptions(fileType, fileExtension) {
    conversionOptions.innerHTML = '';
    conversionOptions.classList.add('active');

    // File Info
    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';
    fileInfo.innerHTML = `
        <p><strong>File Name:</strong> ${currentFile.name}</p>
        <p><strong>File Size:</strong> ${formatFileSize(currentFile.size)}</p>
        <p><strong>File Type:</strong> ${fileType}</p>
    `;
    fileInfo.classList.add('active');
    conversionOptions.appendChild(fileInfo);

    // Image Preview
    if (fileType.startsWith('image/')) {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'preview-container';
        previewContainer.innerHTML = `
            <p><strong>Preview:</strong></p>
            <img class="preview-image" src="${URL.createObjectURL(currentFile)}" alt="Preview">
        `;
        previewContainer.classList.add('active');
        conversionOptions.appendChild(previewContainer);
    }

    // Conversion Buttons
    const supportedFormats = getSupportedFormats(fileType, fileExtension);
    supportedFormats.forEach(format => {
        const button = document.createElement('button');
        button.className = 'conversion-button';
        button.innerHTML = `<i class="fas fa-download"></i> Convert to ${format}`;
        button.addEventListener('click', () => {
            console.log('Converting to:', format);
            convertFile(format);
        });
        conversionOptions.appendChild(button);
    });

    // Progress Container
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    progressContainer.innerHTML = `
        <div class="progress-bar">
            <div class="progress-fill"></div>
        </div>
        <p class="progress-text">Converting...</p>
    `;
    conversionOptions.appendChild(progressContainer);
}

// Video conversion functions
let ffmpeg = null;

async function initFFmpeg() {
    if (ffmpeg) return ffmpeg;

    try {
        // Create FFmpeg instance
        ffmpeg = new FFmpeg();
        
        // Set up logging
        ffmpeg.on('log', ({ message }) => {
            console.log('FFmpeg log:', message);
        });

        // Load FFmpeg with proper configuration
        await ffmpeg.load({
            coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/ffmpeg-core.js',
            wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/ffmpeg-core.wasm'
        });

        console.log('FFmpeg loaded successfully');
        return ffmpeg;
    } catch (error) {
        console.error('FFmpeg initialization error:', error);
        throw new Error('Failed to initialize FFmpeg. Please refresh the page and try again.');
    }
}

async function convertVideo(targetFormat) {
    const progressContainer = document.querySelector('.progress-container');
    progressContainer.classList.add('active');

    // Show warning about video conversion limitations
    const warningMessage = document.createElement('div');
    warningMessage.className = 'warning-message';
    warningMessage.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        Video conversion may take some time and requires significant browser resources.
        Please be patient during the conversion process.
    `;
    progressContainer.appendChild(warningMessage);

    try {
        // Initialize FFmpeg
        const ffmpeg = await initFFmpeg();

        // Set up progress handling
        ffmpeg.on('progress', ({ progress }) => {
            updateProgress(Math.round(progress * 100));
        });

        // Write the input file to FFmpeg's virtual filesystem
        const inputData = await currentFile.arrayBuffer();
        const inputFileName = 'input' + getFileExtension(currentFile.name);
        await ffmpeg.writeFile(inputFileName, new Uint8Array(inputData));

        // Set up FFmpeg command based on target format
        const outputFileName = 'output.' + targetFormat.toLowerCase();
        let command = [];

        // Common video encoding settings
        const commonSettings = [
            '-c:v', 'libx264',     // Video codec
            '-preset', 'medium',    // Encoding preset
            '-crf', '23',          // Quality setting (lower = better quality)
            '-c:a', 'aac',         // Audio codec
            '-b:a', '128k',        // Audio bitrate
            '-movflags', '+faststart' // Enable fast start for web playback
        ];

        // Format-specific settings
        switch (targetFormat.toLowerCase()) {
            case 'mp4':
                command = [
                    '-i', inputFileName,
                    ...commonSettings,
                    outputFileName
                ];
                break;
            case 'mov':
                command = [
                    '-i', inputFileName,
                    ...commonSettings,
                    outputFileName
                ];
                break;
            case 'avi':
                command = [
                    '-i', inputFileName,
                    '-c:v', 'libx264',
                    '-preset', 'medium',
                    '-crf', '23',
                    '-c:a', 'aac',
                    '-b:a', '128k',
                    outputFileName
                ];
                break;
            case 'wmv':
                command = [
                    '-i', inputFileName,
                    '-c:v', 'wmv2',
                    '-c:a', 'wmav2',
                    outputFileName
                ];
                break;
            case 'mkv':
                command = [
                    '-i', inputFileName,
                    ...commonSettings,
                    outputFileName
                ];
                break;
            default:
                throw new Error('Unsupported video format');
        }

        // Run FFmpeg command
        console.log('Running FFmpeg command:', command.join(' '));
        await ffmpeg.exec(command);

        // Read the output file
        const data = await ffmpeg.readFile(outputFileName);

        // Clean up files from FFmpeg's virtual filesystem
        try {
            await ffmpeg.deleteFile(inputFileName);
            await ffmpeg.deleteFile(outputFileName);
        } catch (error) {
            console.warn('Error cleaning up FFmpeg files:', error);
        }

        // Create and return the output blob
        return new Blob([data], { type: `video/${targetFormat.toLowerCase()}` });
    } catch (error) {
        console.error('Video conversion error:', error);
        throw new Error(`Failed to convert video: ${error.message}`);
    } finally {
        // Clean up progress container
        setTimeout(() => {
            progressContainer.classList.remove('active');
            const warningMessage = progressContainer.querySelector('.warning-message');
            if (warningMessage) {
                warningMessage.remove();
            }
        }, 1000);
    }
}

// Conversion Functions
async function convertFile(targetFormat) {
    if (!currentFile) {
        showError('Please select a file first.');
        return;
    }

    const progressContainer = document.querySelector('.progress-container');
    progressContainer.classList.add('active');

    try {
        const fileType = currentFile.type;
        let result;

        if (fileType.startsWith('image/')) {
            result = await convertImage(targetFormat);
        } else if (fileType.startsWith('audio/')) {
            result = await convertAudio(targetFormat);
        } else if (fileType.startsWith('video/')) {
            result = await convertVideo(targetFormat);
        } else {
            throw new Error('Unsupported file type for conversion.');
        }

        if (!result) {
            throw new Error('Conversion failed - no output generated');
        }

        // Create download link with modified filename
        const url = URL.createObjectURL(result);
        const a = document.createElement('a');
        a.href = url;
        const originalName = currentFile.name;
        const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
        a.download = `${nameWithoutExt}-Converted.${targetFormat.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        updateProgress(100);
        showSuccess('File converted successfully, check your downloads folder (Crtl + J)!');
    } catch (error) {
        console.error('Conversion error:', error);
        showError(error.message || 'An error occurred during conversion. Please try again.');
    } finally {
        setTimeout(() => {
            progressContainer.classList.remove('active');
        }, 1000);
    }
}

async function convertImage(targetFormat) {
    // Create an image element
    const img = new Image();
    img.src = URL.createObjectURL(currentFile);

    // Wait for the image to load
    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
    });

    // Create a canvas element
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw the image on the canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Convert to the target format
    let mimeType;
    switch (targetFormat.toLowerCase()) {
        case 'png':
            mimeType = 'image/png';
            break;
        case 'jpg':
        case 'jpeg':
            mimeType = 'image/jpeg';
            break;
        case 'webp':
            mimeType = 'image/webp';
            break;
        case 'gif':
            mimeType = 'image/gif';
            break;
        case 'svg':
            // Convert canvas to base64 data URL
            const dataUrl = canvas.toDataURL('image/png');
            // Create SVG with embedded image data
            const svgString = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${img.width}" 
     height="${img.height}" 
     viewBox="0 0 ${img.width} ${img.height}">
    <image width="${img.width}" 
           height="${img.height}" 
           xlink:href="${dataUrl}"
           preserveAspectRatio="xMidYMid meet"/>
</svg>`;
            return new Blob([svgString], { type: 'image/svg+xml' });
        default:
            throw new Error('Unsupported format');
    }

    // Convert the canvas to a blob with maximum quality
    return new Promise(resolve => {
        canvas.toBlob(resolve, mimeType, 1.0);
    });
}

async function convertAudio(targetFormat) {
    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Read the audio file
    const arrayBuffer = await currentFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Create offline context for processing
    const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
    );

    // Create source and connect to destination
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();

    // Process the audio
    const renderedBuffer = await offlineContext.startRendering();
    
    // Convert to WAV format
    const wavData = audioBufferToWav(renderedBuffer);
    return new Blob([wavData], { type: 'audio/wav' });
}

function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const wav = new ArrayBuffer(44 + buffer.length * blockAlign);
    const view = new DataView(wav);

    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + buffer.length * blockAlign, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, buffer.length * blockAlign, true);

    // Write audio data
    const data = new Float32Array(buffer.length);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
        data[i] = channelData[i];
    }

    let offset = 44;
    for (let i = 0; i < data.length; i++) {
        const sample = Math.max(-1, Math.min(1, data[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
    }

    return wav;
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function getFileExtension(filename) {
    return '.' + filename.split('.').pop().toLowerCase();
}

// Add error and success message functions
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'warning-message error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        ${message}
    `;
    const container = document.querySelector('.conversion-options');
    container.insertBefore(errorDiv, container.firstChild);
    setTimeout(() => errorDiv.remove(), 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'warning-message success-message';
    successDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        ${message}
    `;
    const container = document.querySelector('.conversion-options');
    container.insertBefore(successDiv, container.firstChild);
    setTimeout(() => successDiv.remove(), 5000);
} 