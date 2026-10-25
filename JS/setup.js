"use strict";

function toast(message) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const el = document.createElement("div");
    el.className = "toast-item";
    el.textContent = message;
    container.appendChild(el);

    setTimeout(() => el.remove(), 2800);
}
window.showToast = toast;

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");

    document.documentElement.setAttribute("data-theme", theme);

    const toggle = document.getElementById("theme-toggle-btn");
    if (toggle) {
        toggle.onclick = () => {
            const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", next);
            localStorage.setItem(THEME_KEY, next);
        };
    }
}
initTheme();

const formElements = {
    name: document.getElementById("tournament-name"),
    pairingSystem: document.getElementById("pairing-system"),
    boards: document.getElementById("boards-count"),
    boardsGroup: document.getElementById("boards-count-group"),
    rounds: document.getElementById("total-rounds"),
    roundsHint: document.getElementById("rounds-hint"),
    rules: document.getElementById("rules"),
    pointsWin: document.getElementById("points-win"),
    pointsDraw: document.getElementById("points-draw"),
    participantHeading: document.getElementById("participant-heading"),
    participantForm: document.getElementById("participant-form"),
    participantName: document.getElementById("participant-name"),
    participantList: document.getElementById("participant-list"),
    participantCounter: document.getElementById("participant-counter"),
    startButton: document.getElementById("start-tournament-btn")
};

function getMode() {
    return document.querySelector('input[name="tournament-mode"]:checked')?.value || "TEAM";
}

function getSavedSetup() {
    try {
        return JSON.parse(localStorage.getItem(SETUP_KEY)) || {};
    } catch {
        return {};
    }
}

function getParticipants() {
    const setup = getSavedSetup();
    return getMode() === "SINGLES" ? (setup.players || []) : (setup.teams || []);
}

function getCurrentList() {
    return [...formElements.participantList.querySelectorAll("li")]
        .map((li) => li.dataset.name)
        .filter(Boolean);
}

function saveSetup() {
    const setup = getSavedSetup();
    const mode = getMode();

    setup.tournamentName = formElements.name.value.trim();
    setup.mode = mode;
    setup.pairingSystem = formElements.pairingSystem.value;
    setup.boards = Number(formElements.boards.value) || 4;
    setup.rounds = Number(formElements.rounds.value) || 5;
    setup.rules = formElements.rules.value;
    setup.pointsWin = Number(formElements.pointsWin.value);
    setup.pointsDraw = Number(formElements.pointsDraw.value);

    setup.teams = setup.teams || [];
    setup.players = setup.players || [];

    if (mode === "SINGLES") {
        setup.players = getCurrentList();
    } else {
        setup.teams = getCurrentList();
    }

    localStorage.setItem(SETUP_KEY, JSON.stringify(setup));
    updateParticipantCounter();
    updateRoundsRecommendation();
}

function updateParticipantCounter() {
    const count = getCurrentList().length;
    const label = getMode() === "SINGLES" ? "player" : "team";
    if (formElements.participantCounter) {
        formElements.participantCounter.textContent = `${count} ${label}${count === 1 ? "" : "s"} registered`;
    }
}

function updateRoundsRecommendation() {
    if (!formElements.roundsHint) return;
    const count = getCurrentList().length;
    const isRoundRobin = formElements.pairingSystem.value === "ROUND_ROBBIN";

    if (isRoundRobin) {
        const req = count >= 2 ? (count % 2 === 0 ? count - 1 : count) : "N-1";
        formElements.roundsHint.textContent = `Round Robin requires exactly ${req} rounds.`;
    } else {
        const rec = count >= 2 ? Math.min(count - 1, Math.max(3, Math.ceil(Math.log2(count)) + 1)) : 5;
        formElements.roundsHint.textContent = `Suggested for Swiss: ${rec} rounds.`;
    }
}

function updateParticipantMode() {
    const isSingles = getMode() === "SINGLES";
    const type = isSingles ? "Player" : "Team";

    if (formElements.participantHeading) {
        formElements.participantHeading.textContent = `${type}s`;
    }
    if (formElements.participantName) {
        formElements.participantName.placeholder = `Add ${type.toLowerCase()}...`;
    }
    if (formElements.boardsGroup) {
        formElements.boardsGroup.style.display = isSingles ? "none" : "flex";
    }

    renderParticipants();
    saveSetup();
}

function renderParticipants() {
    formElements.participantList.replaceChildren();
    getParticipants().forEach((name, i) => addParticipantNode(name, i + 1));
    updateParticipantCounter();
    updateRoundsRecommendation();
    updateNavState();
}

