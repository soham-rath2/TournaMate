"use strict";

function load(key) {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch {
        return null;
    }
}

function persist() {
    localStorage.setItem(PAIRING_KEY, JSON.stringify(tournament));
    if (typeof updateNavState === "function") updateNavState();
    syncUndoRedo();
}

function pushHistory() {
    if (!tournament) return;
    undoStack.push(JSON.parse(JSON.stringify(tournament)));
    if (undoStack.length > 50) undoStack.shift();
    redoStack = [];
    syncUndoRedo();
}

function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(JSON.parse(JSON.stringify(tournament)));
    tournament = undoStack.pop();
    persist();
    renderAll();
    window.showToast?.("Undo");
}

function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(JSON.parse(JSON.stringify(tournament)));
    tournament = redoStack.pop();
    persist();
    renderAll();
    window.showToast?.("Redo");
}

function syncUndoRedo() {
    const undoBtn = document.getElementById("undo-btn");
    const redoBtn = document.getElementById("redo-btn");
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
    }
});

document.getElementById("undo-btn").onclick = undo;
document.getElementById("redo-btn").onclick = redo;

// Reset Dialog
const resetModal = document.getElementById("reset-modal");
const resetBtn = document.getElementById("reset-btn");
const closeReset = () => { resetModal.style.display = "none"; };

if (resetBtn && resetModal) {
    resetBtn.onclick = () => { resetModal.style.display = "flex"; };
    document.getElementById("reset-modal-close").onclick = closeReset;
    document.getElementById("reset-modal-cancel").onclick = closeReset;
    resetModal.onclick = (e) => { if (e.target === resetModal) closeReset(); };
}



function resetPairingsOnly() {
    pushHistory();
    localStorage.removeItem(PAIRING_KEY);
    tournament = { rounds: {} };
    generateRound(1);
    persist();
    selectedRound = 1;
    resultsSelectedRound = 1;
    updateRoundSelectors();
    renderAll();
    closeReset();
    window.showToast?.("Pairings reset");
}

function resetAll() {
    if (confirm("Do you really want to delete the entire tourament?")) {
        localStorage.removeItem(PAIRING_KEY);
        localStorage.removeItem(SETUP_KEY);
        closeReset();
        location.reload();
    }
}

function startPairings(excluded = []) {
    selectedRound = 1;
    resultsSelectedRound = 1;
    setup = load(SETUP_KEY);

    if (!setup || (!setup.tournamentName && !setup.teams?.length && !setup.players?.length)) {
        window.showToast?.("Configure tournament setup first");
        window.showView?.("setup", "setup");
        return false;
    }

    mode = setup.mode || "TEAM";
    participants = (mode === "SINGLES" ? setup.players : setup.teams) || [];

    if (participants.length < 2) {
        window.showToast?.("At least 2 participants required");
        window.showView?.("setup", "setup");
        return false;
    }

    pointsWin = Number(setup.pointsWin ?? 2);
    pointsDraw = Number(setup.pointsDraw ?? 1);
    totalRounds = Number(setup.rounds || 5);
    pairingSystem = setup.pairingSystem || "SWISS";

    const labelMode = mode === "SINGLES" ? "Individual" : "Team";
    const labelType = mode === "SINGLES" ? "Players" : "Teams";
    const labelSystem = pairingSystem === "ROUND_ROBBIN" ? "Round Robin" : "Swiss";
    const summary = `${labelMode} • ${labelSystem} • ${totalRounds} Rounds • ${participants.length} ${labelType}`;

    const tName = setup.tournamentName || "Tournament";
    document.getElementById("tournament-title").textContent = `${tName} - Pairings`;
    document.getElementById("tournament-info").textContent = summary;
    document.getElementById("results-tournament-title").textContent = `${tName} - Results`;
    document.getElementById("results-tournament-info").textContent = summary;
    document.getElementById("standings-page-title").textContent = `${tName} - Standings`;
    document.getElementById("standings-page-info").textContent = summary;

    document.querySelectorAll(".participant-col-header").forEach((th) => {
        th.textContent = mode === "SINGLES" ? "Player" : "Team";
    });

    tournament = load(PAIRING_KEY);
    if (!tournament || !tournament.rounds || !tournament.rounds[1]) {
        tournament = { rounds: {} };
        generateRound(1, excluded);
        persist();
    }

    updateRoundSelectors();
    document.getElementById("generate-round-btn").onclick = () => openExcludeModal(false);
    if (typeof updateNavState === "function") updateNavState();
    syncUndoRedo();
    renderAll();
    return true;
}

