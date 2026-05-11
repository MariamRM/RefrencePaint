const dom = {
  imageInput: document.getElementById("imageInput"),
  minutesInput: document.getElementById("minutesInput"),
  secondsInput: document.getElementById("secondsInput"),
  startButton: document.getElementById("startButton"),
  pauseButton: document.getElementById("pauseButton"),
  restartButton: document.getElementById("restartButton"),
  resetButton: document.getElementById("resetButton"),
  runAgainButton: document.getElementById("runAgainButton"),
  previousButton: document.getElementById("previousButton"),
  nextButton: document.getElementById("nextButton"),
  zoomInButton: document.getElementById("zoomInButton"),
  zoomOutButton: document.getElementById("zoomOutButton"),
  zoomResetButton: document.getElementById("zoomResetButton"),
  themeToggle: document.getElementById("themeToggle"),
  themeIcon: document.getElementById("themeIcon"),
  statusLabel: document.getElementById("statusLabel"),
  imageCounter: document.getElementById("imageCounter"),
  countdown: document.getElementById("countdown"),
  currentImageName: document.getElementById("currentImageName"),
  queueCount: document.getElementById("queueCount"),
  previewGrid: document.getElementById("previewGrid"),
  referenceImage: document.getElementById("referenceImage"),
  referenceStage: document.getElementById("referenceStage"),
  viewerState: document.getElementById("viewerState"),
  doneOverlay: document.getElementById("doneOverlay")
};

const state = {
  images: [],
  currentIndex: 0,
  defaultSecondsPerImage: 600,
  timeLeft: 0,
  timerId: null,
  isRunning: false,
  isPaused: false,
  finished: false,
  zoom: 1,
  darkMode: false,
  audioContext: null
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

function getImageDuration(image) {
  return Math.max(1, (image.minutes * 60) + image.seconds);
}

function playBeep(frequency = 880, durationMs = 180) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  if (!state.audioContext) {
    state.audioContext = new AudioContextClass();
  }

  const context = state.audioContext;

  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gainNode.gain.setValueAtTime(0.0001, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.14, context.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (durationMs / 1000));

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + (durationMs / 1000));
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
  dom.previousButton.disabled = !hasImages || state.currentIndex === 0;
  dom.nextButton.disabled = !hasImages || state.currentIndex >= state.images.length - 1;
  dom.zoomInButton.disabled = !hasImages;
  dom.zoomOutButton.disabled = !hasImages;
  dom.zoomResetButton.disabled = !hasImages;
  dom.themeIcon.innerHTML = state.darkMode ? "&#9728;" : "&#9790;";
  dom.themeToggle.setAttribute("aria-label", state.darkMode ? "Switch to light mode" : "Switch to dark mode");
  dom.themeToggle.setAttribute("title", state.darkMode ? "Switch to light mode" : "Switch to dark mode");
  document.body.classList.toggle("session-active", state.isRunning || state.isPaused || state.finished);
}

function applyZoom() {
  dom.referenceImage.style.transform = `scale(${state.zoom})`;
}

function resetZoom() {
  state.zoom = 1;
  applyZoom();
}

function setTheme(darkModeEnabled) {
  state.darkMode = darkModeEnabled;
  document.body.classList.toggle("dark-mode", state.darkMode);
  updateButtons();
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

    const meta = document.createElement("div");
    meta.className = "preview-meta";

    const caption = document.createElement("figcaption");
    caption.textContent = image.name;

    const controls = document.createElement("div");
    controls.className = "preview-controls";

    const timeRow = document.createElement("div");
    timeRow.className = "preview-time";

    const minutesField = document.createElement("label");
    minutesField.className = "mini-field";
    const minutesLabel = document.createElement("span");
    minutesLabel.textContent = "Minutes";
    const minutesInput = document.createElement("input");
    minutesInput.type = "number";
    minutesInput.min = "0";
    minutesInput.max = "240";
    minutesInput.value = String(image.minutes);
    minutesInput.addEventListener("change", (event) => {
      image.minutes = Math.max(0, Number.parseInt(event.target.value, 10) || 0);
      if (index === state.currentIndex && !state.isRunning && !state.finished) {
        state.timeLeft = getImageDuration(image);
        syncStatus();
      }
    });
    minutesField.append(minutesLabel, minutesInput);

    const secondsField = document.createElement("label");
    secondsField.className = "mini-field";
    const secondsLabel = document.createElement("span");
    secondsLabel.textContent = "Seconds";
    const secondsInput = document.createElement("input");
    secondsInput.type = "number";
    secondsInput.min = "0";
    secondsInput.max = "59";
    secondsInput.value = String(image.seconds);
    secondsInput.addEventListener("change", (event) => {
      let nextSeconds = Number.parseInt(event.target.value, 10) || 0;
      nextSeconds = Math.min(59, Math.max(0, nextSeconds));
      image.seconds = nextSeconds;
      event.target.value = String(nextSeconds);

      if (index === state.currentIndex && !state.isRunning && !state.finished) {
        state.timeLeft = getImageDuration(image);
        syncStatus();
      }
    });
    secondsField.append(secondsLabel, secondsInput);

    timeRow.append(minutesField, secondsField);

    const actionRow = document.createElement("div");
    actionRow.className = "preview-actions";

    const useButton = document.createElement("button");
    useButton.type = "button";
    useButton.className = "ghost";
    useButton.textContent = "View";
    useButton.addEventListener("click", () => jumpToImage(index));

    const upButton = document.createElement("button");
    upButton.type = "button";
    upButton.className = "ghost";
    upButton.textContent = "Move up";
    upButton.disabled = index === 0;
    upButton.addEventListener("click", () => moveImage(index, index - 1));

    const downButton = document.createElement("button");
    downButton.type = "button";
    downButton.className = "ghost";
    downButton.textContent = "Move down";
    downButton.disabled = index === state.images.length - 1;
    downButton.addEventListener("click", () => moveImage(index, index + 1));

    actionRow.append(useButton, upButton, downButton);
    controls.append(timeRow, actionRow);
    meta.append(caption, controls);
    card.append(preview, meta);
    dom.previewGrid.appendChild(card);
  });

  dom.queueCount.textContent = `${state.images.length} image${state.images.length === 1 ? "" : "s"}`;
}

