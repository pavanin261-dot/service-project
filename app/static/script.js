const API_BASE_URL =
    window.API_BASE_URL || "https://service-project-6.onrender.com";

const uploadZone = document.querySelector("#uploadZone");
const fileInput = document.querySelector("#fileInput");
const chooseFile = document.querySelector("#chooseFile");
const cameraMode = document.querySelector("#cameraMode");
const resultMessage = document.querySelector("#resultMessage");
const detectionResult = document.querySelector(".detection-result");
const stages = document.querySelectorAll(".stage");
const compareSlider = document.querySelector("#compareSlider");
const afterLayer = document.querySelector("#afterLayer");
const modelStatus = document.querySelector("#modelStatus");
const scanStat = document.querySelector("#scanStat");
const timeStat = document.querySelector("#timeStat");
const historyList = document.querySelector("#historyList");
const resultPreview = document.querySelector("#resultPreview");
const roadMapElement = document.querySelector("#roadMap");
const useLocationButton = document.querySelector("#useLocation");
const registerForm = document.querySelector("#registerForm");
const loginForm = document.querySelector("#loginForm");
const logoutButton = document.querySelector("#logoutButton");
const authStatus = document.querySelector("#authStatus");
const myScansGrid = document.querySelector("#myScansGrid");
const myScansStatus = document.querySelector("#myScansStatus");
const refreshMyScansButton = document.querySelector("#refreshMyScans");
const defaultMapCenter = [14.4673, 78.8242];
let currentLocation = null;
let roadMap = null;
let userLocationMarker = null;
let damageMarkerLayer = null;
let authToken = localStorage.getItem("roadvision_token");

const sampleMapMarkers = [
    {
        lat: 14.4673,
        lng: 78.8242,
        type: "Pothole",
        confidence: 0.94,
        color: "red"
    },
    {
        lat: 14.4758,
        lng: 78.8156,
        type: "Crack",
        confidence: 0.88,
        color: "yellow"
    },
    {
        lat: 14.4584,
        lng: 78.8365,
        type: "Reviewed",
        confidence: 1,
        color: "blue"
    }
];

function setStage(index) {
    stages.forEach((stage, stageIndex) => {
        stage.classList.toggle("active", stageIndex === index);
    });
}

function setPreview(file) {
    if (!file) {
        return;
    }

    const imageUrl = URL.createObjectURL(file);
    resultPreview.innerHTML = `
        <div class="road-sample upload-preview" style="--preview-image: url('${imageUrl}')">
            <span class="box pothole">Scanning</span>
            <span class="box crack">Scanning</span>
        </div>
    `;
}

function renderDetections(predictions) {
    const roadSample = resultPreview.querySelector(".road-sample");

    if (!roadSample || predictions.length === 0) {
        return;
    }

    roadSample.innerHTML = predictions.map((prediction, index) => {
        const boxClass = prediction.label.toLowerCase().includes("crack") ? "crack" : "pothole";
        const confidence = Math.round(prediction.confidence * 100);
        const offset = index * 9;

        return `<span class="box ${boxClass}" style="left:${18 + offset}%;top:${42 + offset}%">${prediction.label} ${confidence}%</span>`;
    }).join("");
}

function addHistoryItem(scan) {
    const label = scan.predictions?.[0]?.label || "Road damage";
    const confidence = scan.predictions?.[0]?.confidence ? Math.round(scan.predictions[0].confidence * 100) : 0;
    const fileName = scan.filename || scan.image_url?.split("/").pop() || "uploaded image";
    const item = document.createElement("li");
    item.innerHTML = `<span></span> ${label} detected in ${fileName} (${confidence}%)`;
    historyList.prepend(item);

    while (historyList.children.length > 4) {
        historyList.lastElementChild.remove();
    }
}

function renderHistory(scans) {
    historyList.innerHTML = "";

    if (!scans.length) {
        historyList.innerHTML = "<li><span></span> No backend scans yet</li>";
        scanStat.textContent = "0";
        return;
    }

    scans.slice(0, 4).forEach(addHistoryItem);
    scanStat.textContent = String(scans.length);
}

