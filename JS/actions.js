"use strict";

const TOURNAMENTS_KEY = "TournaMate-tournaments";
const ACTIVE_TOURNAMENT_KEY = "Active-TournaMate-tournament";

function loadStoredData(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch {
        return null;
    }
}

function generateTournamentId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
}

function saveTournament() {
    // Sync current form state to SETUP_KEY if currently on the setup view
    if (typeof saveSetup === "function") {
        try {
            saveSetup();
        } catch {
            // Ignore if form is not present or populated
        }
    }

    const currentSetup = loadStoredData(SETUP_KEY);
    const currentPairings = loadStoredData(PAIRING_KEY);

    if (!currentSetup && !currentPairings) {
        return;
    }

    const hasName = Boolean(currentSetup?.tournamentName && currentSetup.tournamentName.trim());
    const participantCount = currentSetup?.mode === "SINGLES"
        ? (currentSetup.players?.length || 0)
        : (currentSetup.teams?.length || 0);
    const hasPairings = Boolean(currentPairings?.rounds && Object.keys(currentPairings.rounds).length > 0);

    // If completely empty, don't persist an empty slot
    if (!hasName && participantCount === 0 && !hasPairings) {
        return;
    }

    const tournaments = loadStoredData(TOURNAMENTS_KEY) || [];
    let activeId = localStorage.getItem(ACTIVE_TOURNAMENT_KEY);

    if (!activeId) {
        activeId = generateTournamentId();
        localStorage.setItem(ACTIVE_TOURNAMENT_KEY, activeId);
    }

    const index = tournaments.findIndex(t => t.id === activeId);
    const tournamentName = hasName ? currentSetup.tournamentName.trim() : "Untitled Tournament";

    const saved = {
        id: activeId,
        name: tournamentName,
        setup: currentSetup || {},
        pairings: currentPairings || null,
        updatedAt: new Date().toISOString()
    };

    if (index === -1) {
        tournaments.push(saved);
    } else {
        tournaments[index] = saved;
    }

    localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(tournaments));
}

function openTournament(id) {
    saveTournament();

    const tournaments = loadStoredData(TOURNAMENTS_KEY) || [];
    const tournament = tournaments.find(t => t.id === id);
    if (!tournament) return;

    localStorage.setItem(ACTIVE_TOURNAMENT_KEY, id);

    if (tournament.setup) {
        localStorage.setItem(SETUP_KEY, JSON.stringify(tournament.setup));
    } else {
        localStorage.removeItem(SETUP_KEY);
    }

    if (tournament.pairings) {
        localStorage.setItem(PAIRING_KEY, JSON.stringify(tournament.pairings));
    } else {
        localStorage.removeItem(PAIRING_KEY);
    }

    localStorage.removeItem("TournaMate-history");
    location.reload();
}

function deleteTournament(id) {
    const tournaments = loadStoredData(TOURNAMENTS_KEY) || [];
    const tournament = tournaments.find(t => t.id === id);
    const name = tournament?.name || "this tournament";

    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
        return;
    }

    const activeId = localStorage.getItem(ACTIVE_TOURNAMENT_KEY);
    const remaining = tournaments.filter(t => t.id !== id);
    localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(remaining));

    if (activeId === id) {
        if (remaining.length > 0) {
            openTournament(remaining[0].id);
            return;
        } else {
            localStorage.removeItem(ACTIVE_TOURNAMENT_KEY);
            localStorage.removeItem(SETUP_KEY);
            localStorage.removeItem(PAIRING_KEY);
            localStorage.removeItem("TournaMate-history");
            location.reload();
            return;
        }
    }

    renderTournamentList();
    if (typeof window.showToast === "function") {
        window.showToast(`Deleted "${name}"`);
    } else if (typeof toast === "function") {
        toast(`Deleted "${name}"`);
    }
}

function createNewTournament() {
    saveTournament();

    const newId = generateTournamentId();
    localStorage.setItem(ACTIVE_TOURNAMENT_KEY, newId);
    localStorage.removeItem(SETUP_KEY);
    localStorage.removeItem(PAIRING_KEY);
    localStorage.removeItem("TournaMate-history");

    location.reload();
}

