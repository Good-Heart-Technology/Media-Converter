// Logging utility
const Logger = {
    info: (message, data = null) => {
        console.log(`[INFO] ${message}`, data || '');
    },
    error: (message, error = null) => {
        console.error(`[ERROR] ${message}`, error || '');
    },
    warn: (message, data = null) => {
        console.warn(`[WARN] ${message}`, data || '');
    },
    debug: (message, data = null) => {
        console.debug(`[DEBUG] ${message}`, data || '');
    }
};

// UI Elements
let dropZone;
let fileInput;
let conversionOptions;
let currentFile = null;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    Logger.info('DOM Content Loaded, initializing application...');
    try {
        // Initialize UI elements
        if (!initializeUI()) {
            Logger.error('Failed to initialize UI elements');
            return;
        }
        // Set up event listeners
        setupEventListeners();
        // Set current year in footer
        updateFooterYear();
        Logger.info('Application initialized successfully');
    } catch (error) {
        Logger.error('Failed to initialize application', error);
        showMessage('Failed to initialize application. Please refresh the page.', 'error');
    }
});

// Initialize UI elements
function initializeUI() {
    Logger.debug('Initializing UI elements...');
    dropZone = document.getElementById('dropZone');
    fileInput = document.getElementById('fileInput');
    conversionOptions = document.getElementById('conversionOptions');
    
    // Check if required elements exist
    if (!dropZone || !fileInput || !conversionOptions) {
        Logger.error('Required UI elements not found', {
            dropZone: !!dropZone,
            fileInput: !!fileInput,
            conversionOptions: !!conversionOptions
        });
        return false;
    }
    Logger.debug('UI elements initialized successfully');
    return true;
}

// Set up event listeners
function setupEventListeners() {
    if (!dropZone || !fileInput) {
        Logger.error('Cannot set up event listeners: required elements not found');
        return;
    }

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
    } else {
        Logger.warn('Footer year element not found');
    }
}

// Supported file types and formats
const SUPPORTED_MIME_TYPES = {
    'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml'],
    'audio': ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac'],
    'archive': ['application/zip', 'application/x-tar']
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
        'archive': ['ZIP', 'TAR']
    };

    // Check if it's an archive file
    if (fileType.includes('archive') || fileType.includes('zip') || fileType.includes('tar')) {
        // For ZIP files, we can convert to TAR
        // For TAR files, we can convert to ZIP
        if (fileExtension === 'zip') {
            return ['TAR'];
        } else if (fileExtension === 'tar') {
            return ['ZIP'];
        }
        return [];
    }
    
    // Check other file types
    if (fileType.startsWith('image/')) return formats.image.filter(f => f.toLowerCase() !== fileExtension);
    if (fileType.startsWith('audio/')) return formats.audio.filter(f => f.toLowerCase() !== fileExtension);
    
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
    Logger.debug('File dropped', { files: e.dataTransfer.files.length });
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFileSelect(e) {
    Logger.debug('File selected', { files: e.target.files.length });
    const files = e.target.files;
    handleFiles(files);
}

async function handleFiles(files) {
    if (!files || files.length === 0) {
        Logger.warn('No files provided');
        return;
    }
    
    const file = files[0];
    Logger.info('Processing file', {
        name: file.name,
        type: file.type,
        size: formatFileSize(file.size)
    });
    
    // Special handling for PDF files
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        Logger.info('PDF file detected, showing warning');
        showPDFWarning();
        return;
    }

    const validation = validateFileType(file);
    Logger.debug('File validation result', validation);
    
    if (!validation.valid) {
        Logger.warn('Unsupported file type', { file: file.name, type: file.type });
        showMessage(`Unsupported file type: ${file.name}\nPlease check the supported formats list below.`, 'error');
        return;
    }

    const sizeLimit = FILE_SIZE_LIMITS.default;
    if (file.size > sizeLimit) {
        Logger.warn('File size exceeds limit', {
            fileSize: formatFileSize(file.size),
            limit: formatFileSize(sizeLimit)
        });
        showMessage(`File size exceeds the limit of ${formatFileSize(sizeLimit)}. Please choose a smaller file.`, 'error');
        return;
    }

    currentFile = file;
    Logger.info('File validated successfully, showing conversion options');
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

    Logger.info('Validating file type', { fileType, fileExtension });

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
        'archive': ['zip', 'tar']
    };

    for (const category in extensionMap) {
        if (extensionMap[category].includes(fileExtension)) {
            return { valid: true, category, extension: fileExtension };
        }
    }

    // Show error message to user for unsupported file type
    const errorMessage = `Unsupported file type: ${fileExtension.toUpperCase()}. Please upload one of the following:\n` +
        '• Images (JPG, PNG, GIF, WEBP, BMP, TIFF, SVG)\n' +
        '• Audio (MP3, WAV, OGG, FLAC, AAC)\n' +
        '• Archives (ZIP, TAR)';
    
    showError(errorMessage);
    Logger.warn('Unsupported file type', { fileType, fileExtension });

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

