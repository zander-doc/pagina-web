const video = document.getElementById("video");
const playBtn = document.getElementById("playBtn");
const muteBtn = document.getElementById("muteBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const controls = document.getElementById("controls");
const container = document.getElementById("videoContainer");
const volumeSlider = document.getElementById("volumeSlider");
const volumeControl = document.getElementById("volumeControl");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");

/* AUTOPLAY SEGURO */
if (video) {
  video.muted = true;
  video.play().catch(()=>{});
}

/* PLAY / PAUSA */
if (playBtn && video) {
  playBtn.addEventListener("click", () => {
    if (video.paused) {
      video.play();
      playBtn.textContent = "⏸";
    } else {
      video.pause();
      playBtn.textContent = "▶";
    }
  });
}

/* MUTE / UNMUTE */
if (muteBtn && video) {
  muteBtn.addEventListener("click", () => {
    video.muted = !video.muted;
    muteBtn.textContent = video.muted ? "🔇" : "🔊";
    volumeSlider.style.display = video.muted ? "none" : "block";
  });
}

/* SLIDER DE VOLUMEN */
if (volumeControl && video) {
  volumeControl.addEventListener("input", () => {
    video.volume = volumeControl.value;
  });
}

/* PANTALLA COMPLETA */
if (fullscreenBtn && container) {
  fullscreenBtn.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  });
}

/* PROGRESO */
if (video && progressBar) {
  video.addEventListener("timeupdate", () => {
    if (!video.duration) return;
    const percent = (video.currentTime / video.duration) * 100;
    progressBar.style.width = percent + "%";
  });
}

/* SEEK */
if (progressContainer && video) {
  progressContainer.addEventListener("click", (e) => {
    const width = progressContainer.clientWidth;
    const clickX = e.offsetX;
    if (!video.duration) return;
    video.currentTime = (clickX / width) * video.duration;
  });
}

/* AUTO-OCULTAR CONTROLES */
let hideTimeout;

function showControls() {
  if (!controls || !progressContainer) return;
  controls.style.opacity = "1";
  progressContainer.style.opacity = "1";
  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    controls.style.opacity = "0";
    progressContainer.style.opacity = "0";
    if (volumeSlider) volumeSlider.style.display = "none";
  }, 2500);
}

if (container) {
  container.addEventListener("mousemove", showControls);
  container.addEventListener("touchstart", showControls);
  showControls();
}