function runFallbackDetection(fileName = "sample road image") {
    setStage(0);
    resultMessage.textContent = `Image loaded: ${fileName}`;
    detectionResult.classList.add("processing");

    setTimeout(() => {
        setStage(1);
        resultMessage.textContent = "AI processing: scanning road surface, cracks, and potholes...";
    }, 650);

    setTimeout(() => {
        setStage(2);
        detectionResult.classList.remove("processing");
        resultMessage.textContent = "Demo complete: backend offline, showing simulated detections.";
    }, 2300);
}

async function runBackendDetection(file) {
    setPreview(file);
    setStage(0);
    resultMessage.textContent = `Image loaded: ${file.name}`;
    detectionResult.classList.add("processing");

    const formData = new FormData();
    formData.append("file", file);
    if (currentLocation) {
        formData.append("latitude", currentLocation.lat);
        formData.append("longitude", currentLocation.lng);
        formData.append("location", currentLocation.label);
    }

    try {
        setStage(1);
        resultMessage.textContent = "Sending image to FastAPI backend...";

        const response = await fetch(`${API_BASE_URL}/detect`, {
            method: "POST",
            body: formData,
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        });

        if (!response.ok) {
            throw new Error("Detection request failed");
        }

        const scan = await response.json();
        setStage(2);
        renderDetections(scan.predictions || []);
        addHistoryItem(scan);
        scanStat.textContent = String(Number(scanStat.textContent || "0") + 1);
        timeStat.textContent = `${scan.processing_time || scan.processing_time_seconds}s`;
        resultMessage.textContent = `Detection complete: ${scan.predictions.length} damage item(s) found.`;
        await refreshMapMarkers();
        await loadMyScans();
    } catch (error) {
        runFallbackDetection(file.name);
    } finally {
        setTimeout(() => detectionResult.classList.remove("processing"), 2400);
    }
}

function updateAuthStatus(message) {
    if (authStatus) {
        authStatus.textContent = message;
        authStatus.classList.toggle("is-offline", message.toLowerCase().includes("not") || message.toLowerCase().includes("failed") || message.toLowerCase().includes("expired"));
    }
}

async function loadProfile() {
    if (!authToken) {
        updateAuthStatus("Not logged in");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        if (!response.ok) {
            throw new Error("Profile failed");
        }

        const profile = await response.json();
        updateAuthStatus(`Logged in: ${profile.email}`);
        await loadMyScans();
    } catch (error) {
        localStorage.removeItem("roadvision_token");
        authToken = null;
        updateAuthStatus("Session expired. Please login again.");
        renderMyScans([]);
    }
}

function renderMyScans(scans) {
    if (!myScansGrid || !myScansStatus) {
        return;
    }

    myScansGrid.innerHTML = "";

    if (!authToken) {
        myScansStatus.textContent = "Login to view your personal scan reports.";
        myScansGrid.innerHTML = `
            <article class="empty-scan-card">
                <h3>Login required</h3>
                <p>Your personal scan history is protected by your account token.</p>
            </article>
        `;
        return;
    }

    if (!scans.length) {
        myScansStatus.textContent = "No scans saved for this account yet.";
        myScansGrid.innerHTML = `
            <article class="empty-scan-card">
                <h3>No scans yet</h3>
                <p>Upload a road image after login to create your first report.</p>
            </article>
        `;
        return;
    }

    myScansStatus.textContent = `${scans.length} report(s) found for your account.`;

    scans.forEach((scan) => {
        const confidence = Math.round((scan.confidence || 0) * 100);
        const createdAt = scan.created_at ? new Date(scan.created_at).toLocaleString() : "Unknown time";
        const predictionUrl = `${API_BASE_URL}${scan.prediction_url}`;
        const imageUrl = `${API_BASE_URL}${scan.image_url}`;

        const card = document.createElement("article");
        card.className = "scan-report-card";
        card.innerHTML = `
            <img src="${predictionUrl}" alt="${scan.damage_type} detection report">
            <h3>${scan.damage_type}</h3>
            <div class="scan-meta">
                <span><strong>Confidence:</strong> ${confidence}%</span>
                <span><strong>Location:</strong> ${scan.location || "Unknown location"}</span>
                <span><strong>Processing:</strong> ${scan.processing_time}s</span>
                <span><strong>Date:</strong> ${createdAt}</span>
            </div>
            <div class="scan-report-actions">
                <a href="${imageUrl}" target="_blank" rel="noreferrer">Original</a>
                <a href="${predictionUrl}" target="_blank" rel="noreferrer">Detection</a>
            </div>
        `;
        myScansGrid.appendChild(card);
    });
}

