"use strict";
const TOTAL = 100,
  OPTS = ["A", "B", "C", "D", "E"];
let userAnswers = new Array(TOTAL + 1).fill(null);
let correctAnswers = new Array(TOTAL + 1).fill(null);
let lockedAnswers = new Array(TOTAL + 1).fill(false);
let isSubmitted = false;

const CHAR_MAP = {
  a: 1,
  b: 2,
  c: 3,
  d: 4,
  e: 5,
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
};
const IDX_TO_OPT = ["A", "B", "C", "D", "E"];

// Custom confirm dialog (Promise based)
let confirmResolver = null;
const modal = document.getElementById("confirmationModal");
const confirmMessageSpan = document.getElementById("confirmMessage");
const confirmBtn = document.getElementById("modalConfirmBtn");
const cancelBtn = document.getElementById("modalCancelBtn");

function showConfirmDialog(message) {
  return new Promise((resolve) => {
    confirmMessageSpan.innerText = message;
    modal.classList.add("active");
    const onConfirm = () => {
      cleanup();
      resolve(true);
    };
    const onCancel = () => {
      cleanup();
      resolve(false);
    };
    const cleanup = () => {
      modal.classList.remove("active");
      confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn.removeEventListener("click", onCancel);
      document.removeEventListener("keydown", keyHandler);
    };
    const keyHandler = (e) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    confirmBtn.addEventListener("click", onConfirm);
    cancelBtn.addEventListener("click", onCancel);
    document.addEventListener("keydown", keyHandler);
  });
}

function lockRow(q) {
  if (lockedAnswers[q]) return;
  lockedAnswers[q] = true;
  const radios = document.querySelectorAll(`input[name="q${q}"]`);
  radios.forEach((radio) => (radio.disabled = true));
  const row = document.getElementById(`qrow-${q}`);
  if (row) row.classList.add("locked");
}

function setAnswerAndLock(q, opt) {
  if (userAnswers[q] !== null) return;
  const radio = document.getElementById(`q${q}_${opt}`);
  if (radio) {
    radio.checked = true;
    userAnswers[q] = opt;
    const row = document.getElementById(`qrow-${q}`);
    if (row) row.classList.add("answered");
    updateProgress();
    lockRow(q);
  }
}

function onRadioChange(q, opt) {
  if (lockedAnswers[q] === true) return;
  if (userAnswers[q] !== null) return;
  setAnswerAndLock(q, opt);
}

function buildGrid() {
  const grid = document.getElementById("questionGrid");
  grid.innerHTML = "";
  for (let q = 1; q <= TOTAL; q++) {
    const row = document.createElement("div");
    row.className = "q-row";
    row.id = `qrow-${q}`;
    const numSpan = document.createElement("span");
    numSpan.className = "q-num";
    numSpan.textContent = q;
    row.appendChild(numSpan);
    const optsDiv = document.createElement("div");
    optsDiv.className = "q-opts";
    OPTS.forEach((opt) => {
      const label = document.createElement("label");
      label.className = "q-opt";
      const letterSpan = document.createElement("span");
      letterSpan.className = "q-opt-letter";
      letterSpan.textContent = opt;
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `q${q}`;
      radio.value = opt;
      radio.id = `q${q}_${opt}`;
      radio.addEventListener(
        "change",
        (function (qq, optVal) {
          return function () {
            onRadioChange(qq, optVal);
          };
        })(q, opt),
      );
      const bubble = document.createElement("span");
      bubble.className = "bubble";
      label.appendChild(letterSpan);
      label.appendChild(radio);
      label.appendChild(bubble);
      optsDiv.appendChild(label);
    });
    row.appendChild(optsDiv);
    const dot = document.createElement("span");
    dot.className = "q-status-dot";
    row.appendChild(dot);
    grid.appendChild(row);
  }
}

function updateProgress() {
  const count = userAnswers.slice(1).filter((v) => v !== null).length;
  const pct = (count / TOTAL) * 100;
  document.getElementById("progressFill").style.width = pct + "%";
  document.getElementById("progressVal").textContent = `${count}/100`;
  document.getElementById("progressPct").textContent =
    pct.toFixed(0) + "% completed";
  document.getElementById("nav-answered").textContent = count;
  document.getElementById("fabAnswered").textContent = count;
}

async function autoFillDemo() {
  if (isSubmitted) {
    showToast("warning", "⚠️", "Already submitted. Reset first.");
    return;
  }
  for (let q = 1; q <= TOTAL; q++) {
    if (userAnswers[q] !== null) continue;
    const randomOpt = OPTS[Math.floor(Math.random() * OPTS.length)];
    setAnswerAndLock(q, randomOpt);
  }
  showToast(
    "success",
    "✅",
    `${userAnswers.slice(1).filter((v) => v !== null).length} answers locked.`,
  );
}