// Conversion Functions
async function convertFile(targetFormat) {
    if (!currentFile) {
        showError('Please select a file first.');
        return;
    }

    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer) {
        progressContainer.classList.add('active');
    }

    try {
        const fileType = currentFile.type;
        let result;

        // Check if it's an archive file
        if (fileType.includes('archive') || fileType.includes('zip') || fileType.includes('tar')) {
            result = await convertArchive(targetFormat);
        } else if (fileType.startsWith('image/')) {
            result = await convertImage(targetFormat);
        } else if (fileType.startsWith('audio/')) {
            result = await convertAudio(targetFormat);
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
        if (progressContainer) {
            setTimeout(() => {
                progressContainer.classList.remove('active');
            }, 1000);
        }
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
    try {
        Logger.info('Starting audio conversion', { sourceFormat: currentFile.type, targetFormat });
        
        // Create audio context with default sample rate
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Read the audio file
        const arrayBuffer = await currentFile.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Create offline context with matching sample rate and duration
        const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate  // Use the same sample rate as input
        );

        // Create source and connect to destination
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        
        // Start the source at time 0
        source.start(0);

        // Render the audio
        const renderedBuffer = await offlineContext.startRendering();
        
        Logger.info('Audio rendered successfully', {
            channels: renderedBuffer.numberOfChannels,
            sampleRate: renderedBuffer.sampleRate,
            duration: renderedBuffer.duration
        });

        // Convert based on target format
        switch (targetFormat.toLowerCase()) {
            case 'wav':
                const wavData = audioBufferToWav(renderedBuffer);
                return new Blob([wavData], { type: 'audio/wav' });
            case 'mp3':
            case 'flac':
            case 'ogg':
            case 'aac':
                // All formats currently convert to WAV
                Logger.warn(`${targetFormat.toUpperCase()} conversion not supported in browser, converting to WAV instead`);
                const convertedData = audioBufferToWav(renderedBuffer);
                return new Blob([convertedData], { type: 'audio/wav' });
            default:
                throw new Error('Unsupported audio format');
        }
    } catch (error) {
        Logger.error('Audio conversion failed', error);
        throw error;
    }
}

// Helper function to convert AudioBuffer to WAV format
function audioBufferToWav(buffer) {
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length * numberOfChannels;
    const data = new Float32Array(length);

    // Interleave channels
    for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < buffer.length; i++) {
            data[i * numberOfChannels + channel] = channelData[i];
        }
    }

    // Create WAV file format
    const wavBuffer = new ArrayBuffer(44 + data.length * 2);
    const view = new DataView(wavBuffer);

    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + data.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, data.length * 2, true);

    // Write audio data
    const volume = 0.8;
    for (let i = 0; i < data.length; i++) {
        const sample = Math.max(-1, Math.min(1, data[i])) * volume;
        view.setInt16(44 + i * 2, sample * 0x7FFF, true);
    }

    return wavBuffer;
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

