const dom = {
  imageInput: document.getElementById("imageInput"),
  minutesInput: document.getElementById("minutesInput"),
  secondsInput: document.getElementById("secondsInput"),
  startButton: document.getElementById("startButton"),
  pauseButton: document.getElementById("pauseButton"),
  restartButton: document.getElementById("restartButton"),
  resetButton: document.getElementById("resetButton"),
  runAgainButton: document.getElementById("runAgainButton"),
  statusLabel: document.getElementById("statusLabel"),
  imageCounter: document.getElementById("imageCounter"),
  countdown: document.getElementById("countdown"),
  currentImageName: document.getElementById("currentImageName"),
  queueCount: document.getElementById("queueCount"),
  previewGrid: document.getElementById("previewGrid"),
  referenceImage: document.getElementById("referenceImage"),
  viewerState: document.getElementById("viewerState"),
  doneOverlay: document.getElementById("doneOverlay")
};

const state = {
  images: [],
  currentIndex: 0,
  secondsPerImage: 600,
  timeLeft: 0,
  timerId: null,
  isRunning: false,
  isPaused: false,
  finished: false
};

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getDurationInSeconds() {
  const minutes = Number.parseInt(dom.minutesInput.value, 10) || 0;
  const seconds = Number.parseInt(dom.secondsInput.value, 10) || 0;
  return (minutes * 60) + seconds;
}

function revokeImageUrls() {
  state.images.forEach((image) => URL.revokeObjectURL(image.url));
}

function setViewerMessage(message) {
  dom.viewerState.querySelector("p").textContent = message;
}

function updateButtons() {
  const hasImages = state.images.length > 0;
  dom.startButton.disabled = !hasImages || state.isRunning;
  dom.pauseButton.disabled = !state.isRunning && !state.isPaused;
  dom.pauseButton.textContent = state.isPaused ? "Resume" : "Pause";
  dom.restartButton.disabled = !hasImages;
}

function renderPreviews() {
  dom.previewGrid.innerHTML = "";

  state.images.forEach((image, index) => {
    const card = document.createElement("figure");
    card.className = "preview-card";

    if (!state.finished && (state.isRunning || state.isPaused) && index === state.currentIndex) {
      card.classList.add("active");
    }

    if (index < state.currentIndex || (state.finished && state.images.length > 0)) {
      card.classList.add("completed");
    }

    const preview = document.createElement("img");
    preview.src = image.url;
    preview.alt = image.name;

    const caption = document.createElement("figcaption");
    caption.textContent = image.name;

    card.append(preview, caption);
    dom.previewGrid.appendChild(card);
  });

  dom.queueCount.textContent = `${state.images.length} image${state.images.length === 1 ? "" : "s"}`;
}

function showCurrentImage() {
  const current = state.images[state.currentIndex];

  if (!current) {
    dom.referenceImage.classList.add("hidden");
    dom.viewerState.classList.remove("hidden");
    dom.currentImageName.textContent = "No image selected";
    return;
  }

  dom.referenceImage.src = current.url;
  dom.referenceImage.alt = current.name;
  dom.referenceImage.classList.remove("hidden");
  dom.viewerState.classList.add("hidden");
  dom.currentImageName.textContent = current.name;
  dom.imageCounter.textContent = `${state.currentIndex + 1} / ${state.images.length}`;
  renderPreviews();
}