function renderAll() {
    if (typeof render === "function") render();
    if (typeof renderResults === "function") renderResults();
    if (typeof renderDetailedStandings === "function") renderDetailedStandings();
}

function updateRoundSelectors() {
    const pSelect = document.getElementById("round-select");
    const rSelect = document.getElementById("results-round-select");
    if (!pSelect || !rSelect) return;

    pSelect.replaceChildren();
    rSelect.replaceChildren();

    const maxRound = tournament?.rounds ? Math.max(1, ...Object.keys(tournament.rounds).map(Number)) : 1;
    const count = pairingSystem === "ROUND_ROBBIN" ? Math.max(maxRound, totalRounds) : maxRound;

    for (let r = 1; r <= count; r++) {
        const opt = document.createElement("option");
        opt.value = r;
        opt.textContent = `Round ${r}`;
        pSelect.appendChild(opt);
    }

    for (let r = 1; r <= maxRound; r++) {
        const opt = document.createElement("option");
        opt.value = r;
        opt.textContent = `Round ${r}`;
        rSelect.appendChild(opt);
    }

    if (selectedRound > count) selectedRound = count;
    if (resultsSelectedRound > maxRound) resultsSelectedRound = maxRound;

    pSelect.value = selectedRound;
    rSelect.value = resultsSelectedRound;

    pSelect.onchange = (e) => {
        selectedRound = Number(e.target.value);
        if (!tournament.rounds[selectedRound] && pairingSystem === "ROUND_ROBBIN") {
            generateRound(selectedRound);
            persist();
            updateRoundSelectors();
        }
        render();
    };

    rSelect.onchange = (e) => {
        resultsSelectedRound = Number(e.target.value);
        renderResults();
    };
}

function computeStandings() {
    const stats = {};
    participants.forEach((name) => {
        stats[name] = {
            name,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            points: 0,
            opponents: [],
            defeated: [],
            drawn: [],
            buchholz: 0,
            sonnebornBerger: 0
        };
    });

    if (tournament?.rounds) {
        Object.values(tournament.rounds).forEach((roundMatches) => {
            roundMatches.forEach(({ p1, p2, result }) => {
                if (p2 === "BYE") {
                    if (stats[p1]) {
                        stats[p1].played++;
                        stats[p1].wins++;
                        stats[p1].points += pointsWin;
                    }
                    return;
                }

                if (!result) return;

                if (stats[p1]) {
                    stats[p1].played++;
                    stats[p1].opponents.push(p2);
                }
                if (stats[p2]) {
                    stats[p2].played++;
                    stats[p2].opponents.push(p1);
                }

                if (result === "1-0") {
                    if (stats[p1]) {
                        stats[p1].wins++;
                        stats[p1].points += pointsWin;
                        stats[p1].defeated.push(p2);
                    }
                    if (stats[p2]) stats[p2].losses++;
                } else if (result === "0-1") {
                    if (stats[p2]) {
                        stats[p2].wins++;
                        stats[p2].points += pointsWin;
                        stats[p2].defeated.push(p1);
                    }
                    if (stats[p1]) stats[p1].losses++;
                } else if (result === "0.5-0.5") {
                    if (stats[p1]) {
                        stats[p1].draws++;
                        stats[p1].points += pointsDraw;
                        stats[p1].drawn.push(p2);
                    }
                    if (stats[p2]) {
                        stats[p2].draws++;
                        stats[p2].points += pointsDraw;
                        stats[p2].drawn.push(p1);
                    }
                }
            });
        });
    }

    Object.values(stats).forEach((player) => {
        player.buchholz = player.opponents.reduce((acc, opp) => acc + (stats[opp]?.points || 0), 0);
        player.sonnebornBerger = player.defeated.reduce((acc, opp) => acc + (stats[opp]?.points || 0), 0)
            + player.drawn.reduce((acc, opp) => acc + (stats[opp]?.points || 0) * 0.5, 0);
    });

    return Object.values(stats).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
        if (b.sonnebornBerger !== a.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.played !== a.played) return b.played - a.played;
        return a.name.localeCompare(b.name);
    });
}

