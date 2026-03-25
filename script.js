const video = document.getElementById("camera");
const canvas = document.getElementById("snapshot");

/* ---------------- START CAMERA ---------------- */

async function startCamera() {

    try {

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 1280,
                height: 720,
                facingMode: "environment"
            },
            audio: false
        });

        video.srcObject = stream;

        console.log("Camera started");

    } catch (error) {

        console.error("Camera error:", error);
        alert("Camera access denied or not available");

    }

}

window.addEventListener("load", startCamera);


/* ---------------- GENERATE LOT ID ---------------- */

function generateLotId(){

    const date = new Date();

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth()+1).padStart(2,"0");
    const dd = String(date.getDate()).padStart(2,"0");

    const random = Math.floor(100 + Math.random()*900);

    return `DTI-${yyyy}${mm}${dd}-${random}`;
}


/* ---------------- SCAN & SAVE IMAGE ---------------- */

async function scanImage() {

    if (!video.srcObject) {
        alert("Camera not started");
        return;
    }

    const context = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0);

    // Convert image to base64
    const imageData = canvas.toDataURL("image/png");

    /* -------- GENERATE LOT ID -------- */

    const lotId = generateLotId();

    /* -------- TIMESTAMP -------- */

    const timestamp = new Date().toISOString();

    try {

        const response = await fetch("http://localhost:3000/upload", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                image: imageData,
                lotId: lotId,
                timestamp: timestamp
            })

        });

        if(!response.ok){
            throw new Error("Server error");
        }

        const result = await response.json();

        alert(result.message);


        /* -------- STOP CAMERA AFTER SCAN -------- */

        const stream = video.srcObject;

        if(stream){
            stream.getTracks().forEach(track => track.stop());
        }


        /* -------- REDIRECT TO HISTORY -------- */

        window.location.href = "history.html";


    } catch (error) {

        console.error(error);
        alert("Upload failed. Is backend running?");

    }

}