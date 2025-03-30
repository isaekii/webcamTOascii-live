// DOM Elements
const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const asciiOutput = document.getElementById('asciiOutput');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const characterSetSelect = document.getElementById('characterSet');
const resolutionSlider = document.getElementById('resolution');
const resolutionValue = document.getElementById('resolutionValue');
const invertCheckbox = document.getElementById('invert');
const errorMessage = document.getElementById('errorMessage');

// Canvas Context
const ctx = canvasElement.getContext('2d', { willReadFrequently: true });

// Webcam stream reference
let stream = null;

// Animation frame request reference
let animationFrame = null;

// Character sets
const characterSets = {
    standard: '@#S%?*+;:,. ',
    blocks: '█▓▒░ ',
    simple: '#. '
};

// Configuration object
const config = {
    resolution: 80,
    characterSet: 'standard',
    invert: false,
    frameSkip: 2, // Process every n frames for performance
    frameCount: 0
};

// Set up event listeners
function init() {
    startButton.addEventListener('click', startWebcam);
    stopButton.addEventListener('click', stopWebcam);
    
    characterSetSelect.addEventListener('change', () => {
        config.characterSet = characterSetSelect.value;
    });
    
    resolutionSlider.addEventListener('input', () => {
        config.resolution = parseInt(resolutionSlider.value);
        resolutionValue.textContent = `${config.resolution} cols`;
    });
    
    invertCheckbox.addEventListener('change', () => {
        config.invert = invertCheckbox.checked;
    });
    
    // Set initial values
    resolutionValue.textContent = `${config.resolution} cols`;
}

// Start webcam and ASCII conversion
async function startWebcam() {
    try {
        // Request webcam access
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 },
                height: { ideal: 480 }
            } 
        });
        
        // Set up video stream
        videoElement.srcObject = stream;
        
        // Wait for video metadata to load
        await videoElement.play();
        
        // Set canvas dimensions to match video
        updateCanvasSize();
        
        // Start the conversion process
        processVideo();
        
        // Update UI
        startButton.disabled = true;
        stopButton.disabled = false;
        hideError();
        
    } catch (error) {
        showError(`Error accessing webcam: ${error.message || 'Permission denied'}. Please make sure your camera is connected and you've granted permission.`);
        console.error('Webcam error:', error);
    }
}

// Stop webcam and clean up
function stopWebcam() {
    if (stream) {
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        
        // Clear video source
        videoElement.srcObject = null;
        
        // Cancel animation frame
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
        
        // Clear ASCII output
        asciiOutput.textContent = '';
        
        // Update UI
        startButton.disabled = false;
        stopButton.disabled = true;
    }
}

// Update canvas dimensions based on the video and desired resolution
function updateCanvasSize() {
    // Get the aspect ratio of the video
    const ratio = videoElement.videoHeight / videoElement.videoWidth;
    
    // Set width based on the resolution slider
    canvasElement.width = config.resolution;
    
    // Set height based on the aspect ratio
    canvasElement.height = Math.floor(config.resolution * ratio / 2);
}

// Main video processing function
function processVideo() {
    // Skip frames for performance if needed
    config.frameCount = (config.frameCount + 1) % config.frameSkip;
    
    if (config.frameCount === 0) {
        // Update canvas size if resolution changed
        updateCanvasSize();
        
        // Draw current video frame to canvas
        ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        
        // Get pixel data from canvas
        const imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
        
        // Convert to ASCII
        const asciiArt = convertToAscii(imageData);
        
        // Display ASCII art
        asciiOutput.textContent = asciiArt;
    }
    
    // Continue processing frames
    animationFrame = requestAnimationFrame(processVideo);
}

// Convert image data to ASCII art
function convertToAscii(imageData) {
    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const chars = characterSets[config.characterSet];
    
    let result = '';
    
    // Process each pixel row by row
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Calculate pixel index (each pixel has 4 values: R, G, B, A)
            const idx = (y * width + x) * 4;
            
            // Calculate grayscale value using luminance formula
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Invert if needed
            if (config.invert) {
                gray = 255 - gray;
            }
            
            // Map grayscale value to character
            const charIndex = Math.floor(gray * (chars.length - 1) / 255);
            result += chars[charIndex];
        }
        result += '\n';
    }
    
    return result;
}

// Error handling
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (stream) {
        stopWebcam();
    }
});

// Initialize the application
init();