function hasPlayedBefore(p1, p2) {
    if (!tournament?.rounds) return false;
    for (const matches of Object.values(tournament.rounds)) {
        for (const m of matches) {
            if ((m.p1 === p1 && m.p2 === p2) || (m.p1 === p2 && m.p2 === p1)) {
                return true;
            }
        }
    }
    return false;
}

function generateSwiss(roundNum, excluded = []) {
    const excludeSet = new Set(excluded);
    const pool = [...computeStandings().map((s) => s.name)].filter((name) => !excludeSet.has(name));
    if (pool.length < 2) return [];
    const matches = [];
    let byePlayer = null;

    if (pool.length % 2 !== 0) {
        let byeIdx = pool.length - 1;
        for (let i = pool.length - 1; i >= 0; i--) {
            if (!hasPlayedBefore(pool[i], "BYE")) {
                byeIdx = i;
                break;
            }
        }
        byePlayer = pool.splice(byeIdx, 1)[0];
    }

    const pairs = findSwissPairs(pool);
    pairs.forEach(([p1, p2], idx) => {
        matches.push({ id: `${roundNum}-${idx + 1}`, p1, p2, result: null });
    });

    if (byePlayer) {
        matches.push({ id: `${roundNum}-bye`, p1: byePlayer, p2: "BYE", result: "1-0" });
    }

    return matches;
}

function findSwissPairs(pool) {
    if (pool.length === 0) return [];
    if (pool.length === 2) return [[pool[0], pool[1]]];

    function solve(used, pairs, strict) {
        if (pairs.length * 2 === pool.length) return pairs;
        let p1Idx = 0;
        while (p1Idx < pool.length && used.has(pool[p1Idx])) p1Idx++;
        if (p1Idx >= pool.length) return pairs;

        const p1 = pool[p1Idx];
        used.add(p1);

        for (let j = p1Idx + 1; j < pool.length; j++) {
            const p2 = pool[j];
            if (!used.has(p2) && (!strict || !hasPlayedBefore(p1, p2))) {
                used.add(p2);
                pairs.push([p1, p2]);
                const next = solve(used, pairs, strict);
                if (next) return next;
                pairs.pop();
                used.delete(p2);
            }
        }
        used.delete(p1);
        return null;
    }

    return solve(new Set(), [], true) || solve(new Set(), [], false) || [];
}

function generateRoundRobin(roundNum, excluded = []) {
    const excludeSet = new Set(excluded);
    const list = participants.filter((participant) => !excludeSet.has(participant));
    if (list.length < 2) return [];
    if (list.length % 2 !== 0) list.push("BYE");

    const n = list.length;
    const r = roundNum - 1;
    const matches = [];

    const current = [list[0]];
    const rest = list.slice(1);
    const offset = r % (n - 1);
    current.push(...rest.slice(offset).concat(rest.slice(0, offset)));

    for (let i = 0; i < n / 2; i++) {
        let p1 = current[i];
        let p2 = current[n - 1 - i];

        if (r % 2 === 1 && i === 0) [p1, p2] = [p2, p1];

        if (p1 === "BYE") {
            matches.push({ id: `${roundNum}-${i + 1}`, p1: p2, p2: "BYE", result: "1-0" });
        } else if (p2 === "BYE") {
            matches.push({ id: `${roundNum}-${i + 1}`, p1, p2, result: "1-0" });
        } else {
            matches.push({ id: `${roundNum}-${i + 1}`, p1, p2, result: null });
        }
    }

    return matches;
}

function generateRound(roundNum, excluded = []) {
    if (!tournament || !tournament.rounds) {
        tournament = { rounds: {} };
    }
    if (!tournament.rounds[roundNum]) {
        tournament.rounds[roundNum] = pairingSystem === "ROUND_ROBBIN"
            ? generateRoundRobin(roundNum, excluded)
            : generateSwiss(roundNum, excluded);
    }
}