async function submitOMR() {
  if (isSubmitted) {
    showToast("warning", "⚠️", "Already submitted. Reset to start over.");
    return;
  }
  const answered = userAnswers.slice(1).filter(Boolean).length;
  const confirmMsg = `You've answered ${answered}/100. After submission answers become final.\nProceed?`;
  const ok = await showConfirmDialog(confirmMsg);
  if (!ok) return;

  document
    .querySelectorAll('#questionGrid input[type="radio"]')
    .forEach((r) => (r.disabled = true));
  isSubmitted = true;
  ["submitBtn", "fabSubmitBtn"].forEach((id) => {
    let b = document.getElementById(id);
    if (b) {
      b.disabled = true;
      b.textContent = "✓ Submitted";
    }
  });
  document.getElementById("akSection").classList.add("visible");
  setTimeout(
    () =>
      document
        .getElementById("akSection")
        .scrollIntoView({ behavior: "smooth", block: "start" }),
    100,
  );
  showToast("success", "🎯", "OMR locked. Now paste answer key.");
}

function parseRawKey(raw) {
  let result = [],
    q = 1;
  for (let i = 0; i < raw.length && q <= TOTAL; i++) {
    let ch = raw[i];
    if (/[\s,.\-|;:\/\\]/.test(ch)) continue;
    if (CHAR_MAP.hasOwnProperty(ch))
      result.push({ q, opt: IDX_TO_OPT[CHAR_MAP[ch] - 1], valid: true });
    else result.push({ q, opt: null, valid: false });
    q++;
  }
  return result;
}

function onAKInput() {
  let raw = document.getElementById("akTextarea").value;
  let parsed = parseRawKey(raw);
  let validCount = parsed.filter((p) => p.valid).length;
  let previewDiv = document.getElementById("akParsePreview");
  let chipsDiv = document.getElementById("akParseChips");
  if (parsed.length === 0) {
    previewDiv.classList.remove("visible");
    document.getElementById("akValidInfo").innerText = "Enter answer key...";
    return;
  }
  previewDiv.classList.add("visible");
  chipsDiv.innerHTML = "";
  parsed.forEach((p) => {
    let chip = document.createElement("span");
    chip.className = p.valid
      ? "parse-chip valid-chip"
      : "parse-chip invalid-chip";
    chip.textContent = `Q${p.q}:${p.valid ? p.opt : "?"}`;
    chipsDiv.appendChild(chip);
  });
  let info = `${validCount} valid answers · ${parsed.length >= TOTAL ? "✓ all 100 covered" : TOTAL - parsed.length + " missing"}`;
  document.getElementById("akValidInfo").innerText = info;
}

function autoFillAnswerKey() {
  let demoStr = Array.from(
    { length: TOTAL },
    () => OPTS[Math.floor(Math.random() * OPTS.length)],
  ).join("");
  document.getElementById("akTextarea").value = demoStr;
  onAKInput();
  showToast("info", "🔑", "Demo answer key generated.");
}

function evaluateAnswers() {
  let raw = document.getElementById("akTextarea").value;
  if (!raw.trim()) {
    showToast("error", "❌", "Please provide answer key first.");
    return;
  }
  let parsed = parseRawKey(raw);
  for (let i = 1; i <= TOTAL; i++) correctAnswers[i] = null;
  for (let p of parsed) {
    if (p.valid) correctAnswers[p.q] = p.opt;
    else if (!p.valid) correctAnswers[p.q] = "INVALID";
  }
  let overlay = document.getElementById("evaluatingOverlay");
  overlay.classList.add("visible");
  let prog = 0,
    interval = setInterval(() => {
      prog += 8;
      if (prog > 100) prog = 100;
      document.getElementById("evalProgress").innerText =
        `Processing ${Math.min(prog, 100)} of 100...`;
    }, 60);
  setTimeout(() => {
    clearInterval(interval);
    overlay.classList.remove("visible");
    runEvaluation();
  }, 1200);
}

