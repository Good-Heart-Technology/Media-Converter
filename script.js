// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI elements
    initializeUI();
    // Set up event listeners
    setupEventListeners();
    // Set current year in footer
    updateFooterYear();
});

// UI Elements
let dropZone;
let fileInput;
let conversionOptions;
let currentFile = null;

// Initialize UI elements
function initializeUI() {
    dropZone = document.getElementById('dropZone');
    fileInput = document.getElementById('fileInput');
    conversionOptions = document.getElementById('conversionOptions');
}

// Set up event listeners
function setupEventListeners() {
    if (!dropZone || !fileInput) return;

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
}

// Update footer year
function updateFooterYear() {
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

// Supported file types and formats
const SUPPORTED_MIME_TYPES = {
    'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml'],
    'audio': ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac'],
    'video': ['video/mp4', 'video/webm', 'video/gif'],
    'archive': ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed']
};

// File size limits (effectively removed)
const FILE_SIZE_LIMITS = {
    'default': Number.MAX_SAFE_INTEGER
};

// Get supported formats for a file type
function getSupportedFormats(fileType, fileExtension) {
    const formats = {
        'image': ['PNG', 'JPG', 'WEBP', 'GIF', 'SVG'],
        'audio': ['MP3', 'WAV', 'OGG'],
        'video': ['MP4', 'WEBM', 'GIF'],
        'archive': ['ZIP', 'RAR', '7Z']
    };

    if (fileType.startsWith('image/')) return formats.image.filter(f => f.toLowerCase() !== fileExtension);
    if (fileType.startsWith('audio/')) return formats.audio.filter(f => f.toLowerCase() !== fileExtension);
    if (fileType.startsWith('video/')) return formats.video.filter(f => f.toLowerCase() !== fileExtension);
    if (fileType.includes('archive')) return formats.archive.filter(f => f.toLowerCase() !== fileExtension);
    return [];
}

// UI Helper Functions
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    if (dropZone) dropZone.classList.add('highlight');
}

function unhighlight(e) {
    if (dropZone) dropZone.classList.remove('highlight');
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
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Special handling for PDF files
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        showPDFWarning();
        return;
    }

    const validation = validateFileType(file);
    
    if (!validation.valid) {
        showMessage(`Unsupported file type: ${file.name}\nPlease check the supported formats list below.`, 'error');
        return;
    }

    const sizeLimit = FILE_SIZE_LIMITS.default;
    if (file.size > sizeLimit) {
        showMessage(`File size exceeds the limit of ${formatFileSize(sizeLimit)}. Please choose a smaller file.`, 'error');
        return;
    }

    currentFile = file;
    showConversionOptions(file.type, validation.extension);
}

function showPDFWarning() {
    const warningMessage = document.createElement('div');
    warningMessage.className = 'warning-message';
    warningMessage.innerHTML = `
        <i class="fas fa-info-circle"></i>
        For PDF file conversions, we recommend using this tool, which can do pretty much anything with PDFs:
        <a href="http://pdf.nonprofittools.org/" target="_blank" style="color: inherit; text-decoration: underline;">PDF Tools (Stirling PDF)</a>
    `;
    const uploadSection = document.querySelector('.upload-section');
    if (uploadSection) {
        uploadSection.appendChild(warningMessage);
    }
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
        'video': ['mp4', 'webm', 'gif'],
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
    try {
        if (!ffmpeg) {
            // Create FFmpeg instance
            ffmpeg = new FFmpeg();
            
            // Set up logging
            ffmpeg.on('log', ({ message }) => {
                console.log(message);
            });

            // Load FFmpeg
            await ffmpeg.load();
            console.log('FFmpeg initialized successfully');
        }
        return true;
    } catch (error) {
        console.error('Failed to initialize FFmpeg:', error);
        showMessage('Failed to initialize FFmpeg. Please refresh the page and try again.', 'error');
        return false;
    }
}

async function convertVideo(inputFile, outputFormat) {
    try {
        if (!ffmpeg) {
            const initialized = await initFFmpeg();
            if (!initialized) {
                throw new Error('Failed to initialize FFmpeg');
            }
        }

        // Show warning about conversion time
        showMessage('Converting video... This may take a few minutes.', 'warning');
        
        // Write the input file to memory
        const inputFileName = 'input' + getFileExtension(inputFile.name);
        const inputData = await inputFile.arrayBuffer();
        await ffmpeg.writeFile(inputFileName, new Uint8Array(inputData));

        // Set output filename
        const outputFileName = `output.${outputFormat.toLowerCase()}`;

        // Configure conversion options based on format
        let outputOptions = [];
        switch (outputFormat.toLowerCase()) {
            case 'mp4':
                outputOptions = [
                    '-c:v', 'libx264',     // H.264 video codec
                    '-preset', 'medium',    // Encoding preset
                    '-crf', '23',          // Quality level (0-51, lower is better)
                    '-c:a', 'aac',         // AAC audio codec
                    '-b:a', '128k'         // Audio bitrate
                ];
                break;
            case 'webm':
                outputOptions = [
                    '-c:v', 'libvpx-vp9',  // VP9 video codec
                    '-b:v', '2M',          // Video bitrate
                    '-c:a', 'libopus',     // Opus audio codec
                    '-b:a', '128k'         // Audio bitrate
                ];
                break;
            case 'gif':
                outputOptions = [
                    '-vf', 'fps=10,scale=480:-1:flags=lanczos',  // 10 FPS, scale width to 480px
                    '-f', 'gif'
                ];
                break;
            default:
                throw new Error('Unsupported output format');
        }

        // Run FFmpeg command
        await ffmpeg.exec([
            '-i', inputFileName,
            ...outputOptions,
            outputFileName
        ]);

        // Read the output file
        const data = await ffmpeg.readFile(outputFileName);

        // Clean up files in memory
        await ffmpeg.deleteFile(inputFileName);
        await ffmpeg.deleteFile(outputFileName);

        // Create download URL
        const blob = new Blob([data.buffer], { type: `video/${outputFormat}` });
        const url = URL.createObjectURL(blob);

        // Trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = `converted_video.${outputFormat}`;
        link.click();

        // Clean up
        URL.revokeObjectURL(url);
        showMessage('Video conversion completed successfully!', 'success');

    } catch (error) {
        console.error('Error during video conversion:', error);
        showMessage(`Failed to convert video: ${error.message}`, 'error');
        throw error;
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
            result = await convertVideo(currentFile, targetFormat);
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

// Add showMessage function
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `warning-message ${type}-message`;
    
    let icon;
    switch (type) {
        case 'error':
            icon = 'exclamation-circle';
            break;
        case 'success':
            icon = 'check-circle';
            break;
        case 'warning':
            icon = 'exclamation-triangle';
            break;
        default:
            icon = 'info-circle';
    }
    
    messageDiv.innerHTML = `
        <i class="fas fa-${icon}"></i>
        ${message}
    `;
    
    const container = document.querySelector('.conversion-options');
    container.insertBefore(messageDiv, container.firstChild);
    setTimeout(() => messageDiv.remove(), 5000);
} 