// Archive conversion function
async function convertArchive(targetFormat) {
    Logger.info('Starting archive conversion', {
        inputFile: currentFile.name,
        targetFormat: targetFormat
    });

    try {
        // Read the input file
        const arrayBuffer = await currentFile.arrayBuffer();
        const inputExtension = currentFile.name.split('.').pop().toLowerCase();
        
        // Create a new ZIP instance for output
        const outputZip = new JSZip();
        
        if (inputExtension === 'zip') {
            // If input is ZIP, read it and convert to TAR
            const zip = await JSZip.loadAsync(arrayBuffer);
            const files = zip.files;
            let processedFiles = 0;
            const totalFiles = Object.keys(files).length;

            // Process each file
            for (const [fileName, file] of Object.entries(files)) {
                if (file.dir) continue;

                // Read file content
                const content = await file.async('arraybuffer');
                
                // Add file to the new archive
                outputZip.file(fileName, content);
                
                // Update progress
                processedFiles++;
                const progress = Math.round((processedFiles / totalFiles) * 100);
                updateProgress(progress);
            }

            // Generate the output archive
            if (targetFormat.toLowerCase() === 'tar') {
                const tarData = await convertZipToTar(outputZip);
                return new Blob([tarData], { type: 'application/x-tar' });
            }
        } else if (inputExtension === 'tar') {
            // If input is TAR, convert to ZIP
            // Note: This is a simplified version. In a real implementation,
            // you would need to properly parse the TAR file structure
            const tarData = new Uint8Array(arrayBuffer);
            const fileName = currentFile.name.replace('.tar', '');
            outputZip.file(fileName, tarData);
            updateProgress(100);
        }

        // Generate ZIP output
        return await outputZip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
        });
    } catch (error) {
        Logger.error('Archive conversion failed', error);
        throw new Error(`Failed to convert archive: ${error.message}`);
    }
}

// Helper function to convert ZIP to TAR format
async function convertZipToTar(zip) {
    const tarData = [];
    
    // Process each file in the ZIP
    for (const [fileName, file] of Object.entries(zip.files)) {
        if (file.dir) continue;

        // Read file content
        const content = await file.async('arraybuffer');
        
        // Create TAR header
        const header = createTarHeader(fileName, content.byteLength);
        tarData.push(header);
        
        // Add file content
        tarData.push(new Uint8Array(content));
        
        // Add padding if needed
        const padding = 512 - (content.byteLength % 512);
        if (padding < 512) {
            tarData.push(new Uint8Array(padding));
        }
    }
    
    // Add end marker
    tarData.push(new Uint8Array(1024));
    
    // Combine all data
    return new Blob(tarData, { type: 'application/x-tar' });
}

// Helper function to create TAR header
function createTarHeader(fileName, fileSize) {
    const header = new Uint8Array(512);
    const encoder = new TextEncoder();
    
    // Write filename (100 bytes)
    const nameBytes = encoder.encode(fileName);
    header.set(nameBytes, 0);
    
    // Write file mode (8 bytes)
    header.set(encoder.encode('0000644'), 100);
    
    // Write user ID (8 bytes)
    header.set(encoder.encode('0000000'), 108);
    
    // Write group ID (8 bytes)
    header.set(encoder.encode('0000000'), 116);
    
    // Write file size (12 bytes)
    const sizeStr = fileSize.toString(8).padStart(11, '0') + ' ';
    header.set(encoder.encode(sizeStr), 124);
    
    // Write modification time (12 bytes)
    const timeStr = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + ' ';
    header.set(encoder.encode(timeStr), 136);
    
    // Write checksum (8 bytes)
    header.set(encoder.encode('        '), 148);
    
    // Write type flag (1 byte)
    header[156] = 0x30; // Regular file
    
    // Write link name (100 bytes)
    header.set(encoder.encode(''), 157);
    
    // Write USTAR indicator (8 bytes)
    header.set(encoder.encode('ustar  '), 257);
    
    // Write owner name (32 bytes)
    header.set(encoder.encode(''), 265);
    
    // Write group name (32 bytes)
    header.set(encoder.encode(''), 297);
    
    // Write device major (8 bytes)
    header.set(encoder.encode(''), 329);
    
    // Write device minor (8 bytes)
    header.set(encoder.encode(''), 337);
    
    // Write prefix (155 bytes)
    header.set(encoder.encode(''), 345);
    
    // Write padding (12 bytes)
    header.set(encoder.encode(''), 500);
    
    return header;
} 