function addParticipantNode(name, seedIndex) {
    const li = document.createElement("li");
    li.dataset.name = name;

    const info = document.createElement("div");
    info.className = "roster-info";

    const seed = document.createElement("span");
    seed.className = "roster-seed";
    seed.textContent = seedIndex || formElements.participantList.children.length + 1;

    const nameSpan = document.createElement("span");
    nameSpan.className = "roster-name";
    nameSpan.textContent = name;

    info.append(seed, nameSpan);

    const actions = document.createElement("div");
    actions.className = "roster-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "roster-action-btn";
    editBtn.textContent = "Edit";
    editBtn.onclick = () => {
        const next = prompt("Rename participant:", name);
        if (next && next.trim() && next.trim() !== name) {
            const trimmed = next.trim();
            const exists = getCurrentList().some((n) => n.toLowerCase() === trimmed.toLowerCase() && n !== name);
            if (exists) {
                toast("A participant with that name already exists.");
                return;
            }
            nameSpan.textContent = trimmed;
            li.dataset.name = trimmed;
            saveSetup();
        }
    };

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "roster-action-btn del";
    delBtn.textContent = "Remove";
    delBtn.onclick = () => {
        li.remove();
        refreshSeeds();
        saveSetup();
        updateNavState();
    };

    actions.append(editBtn, delBtn);
    li.append(info, actions);
    formElements.participantList.appendChild(li);
}

function refreshSeeds() {
    formElements.participantList.querySelectorAll("li").forEach((li, idx) => {
        const el = li.querySelector(".roster-seed");
        if (el) el.textContent = idx + 1;
    });
}

function addParticipant() {
    const name = formElements.participantName.value.trim();
    if (!name) return;

    const exists = getCurrentList().some((n) => n.toLowerCase() === name.toLowerCase());
    if (exists) {
        toast(`"${name}" is already registered.`);
        formElements.participantName.focus();
        return;
    }

    addParticipantNode(name, formElements.participantList.children.length + 1);
    formElements.participantName.value = "";
    formElements.participantName.focus();

    saveSetup();
    updateNavState();
}

formElements.participantForm.onsubmit = (e) => {
    e.preventDefault();
    addParticipant();
};

document.querySelectorAll('input[name="tournament-mode"]').forEach((r) => {
    r.onchange = updateParticipantMode;
});

formElements.rules.onchange = () => {
    const preset = SCORING_PRESETS[formElements.rules.value];
    if (preset) {
        formElements.pointsWin.value = preset.win;
        formElements.pointsDraw.value = preset.draw;
    }
    saveSetup();
};

formElements.pairingSystem.onchange = () => {
    const count = getCurrentList().length;
    if (formElements.pairingSystem.value === "ROUND_ROBBIN" && count >= 2) {
        formElements.rounds.value = count % 2 === 0 ? count - 1 : count;
    }
    saveSetup();
};

// Bulk Add Dialog
const bulkModal = document.getElementById("bulk-modal");
const bulkBtn = document.getElementById("bulk-add-btn");
const bulkText = document.getElementById("bulk-textarea");

if (bulkBtn && bulkModal) {
    bulkBtn.onclick = () => {
        bulkText.value = "";
        bulkModal.style.display = "flex";
        bulkText.focus();
    };

    const closeBulk = () => {
        bulkModal.style.display = "none";
    };

    document.getElementById("bulk-modal-cancel").onclick = closeBulk;
    document.getElementById("bulk-modal-close").onclick = closeBulk;
    bulkModal.onclick = (e) => {
        if (e.target === bulkModal) closeBulk();
    };

    document.getElementById("bulk-modal-submit").onclick = () => {
        const entries = bulkText.value.split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean);
        const current = getCurrentList();
        let added = 0;

        entries.forEach((name) => {
            if (!current.some((x) => x.toLowerCase() === name.toLowerCase())) {
                addParticipantNode(name, formElements.participantList.children.length + 1);
                current.push(name);
                added++;
            }
        });

        saveSetup();
        updateNavState();
        closeBulk();
        if (added > 0) toast(`Added ${added} participants.`);
    };
}

// Sample Data Button
document.getElementById("demo-data-btn").onclick = () => {
    const mode = getMode();
    const data = SAMPLE_DATA[mode] || SAMPLE_DATA.TEAM;

    formElements.participantList.replaceChildren();
    data.forEach((name, i) => addParticipantNode(name, i + 1));

    if (!formElements.name.value.trim()) {
        formElements.name.value = mode === "SINGLES" ? "Masters Invitational" : "Club Championship";
    }

    if (formElements.pairingSystem.value === "ROUND_ROBBIN") {
        formElements.rounds.value = data.length - 1;
    } else {
        formElements.rounds.value = 5;
    }

    saveSetup();
    updateNavState();
    toast(`Loaded ${data.length} sample entries.`);
};

