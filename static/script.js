// Get DOM elements
const video = document.getElementById('video');
const detectBtn = document.getElementById('detectBtn');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn'); // New: Get the pause button
const emotionLabel = document.getElementById('emotion');
const resultContainer = document.getElementById('result-container');
const statusMsg = document.getElementById('statusMsg');
const audioPlayer = document.getElementById('audioPlayer');

// --- BOLLYWOOD SONG DATABASE (Search Queries) ---
const EMOTION_MAP = {
    'happy': [
        { name: "Ghungroo", query: "Ghungroo song lyrical" },
        { name: "Badtameez Dil", query: "Badtameez Dil Full Song HD" },
        { name: "Kar Gayi Chull", query: "Kar Gayi Chull Kapoor & Sons" }
    ],
    'sad': [
        { name: "Agar Tum Saath Ho", query: "Agar Tum Saath Ho lyrical" },
        { name: "Ve Maahi", query: "Ve Maahi Kesari Full Song" },
        { name: "Tujhe Kitna Chahne Lage", query: "Tujhe Kitna Chahne Lage Kabir Singh" }
    ],
    'angry': [
        { name: "Sultan Title Track", query: "Sultan Title Track Full Song" },
        { name: "Zinda", query: "Zinda Bhaag Milkha Bhaag full song" },
        { name: "Malhari", query: "Malhari Bajirao Mastani full song" }
    ],
    'neutral': [
        { name: "Iktara", query: "Iktara lyrical Wake Up Sid" },
        { name: "Kun Faya Kun", query: "Kun Faya Kun Rockstar full song" },
        { name: "Shaam", query: "Shaam Aisha song" }
    ],
    'surprise': [
        { name: "Dil Dhadakne Do", query: "Dil Dhadakne Do Title Track" },
        { name: "Sooraj Ki Baahon Mein", query: "Sooraj Ki Baahon Mein Zindagi Na Milegi Dobara" }
    ]
};
EMOTION_MAP.fear = EMOTION_MAP.neutral;
EMOTION_MAP.disgust = EMOTION_MAP.angry;


// --- FACE DETECTION SETUP ---
async function loadModels() {
    statusMsg.innerText = "Loading AI models...";
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/static/models');
        await faceapi.nets.faceExpressionNet.loadFromUri('/static/models');
        statusMsg.innerText = "";
        detectBtn.disabled = false;
    } catch (err) {
        console.error("Error loading models:", err);
        statusMsg.innerText = "Error loading models.";
    }
}

async function startVideo() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (err) {
        console.error("Webcam Error:", err);
        alert("Please allow camera access.");
    }
}

function getTopExpression(expressions) {
    return Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);
}


// --- MAIN LOGIC ---
(async () => {
    detectBtn.disabled = true;
    await startVideo();
    await loadModels();

    let currentEmotion = 'neutral';

    detectBtn.addEventListener('click', async () => {
        detectBtn.disabled = true;
        detectBtn.innerText = "Scanning...";
        statusMsg.innerText = "";
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
        
        if (detection && detection.expressions) {
            currentEmotion = getTopExpression(detection.expressions);
            emotionLabel.innerText = currentEmotion;
            resultContainer.style.display = 'block';
            audioPlayer.pause();
            pauseBtn.style.display = 'none'; // New: Hide pause button on new detection
            playBtn.innerText = "Play Music"; // New: Reset play button text
        } else {
            emotionLabel.innerText = 'No face found. Try again.';
            resultContainer.style.display = 'block';
        }
        detectBtn.disabled = false;
        detectBtn.innerText = "Detect Mood Again";
    });

    playBtn.addEventListener('click', async () => {
        // New: Check if the audio is paused and just needs to be resumed
        if (!audioPlayer.paused) {
            // If it's already playing, this button acts as a "Play Another Song" button
            // The logic below will handle fetching a new song
        } else if (audioPlayer.src && audioPlayer.paused) {
            audioPlayer.play();
            statusMsg.innerText = `Now Playing: ${statusMsg.innerText.split(': ')[1]}`;
            pauseBtn.innerText = "Pause";
            playBtn.style.display = 'none'; // Hide the "Play" button while playing
            pauseBtn.style.display = 'inline-block'; // Show the "Pause" button
            return; // Exit the function to avoid fetching a new song
        }
    
        const songList = EMOTION_MAP[currentEmotion] || EMOTION_MAP['neutral'];
        const song = songList[Math.floor(Math.random() * songList.length)];

        playBtn.disabled = true;
        playBtn.innerText = "Searching...";
        statusMsg.innerText = `Searching for: ${song.name}`;
        audioPlayer.pause();

        try {
            const response = await fetch('/get_audio_url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: song.query })
            });
            
            const data = await response.json();

            if (data.status === 'success' && data.audio_url) {
                audioPlayer.src = data.audio_url;
                statusMsg.innerText = `Now Playing: ${data.title}`;
                audioPlayer.play().catch(e => {
                    statusMsg.innerText = "Playback error. Click play again.";
                    console.error("Play error:", e);
                });
                
                // New: Show Pause button and hide Play button when playback starts
                pauseBtn.innerText = "Pause";
                pauseBtn.style.display = 'inline-block';
                playBtn.style.display = 'none'; // Hide play/resume button

            } else {
                statusMsg.innerText = `Could not find a playable source. Try another song.`;
                console.error("Server error:", data.message);
            }
        } catch (err) {
            statusMsg.innerText = "Network error. Could not contact server.";
            console.error("Fetch error:", err);
        }

        playBtn.disabled = false;
        playBtn.innerText = "Play Another Song"; // Set text for the next action
    });

    // New: Add click listener for the PAUSE button
    pauseBtn.addEventListener('click', () => {
        if (audioPlayer.paused) {
            audioPlayer.play();
            pauseBtn.innerText = "Pause";
            playBtn.style.display = 'none'; // Hide the resume button
        } else {
            audioPlayer.pause();
            pauseBtn.innerText = "Resume";
            playBtn.innerText = "Play Another Song"; // Show the "other song" button
            playBtn.style.display = 'inline-block';
        }
    });

})();