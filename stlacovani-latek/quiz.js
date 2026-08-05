const QUIZ_STATES = [
  { id: "solid", label: "pevné" },
  { id: "liquid", label: "kapalné" },
  { id: "gas", label: "plynné" },
];

const QUIZ_PROPERTIES = [
  { id: "fills-volume", text: "vyplní vždy celý objem nádoby", answers: ["gas"] },
  { id: "easy-compress", text: "jde snadno stlačit", answers: ["gas"] },
  { id: "fits-container", text: "přizpůsobí se tvaru nádoby", answers: ["liquid", "gas"] },
  { id: "fluid", text: "je tekuté", answers: ["liquid", "gas"] },
  { id: "incompressible", text: "je prakticky nestlačitelné", answers: ["solid", "liquid"] },
  { id: "changes-shape", text: "snadno mění svůj tvar", answers: ["liquid", "gas"] },
  { id: "keeps-shape", text: "drží svůj tvar", answers: ["solid"] },
];

const quizView = document.getElementById("quizView");
const simView = document.getElementById("simView");
const quizPool = document.getElementById("quizPool");
const quizBoard = document.getElementById("quizBoard");
const btnQuiz = document.getElementById("btnQuiz");
const btnQuizCheck = document.getElementById("btnQuizCheck");
const btnQuizReset = document.getElementById("btnQuizReset");
const simControls = document.getElementById("simControls");
const sceneWorkspace = document.querySelector(".scene-workspace");

let quizActive = false;
/** @type {Map<string, Set<string>>} */
let assignments = new Map();
let dragState = null;
let selectedPropertyId = null;
let suppressClick = false;

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createPropertyCard(property) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "quiz-card";
  card.dataset.propertyId = property.id;
  card.textContent = property.text;
  card.draggable = false;
  card.addEventListener("click", () => onPropertyClick(property.id));
  card.addEventListener("dragstart", (event) => onDragStart(event, property.id));
  card.addEventListener("dragend", onDragEnd);
  card.addEventListener("pointerdown", (event) => onPointerDownCard(event, property.id));
  return card;
}

function createAssignmentChip(property, stateId) {
  const row = document.createElement("div");
  row.className = "quiz-assignment";
  row.dataset.propertyId = property.id;
  row.dataset.state = stateId;
  row.setAttribute("role", "listitem");

  const text = document.createElement("span");
  text.className = "quiz-assignment__text";
  text.textContent = property.text;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "quiz-assignment__remove";
  removeBtn.textContent = "×";
  removeBtn.setAttribute(
    "aria-label",
    `Odebrat „${property.text}“ ze skupenství ${getStateLabel(stateId)}`
  );
  removeBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    removeAssignment(property.id, stateId);
  });

  row.append(text, removeBtn);
  return row;
}

function createColumn(state) {
  const column = document.createElement("section");
  column.className = "quiz-column";
  column.dataset.state = state.id;

  const title = document.createElement("h3");
  title.className = "quiz-column__title";
  title.textContent = state.label;

  const dropzone = document.createElement("div");
  dropzone.className = "quiz-dropzone";
  dropzone.dataset.state = state.id;
  dropzone.setAttribute("role", "list");
  dropzone.setAttribute("aria-label", `Vlastnosti pro skupenství ${state.label}`);

  const status = document.createElement("p");
  status.className = "quiz-dropzone__status";
  status.textContent = "Něco tu chybí.";
  dropzone.append(status);

  dropzone.addEventListener("dragover", onDragOver);
  dropzone.addEventListener("dragleave", onDragLeave);
  dropzone.addEventListener("drop", (event) => onDrop(event, state.id));
  dropzone.addEventListener("click", () => onColumnClick(state.id));

  column.append(title, dropzone);
  return column;
}

function renderQuiz() {
  if (!quizPool || !quizBoard) return;

  assignments = new Map();
  selectedPropertyId = null;
  quizPool.innerHTML = "";
  quizBoard.innerHTML = "";

  shuffle(QUIZ_PROPERTIES).forEach((property) => {
    quizPool.append(createPropertyCard(property));
  });

  QUIZ_STATES.forEach((state) => {
    quizBoard.append(createColumn(state));
  });

  clearFeedback();
}