// Shuffle Button
document.getElementById("shuffle-btn").onclick = () => {
    const list = getCurrentList();
    if (list.length < 2) return;

    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }

    formElements.participantList.replaceChildren();
    list.forEach((name, i) => addParticipantNode(name, i + 1));
    saveSetup();
    toast("Seeding randomized.");
};

// Clear All Button
document.getElementById("clear-participants-btn").onclick = () => {
    if (getCurrentList().length === 0) return;
    if (confirm("Remove all participants?")) {
        formElements.participantList.replaceChildren();
        saveSetup();
        updateNavState();
    }
};

// Start Tournament
formElements.startButton.onclick = () => {
    const name = formElements.name.value.trim();
    const list = getCurrentList();

    if (!name) {
        toast("Please provide a tournament name.");
        formElements.name.focus();
        return;
    }

    if (list.length < 2) {
        toast("At least 2 participants are required.");
        formElements.participantName.focus();
        return;
    }

    const hasTournament = !!localStorage.getItem("TournaMate-pairings");
    if (hasTournament && !confirm("Starting a new tournament will reset current pairings. Continue?")) {
        return;
    }

    saveSetup();
    localStorage.removeItem("TournaMate-pairings");
    localStorage.removeItem("TournaMate-history");
    if (typeof tournament !== "undefined") tournament = null;

    updateNavState();
    if (typeof window.openExcludeModal === "function") {
        window.openExcludeModal(true);
    } else {
        openPairings();
    }
};

[
    formElements.name, formElements.boards,
    formElements.rounds, formElements.pointsWin, formElements.pointsDraw
].forEach((el) => {
    el?.addEventListener("change", saveSetup);
});

// View Navigation
function showView(name, activeTarget = name) {
    document.querySelectorAll(".view").forEach((v) => {
        v.classList.toggle("active", v.dataset.view === name);
    });
    document.querySelectorAll(".nav-tab[data-target]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.target === activeTarget);
    });
    window.scrollTo({ top: 0, behavior: "auto" });
}

function openPairings() {
    showView("pairings", "pairings");
    if (typeof window.startPairings === "function" && !window.startPairings()) {
        showView("setup", "setup");
    }
}

function openResults() {
    showView("results", "results");
    if (typeof window.startPairings === "function" && !window.startPairings()) {
        showView("setup", "setup");
        return;
    }
    if (typeof window.renderResults === "function") {
        window.renderResults();
    }
}

function openStandings() {
    showView("standings", "standings");
    if (typeof window.startPairings === "function" && !window.startPairings()) {
        showView("setup", "setup");
        return;
    }
    if (typeof window.renderDetailedStandings === "function") {
        window.renderDetailedStandings();
    }
}

function updateNavState() {
    const setup = getSavedSetup();
    const hasTournament = !!localStorage.getItem("TournaMate-pairings");
    const count = setup ? ((setup.mode === "SINGLES" ? setup.players?.length : setup.teams?.length) || 0) : 0;
    const canAccess = hasTournament || count >= 2;

    const navPairings = document.getElementById("nav-pairings");
    const navResults = document.getElementById("nav-results");
    const navStandings = document.getElementById("nav-standings");
    const resetBtn = document.getElementById("reset-btn");

    if (navPairings) navPairings.disabled = !canAccess;
    if (navResults) navResults.disabled = !canAccess;
    if (navStandings) navStandings.disabled = !canAccess;
    if (resetBtn) resetBtn.disabled = !hasTournament;
}

window.updateNavState = updateNavState;

function loadSetup() {
    const setup = getSavedSetup();
    formElements.name.value = setup.tournamentName || "";
    formElements.pairingSystem.value = setup.pairingSystem || "SWISS";
    formElements.boards.value = setup.boards ?? 4;
    formElements.rounds.value = setup.rounds ?? 5;
    formElements.rules.value = setup.rules || "TEAM_POINTS";
    formElements.pointsWin.value = setup.pointsWin ?? 2;
    formElements.pointsDraw.value = setup.pointsDraw ?? 1;

    const mode = setup.mode === "SINGLES" ? "SINGLES" : "TEAM";
    const radio = document.querySelector(`input[name="tournament-mode"][value="${mode}"]`);
    if (radio) radio.checked = true;

    updateParticipantMode();
}

loadSetup();