async function loadMyScans() {
    if (!authToken) {
        renderMyScans([]);
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/my-history`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        if (!response.ok) {
            throw new Error("My history failed");
        }

        const scans = await response.json();
        renderMyScans(scans);
    } catch (error) {
        myScansStatus.textContent = "Could not load personal scan reports.";
        renderMyScans([]);
    }
}

async function checkApiStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        modelStatus.textContent = data.model_loaded ? "YOLO Ready" : "Backend Online - Demo Mode";
        await loadHistory();
    } catch (error) {
        modelStatus.textContent = "Backend Offline";
    }
}

async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/history`);
        const scans = await response.json();
        renderHistory(scans);
    } catch (error) {
        renderHistory([]);
    }
}

function markerClass(marker) {
    const type = (marker.type || marker.damage_type || "").toLowerCase();

    if (type.includes("crack")) {
        return "crack";
    }

    if (type.includes("review")) {
        return "reviewed";
    }

    return "pothole";
}

function createDamageIcon(marker) {
    return L.divIcon({
        className: "",
        html: `<span class="damage-marker ${markerClass(marker)}"></span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -14]
    });
}

function showKadapaFallbackMap(message = "Kadapa offline map preview") {
    if (!roadMapElement) {
        return;
    }

    roadMapElement.innerHTML = `
        <div class="fallback-map">
            <div class="fallback-title">${message}</div>
            <span class="fallback-marker red" style="left: 48%; top: 58%" title="Pothole"></span>
            <span class="fallback-marker yellow" style="left: 62%; top: 38%" title="Crack"></span>
            <span class="fallback-marker blue" style="left: 36%; top: 72%" title="Reviewed"></span>
        </div>
    `;
}

function locateUser() {
    if (!navigator.geolocation) {
        showKadapaFallbackMap("Location is not supported in this browser");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                label: "Current location"
            };

            if (roadMap) {
                roadMap.setView([currentLocation.lat, currentLocation.lng], 15);

                if (userLocationMarker) {
                    userLocationMarker.setLatLng([currentLocation.lat, currentLocation.lng]);
                } else {
                    userLocationMarker = L.marker([currentLocation.lat, currentLocation.lng])
                        .addTo(roadMap)
                        .bindPopup("<strong>You are here</strong>");
                }
            } else {
                showKadapaFallbackMap("Location captured - map offline");
            }
        },
        () => {
            showKadapaFallbackMap("Location permission denied");
        },
        {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 60000
        }
    );
}

function loadExternalAsset(url, type) {
    return new Promise((resolve, reject) => {
        const element = type === "css" ? document.createElement("link") : document.createElement("script");
        const timeout = setTimeout(() => reject(new Error(`Timed out loading ${url}`)), 2500);

        element.onload = () => {
            clearTimeout(timeout);
            resolve();
        };
        element.onerror = () => {
            clearTimeout(timeout);
            reject(new Error(`Could not load ${url}`));
        };

        if (type === "css") {
            element.rel = "stylesheet";
            element.href = url;
        } else {
            element.src = url;
        }

        document.head.appendChild(element);
    });
}

async function loadLeaflet() {
    if (typeof L !== "undefined") {
        return true;
    }

    try {
        await loadExternalAsset("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "css");
        await loadExternalAsset("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "js");
        return typeof L !== "undefined";
    } catch (error) {
        return false;
    }
}

async function loadMapMarkers() {
    try {
        const response = await fetch(`${API_BASE_URL}/map-markers`);
        const markers = await response.json();
        return markers.length ? markers : sampleMapMarkers;
    } catch (error) {
        return sampleMapMarkers;
    }
}

function renderMapMarkers(markers) {
    if (!roadMap || typeof L === "undefined") {
        return;
    }

    if (damageMarkerLayer) {
        damageMarkerLayer.clearLayers();
    } else {
        damageMarkerLayer = L.layerGroup().addTo(roadMap);
    }

    markers.forEach((marker) => {
        const lat = marker.lat ?? marker.latitude;
        const lng = marker.lng ?? marker.longitude;

        if (lat === null || lng === null || lat === undefined || lng === undefined) {
            return;
        }

        const type = marker.type || marker.damage_type || "Road damage";
        const confidence = marker.confidence ? `${Math.round(marker.confidence * 100)}%` : "N/A";

        L.marker([lat, lng], { icon: createDamageIcon(marker) })
            .addTo(damageMarkerLayer)
            .bindPopup(`<strong>${type}</strong><br>Confidence: ${confidence}<br>${marker.location || "Kadapa sample"}`);
    });
}

async function refreshMapMarkers() {
    const markers = await loadMapMarkers();
    renderMapMarkers(markers);
}

async function initRoadMap() {
    if (!roadMapElement) {
        return;
    }

    showKadapaFallbackMap("Kadapa live location map loading");

    const leafletReady = await loadLeaflet();
    if (!leafletReady) {
        showKadapaFallbackMap("Kadapa offline map preview");
        return;
    }

    try {
        roadMapElement.innerHTML = "";
        roadMap = L.map("roadMap", {
            zoomControl: true,
            scrollWheelZoom: false
        }).setView(defaultMapCenter, 13);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(roadMap);

        await refreshMapMarkers();
        locateUser();
    } catch (error) {
        showKadapaFallbackMap("Kadapa map - offline fallback");
    }
}

chooseFile.addEventListener("click", () => fileInput.click());
cameraMode.addEventListener("click", () => runFallbackDetection("live camera frame"));

fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];

    if (file) {
        runBackendDetection(file);
    }
});

["dragenter", "dragover"].forEach((eventName) => {
    uploadZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        uploadZone.classList.add("dragging");
    });
});

["dragleave", "drop"].forEach((eventName) => {
    uploadZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        uploadZone.classList.remove("dragging");
    });
});

uploadZone.addEventListener("drop", (event) => {
    const file = event.dataTransfer.files[0];

    if (file) {
        runBackendDetection(file);
    }
});

compareSlider.addEventListener("input", (event) => {
    afterLayer.style.width = `${event.target.value}%`;
});

useLocationButton.addEventListener("click", locateUser);

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
        full_name: document.querySelector("#registerName").value.trim() || null,
        email: document.querySelector("#registerEmail").value.trim(),
        password: document.querySelector("#registerPassword").value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error("Register failed");
        }

        updateAuthStatus("Account created. Login now.");
        loginForm.querySelector("#loginEmail").value = payload.email;
    } catch (error) {
        updateAuthStatus("Registration failed. Try another email.");
    }
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
        email: document.querySelector("#loginEmail").value.trim(),
        password: document.querySelector("#loginPassword").value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error("Login failed");
        }

        const data = await response.json();
        authToken = data.access_token;
        localStorage.setItem("roadvision_token", authToken);
        await loadProfile();
    } catch (error) {
        updateAuthStatus("Login failed. Check email and password.");
    }
});

logoutButton.addEventListener("click", () => {
    localStorage.removeItem("roadvision_token");
    authToken = null;
    updateAuthStatus("Logged out");
    renderMyScans([]);
});

refreshMyScansButton.addEventListener("click", loadMyScans);

checkApiStatus();
loadProfile();
initRoadMap();