function getPropertyById(id) {
  return QUIZ_PROPERTIES.find((property) => property.id === id);
}

function getStateLabel(stateId) {
  return QUIZ_STATES.find((state) => state.id === stateId)?.label || stateId;
}

function getPoolCardElement(id) {
  return document.querySelector(`.quiz-pool .quiz-card[data-property-id="${id}"]`);
}

function getDropzone(stateId) {
  return document.querySelector(`.quiz-dropzone[data-state="${stateId}"]`);
}

function getAssignmentChip(stateId, propertyId) {
  return document.querySelector(
    `.quiz-assignment[data-state="${stateId}"][data-property-id="${propertyId}"]`
  );
}

function getStateAssignments(stateId) {
  if (!assignments.has(stateId)) {
    assignments.set(stateId, new Set());
  }
  return assignments.get(stateId);
}

function setSelectedProperty(id) {
  selectedPropertyId = id;
  document.querySelectorAll(".quiz-pool .quiz-card").forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.propertyId === id);
  });
}

function onPropertyClick(id) {
  if (suppressClick || dragState) return;
  setSelectedProperty(selectedPropertyId === id ? null : id);
}

function onColumnClick(stateId) {
  if (!selectedPropertyId) return;
  assignProperty(selectedPropertyId, stateId);
  setSelectedProperty(null);
}

function assignProperty(propertyId, stateId) {
  const property = getPropertyById(propertyId);
  const dropzone = getDropzone(stateId);
  if (!property || !dropzone) return;

  const stateAssignments = getStateAssignments(stateId);
  if (stateAssignments.has(propertyId)) return;

  stateAssignments.add(propertyId);
  dropzone.append(createAssignmentChip(property, stateId));
  getPoolCardElement(propertyId)?.classList.remove("is-selected");
  clearFeedback();
}

function removeAssignment(propertyId, stateId) {
  getStateAssignments(stateId).delete(propertyId);
  getAssignmentChip(stateId, propertyId)?.remove();
  clearFeedback();
}

function onDragStart(event, propertyId) {
  clearDragGhost();
  event.dataTransfer.setData("text/plain", propertyId);
  event.dataTransfer.effectAllowed = "copy";
  const card = getPoolCardElement(propertyId);
  if (card) card.classList.add("is-dragging");
}

function onDragEnd(event) {
  event.target.classList.remove("is-dragging");
  event.target.draggable = false;
  clearDragGhost();
}

function clearDragGhost() {
  dragState?.ghost?.remove();
  if (dragState) dragState.ghost = null;
  document.querySelectorAll(".quiz-card-ghost").forEach((node) => node.remove());
}

function createDragGhost(card, clientX, clientY) {
  clearDragGhost();
  const rect = card.getBoundingClientRect();
  const ghost = card.cloneNode(true);
  ghost.removeAttribute("id");
  ghost.draggable = false;
  ghost.classList.remove("is-selected", "is-dragging");
  ghost.classList.add("quiz-card-ghost");
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  document.body.append(ghost);

  return {
    ghost,
    offsetX: clientX - rect.left,
    offsetY: clientY - rect.top,
  };
}

function moveDragGhost(clientX, clientY) {
  if (!dragState?.ghost) return;
  dragState.ghost.style.left = `${clientX - dragState.offsetX}px`;
  dragState.ghost.style.top = `${clientY - dragState.offsetY}px`;
}

function onDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  event.currentTarget.classList.add("is-drop-target");
}

function onDragLeave(event) {
  const zone = event.currentTarget;
  if (!zone.contains(event.relatedTarget)) {
    zone.classList.remove("is-drop-target");
  }
}

function onDrop(event, stateId) {
  event.preventDefault();
  event.currentTarget.classList.remove("is-drop-target");
  const propertyId = event.dataTransfer.getData("text/plain");
  if (!propertyId || !getPropertyById(propertyId)) return;
  assignProperty(propertyId, stateId);
  setSelectedProperty(null);
  clearFeedback();
}

