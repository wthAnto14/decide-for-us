// --- ELEMENTI DEL DOM ---
const areaTouch = document.getElementById('areaTouch');
const resultFingers = document.getElementById('resultFingers');
const countdownEl = document.getElementById('countdown');
const pickNameBtn = document.getElementById('pickNameBtn');
const resultNames = document.getElementById('resultNames');
const modeFingers = document.getElementById('modeFingers');
const modeNames = document.getElementById('modeNames');
const fingersArea = document.getElementById('fingersArea');
const namesArea = document.getElementById('namesArea');
const namesInput = document.getElementById('namesInput');

// --- COSTANTI DI CONFIGURAZIONE ---
const SELECTION_TIME_MS = 3000;
const DOT_SIZE = 70;
const CIRCLE_RADIUS = 26.25;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'purple'];

// --- STATO DELL'APPLICAZIONE ---
let activeTouches = new Map();
let selectionTimer = null;
let countdownInterval = null;
let selectionDone = false;
let activeMode = 'fingers';
let previousTouchCount = 0;
let winnerId = null; // ID dito vincitore

function setActiveMode(mode) {
    activeMode = mode;
    if (mode === 'fingers') {
        fingersArea.style.display = 'block';
        namesArea.style.display = 'none';
        areaTouch.style.display = 'block';
        modeFingers.classList.add('active');
        modeNames.classList.remove('active');
        resetFingersGame();
    } else {
        fingersArea.style.display = 'none';
        namesArea.style.display = 'block';
        areaTouch.style.display = 'none';
        modeFingers.classList.remove('active');
        modeNames.classList.add('active');
    }
}

function clearTimer() {
    clearTimeout(selectionTimer);
    clearInterval(countdownInterval);
    selectionTimer = null;
    countdownInterval = null;
    resetAllProgressCircles();
}

function createProgressCircle() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    const fg = document.createElementNS("http://www.w3.org/2000/svg", "circle");

    bg.classList.add('bg');
    fg.classList.add('fg');

    [bg, fg].forEach(c => {
        c.setAttribute("cx", "40");
        c.setAttribute("cy", "40");
        c.setAttribute("r", CIRCLE_RADIUS);
    });

    fg.style.strokeDasharray = CIRCLE_CIRCUMFERENCE;
    fg.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;

    svg.appendChild(bg);
    svg.appendChild(fg);
    return svg;
}

function startProgressAnimation() {
    const duration = SELECTION_TIME_MS;
    const start = performance.now();

    activeTouches.forEach(({ progressCircle }) => {
        if (progressCircle) {
            const circle = progressCircle.querySelector('.fg');
            animateProgress(circle, duration, start);
        }
    });
}

function animateProgress(circle, duration, start) {
    function step(timestamp) {
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / duration, 1);
        circle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);
        if (elapsed < duration) {
            requestAnimationFrame(step);
        }
    }
    requestAnimationFrame(step);
}

function resetProgressCircle(svg) {
    if (!svg) return;
    const circle = svg.querySelector('.fg');
    if (!circle) return;
    circle.style.transition = 'none';
    circle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
}

function resetAllProgressCircles() {
    activeTouches.forEach(({ progressCircle }) => {
        resetProgressCircle(progressCircle);
    });
}

function resetFingersGame() {
    clearTimer();
    while (areaTouch.firstChild) {
        areaTouch.removeChild(areaTouch.firstChild);
    }
    activeTouches.clear();
    resultFingers.textContent = 'Appoggia almeno 2 dita per iniziare la scelta.';
    countdownEl.textContent = '';
    selectionDone = false;
    previousTouchCount = 0;
    winnerId = null;
    areaTouch.style.backgroundColor = '#111';
}

function selectFinger() {
    if (activeTouches.size < 2) return;
    selectionDone = true;

    const keys = Array.from(activeTouches.keys());
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const winnerIndex = array[0] % keys.length;
    winnerId = keys[winnerIndex];

    activeTouches.forEach((data, id) => {
        if (id !== winnerId) {
            data.element.style.opacity = '0';
            data.element.style.animation = 'none';
            data.element.style.pointerEvents = 'none';
        } else {
            data.element.style.opacity = '1';
            data.element.style.transform = 'translate(-50%, -50%) scale(1.1)';
            data.element.style.pointerEvents = 'auto';
            // Cambia il colore dello sfondo areaTouch al colore del dito vincitore
            const colorClass = COLORS[id % COLORS.length] || 'purple';
            areaTouch.style.backgroundColor = window.getComputedStyle(data.element).backgroundColor;
            // Vibrazione dito vincitore
            if (navigator.vibrate) {
                navigator.vibrate(150);
            }
        }
    });

    resultFingers.textContent = 'Dito scelto!';
}