function syncStatus() {
  if (!state.images.length) {
    dom.statusLabel.textContent = "Waiting for images";
    dom.imageCounter.textContent = "0 / 0";
    dom.countdown.textContent = "00:00";
    dom.currentImageName.textContent = "No image selected";
    setViewerMessage("Upload images to begin.");
    return;
  }

  if (state.finished) {
    dom.statusLabel.textContent = "Done";
    dom.countdown.textContent = "00:00";
    dom.imageCounter.textContent = `${state.images.length} / ${state.images.length}`;
    dom.currentImageName.textContent = "All images completed";
    return;
  }

  if (state.isPaused) {
    dom.statusLabel.textContent = "Paused";
  } else if (state.isRunning) {
    dom.statusLabel.textContent = "Running";
  } else {
    dom.statusLabel.textContent = "Ready";
  }

  dom.countdown.textContent = formatTime(state.timeLeft);
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function finishRun() {
  stopTimer();
  state.isRunning = false;
  state.isPaused = false;
  state.finished = true;
  dom.doneOverlay.classList.remove("hidden");
  renderPreviews();
  syncStatus();
  updateButtons();
}

function advanceImage() {
  if (state.currentIndex >= state.images.length - 1) {
    finishRun();
    return;
  }

  state.currentIndex += 1;
  state.timeLeft = state.secondsPerImage;
  showCurrentImage();
  syncStatus();
}

function tick() {
  if (!state.isRunning) {
    return;
  }

  state.timeLeft -= 1;

  if (state.timeLeft <= 0) {
    advanceImage();
  }

  syncStatus();
}

function startTimer() {
  const duration = getDurationInSeconds();

  if (!state.images.length) {
    window.alert("Please upload at least one image.");
    return;
  }

  if (duration <= 0) {
    window.alert("Please enter a time greater than 0 seconds.");
    return;
  }

  stopTimer();
  state.secondsPerImage = duration;

  if (!state.isPaused) {
    state.currentIndex = 0;
    state.timeLeft = duration;
    state.finished = false;
    dom.doneOverlay.classList.add("hidden");
    showCurrentImage();
  }

  state.isRunning = true;
  state.isPaused = false;
  syncStatus();
  updateButtons();
  state.timerId = window.setInterval(tick, 1000);
}

function pauseOrResumeTimer() {
  if (state.isRunning) {
    stopTimer();
    state.isRunning = false;
    state.isPaused = true;
  } else if (state.isPaused) {
    state.isRunning = true;
    state.isPaused = false;
    state.timerId = window.setInterval(tick, 1000);
  }

  syncStatus();
  updateButtons();
}

function restartTimer() {
  const duration = getDurationInSeconds();

  if (!state.images.length) {
    window.alert("Please upload at least one image.");
    return;
  }

  if (duration <= 0) {
    window.alert("Please enter a time greater than 0 seconds.");
    return;
  }

  stopTimer();
  state.secondsPerImage = duration;
  state.currentIndex = 0;
  state.timeLeft = duration;
  state.isRunning = false;
  state.isPaused = false;
  state.finished = false;
  dom.doneOverlay.classList.add("hidden");
  showCurrentImage();
  syncStatus();
  updateButtons();
}

function resetAll() {
  stopTimer();
  revokeImageUrls();
  state.images = [];
  state.currentIndex = 0;
  state.timeLeft = 0;
  state.secondsPerImage = getDurationInSeconds() || 600;
  state.isRunning = false;
  state.isPaused = false;
  state.finished = false;

  dom.referenceImage.removeAttribute("src");
  dom.referenceImage.classList.add("hidden");
  dom.doneOverlay.classList.add("hidden");
  dom.viewerState.classList.remove("hidden");
  dom.imageInput.value = "";
  dom.previewGrid.innerHTML = "";
  dom.queueCount.textContent = "0 images";

  syncStatus();
  updateButtons();
}

function handleImagesSelected(event) {
  stopTimer();
  revokeImageUrls();

  const files = Array.from(event.target.files || []);
  state.images = files.map((file, index) => ({
    id: `${file.name}-${index}-${file.lastModified}`,
    name: file.name,
    url: URL.createObjectURL(file)
  }));

  state.currentIndex = 0;
  state.secondsPerImage = getDurationInSeconds() || 600;
  state.timeLeft = state.secondsPerImage;
  state.isRunning = false;
  state.isPaused = false;
  state.finished = false;

  dom.doneOverlay.classList.add("hidden");

  if (state.images.length) {
    showCurrentImage();
  } else {
    dom.referenceImage.classList.add("hidden");
    dom.viewerState.classList.remove("hidden");
  }

  renderPreviews();
  syncStatus();
  updateButtons();
}

dom.imageInput.addEventListener("change", handleImagesSelected);
dom.startButton.addEventListener("click", startTimer);
dom.pauseButton.addEventListener("click", pauseOrResumeTimer);
dom.restartButton.addEventListener("click", restartTimer);
dom.resetButton.addEventListener("click", resetAll);
dom.runAgainButton.addEventListener("click", startTimer);

syncStatus();
updateButtons();