function onPointerDownCard(event, propertyId) {
  if (event.button !== 0) return;

  const card = event.currentTarget;

  // Desktop: nativní HTML5 drag (má vlastní náhled).
  if (event.pointerType === "mouse") {
    card.draggable = true;
    return;
  }

  // Touch / tablet: vlastní drag s viditelným boxem pod prstem.
  card.draggable = false;
  dragState = {
    propertyId,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    ghost: null,
    offsetX: 0,
    offsetY: 0,
  };
  card.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;

  const dx = event.clientX - dragState.startX;
  const dy = event.clientY - dragState.startY;
  if (!dragState.moved && Math.hypot(dx, dy) < 8) return;

  const card = getPoolCardElement(dragState.propertyId);
  if (!card) return;

  if (!dragState.moved) {
    dragState.moved = true;
    const ghostInfo = createDragGhost(card, event.clientX, event.clientY);
    dragState.ghost = ghostInfo.ghost;
    dragState.offsetX = ghostInfo.offsetX;
    dragState.offsetY = ghostInfo.offsetY;
    card.classList.add("is-dragging");
  }

  event.preventDefault();
  moveDragGhost(event.clientX, event.clientY);

  document.querySelectorAll(".quiz-dropzone").forEach((zone) => {
    zone.classList.remove("is-drop-target");
  });

  const target = document.elementFromPoint(event.clientX, event.clientY);
  const zone = target?.closest(".quiz-dropzone");
  if (zone) zone.classList.add("is-drop-target");
}

function onPointerUp(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;

  const { propertyId, moved } = dragState;
  clearDragGhost();
  dragState = null;

  const card = getPoolCardElement(propertyId);
  if (card) {
    card.classList.remove("is-dragging");
    if (card.hasPointerCapture(event.pointerId)) {
      card.releasePointerCapture(event.pointerId);
    }
  }

  document.querySelectorAll(".quiz-dropzone").forEach((zone) => {
    zone.classList.remove("is-drop-target");
  });

  if (!moved) return;

  suppressClick = true;
  window.setTimeout(() => {
    suppressClick = false;
  }, 0);

  const target = document.elementFromPoint(event.clientX, event.clientY);
  const dropzone = target?.closest(".quiz-dropzone");

  if (dropzone?.dataset.state) {
    assignProperty(propertyId, dropzone.dataset.state);
    setSelectedProperty(null);
  }
}

function clearCelebration() {
  if (celebrationTimer) {
    window.clearTimeout(celebrationTimer);
    celebrationTimer = 0;
  }
  quizView?.classList.remove("is-celebrating");
  sceneWorkspace?.classList.remove("is-celebrating");
  sceneWorkspace?.querySelector(".quiz-celebration")?.remove();
  quizView?.querySelector(".quiz-celebration")?.remove();
}

function clearMissingHints() {
  document.querySelectorAll(".quiz-dropzone").forEach((zone) => {
    zone.classList.remove("has-missing");
  });
}

function clearAssignmentFeedback() {
  document.querySelectorAll(".quiz-assignment").forEach((chip) => {
    chip.classList.remove("is-correct", "is-wrong");
  });
}

function clearFeedback() {
  clearCelebration();
  clearMissingHints();
  clearAssignmentFeedback();
}

function getExpectedPropertyIds(stateId) {
  return QUIZ_PROPERTIES.filter((property) => property.answers.includes(stateId)).map(
    (property) => property.id
  );
}

function isQuizPerfect() {
  return evaluateQuiz().isPerfect;
}

let celebrationTimer = 0;