function renderTournamentList() {
    const list = document.getElementById("tournament-list");
    if (!list) return;

    list.replaceChildren();

    const tournaments = loadStoredData(TOURNAMENTS_KEY) || [];
    const activeId = localStorage.getItem(ACTIVE_TOURNAMENT_KEY);

    if (!tournaments.length) {
        const empty = document.createElement("li");
        empty.className = "tournament-empty-state";
        empty.textContent = "No saved tournaments yet. Click '+ New Tournament' to create one!";
        list.appendChild(empty);
        return;
    }

    tournaments.forEach(tournament => {
        const li = document.createElement("li");
        const isCurrent = tournament.id === activeId;
        li.className = "tournament-item" + (isCurrent ? " active-tournament" : "");

        const info = document.createElement("div");
        info.className = "tournament-info";

        const titleRow = document.createElement("div");
        titleRow.className = "tournament-title-row";

        const nameSpan = document.createElement("span");
        nameSpan.className = "tournament-name";
        nameSpan.textContent = tournament.name || "Untitled Tournament";
        titleRow.appendChild(nameSpan);

        if (isCurrent) {
            const badge = document.createElement("span");
            badge.className = "badge-current";
            badge.textContent = "Current";
            titleRow.appendChild(badge);
        }

        const meta = document.createElement("div");
        meta.className = "tournament-meta";

        const count = tournament.setup?.mode === "SINGLES"
            ? (tournament.setup?.players?.length || 0)
            : (tournament.setup?.teams?.length || 0);
        const modeText = tournament.setup?.mode === "SINGLES" ? "Singles" : "Team";
        const systemText = tournament.setup?.pairingSystem === "ROUND_ROBBIN" ? "Round Robin" : "Swiss";
        const roundsText = tournament.setup?.rounds ? `${tournament.setup.rounds} Rounds` : "";

        meta.textContent = [modeText, systemText, `${count} participants`, roundsText].filter(Boolean).join(" • ");

        info.appendChild(titleRow);
        info.appendChild(meta);

        const actions = document.createElement("div");
        actions.className = "tournament-actions";

        const openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.className = isCurrent ? "btn-outline btn-sm" : "btn-solid btn-sm";
        openBtn.textContent = isCurrent ? "Active" : "Open";
        openBtn.disabled = isCurrent;
        if (!isCurrent) {
            openBtn.onclick = () => openTournament(tournament.id);
        }
        actions.appendChild(openBtn);

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "btn-icon btn-sm danger-text";
        deleteBtn.title = "Delete tournament";
        deleteBtn.innerHTML = "&times;";
        deleteBtn.setAttribute("aria-label", "Delete tournament");
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteTournament(tournament.id);
        };
        actions.appendChild(deleteBtn);

        li.appendChild(info);
        li.appendChild(actions);
        list.appendChild(li);
    });
}

function openTournamentManager() {
    saveTournament();
    renderTournamentList();
    const modal = document.getElementById("tournament-manager-modal");
    if (modal) {
        modal.style.display = "flex";
    }
}

function closeTournamentManager() {
    const modal = document.getElementById("tournament-manager-modal");
    if (modal) {
        modal.style.display = "none";
    }
}

function initTournamentManager() {
    const tournamentBtn = document.getElementById("tournament-btn");
    if (tournamentBtn) {
        tournamentBtn.onclick = openTournamentManager;
    }

    const manageModalClose = document.getElementById("manage-modal-close");
    if (manageModalClose) {
        manageModalClose.onclick = closeTournamentManager;
    }

    const manageModalCancel = document.getElementById("manage-modal-cancel");
    if (manageModalCancel) {
        manageModalCancel.onclick = closeTournamentManager;
    }

    const createTournamentBtn = document.getElementById("create-tournament");
    if (createTournamentBtn) {
        createTournamentBtn.onclick = createNewTournament;
    }

    const tournamentModal = document.getElementById("tournament-manager-modal");
    if (tournamentModal) {
        tournamentModal.onclick = (e) => {
            if (e.target === tournamentModal) {
                closeTournamentManager();
            }
        };
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTournamentManager);
} else {
    initTournamentManager();
}