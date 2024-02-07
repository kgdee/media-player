const storagePrefix = "media-player_"

let player = null
const audioPlayer = document.getElementById("audio-player")
const videoPlayer = document.getElementById("video-player")
const players = [audioPlayer, videoPlayer]

const backgroundEl = document.querySelector(".media-container .background")
const appTitle = document.querySelector(".app .title p")
const controls = document.querySelector(".controls")
const progressBar = document.querySelector(".progress-bar .slider")
const pauseBtn = document.querySelector(".controls .pause")

const volumeDisplay = document.querySelector(".controls .volume .value")

let volume = parseFloat(localStorage.getItem(storagePrefix + "volume")) || 0.5
let muted = JSON.parse(localStorage.getItem(storagePrefix + "muted")) || false
let background = localStorage.getItem(storagePrefix + "background") || null

let fileType = null

let currentFiles = []
let availableFiles = []

let animationInterval = null
let animated = false

function openFile(file) {
  fileType = file.type.split("/")[0]

  if (fileType != "audio" && fileType != "video") return

  const url = URL.createObjectURL(file)

  
  if (player) player.pause()

  switch (fileType) {
    case "audio":
      player = audioPlayer
      videoPlayer.classList.add("hidden")
      break
    case "video":
      player = videoPlayer
      audioPlayer.classList.add("hidden")
      break
    default:
      break
  }

  appTitle.textContent = file.name
  player.classList.remove("hidden")
  player.src = url
  player.play()

  controls.classList.remove("hidden")
  document.title = file.name + " - Media Player"
}

function openFiles(files) {
  if (files) currentFiles = [...files]
  if (!currentFiles) return

  if (availableFiles.length <= 0) availableFiles = [...currentFiles]

  const fileIndex = Math.floor(Math.random() * availableFiles.length)
  const file = availableFiles[fileIndex]
  availableFiles.splice(fileIndex, 1)

  openFile(file)
}


function pause() {
  if (!player) return

  const ended = player.currentTime >= player.duration - 0.1

  if (!ended) player.paused ? player.play() : player.pause() 
  else {
    replay()
    return
  }

  updatePauseBtn()
}

function replay() {
  if (!player) return

  player.currentTime = 0
  player.play()

  updatePauseBtn()
}

function updatePauseBtn() {
  const ended = player.currentTime >= player.duration - 0.1
  if (!ended) {
    pauseBtn.innerHTML = player.paused ? `
      <i class="bi bi-play-fill"></i>
      <div class="tooltip-text">Play (k)</div>
    ` : `
      <i class="bi bi-pause-fill"></i>
      <div class="tooltip-text">Pause (k)</div>
    `
  } else {
    pauseBtn.innerHTML = `
      <i class="bi bi-arrow-counterclockwise"></i>
      <div class="tooltip-text">Replay (k)</div>
    `
  }
}

function increaseVolume(amount) {
  if ((amount > 0 && volume + amount > 1) || (amount < 0 && volume + amount < 0)) return

  volume += amount
  if (player) player.volume = volume
  localStorage.setItem(storagePrefix + "volume", volume.toString())
  updateVolumeDisplay()
}

function updateVolumeDisplay() {
  volumeDisplay.textContent = Math.round(volume * 100)

  let icon = muted ? `<i class="bi bi-volume-mute-fill"></i>` : `<i class="bi bi-volume-down-fill"></i>`
  document.querySelector(".controls .volume .icon-container").innerHTML = icon
}

function mute() {
  muted = !muted
  if (player) player.muted = muted
  
  localStorage.setItem(storagePrefix + "muted", muted.toString())

  updateVolumeDisplay()
}

function updateProgressBar() {
  progressBar.min = 0
  progressBar.max = player.duration
  progressBar.value = player.currentTime
}

function seekTo(time) {
  player.currentTime = time
}


function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      resolve(e.target.result);
    };

    reader.onerror = function (error) {
      reject(error);
    };

    reader.readAsDataURL(file);
  });
}

async function updateBackground(file) {
  const url = file ? await readFile(file) : background

  if (url) {
    backgroundEl.classList.remove("hidden")
    backgroundEl.src = url
  } else {
    backgroundEl.src = null
    backgroundEl.classList.add("hidden")
  }

  if (url && (url !== background)) localStorage.setItem(storagePrefix + "background", url)
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.querySelector(".media-container").requestFullscreen();
  }
}


function startAnimation() {
  animated = true
  clearInterval(animationInterval)
  animationInterval = setInterval(animation, 500)
}

function stopAnimation() {
  animated = false
  clearInterval(animationInterval)
}

function animation() {
  const x = (Math.random() * 0.8) - 0.4
  const y = (Math.random() * 0.8) - 0.4
  const scale = 1.01 + (Math.random() * 0.01)

  backgroundEl.style.transform = `translate(${x}%, ${y}%) scale(${scale})`
}



document.addEventListener("keydown", function(event) {
  if (player) {
    if (event.code === 'KeyK') pause()
    if (event.code === 'KeyR') replay()

    if (event.code === 'KeyJ' || event.key === 'ArrowLeft') player.currentTime -= 5
    if (event.code === 'KeyL' || event.key === 'ArrowRight') player.currentTime += 5
  }

  if (event.code === 'KeyM') mute()
  if (event.key === 'ArrowDown') increaseVolume(-0.05)
  if (event.key === 'ArrowUp') increaseVolume(0.05)

  if (event.code === 'KeyF') toggleFullscreen()
})



players.forEach(player => {
  player.addEventListener('loadedmetadata', function() {
    player.volume = volume
    player.muted = muted
    updateVolumeDisplay()
  });
  player.addEventListener("timeupdate", updateProgressBar)
  
  player.addEventListener("play", function() {
    startAnimation()
  })
  
  player.addEventListener("pause", function() {
    stopAnimation()
  })

  player.addEventListener('ended', () => {
    if (currentFiles.length > 1) {
      openFiles()
    } else
      updatePauseBtn()
  });

})

document.addEventListener("DOMContentLoaded", function() {
  updateVolumeDisplay()
  updateBackground()
})