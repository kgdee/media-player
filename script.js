const projectName = "media-player";

let player = null;
const audioPlayer = document.getElementById("audio-player");
const videoPlayer = document.getElementById("video-player");
const players = [audioPlayer, videoPlayer];

const coverEl = document.querySelector(".media-container .cover");
const appTitle = document.querySelector(".app .title p");
const controls = document.querySelector(".controls");
const progressBar = document.querySelector(".progress-bar .slider");
const pauseBtn = document.querySelector(".controls .pause");

const volumeDisplay = document.querySelector(".controls .volume .value");
const repeatBtn = document.querySelector(".controls .repeat");
const rateBtn = document.querySelector(".controls .rate");

let currentVolume = parseInt(localStorage.getItem(`${projectName}_currentVolume`)) || 50;
let playbackRate = 1;

let muted = JSON.parse(localStorage.getItem(`${projectName}_muted`)) || false;
let repeatEnabled = false;
let currentCover = localStorage.getItem(`${projectName}_currentCover`) || null;

let currentFiles = [];
let shuffledIndexes = [];
let currentIndex = -1;

let animationInterval = null;
let repeatTimeout = null;

function openFile(file) {
  if (!file) return;
  if (!isAudio(file) && !isVideo(file)) return;

  const dataUrl = URL.createObjectURL(file);

  if (player) player.pause();

  if (isAudio(file)) {
    player = audioPlayer;
    videoPlayer.classList.add("hidden");
  } else if (isVideo(file)) {
    player = videoPlayer;
    audioPlayer.classList.add("hidden");
  }

  const decodedFileName = decodeURIComponent(file.name).split("/").pop();
  appTitle.textContent = decodedFileName;
  player.classList.remove("hidden");
  player.src = dataUrl;
  player.play();

  coverEl.classList.toggle("hidden", isVideo(file))
  document.title = decodedFileName + " - Media Player";
  toggleHeaderMenu(false);
}

function openFiles(files) {
  if (!files) return;
  if (files.length <= 0) return;

  currentFiles = files;

  shuffledIndexes = shuffle([...Array(currentFiles.length).keys()]);

  openNext();
}

function openNext() {
  if (currentIndex < shuffledIndexes.length - 1) {
    currentIndex++;
    openFile(currentFiles[shuffledIndexes[currentIndex]]);
  }
}