function runEvaluation() {
  let correct = 0,
    wrong = 0,
    unattempted = 0,
    invalid = 0;
  let wrongList = [],
    unattemptedList = [],
    invalidList = [];
  for (let q = 1; q <= TOTAL; q++) {
    let ua = userAnswers[q],
      ca = correctAnswers[q];
    let row = document.getElementById(`qrow-${q}`);
    row.classList.remove("st-correct", "st-wrong", "st-invalid");
    if (!ua) {
      unattempted++;
      unattemptedList.push(q);
    } else if (ca === "INVALID") {
      invalid++;
      invalidList.push(q);
      row.classList.add("st-invalid");
    } else if (!ca) {
      correct++;
      row.classList.add("st-correct");
    } else if (ua === ca) {
      correct++;
      row.classList.add("st-correct");
    } else {
      wrong++;
      wrongList.push(q);
      row.classList.add("st-wrong");
      let correctBubble = document.querySelector(
        `#qrow-${q} .bubble[data-opt="${ca}"]`,
      );
      if (correctBubble) correctBubble.dataset.isCorrect = "true";
    }
  }
  let attempted = TOTAL - unattempted,
    pct = ((correct / TOTAL) * 100).toFixed(1);
  document.getElementById("rScoreNum").innerText = correct;
  document.getElementById("rPctCircle").innerHTML = pct + "%";
  let circumference = 2 * Math.PI * 45;
  let offset = circumference - (correct / TOTAL) * circumference;
  let arc = document.getElementById("circularFill");
  arc.style.strokeDasharray = circumference;
  arc.style.strokeDashoffset = offset;
  arc.style.stroke =
    correct / TOTAL >= 0.8
      ? "#4ade80"
      : correct / TOTAL >= 0.5
        ? "#3bc9ff"
        : "#f87171";
  let grade =
    correct / TOTAL >= 0.9
      ? "🏆 A+"
      : correct / TOTAL >= 0.75
        ? "🌟 A"
        : correct / TOTAL >= 0.6
          ? "✅ B"
          : correct / TOTAL >= 0.45
            ? "📘 C"
            : "⚠️ D";
  let gradeBadge = document.getElementById("rGradeBadge");
  gradeBadge.innerText = grade;
  document.getElementById("rAttempted").innerText = attempted;
  document.getElementById("rCorrect").innerText = correct;
  document.getElementById("rWrong").innerText = wrong;
  document.getElementById("rUnattempted").innerText = unattempted;
  document.getElementById("rInvalid").innerText = invalid;

  function renderTags(container, list, className) {
    let el = document.getElementById(container);
    if (!el) return;
    el.innerHTML = list.length
      ? list
          .map((q) => `<span class="q-tag ${className}">Q${q}</span>`)
          .join("")
      : `<span class="q-tag q-tag-none">—</span>`;
  }
  renderTags("wrongTagList", wrongList, "q-tag-wrong");
  renderTags("unattemptedTagList", unattemptedList, "q-tag-unattempted");
  renderTags("invalidTagList", invalidList, "q-tag-invalid");
  let tbody = document.getElementById("wrongTableBody");
  tbody.innerHTML = "";
  if (wrongList.length === 0)
    tbody.innerHTML =
      "<tr><td colspan='4' style='text-align:center;padding:20px;'>✨ No wrong answers on attempted questions</td></tr>";
  else
    wrongList.forEach((q, idx) => {
      tbody.innerHTML += `<tr><td>${idx + 1}</td><td>Q${q}</td><td><span class="answer-badge badge-user">${userAnswers[q]}</span></td><td><span class="answer-badge badge-correct">${correctAnswers[q]}</span></td></tr>`;
    });
  document.getElementById("resultsSection").classList.add("visible");
  setTimeout(
    () =>
      document
        .getElementById("resultsSection")
        .scrollIntoView({ behavior: "smooth", block: "start" }),
    80,
  );
  showToast("success", "📊", `Score ${correct}/100 (${pct}%)`);
}

async function resetOMR() {
  const ok = await showConfirmDialog(
    "Reset everything? All answers and progress will be erased.",
  );
  if (!ok) return;
  userAnswers = new Array(TOTAL + 1).fill(null);
  correctAnswers = new Array(TOTAL + 1).fill(null);
  lockedAnswers = new Array(TOTAL + 1).fill(false);
  isSubmitted = false;
  buildGrid();
  updateProgress();
  ["submitBtn", "fabSubmitBtn"].forEach((id) => {
    let b = document.getElementById(id);
    if (b) {
      b.disabled = false;
      b.innerHTML = id === "submitBtn" ? "📄 Submit OMR" : "Submit →";
    }
  });
  document.getElementById("akSection").classList.remove("visible");
  document.getElementById("resultsSection").classList.remove("visible");
  document.getElementById("akTextarea").value = "";
  onAKInput();
  scrollToTop();
  showToast("info", "🔄", "OMR fully reset.");
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(type, icon, msg) {
  let c = document.getElementById("toastContainer"),
    t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.remove();
  }, 3500);
}

buildGrid();
updateProgress();
