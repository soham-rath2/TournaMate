"use strict";

const modeIputs = document.querySelectorAll('input[name="tournament-mode"]');

const participantHeading = document.getElementById("participant-heading");
const participantForm = document.getElementById("participant-form");
const participantName = document.getElementById("participant-name");
const participantList = document.getElementById("participant-list");

function getTournamentMode() {
    return document.querySelector('input[name="tournament-mode"]:checked').value;
}

function getParticipantType() {
    return getTournamentMode() === "TEAM" ? "Team" : "Player";
}

function updateParticipantMode() {
    const type = getParticipantType();

    participantHeading.textContent = `Add ${type}`;
    participantName.placeholder = `New ${type}`;
    participantName.setAttribute("aria-label", `New ${type} name`);

    renderParticipants();
    saveSetup();
}

function renderParticipants() {
    const setup = JSON.parse(localStorage.getItem("TournaMate-setup") || "{}");

    participantList.replaceChildren();

    const participants = setup.mode === getTournamentMode() ? setup.participants || [] : [];

    participants.forEach((name) => {
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
    removeButton.textContent = "x";
    removeButton.setAttribute("aria-label", `remove ${name}`);

    removeButton.addEventListener("click", () => {
        item.remove();
        saveSetup();
    });

    item.append(nameLabel, removeButton);
    participantList.appendChild(item);
}

function saveSetup() {
    const setup = {
        tournamentName: document.getElementById("tournament-name").value.trim(),
        mode: getTournamentMode(),
        pairingSystem: document.getElementById("pairing-system").value,
        boards: Number(document.getElementById("boards-count").value),
        rounds: Number(document.getElementById("total-rounds").value),
        rules: document.getElementById("rules").value,
        pointsWin: Number(document.getElementById("points-win").value),
        pointsDraw: Number(document.getElementById("points-draw").value),
        participants: [...participantList.querySelectorAll("li")].map((item) => item.dataset.name)
    };

    localStorage.setItem("TournaMate-setup", JSON.stringify(setup));
}


function addParticipant() {
    const type = getParticipantType();
    const name = participantName.value.trim();

    if (!name) {
        alert(`Please enter a ${type.toLowerCase()} name.`);
        participantName.focus();
        return;
    }

    const existingNames = [
        ...participantList.querySelectorAll("li")
    ].map(item => item.dataset.name.toLowerCase());

    if (existingNames.includes(name.toLowerCase())) {
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
    const name = document.getElementById("tournament-name").value.trim();
    const participants = participantList.querySelectorAll("li");
    const rounds = Number(document.getElementById("total-rounds").value);
    const boards = Number(document.getElementById("boards-count").value);
    const type = getParticipantType();

    if (!name) {
        alert("Please enter a name!");
        return;
    }

    if (participants.length < 2) {
        alert(`Atleast 2 ${type.toLowerCase()}s needed`);
        return;
    }

    if (!Number.isInteger(rounds)) {
        alert("Please enter a valid number of rounds.");
        return;
    }

    if (!Number.isInteger(boards)) {
        alert("Please enter a valid amount of boards.");
        return;
    }

    saveSetup();
    alert("Tournament Setup was saved.");
}

participantForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addParticipant();
});

modeInputs.forEach((input) => {
    input.addEventListener("change", updateParticipantMode);
});

document.querySelectorAll("#tournament-name, #pairing-system, #boards-count, #total-rounds, #rules, #points-win, #points-draw").forEach((input) => {
    input.addEventListener("change", saveSetup);
})


updateParticipantMode();