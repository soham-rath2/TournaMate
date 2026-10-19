"use strict";

function getTournamentMode() {
    const selected = document.querySelector('input[name="tournament-mode":checked');
    return selected ? selected.value : "TEAM";
}

function saveSetup() {
    const setup = {
        tournamentName: document.getElementById("tournament-name").value,
        mode: getTournamentMode(),
        pairingSystem: document.getElementById("pairing-system").value,
        boards: document.getElementById("total-boards").value,
        rounds: document.getElementById("total-rounds").value,
        rules: document.getElementById("rules").value,
        pointsWin: document.getElementById("points-win").value,
        pointsDraw: document.getElementById("points-draw").value,
        teams: [...document.querySelector("#team-list li")].map((item) => item.dataset.name),
        players: [...document.querySelector("#player-list li")].map((item) => item.dataset.name),
    }

    localStorage.setItem("TournaMate-setup", JSON.stringify(setup));
}

function addParticipant(inputId, listId, type) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    const name = input.value.trim();

    if (!name) {
        alert(`Please enter a ${type}.`)
        input.focus();
        return;
    }

    const existingNames = [...list.querySelectorAll("li")].map((item) => item.dataset.name.toLocaleLowerCase());

    if (existingNames.includes(name.toLocaleLowerCase())) {
        alert(`${type} already exists.`);
        input.focus();
        return;
    }

    const item = document.createElement("li");
    item.dataset.name = name;

    const nameLabel = document.createElement("span");
    nameLabel.textContent = name;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "delete-btn";
    removeButton.textContent = "x";
    removeButton.setAttribute("aria-label", `remove ${name}`)

    removeButton.addEventListener("click", () => {
        item.remove();
        saveSetup();
    })

    item.append(nameLabel, removeButton);
    list.appendChild(item);

    input.value = "";
    input.focus();

    saveSetup();
}

function addTeam() {
    addParticipant("new-team-name", "team-list", "team-name");
}

function addPlayer() {
    addParticipant("new-player-name", "player-list", "player-name");
}

function startTournament() {
    const name = document.getElementById("tournament-name").value.trim();
    const teams = document.getElementById("team-list").querySelector("li");
    const rounds = Number(document.getElementById("total-rounds").value);
    const boards = Number(document.getElementById("boards-count").value);

    if (!name) {
        alert("Please enter a name!");
        return;
    }

    if (teams.length < 2) {
        alert("Atleast 2 teams needed");
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

document.addEventListener("DOMContentLoaded", () => {
    const settings = [
        "tournament-name",
        "pairing-system",
        "boards-count",
        "total-rounds",
        "rules",
        "points-win",
        "points-draw",
        "tournament-name-singles",
        "pairing-system-singles",
        "boards-count-singles",
        "total-rounds-singles",
        "rules-singles",
        "points-win-singles",
        "points-draw-singles"
    ];

    settings.forEach((id) => {
        const element = document.getElementById(id);

        if (element) {
            element.addEventListener("change", saveSetup);
        }
    })
})