function updateCurrentTimeFromImage() {
  const current = state.images[state.currentIndex];
  state.timeLeft = current ? getImageDuration(current) : 0;
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
  resetZoom();
  renderPreviews();
  updateButtons();
}

function syncStatus() {
  if (!state.images.length) {
    dom.statusLabel.textContent = "Waiting for images";
    dom.imageCounter.textContent = "0 / 0";
    dom.countdown.textContent = "00:00";
    dom.currentImageName.textContent = "No image selected";
    setViewerMessage("Upload images to begin.");
    dom.referenceImage.style.transform = "scale(1)";
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
  playBeep(660, 220);
  window.setTimeout(() => playBeep(880, 260), 120);
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

  playBeep();
  state.currentIndex += 1;
  updateCurrentTimeFromImage();
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
  if (!state.images.length) {
    window.alert("Please upload at least one image.");
    return;
  }

  stopTimer();

  if (!state.isPaused) {
    state.currentIndex = 0;
    updateCurrentTimeFromImage();
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
  if (!state.images.length) {
    window.alert("Please upload at least one image.");
    return;
  }

  stopTimer();
  state.currentIndex = 0;
  updateCurrentTimeFromImage();
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
  state.defaultSecondsPerImage = getDurationInSeconds() || 600;
  state.isRunning = false;
  state.isPaused = false;
  state.finished = false;
  resetZoom();

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

  const files = Array.from(event.target.files || []);
  const defaultMinutes = Number.parseInt(dom.minutesInput.value, 10) || 0;
  const defaultSeconds = Number.parseInt(dom.secondsInput.value, 10) || 0;
  const newImages = files.map((file, index) => ({
    id: `${file.name}-${index}-${file.lastModified}`,
    name: file.name,
    url: URL.createObjectURL(file),
    minutes: defaultMinutes,
    seconds: defaultSeconds
  }));

  if (!newImages.length) {
    return;
  }

  const hadImages = state.images.length > 0;
  state.images = [...state.images, ...newImages];
  state.defaultSecondsPerImage = getDurationInSeconds() || 600;
  state.isRunning = false;
  state.isPaused = false;
  state.finished = false;
  dom.doneOverlay.classList.add("hidden");
  dom.imageInput.value = "";

  if (!hadImages) {
    state.currentIndex = 0;
    updateCurrentTimeFromImage();
    showCurrentImage();
  } else {
    renderPreviews();
    syncStatus();
    updateButtons();
  }
}

function jumpToImage(index) {
  if (index < 0 || index >= state.images.length) {
    return;
  }

  state.currentIndex = index;
  state.finished = false;
  dom.doneOverlay.classList.add("hidden");
  stopTimer();
  state.isRunning = false;
  state.isPaused = false;
  updateCurrentTimeFromImage();
  showCurrentImage();
  syncStatus();
  updateButtons();
}

function moveImage(fromIndex, toIndex) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= state.images.length ||
    toIndex >= state.images.length ||
    fromIndex === toIndex
  ) {
    return;
  }

  const [movedImage] = state.images.splice(fromIndex, 1);
  state.images.splice(toIndex, 0, movedImage);

  if (state.currentIndex === fromIndex) {
    state.currentIndex = toIndex;
  } else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
    state.currentIndex -= 1;
  } else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
    state.currentIndex += 1;
  }

  renderPreviews();
  showCurrentImage();
  syncStatus();
}

function showPreviousImage() {
  if (state.currentIndex > 0) {
    jumpToImage(state.currentIndex - 1);
  }
}

function showNextImage() {
  if (state.currentIndex < state.images.length - 1) {
    jumpToImage(state.currentIndex + 1);
  }
}

function zoomIn() {
  state.zoom = Math.min(4, Number((state.zoom + 0.2).toFixed(2)));
  applyZoom();
}

function zoomOut() {
  state.zoom = Math.max(0.4, Number((state.zoom - 0.2).toFixed(2)));
  applyZoom();
}

dom.imageInput.addEventListener("change", handleImagesSelected);
dom.startButton.addEventListener("click", startTimer);
dom.pauseButton.addEventListener("click", pauseOrResumeTimer);
dom.restartButton.addEventListener("click", restartTimer);
dom.resetButton.addEventListener("click", resetAll);
dom.runAgainButton.addEventListener("click", startTimer);
dom.previousButton.addEventListener("click", showPreviousImage);
dom.nextButton.addEventListener("click", showNextImage);
dom.zoomInButton.addEventListener("click", zoomIn);
dom.zoomOutButton.addEventListener("click", zoomOut);
dom.zoomResetButton.addEventListener("click", resetZoom);
dom.themeToggle.addEventListener("click", () => setTheme(!state.darkMode));

setTheme(false);
syncStatus();
updateButtons();
