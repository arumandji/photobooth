const video = document.getElementById("video");
const placeholder = document.getElementById("placeholder");
const startButton = document.getElementById("start");
const shootButton = document.getElementById("shoot");
const resetButton = document.getElementById("retake");
const countdown = document.getElementById("countdown");
const results = document.getElementById("results");
const layoutSelect = document.getElementById("layout");
const captionInput = document.getElementById("caption");

let cameraStream = null;
let selectedFilter = "none";
let photos = [];

const filters = {
  none: "none",
  soft: "brightness(1.12) contrast(0.92) saturate(0.85)",
  warm: "sepia(0.28) saturate(1.15) brightness(1.04)",
  mono: "grayscale(1)",
  pink: "hue-rotate(330deg) saturate(0.82) brightness(1.06)",
  vintage: "sepia(0.42) contrast(0.88) saturate(0.8)"
};

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function setActiveFilter(button) {
  document.querySelector(".filter.active")?.classList.remove("active");
  button.classList.add("active");

  selectedFilter = button.dataset.filter;
  video.style.filter = filters[selectedFilter];
}

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => setActiveFilter(button));
});

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    alert("Browser tidak mendukung akses kamera. Gunakan localhost atau HTTPS.");
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    video.srcObject = cameraStream;
    video.hidden = false;
    placeholder.hidden = true;
    video.style.filter = filters[selectedFilter];

    shootButton.disabled = false;
    startButton.textContent = "Camera ready";
  } catch (error) {
    console.error("Camera error:", error);
    alert(
      "Tidak bisa membuka kamera. Pastikan izin kamera diberikan dan halaman dibuka melalui localhost atau HTTPS."
    );
  }
}

async function capturePhoto() {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  const context = canvas.getContext("2d");

  // Membalik foto secara horizontal agar hasil sesuai tampilan preview.
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.filter = filters[selectedFilter];
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.92);
}

async function runCountdown() {
  countdown.style.display = "grid";

  for (let number = 3; number > 0; number -= 1) {
    countdown.textContent = number;
    await wait(700);
  }

  countdown.textContent = "✿";
  await wait(250);

  return capturePhoto();
}

async function takePhotoStrip() {
  if (!cameraStream) return;

  shootButton.disabled = true;
  resetButton.disabled = true;
  photos = [];

  const photoCount = Number(layoutSelect.value);

  try {
    for (let index = 0; index < photoCount; index += 1) {
      photos.push(await runCountdown());
    }

    renderPhotoStrip();
    resetButton.disabled = false;
  } catch (error) {
    console.error("Photo capture error:", error);
    alert("Terjadi kendala saat mengambil foto. Silakan coba lagi.");
  } finally {
    countdown.style.display = "none";
    shootButton.disabled = false;
  }
}

function renderPhotoStrip() {
  results.innerHTML = "";

  const strip = document.createElement("div");
  strip.className = "strip";

  photos.forEach((photoSource) => {
    const image = document.createElement("img");
    image.src = photoSource;
    image.alt = "Hasil foto photobooth";
    strip.appendChild(image);
  });

  const caption = document.createElement("div");
  caption.className = "strip-caption";
  caption.textContent = captionInput.value.trim() || "bloom booth ✿";
  strip.appendChild(caption);

  const downloadButton = document.createElement("button");
  downloadButton.className = "btn btn-primary";
  downloadButton.style.marginTop = "12px";
  downloadButton.textContent = "Download strip";
  downloadButton.type = "button";
  downloadButton.addEventListener("click", downloadPhotoStrip);

  results.append(strip, downloadButton);
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function downloadPhotoStrip() {
  if (photos.length === 0) return;

  try {
    const images = await Promise.all(photos.map(loadImage));
    const originalWidth = images[0].naturalWidth;
    const originalHeight = images[0].naturalHeight;
    const imageWidth = originalWidth / 2;
    const imageHeight = originalHeight / 2;
    const gap = 12;
    const sidePadding = 25;

    const canvas = document.createElement("canvas");
    canvas.width = imageWidth + sidePadding * 2;
    canvas.height =
      images.length * imageHeight +
      (images.length - 1) * gap +
      110;

    const context = canvas.getContext("2d");

    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    let positionY = 22;

    images.forEach((image) => {
      context.drawImage(
        image,
        sidePadding,
        positionY,
        imageWidth,
        imageHeight
      );
      positionY += imageHeight + gap;
    });

    context.fillStyle = "#51434c";
    context.textAlign = "center";
    context.font = "28px Georgia";
    context.fillText(
      captionInput.value.trim() || "bloom booth ✿",
      canvas.width / 2,
      canvas.height - 28
    );

    const downloadLink = document.createElement("a");
    downloadLink.download = "bloom-booth-strip.jpg";
    downloadLink.href = canvas.toDataURL("image/jpeg", 0.95);
    downloadLink.click();
  } catch (error) {
    console.error("Download error:", error);
    alert("Gagal membuat file foto. Silakan coba lagi.");
  }
}

function resetPhotoStrip() {
  photos = [];
  results.innerHTML =
    '<p class="empty-state">Your finished photo strip will show up here ✿</p>';
  resetButton.disabled = true;
}

startButton.addEventListener("click", startCamera);
shootButton.addEventListener("click", takePhotoStrip);
resetButton.addEventListener("click", resetPhotoStrip);

// Matikan kamera ketika halaman ditinggalkan.
window.addEventListener("pagehide", () => {
  cameraStream?.getTracks().forEach((track) => track.stop());
});