function launchConfetti() {
  const host = sceneWorkspace || quizView;
  if (!host) return;

  clearCelebration();

  const layer = document.createElement("div");
  layer.className = "quiz-celebration";
  layer.setAttribute("aria-hidden", "true");

  const banner = document.createElement("div");
  banner.className = "quiz-success-banner";
  banner.textContent = "Výborně!";
  layer.append(banner);

  const burst = document.createElement("div");
  burst.className = "quiz-confetti-burst";
  layer.append(burst);

  const colors = ["#3d5a9a", "#2f8f57", "#5b8dee", "#f4b942", "#9b59b6", "#e67e22"];

  for (let i = 0; i < 80; i += 1) {
    const piece = document.createElement("span");
    piece.className = "quiz-confetti";
    const angle = Math.random() * Math.PI * 2;
    const distance = 120 + Math.random() * 280;
    piece.style.setProperty("--burst-x", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--burst-y", `${Math.sin(angle) * distance}px`);
    piece.style.setProperty("--rotation", `${Math.random() * 720 - 360}deg`);
    piece.style.setProperty("--size", `${6 + Math.random() * 10}px`);
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.12}s`;
    burst.append(piece);
  }

  host.append(layer);
  host.classList.add("is-celebrating");
  quizView?.classList.add("is-celebrating");

  celebrationTimer = window.setTimeout(() => {
    clearCelebration();
  }, 2600);
}

function celebratePerfectQuiz() {
  launchConfetti();
}

function evaluateQuiz() {
  let wrongCount = 0;
  let missingCount = 0;

  QUIZ_STATES.forEach((state) => {
    const assigned = getStateAssignments(state.id);
    const expected = getExpectedPropertyIds(state.id);

    expected.forEach((propertyId) => {
      if (!assigned.has(propertyId)) missingCount += 1;
    });

    assigned.forEach((propertyId) => {
      const property = getPropertyById(propertyId);
      if (!property?.answers.includes(state.id)) wrongCount += 1;
    });
  });

  return {
    wrongCount,
    missingCount,
    isPerfect: wrongCount === 0 && missingCount === 0,
  };
}

function updateMissingHints() {
  clearMissingHints();

  QUIZ_STATES.forEach((state) => {
    const assigned = getStateAssignments(state.id);
    const expected = getExpectedPropertyIds(state.id);
    const hasMissing = expected.some((propertyId) => !assigned.has(propertyId));
    if (!hasMissing) return;

    getDropzone(state.id)?.classList.add("has-missing");
  });
}

function checkQuiz() {
  clearAssignmentFeedback();

  QUIZ_STATES.forEach((state) => {
    const assigned = getStateAssignments(state.id);

    assigned.forEach((propertyId) => {
      const property = getPropertyById(propertyId);
      const chip = getAssignmentChip(state.id, propertyId);
      const isCorrect = property?.answers.includes(state.id);
      if (chip) {
        chip.classList.toggle("is-correct", Boolean(isCorrect));
        chip.classList.toggle("is-wrong", !isCorrect);
      }
    });
  });

  updateMissingHints();

  if (isQuizPerfect()) {
    celebratePerfectQuiz();
  }
}

function resetQuiz() {
  renderQuiz();
}

function setQuizMode(active) {
  quizActive = active;

  if (simView) {
    simView.hidden = active;
    simView.setAttribute("aria-hidden", active ? "true" : "false");
  }
  if (quizView) {
    quizView.hidden = !active;
    quizView.setAttribute("aria-hidden", active ? "false" : "true");
  }
  if (simControls) simControls.hidden = false;
  if (sceneWorkspace) {
    sceneWorkspace.classList.toggle("scene-workspace--quiz", active);
    sceneWorkspace.setAttribute(
      "aria-label",
      active ? "Kvíz — přiřazování vlastností skupenstvím" : "Vizualizace lisu"
    );
  }

  if (btnQuiz) {
    btnQuiz.classList.toggle("is-active", active);
    btnQuiz.setAttribute("aria-pressed", active ? "true" : "false");
  }

  document.querySelectorAll(".subject-btn[data-scene]").forEach((button) => {
    if (active) {
      button.classList.remove("is-active");
      button.setAttribute("aria-pressed", "false");
    }
  });

  if (active) {
    renderQuiz();
  } else {
    clearFeedback();
    setSelectedProperty(null);
  }
}

window.stlacovaniQuiz = {
  isActive: () => quizActive,
  exit: () => {
    if (quizActive) setQuizMode(false);
  },
};

if (btnQuiz) {
  btnQuiz.addEventListener("click", () => {
    if (!quizActive) setQuizMode(true);
  });
}

if (btnQuizCheck) {
  btnQuizCheck.addEventListener("click", checkQuiz);
}

if (btnQuizReset) {
  btnQuizReset.addEventListener("click", resetQuiz);
}

window.addEventListener("pointermove", onPointerMove, { passive: false });
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", onPointerUp);