function openPrev() {
  if (currentIndex > 0) {
    currentIndex--;
    openFile(currentFiles[shuffledIndexes[currentIndex]]);
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function isAudio(file) {
  const audioTypes = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3", "audio/webm"];

  return audioTypes.includes(file.type);
}

function isVideo(file) {
  const videoTypes = ["video/mp4", "video/webm", "video/ogg", "video/avi", "video/mov"];

  return videoTypes.includes(file.type);
}

function pause() {
  if (!player) return;

  const ended = player.currentTime >= player.duration - 0.1;

  if (!ended) player.paused ? player.play() : player.pause();
  else {
    replay();
    return;
  }
}

function replay() {
  if (!player) return;

  player.currentTime = 0;
  player.play();
}

function updatePauseBtn() {
  if (!player) return;

  const ended = player.currentTime >= player.duration - 0.1;
  if (!ended) {
    pauseBtn.innerHTML = player.paused
      ? `
      <i class="bi bi-play-fill"></i>
      <div class="tooltip-text">Play (k)</div>
    `
      : `
      <i class="bi bi-pause-fill"></i>
      <div class="tooltip-text">Pause (k)</div>
    `;
  } else {
    pauseBtn.innerHTML = `
      <i class="bi bi-arrow-counterclockwise"></i>
      <div class="tooltip-text">Replay (k)</div>
    `;
  }
}

function changeVolume(isIncrease) {
  let amount = isIncrease ? 5 : -5;

  if (currentVolume <= 5 && amount < 0) amount = -1;
  if (currentVolume < 5 && amount > 0) amount = 1;

  currentVolume = Math.min(Math.max(currentVolume + amount, 0), 100);

  if (player) player.volume = currentVolume / 100;
  localStorage.setItem(`${projectName}_currentVolume`, currentVolume.toString());
  updateVolumeDisplay();
}

function updateVolumeDisplay() {
  volumeDisplay.textContent = currentVolume;

  let icon = muted ? `<i class="bi bi-volume-mute-fill"></i>` : `<i class="bi bi-volume-down-fill"></i>`;
  document.querySelector(".controls .volume .icon-container").innerHTML = icon;
}

function mute() {
  muted = !muted;
  if (player) player.muted = muted;

  localStorage.setItem(`${projectName}_muted`, muted.toString());

  updateVolumeDisplay();
}

function toggleRepeat() {
  repeatEnabled = !repeatEnabled;

  repeatBtn.innerHTML = `
    <i class="bi bi-repeat${repeatEnabled ? "-1" : ""}"></i>
    <div class="tooltip-text">Repeat ${repeatEnabled ? "on" : "off"}</div>
  `;
}

function stop() {
  if (!player) return;

  player.pause();
  player.currentTime = 0;
}

function updateProgressBar() {
  progressBar.min = 0;
  progressBar.max = player.duration;
  progressBar.value = player.currentTime;
}

function seekTo(time) {
  if (!player) return;

  player.currentTime = time;

  if (player.paused) player.play();
}

function changePlaybackRate() {
  playbackRate = playbackRate === 1 ? 0.75 : 1;

  if (player) player.playbackRate = playbackRate;

  rateBtn.innerHTML = `
  ${playbackRate}x
  <div class="tooltip-text">Playback speed ${playbackRate}x</div>
  `;
}

function getFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

async function changeCover(file) {
  const dataUrl = file ? await getFileDataUrl(file) : currentCover;

  if (!dataUrl) return;
  if (dataUrl === currentCover) return;

  currentCover = dataUrl;
  localStorage.setItem(`${projectName}_currentCover`, dataUrl);
  displayCover();
}

function displayCover() {
  coverEl.src = currentCover || "";
  coverEl.classList.toggle("hidden", !currentCover);
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.querySelector(".media-container").requestFullscreen();
  }
}

function repeat() {
  if (repeatTimeout) cancelRepeat();

  repeatTimeout = setTimeout(replay, 2000);
}

function cancelRepeat() {
  clearTimeout(repeatTimeout);
}

function startAnimation() {
  clearInterval(animationInterval);
  animationInterval = setInterval(animation, 500);
}

function stopAnimation() {
  clearInterval(animationInterval);
}

function animation() {
  const x = Math.random() * 0.8 - 0.4;
  const y = Math.random() * 0.8 - 0.4;
  const scale = 1.01 + Math.random() * 0.01;

  coverEl.style.transform = `translate(${x}%, ${y}%) scale(${scale})`;
}

function switchControlMenu() {
  const buttonsEl = document.querySelectorAll(".controls .buttons");

  buttonsEl.forEach((el) => {
    el.classList.toggle("active");
  });
}

function toggleHeaderMenu(force) {
  document.querySelector(".header .menu").classList.toggle("expanded", force);
}

document.addEventListener("keydown", function (event) {
  if (player) {
    if (event.key === " " || event.code === "KeyK") pause();
    if (event.code === "KeyR") replay();

    if (event.code === "KeyA" || event.key === "ArrowLeft") player.currentTime -= 5;
    if (event.code === "KeyD" || event.key === "ArrowRight") player.currentTime += 5;
  }

  if (event.code === "KeyM") mute();
  if (event.code === "KeyW" || event.key === "ArrowUp") changeVolume(true);
  if (event.code === "KeyS" || event.key === "ArrowDown") changeVolume(false);

  if (event.code === "KeyF") toggleFullscreen();
});

players.forEach((player) => {
  player.addEventListener("loadedmetadata", function () {
    player.volume = currentVolume / 100;
    player.muted = muted;
    player.playbackRate = playbackRate;
    updateVolumeDisplay();
    updatePauseBtn();
  });
  player.addEventListener("timeupdate", updateProgressBar);

  player.addEventListener("play", function () {
    if (repeatTimeout) cancelRepeat();
    startAnimation();
    updatePauseBtn();
  });

  player.addEventListener("pause", function () {
    stopAnimation();
    updatePauseBtn();
  });

  player.addEventListener("ended", () => {
    if (!repeatEnabled) {
      currentIndex < shuffledIndexes.length - 1 ? openNext() : updatePauseBtn();
    } else {
      repeat();
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  updateVolumeDisplay();
  displayCover();
});

window.addEventListener("error", (event) => {
  const error = `${event.type}: ${event.message}`;
  console.error(error);
  alert(error);
});
