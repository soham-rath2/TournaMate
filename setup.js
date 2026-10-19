
"use strict";

const STORAGE_KEY = "TournaMate-setup";

const modeInputs = document.querySelectorAll(
    'input[name="tournament-mode"]'
);

const participantHeading = document.getElementById("participant-heading");
const participantForm = document.getElementById("participant-form");
const participantName = document.getElementById("participant-name");
const participantList = document.getElementById("participant-list");
const startButton = document.getElementById("start-tournament-btn");

function getTournamentMode() {
    return document.querySelector(
        'input[name="tournament-mode"]:checked'
    ).value;
}

function getParticipantType() {
    return getTournamentMode() === "TEAM" ? "Team" : "Player";
}

function getSavedSetup() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

function getParticipants() {
    const setup = getSavedSetup();

    return getTournamentMode() === "TEAM"
        ? setup.teams || []
        : setup.players || [];
}

function saveSetup() {
    const setup = getSavedSetup();

    setup.tournamentName = document
        .getElementById("tournament-name").value.trim();

    setup.mode = getTournamentMode();

    setup.pairingSystem = document
        .getElementById("pairing-system").value;

    setup.boards = Number(
        document.getElementById("boards-count").value
    );

    setup.rounds = Number(
        document.getElementById("total-rounds").value
    );

    setup.rules = document.getElementById("rules").value;

    setup.pointsWin = Number(
        document.getElementById("points-win").value
    );

    setup.pointsDraw = Number(
        document.getElementById("points-draw").value
    );

    setup.teams = setup.teams || [];
    setup.players = setup.players || [];

    if (getTournamentMode() === "TEAM") {
        setup.teams = getCurrentList();
    } else {
        setup.players = getCurrentList();
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
}

function getCurrentList() {
    return [...participantList.querySelectorAll("li")]
        .map((item) => item.dataset.name);
}

function updateParticipantMode() {
    const type = getParticipantType();

    participantHeading.textContent = `Add ${type}s`;
    participantName.placeholder = `New ${type}`;
    participantName.setAttribute(
        "aria-label",
        `New ${type} name`
    );

    renderParticipants();
    saveSetup();
}

function renderParticipants() {
    participantList.replaceChildren();

    getParticipants().forEach((name) => {
        createParticipantItem(name);
    });
}

function createParticipantItem(name) {
    const item = document.createElement("li");
    item.dataset.name = name;

    const nameLabel = document.createElement("span");
    nameLabel.textContent = name;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "delete-btn";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `Remove ${name}`);

    removeButton.addEventListener("click", () => {
        item.remove();
        saveSetup();
    });

    item.append(nameLabel, removeButton);
    participantList.appendChild(item);
}

function addParticipant() {
    const name = participantName.value.trim();
    const type = getParticipantType();

    if (!name) {
        alert(`Please enter a ${type.toLowerCase()} name.`);
        participantName.focus();
        return;
    }

    const exists = getCurrentList().some(
        (existingName) =>
            existingName.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
        alert(`${type} already exists.`);
        participantName.focus();
        return;
    }

    createParticipantItem(name);
    participantName.value = "";
    participantName.focus();

    saveSetup();
}

function startTournament() {
    const name = document
        .getElementById("tournament-name").value.trim();

    const rounds = Number(
        document.getElementById("total-rounds").value
    );

    const boards = Number(
        document.getElementById("boards-count").value
    );

    const pointsWin = Number(
        document.getElementById("points-win").value
    );

    const pointsDraw = Number(
        document.getElementById("points-draw").value
    );

    const participants = getCurrentList();
    const type = getParticipantType();

    if (!name) {
        alert("Please enter a tournament name.");
        return;
    }

    if (participants.length < 2) {
        alert(`At least 2 ${type.toLowerCase()}s are required.`);
        return;
    }

    if (!Number.isInteger(rounds) || rounds < 1 || rounds > 20) {
        alert("Enter a valid number of rounds (1–20).");
        return;
    }

    if (!Number.isInteger(boards) || boards < 1 || boards > 20) {
        alert("Enter a valid number of boards (1–20).");
        return;
    }

    if (
        !Number.isFinite(pointsWin) || pointsWin < 0 ||
        !Number.isFinite(pointsDraw) || pointsDraw < 0
    ) {
        alert("Enter valid win and draw points.");
        return;
    }

    saveSetup();

    alert("Tournament setup saved.");
}

participantForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addParticipant();
});

modeInputs.forEach((input) => {
    input.addEventListener("change", updateParticipantMode);
});

startButton.addEventListener("click", startTournament);

document.querySelectorAll(
    "#tournament-name, #pairing-system, #boards-count, " +
    "#total-rounds, #rules, #points-win, #points-draw"
).forEach((input) => {
    input.addEventListener("change", saveSetup);
});

function loadSetup() {
    const setup = getSavedSetup();

    document.getElementById("tournament-name").value =
        setup.tournamentName || "";

    document.getElementById("pairing-system").value =
        setup.pairingSystem || "SWISS";

    document.getElementById("boards-count").value =
        setup.boards ?? 4;

    document.getElementById("total-rounds").value =
        setup.rounds ?? 6;

    document.getElementById("rules").value =
        setup.rules || "FIDE";

    document.getElementById("points-win").value =
        setup.pointsWin ?? 2;

    document.getElementById("points-draw").value =
        setup.pointsDraw ?? 1;

    const savedMode = setup.mode === "SINGLES" ? "SINGLES" : "TEAM";

    document.querySelector(
        `input[name="tournament-mode"][value="${savedMode}"]`
    ).checked = true;

    updateParticipantMode();
}

loadSetup();
