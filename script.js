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

let currentVolume = parseInt(localStorage.getItem(`${projectName}_currentVolume`));
let playbackRate = 1;
if (isNaN(currentVolume)) currentVolume = 50;

let muted = JSON.parse(localStorage.getItem(`${projectName}_muted`)) || false;
let repeatEnabled = false;
let currentCover = localStorage.getItem(`${projectName}_currentCover`) || null;

let fileType = null;

let currentFiles = [];
let currentFile = null;
let availableFiles = [];
let historyFiles = [];
let backwardCount = 0;

let animationInterval = null;
let animated = false;

let repeatTimeout = null;

function openFile(file, options = { useHistory: true }) {
  if (!file) return;

  const fileMatch = currentFiles.some((item) => item.name === file.name);
  if (fileMatch) file = currentFiles[currentFiles.findIndex((item) => item.name === file.name)];

  fileType = file.type.split("/")[0];

  if (fileType != "audio" && fileType != "video") return;

  const url = URL.createObjectURL(file);

  if (player) player.pause();

  switch (fileType) {
    case "audio":
      player = audioPlayer;
      videoPlayer.classList.add("hidden");
      break;
    case "video":
      player = videoPlayer;
      audioPlayer.classList.add("hidden");
      break;
    default:
      break;
  }

  const decodedFileName = decodeURIComponent(file.name).split("/").pop();
  appTitle.textContent = decodedFileName;
  player.classList.remove("hidden");
  player.src = url;
  player.play();

  const fileIndex = currentFiles.indexOf(file);
  currentFile = fileIndex;

  if (options.useHistory) {
    if (historyFiles.length > 0 && backwardCount > 0) historyFiles.splice(historyFiles.length - backwardCount, 0, fileIndex);
    else historyFiles.push(fileIndex);
  }

  if (fileMatch) {
    if (availableFiles.includes(fileIndex)) availableFiles.splice(availableFiles.indexOf(fileIndex), 1);
  }

  controls.classList.remove("hidden");
  document.title = decodedFileName + " - Media Player";
  toggleHeaderMenu(false);
}

function openFiles(files) {
  if (!files) return;
  if (files.length <= 0) return;

  if (files.length <= 1) {
    openFile(files[0]);
    return;
  }

  currentFiles = [...files];

  openRandomFile();
}

function openRandomFile() {
  if (!currentFiles) return;

  backwardCount = 0;

  if (availableFiles.length <= 0) availableFiles = Array.from({ length: currentFiles.length }, (_, index) => index);

  const fileIndex = availableFiles[Math.floor(Math.random() * availableFiles.length)];
  const file = currentFiles[fileIndex];

  openFile(file);
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

function skip(forward = true) {
  let file = null;
  if (forward) {
    if (backwardCount > 0) {
      backwardCount--;
      file = currentFiles[historyFiles[historyFiles.length - backwardCount - 1]];
    } else {
      backwardCount = 0;
      openRandomFile();
      return;
    }
  } else if (historyFiles.length > backwardCount + 1) {
    backwardCount++;
    file = currentFiles[historyFiles[historyFiles.length - backwardCount - 1]];
  } else {
    // console.log("minimum limit!")
  }

  // console.log(backwardCount)

  const useHistory = backwardCount <= 0 && historyFiles[historyFiles.length - 1] !== currentFiles.indexOf(file);

  openFile(file, { useHistory: useHistory });
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
  animated = true;
  clearInterval(animationInterval);
  animationInterval = setInterval(animation, 500);
}

function stopAnimation() {
  animated = false;
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
      currentFiles.length > 1 ? openRandomFile() : updatePauseBtn();
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