function startSelectionProcess() {
    if (selectionTimer || activeTouches.size < 2) {
        return;
    }

    resultFingers.textContent = `Dita poggiate: ${activeTouches.size}. Scelta tra ${SELECTION_TIME_MS / 1000} secondi...`;
    let secondsLeft = SELECTION_TIME_MS / 1000;
    countdownEl.textContent = `Tempo rimasto: ${secondsLeft} s`;

    startProgressAnimation();

    countdownInterval = setInterval(() => {
        secondsLeft--;
        countdownEl.textContent = `Tempo rimasto: ${secondsLeft > 0 ? secondsLeft : 0} s`;
    }, 1000);

    selectionTimer = setTimeout(() => {
        clearInterval(countdownInterval);
        countdownEl.textContent = '';
        selectFinger();
    }, SELECTION_TIME_MS);
}

function handleTouchStart(e) {
    if (activeMode !== 'fingers') return;
    e.preventDefault();

    if (selectionDone) {
        resetFingersGame();
    }

    const rect = areaTouch.getBoundingClientRect();

    for (const touch of e.changedTouches) {
        if (activeTouches.size >= COLORS.length) {
            // Limite raggiunto, ignora altri tocchi
            continue;
        }
        const dot = document.createElement('div');
        dot.classList.add('dot');
        const colorClass = COLORS[activeTouches.size % COLORS.length];
        dot.classList.add(colorClass);

        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        dot.style.left = `${x}px`;
        dot.style.top = `${y}px`;

        const progressCircle = createProgressCircle();
        dot.appendChild(progressCircle);

        areaTouch.appendChild(dot);
        activeTouches.set(touch.identifier, { element: dot, progressCircle });
    }

    updateTouchState();
}

function handleTouchEnd(e) {
    if (activeMode !== 'fingers') return;
    e.preventDefault();

    for (const touch of e.changedTouches) {
        const data = activeTouches.get(touch.identifier);
        if (data) {
            areaTouch.removeChild(data.element);
            activeTouches.delete(touch.identifier);
        }
    }

    if (selectionDone) {
        // Se il dito vincitore viene sollevato, torna sfondo scuro e resetta
        if (e.changedTouches) {
            for (const touch of e.changedTouches) {
                if (touch.identifier === winnerId) {
                    resetFingersGame();
                    break;
                }
            }
        }
        return;
    }

    updateTouchState();
}

function handleTouchMove(e) {
    if (activeMode !== 'fingers' || selectionDone) return;
    e.preventDefault();

    const rect = areaTouch.getBoundingClientRect();

    for (const touch of e.changedTouches) {
        const data = activeTouches.get(touch.identifier);
        if (data) {
            let x = touch.clientX - rect.left;
            let y = touch.clientY - rect.top;

            const radius = DOT_SIZE / 2;
            x = Math.max(radius, Math.min(x, rect.width - radius));
            y = Math.max(radius, Math.min(y, rect.height - radius));

            data.element.style.left = `${x}px`;
            data.element.style.top = `${y}px`;
        }
    }
}

function updateTouchState() {
    const currentTouchCount = activeTouches.size;

    if (previousTouchCount !== currentTouchCount && !selectionDone) {
        clearTimer();
        if (currentTouchCount >= 2) {
            startSelectionProcess();
        } else {
            resultFingers.textContent = 'Appoggia almeno 2 dita per iniziare la scelta.';
            countdownEl.textContent = '';
        }
    }
    previousTouchCount = currentTouchCount;
}

// --- Funzione pickName aggiornata con controllo minimo 2 nomi e duplicati ---
function pickName() {
    if (activeMode !== 'names') return;

    const input = namesInput.value.trim();
    if (!input) {
        resultNames.textContent = 'Inserisci almeno due nomi.';
        resultNames.classList.add('error');
        namesInput.classList.add('error');
        return;
    }

    const names = input.split(',').map(n => n.trim()).filter(n => n.length > 0);

    if (names.length < 2) {
        resultNames.textContent = 'Inserisci almeno due nomi per effettuare una scelta.';
        resultNames.classList.add('error');
        namesInput.classList.add('error');
        return;
    }

    // Controlla duplicati esatti case-sensitive
    const duplicates = new Set();
    const seen = new Set();

    for (const n of names) {
        if (seen.has(n)) duplicates.add(n);
        else seen.add(n);
    }

    if (duplicates.size > 0) {
        resultNames.textContent = 'I nomi devono essere tutti diversi (case-sensitive).';
        resultNames.classList.add('error');
        namesInput.classList.add('error');
        return;
    }

    // Reset errori
    resultNames.classList.remove('error');
    namesInput.classList.remove('error');

    // Scelta casuale
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const idx = array[0] % names.length;

    resultNames.textContent = `Nome scelto: ${names[idx]}`;

    if (navigator.vibrate) {
        navigator.vibrate(150);
    }
}

// --- EVENT LISTENERS ---
areaTouch.addEventListener('touchstart', handleTouchStart, { passive: false });
areaTouch.addEventListener('touchend', handleTouchEnd, { passive: false });
areaTouch.addEventListener('touchcancel', handleTouchEnd, { passive: false });
areaTouch.addEventListener('touchmove', handleTouchMove, { passive: false });

pickNameBtn.addEventListener('click', pickName);
modeFingers.addEventListener('click', () => setActiveMode('fingers'));
modeNames.addEventListener('click', () => setActiveMode('names'));

// --- INIZIALIZZAZIONE ---
setActiveMode('fingers');