function handleNextRound(excludeList = [], skipPendingConfirm = false) {
    if (!tournament || !tournament.rounds) {
        tournament = load(PAIRING_KEY);
        if (!tournament || !tournament.rounds) {
            if (!startPairings()) return;
        }
    }

    const roundsKeys = Object.keys(tournament.rounds || {});
    const maxRound = roundsKeys.length > 0 ? Math.max(1, ...roundsKeys.map(Number)) : 1;

    if (maxRound >= totalRounds) {
        window.showToast?.(`All ${totalRounds} rounds generated`);
        return;
    }

    const currentMatches = tournament.rounds[maxRound] || [];
    const pending = currentMatches.filter((m) => m.p2 !== "BYE" && !m.result).length;

    if (!skipPendingConfirm && pending > 0 && !confirm(`Round ${maxRound} has ${pending} pending match(es). Proceed?`)) {
        return;
    }

    const excluded = Array.isArray(excludeList)
        ? excludeList
        : (excludeList instanceof Set ? Array.from(excludeList) : []);

    if (!participants || participants.length === 0) {
        if (!setup) setup = load(SETUP_KEY) || {};
        mode = setup.mode || mode || "TEAM";
        participants = (mode === "SINGLES" ? setup.players : setup.teams) || [];
    }

    if (!participants || participants.length === 0) {
        const pSet = new Set();
        if (tournament?.rounds) {
            Object.values(tournament.rounds).forEach((round) => {
                round.forEach((m) => {
                    if (m.p1 && m.p1 !== "BYE") pSet.add(m.p1);
                    if (m.p2 && m.p2 !== "BYE") pSet.add(m.p2);
                });
            });
        }
        participants = Array.from(pSet);
    }

    const activeCount = participants.filter((p) => !excluded.includes(p)).length;
    if (activeCount < 2) {
        window.showToast?.("At least 2 active participants required to generate a round");
        return;
    }

    pushHistory();
    const nextRound = maxRound + 1;
    generateRound(nextRound, excluded);
    persist();

    selectedRound = nextRound;
    resultsSelectedRound = nextRound;
    updateRoundSelectors();
    renderAll();
    window.showToast?.(`Round ${nextRound} ready`);
}

function setResult(roundNum, matchIndex, result) {
    const match = tournament.rounds?.[roundNum]?.[matchIndex];
    if (!match) return;

    pushHistory();
    match.result = match.result === result ? null : result;
    persist();
    renderAll();
}

const excludeConfirmBtn = document.getElementById("exclude-confirm");
const excludeCancelBtn = document.getElementById("exclude-cancel");
const excludeCloseBtn = document.getElementById("exclude-modal-close");
const generateRoundBtn = document.getElementById("generate-round-btn");
const excludeNames = new Set();
let isInitialRoundModal = false;

