const cameraStream = document.getElementById('camera-stream');
const cameraCanvas = document.getElementById('camera-canvas');
const previewImage = document.getElementById('preview-image');
const cameraPlaceholder = document.getElementById('camera-placeholder');
const startCameraBtn = document.getElementById('start-camera-btn');
const captureBtn = document.getElementById('capture-btn');
const uploadImage = document.getElementById('upload-image');
const analyzeBtn = document.getElementById('analyze-btn');
const resultsCard = document.getElementById('results-card');

let currentStream = null;
let capturedBlob = null;

async function startCamera() {
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        cameraStream.srcObject = currentStream;
        cameraStream.classList.remove('hidden');
        cameraPlaceholder.classList.add('hidden');
        previewImage.classList.add('hidden');
        captureBtn.classList.remove('hidden');
        startCameraBtn.classList.add('hidden');
        analyzeBtn.classList.add('hidden');
        resultsCard.style.display = 'none';
    } catch (err) {
        alert("Camera access denied or unavailable.");
        console.error(err);
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
}

startCameraBtn.addEventListener('click', startCamera);

captureBtn.addEventListener('click', () => {
    cameraCanvas.width = cameraStream.videoWidth;
    cameraCanvas.height = cameraStream.videoHeight;
    cameraCanvas.getContext('2d').drawImage(cameraStream, 0, 0);
    
    cameraCanvas.toBlob((blob) => {
        capturedBlob = blob;
        previewImage.src = URL.createObjectURL(blob);
        previewImage.classList.remove('hidden');
        cameraStream.classList.add('hidden');
        stopCamera();
        
        captureBtn.classList.add('hidden');
        startCameraBtn.classList.remove('hidden');
        startCameraBtn.textContent = "Retake Photo";
        analyzeBtn.classList.remove('hidden');
    }, 'image/jpeg');
});

uploadImage.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        capturedBlob = e.target.files[0];
        previewImage.src = URL.createObjectURL(capturedBlob);
        previewImage.classList.remove('hidden');
        cameraStream.classList.add('hidden');
        cameraPlaceholder.classList.add('hidden');
        stopCamera();
        
        captureBtn.classList.add('hidden');
        startCameraBtn.classList.remove('hidden');
        startCameraBtn.textContent = "Retake Photo";
        analyzeBtn.classList.remove('hidden');
        resultsCard.style.display = 'none';
    }
});

analyzeBtn.addEventListener('click', async () => {
    if (!capturedBlob) return;
    
    resultsCard.style.display = 'block';
    document.getElementById('analysis-content').classList.add('hidden');
    document.getElementById('analysis-loading').classList.remove('hidden');
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Analyzing...";
    
    const formData = new FormData();
    formData.append("image", capturedBlob, "tree.jpg");
    
    try {
        const res = await fetch("/analyze-tree", {
            method: "POST",
            body: formData
        });
        
        const data = await res.json();
        
        if (res.ok) {
            // Apply theme based on status
            const statusLevel = data.status_level || 'Safe';
            const banner = document.getElementById('status-banner');
            const badge = document.getElementById('status-badge');
            
            // Remove old themes
            banner.classList.remove('theme-safe', 'theme-warning', 'theme-danger');
            badge.classList.remove('theme-safe', 'theme-warning', 'theme-danger');
            
            let themeClass = 'theme-safe';
            let icon = '✅';
            if (statusLevel === 'Warning') {
                themeClass = 'theme-warning';
                icon = '⚠️';
            } else if (statusLevel === 'Dangerous') {
                themeClass = 'theme-danger';
                icon = '🛑';
            }
            
            banner.classList.add(themeClass);
            badge.classList.add(themeClass);
            badge.textContent = `${icon} ${statusLevel}`;
            
            // Update Score & Parking
            document.getElementById('safety-score').textContent = data.safety_score;
            document.getElementById('parking-status').textContent = data.safe_to_park ? '✅ Safe to park under' : '🚫 Do NOT park under';
            
            // Update Lists
            document.getElementById('res-health').textContent = data.overall_health || "N/A";
            
            const fillList = (id, items) => {
                const ul = document.getElementById(id);
                ul.innerHTML = "";
                if (items && items.length > 0) {
                    items.forEach(item => {
                        const li = document.createElement("li");
                        li.textContent = item;
                        ul.appendChild(li);
                    });
                } else {
                    ul.innerHTML = "<li>None detected</li>";
                }
            };
            
            fillList('res-weaknesses', data.structural_weaknesses);
            fillList('res-diseases', data.disease_signs);
            fillList('res-decay', data.decay);
            fillList('res-recommendations', data.safety_recommendations);
            
            document.getElementById('analysis-content').classList.remove('hidden');
        } else {
            alert("Error: " + data.error);
            resultsCard.style.display = 'none';
        }
    } catch (err) {
        alert("Failed to analyze image.");
        console.error(err);
        resultsCard.style.display = 'none';
    } finally {
        document.getElementById('analysis-loading').classList.add('hidden');
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = "Analyze Tree";
    }
});