function openExcludeModal(isInitial = false) {
    if (!setup) {
        setup = load(SETUP_KEY) || {};
    }

    mode = setup.mode || mode || "TEAM";
    totalRounds = Number(setup.rounds || totalRounds || 5);
    pairingSystem = setup.pairingSystem || pairingSystem || "SWISS";

    if (!participants || participants.length === 0) {
        participants = (mode === "SINGLES" ? setup.players : setup.teams) || [];
    }

    tournament = load(PAIRING_KEY);
    const hasExistingRounds = Boolean(tournament?.rounds && tournament.rounds[1]);
    isInitialRoundModal = (isInitial === true) || !hasExistingRounds;

    if (isInitialRoundModal) {
        if (!participants || participants.length === 0) {
            setup = load(SETUP_KEY) || {};
            participants = (mode === "SINGLES" ? setup.players : setup.teams) || [];
        }
    } else {
        if (!participants || participants.length === 0) {
            const pSet = new Set();
            if (tournament?.rounds) {
                Object.values(tournament.rounds).forEach((round) => {
                    round.forEach((m) => {
                        if (m.p1 && m.p1 !== "BYE") pSet.add(m.p1);
                        if (m.p2 && m.p2 !== "BYE") pSet.add(m.p2);
                    });
                });
            }
            participants = Array.from(pSet);
        }

        const roundsKeys = Object.keys(tournament.rounds || {});
        const maxRound = roundsKeys.length > 0 ? Math.max(1, ...roundsKeys.map(Number)) : 1;

        if (maxRound >= totalRounds) {
            window.showToast?.(`All ${totalRounds} rounds generated`);
            return;
        }

        const currentMatches = tournament.rounds[maxRound] || [];
        const pending = currentMatches.filter((m) => m.p2 !== "BYE" && !m.result).length;

        if (pending > 0 && !confirm(`Round ${maxRound} has ${pending} pending match(es). Proceed?`)) {
            return;
        }
    }

    const modal = document.getElementById("exclude-participant-modal");
    const list = document.getElementById("exclude-participant-list");

    if (!modal || !list) {
        if (isInitialRoundModal) {
            if (typeof showView === "function") showView("pairings", "pairings");
            startPairings([]);
        } else {
            handleNextRound([]);
        }
        return;
    }

    excludeNames.clear();
    list.replaceChildren();

    const isSingles = mode === "SINGLES";
    const roundLabel = isInitialRoundModal ? "Round 1" : "the next round";
    const titleEl = document.getElementById("exclude-title");
    if (titleEl) {
        titleEl.textContent = isSingles ? "Exclude Players" : "Exclude Teams";
    }
    const descEl = document.querySelector(".exclude-description");
    if (descEl) {
        descEl.textContent = isSingles
            ? `Select players to sit out/exclude from ${roundLabel}.`
            : `Select teams to sit out/exclude from ${roundLabel}.`;
    }

    const confirmBtn = document.getElementById("exclude-confirm");
    if (confirmBtn) {
        confirmBtn.textContent = isInitialRoundModal ? "Start Tournament" : "Generate Round";
    }

    const names = [...participants];
    if (names.length === 0) {
        if (isInitialRoundModal) {
            if (typeof showView === "function") showView("pairings", "pairings");
            startPairings([]);
        } else {
            handleNextRound([]);
        }
        return;
    }

    names.forEach((name) => {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.addEventListener("change", () => {
            if (input.checked) excludeNames.add(name);
            else excludeNames.delete(name);
        });

        label.append(input, document.createTextNode(" " + name));
        list.appendChild(label);
    });

    modal.style.display = "flex";
}

function closeExcludeModal() {
    const modal = document.getElementById("exclude-participant-modal");
    if (modal) {
        modal.style.display = "none";
    }
}

if (excludeConfirmBtn) {
    excludeConfirmBtn.onclick = () => {
        const activeCount = participants.filter((p) => !excludeNames.has(p)).length;
        if (activeCount < 2) {
            window.showToast?.("At least 2 active participants required to generate a round");
            return;
        }
        closeExcludeModal();
        const excluded = Array.from(excludeNames);
        if (isInitialRoundModal) {
            if (typeof showView === "function") showView("pairings", "pairings");
            startPairings(excluded);
        } else {
            handleNextRound(excluded, true);
        }
    };
}

if (excludeCancelBtn) {
    excludeCancelBtn.onclick = closeExcludeModal;
}

if (excludeCloseBtn) {
    excludeCloseBtn.onclick = closeExcludeModal;
}

const modalElem = document.getElementById("exclude-participant-modal");
if (modalElem) {
    modalElem.onclick = (e) => {
        if (e.target === modalElem) closeExcludeModal();
    };
}

if (generateRoundBtn) {
    generateRoundBtn.onclick = () => openExcludeModal(false);
}

window.openExcludeModal = openExcludeModal;
window.closeExcludeModal = closeExcludeModal;
window.handleNextRound = handleNextRound;

function updateAnalytics() {
    let total = 0;
    let completed = 0;

    if (tournament?.rounds) {
        Object.values(tournament.rounds).forEach((roundMatches) => {
            roundMatches.forEach((m) => {
                total++;
                if (m.p2 === "BYE" || m.result !== null) completed++;
            });
        });
    }

    const pending = total - completed;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.getElementById("total-matches").textContent = total;
    document.getElementById("completed-matches").textContent = completed;
    document.getElementById("pending-matches").textContent = pending;
    document.getElementById("tournament-progress-percent").textContent = `${progress}%`;
    document.getElementById("tournament-progress-fill").style.width = `${progress}%`;
}

window.startPairings = startPairings;