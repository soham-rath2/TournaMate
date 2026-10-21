"use strict";

var SETUP_KEY = window.SETUP_KEY || "TournaMate-setup";
var PAIRING_KEY = "TournaMate-pairings";

let setup = null;
let tournament = null;
let participants = [];
let selectedRound = 1;
let resultsSelectedRound = 1;
let pointsWin = 2;
let pointsDraw = 1;
let totalRounds = 5;
let mode = "TEAM";
let pairingSystem = "SWISS";

let undoStack = [];
let redoStack = [];

function load(key) {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch {
        return null;
    }
}

function persist() {
    localStorage.setItem(PAIRING_KEY, JSON.stringify(tournament));
    updateNavState();
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

    document.getElementById("reset-pairings-only-btn").onclick = () => {
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
    };

    document.getElementById("reset-all-btn").onclick = () => {
        localStorage.removeItem(PAIRING_KEY);
        localStorage.removeItem(SETUP_KEY);
        closeReset();
        location.reload();
    };
}

function startPairings() {
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
        generateRound(1);
        persist();
    }

    updateRoundSelectors();
    document.getElementById("generate-round-btn").onclick = handleNextRound;
    updateNavState();
    syncUndoRedo();
    renderAll();
    return true;
}

function renderAll() {
    render();
    renderResults();
    renderDetailedStandings();
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

function generateSwiss(roundNum) {
    const pool = [...computeStandings().map((s) => s.name)];
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

function generateRoundRobin(roundNum) {
    const list = [...participants];
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
            matches.push({ id: `${roundNum}-${i + 1}`, p1, p2: "BYE", result: "1-0" });
        } else {
            matches.push({ id: `${roundNum}-${i + 1}`, p1, p2, result: null });
        }
    }

    return matches;
}

function generateRound(roundNum) {
    if (!tournament.rounds[roundNum]) {
        tournament.rounds[roundNum] = pairingSystem === "ROUND_ROBBIN"
            ? generateRoundRobin(roundNum)
            : generateSwiss(roundNum);
    }
}

function handleNextRound() {
    const maxRound = Math.max(1, ...Object.keys(tournament.rounds).map(Number));

    if (maxRound >= totalRounds) {
        window.showToast?.(`All ${totalRounds} rounds generated`);
        return;
    }

    const currentMatches = tournament.rounds[maxRound] || [];
    const pending = currentMatches.filter((m) => m.p2 !== "BYE" && !m.result).length;

    if (pending > 0 && !confirm(`Round ${maxRound} has ${pending} pending match(es). Proceed?`)) {
        return;
    }

    pushHistory();
    const nextRound = maxRound + 1;
    generateRound(nextRound);
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

function render() {
    document.getElementById("round-title").textContent = `Round ${selectedRound}`;
    const list = document.getElementById("pairings-list");
    if (!list) return;

    list.replaceChildren();
    const matches = tournament?.rounds?.[selectedRound] || [];

    const badge = document.getElementById("pairings-round-badge");
    if (badge) {
        const completed = matches.filter((m) => m.p2 === "BYE" || m.result).length;
        const allDone = matches.length > 0 && completed === matches.length;
        badge.textContent = allDone ? `Completed (${completed}/${matches.length})` : `${completed}/${matches.length} completed`;
        badge.className = `status-pill ${allDone ? "complete" : ""}`;
    }

    if (matches.length === 0) {
        const empty = document.createElement("p");
        empty.className = "subtext";
        empty.textContent = "No matches scheduled.";
        list.appendChild(empty);
    } else {
        matches.forEach((m, idx) => {
            const row = document.createElement("div");
            row.className = "match-row";

            const pairing = document.createElement("div");
            pairing.className = "match-pairing";

            const board = document.createElement("span");
            board.className = "board-tag";
            board.textContent = `B${idx + 1}`;

            const p1 = document.createElement("span");
            p1.className = "side-p1";
            p1.textContent = m.p1;

            const vs = document.createElement("span");
            vs.className = "vs-divider";
            vs.textContent = "vs";

            const p2 = document.createElement("span");
            p2.className = "side-p2";
            p2.textContent = m.p2;

            pairing.append(board, p1, vs, p2);

            const actions = document.createElement("div");
            if (m.p2 === "BYE") {
                const bye = document.createElement("span");
                bye.className = "bye-tag";
                bye.textContent = "BYE";
                actions.appendChild(bye);
            } else {
                const selector = document.createElement("div");
                selector.className = "result-selector";

                const b1 = document.createElement("button");
                b1.type = "button";
                b1.className = `result-btn ${m.result === "1-0" ? "active" : ""}`;
                b1.textContent = `${m.p1} Win`;
                b1.onclick = () => setResult(selectedRound, idx, "1-0");

                const bD = document.createElement("button");
                bD.type = "button";
                bD.className = `result-btn ${m.result === "0.5-0.5" ? "active" : ""}`;
                bD.textContent = "Draw";
                bD.onclick = () => setResult(selectedRound, idx, "0.5-0.5");

                const b2 = document.createElement("button");
                b2.type = "button";
                b2.className = `result-btn ${m.result === "0-1" ? "active" : ""}`;
                b2.textContent = `${m.p2} Win`;
                b2.onclick = () => setResult(selectedRound, idx, "0-1");

                selector.append(b1, bD, b2);
                actions.appendChild(selector);
            }

            row.append(pairing, actions);
            list.appendChild(row);
        });
    }

    renderMiniStandings();
    updateAnalytics();
}

function renderResults() {
    document.getElementById("results-round-title").textContent = `Round ${resultsSelectedRound} Results`;
    const list = document.getElementById("results-list");
    if (!list) return;

    list.replaceChildren();
    const matches = tournament?.rounds?.[resultsSelectedRound] || [];

    const badge = document.getElementById("results-round-status");
    if (badge) {
        const completed = matches.filter((m) => m.p2 === "BYE" || m.result).length;
        const allDone = matches.length > 0 && completed === matches.length;
        badge.textContent = allDone ? `Completed (${completed}/${matches.length})` : `${completed}/${matches.length} completed`;
        badge.className = `status-pill ${allDone ? "complete" : ""}`;
    }

    matches.forEach((m, idx) => {
        const row = document.createElement("div");
        row.className = "match-row";

        const pairing = document.createElement("div");
        pairing.className = "match-pairing";

        const board = document.createElement("span");
        board.className = "board-tag";
        board.textContent = `B${idx + 1}`;

        const isP1 = m.result === "1-0" || m.p2 === "BYE";
        const isP2 = m.result === "0-1";

        const p1 = document.createElement("span");
        p1.className = `side-p1 ${isP1 ? "participant-winner" : isP2 ? "participant-loser" : ""}`;
        p1.textContent = m.p1;

        const score = document.createElement("span");
        if (m.p2 === "BYE") {
            score.className = "score-badge bye";
            score.textContent = "BYE";
        } else if (m.result === "1-0") {
            score.className = "score-badge win";
            score.textContent = "1 – 0";
        } else if (m.result === "0-1") {
            score.className = "score-badge win";
            score.textContent = "0 – 1";
        } else if (m.result === "0.5-0.5") {
            score.className = "score-badge draw";
            score.textContent = "½ – ½";
        } else {
            score.className = "score-badge pending";
            score.textContent = "Pending";
        }

        const p2 = document.createElement("span");
        p2.className = `side-p2 ${isP2 ? "participant-winner" : isP1 ? "participant-loser" : ""}`;
        p2.textContent = m.p2;

        pairing.append(board, p1, score, p2);

        const actions = document.createElement("div");
        if (m.p2 !== "BYE") {
            const selector = document.createElement("div");
            selector.className = "result-selector";

            const b1 = document.createElement("button");
            b1.type = "button";
            b1.className = `result-btn ${m.result === "1-0" ? "active" : ""}`;
            b1.textContent = `${m.p1} Win`;
            b1.onclick = () => setResult(resultsSelectedRound, idx, "1-0");

            const bD = document.createElement("button");
            bD.type = "button";
            bD.className = `result-btn ${m.result === "0.5-0.5" ? "active" : ""}`;
            bD.textContent = "Draw";
            bD.onclick = () => setResult(resultsSelectedRound, idx, "0.5-0.5");

            const b2 = document.createElement("button");
            b2.type = "button";
            b2.className = `result-btn ${m.result === "0-1" ? "active" : ""}`;
            b2.textContent = `${m.p2} Win`;
            b2.onclick = () => setResult(resultsSelectedRound, idx, "0-1");

            selector.append(b1, bD, b2);
            actions.appendChild(selector);
        }

        row.append(pairing, actions);
        list.appendChild(row);
    });

    updateAnalytics();
}

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

function renderMiniStandings() {
    const body = document.getElementById("standings-body");
    if (!body) return;

    body.replaceChildren();
    const standings = computeStandings();

    standings.forEach((st, idx) => {
        const tr = document.createElement("tr");

        const tdRank = document.createElement("td");
        tdRank.className = "col-rank";
        tdRank.textContent = idx + 1;

        const tdName = document.createElement("td");
        tdName.textContent = st.name;

        const tdP = document.createElement("td");
        tdP.textContent = st.played;

        const tdW = document.createElement("td");
        tdW.textContent = st.wins;

        const tdD = document.createElement("td");
        tdD.textContent = st.draws;

        const tdL = document.createElement("td");
        tdL.textContent = st.losses;

        const tdPts = document.createElement("td");
        tdPts.className = "col-pts";
        tdPts.textContent = st.points;

        tr.append(tdRank, tdName, tdP, tdW, tdD, tdL, tdPts);
        body.appendChild(tr);
    });
}

function renderDetailedStandings() {
    const body = document.getElementById("detailed-standings-body");
    if (!body) return;

    body.replaceChildren();
    const standings = computeStandings();

    standings.forEach((st, idx) => {
        const tr = document.createElement("tr");

        const tdRank = document.createElement("td");
        tdRank.className = "col-rank";
        tdRank.textContent = idx + 1;

        const tdName = document.createElement("td");
        tdName.innerHTML = `<strong>${st.name}</strong>`;

        const tdP = document.createElement("td");
        tdP.textContent = st.played;

        const tdW = document.createElement("td");
        tdW.textContent = st.wins;

        const tdD = document.createElement("td");
        tdD.textContent = st.draws;

        const tdL = document.createElement("td");
        tdL.textContent = st.losses;

        const tdBh = document.createElement("td");
        tdBh.textContent = st.buchholz;

        const tdSb = document.createElement("td");
        tdSb.textContent = st.sonnebornBerger;

        const tdPts = document.createElement("td");
        tdPts.className = "col-pts";
        tdPts.textContent = st.points;

        tr.append(tdRank, tdName, tdP, tdW, tdD, tdL, tdBh, tdSb, tdPts);
        body.appendChild(tr);
    });

    renderCrosstable(standings);
    checkCompletion(standings);
}

function renderCrosstable(standings) {
    const thead = document.getElementById("crosstable-head");
    const tbody = document.getElementById("crosstable-body");
    if (!thead || !tbody) return;

    thead.replaceChildren();
    tbody.replaceChildren();
    const n = standings.length;
    if (n === 0) return;

    const htr = document.createElement("tr");
    const thRank = document.createElement("th");
    thRank.textContent = "#";
    const thName = document.createElement("th");
    thName.textContent = "Participant";
    htr.append(thRank, thName);

    for (let i = 1; i <= n; i++) {
        const thNum = document.createElement("th");
        thNum.textContent = i;
        htr.appendChild(thNum);
    }

    const thPts = document.createElement("th");
    thPts.textContent = "Pts";
    htr.appendChild(thPts);
    thead.appendChild(htr);

    const h2h = {};
    if (tournament?.rounds) {
        Object.values(tournament.rounds).forEach((roundMatches) => {
            roundMatches.forEach(({ p1, p2, result }) => {
                if (!result || p2 === "BYE") return;
                if (!h2h[p1]) h2h[p1] = {};
                if (!h2h[p2]) h2h[p2] = {};

                if (result === "1-0") {
                    h2h[p1][p2] = { score: "1", cls: "cell-win" };
                    h2h[p2][p1] = { score: "0", cls: "cell-loss" };
                } else if (result === "0-1") {
                    h2h[p1][p2] = { score: "0", cls: "cell-loss" };
                    h2h[p2][p1] = { score: "1", cls: "cell-win" };
                } else if (result === "0.5-0.5") {
                    h2h[p1][p2] = { score: "½", cls: "cell-draw" };
                    h2h[p2][p1] = { score: "½", cls: "cell-draw" };
                }
            });
        });
    }

    standings.forEach((st, rowIdx) => {
        const tr = document.createElement("tr");

        const tdRank = document.createElement("td");
        tdRank.className = "col-rank";
        tdRank.textContent = rowIdx + 1;

        const tdName = document.createElement("td");
        tdName.className = "name-cell";
        tdName.textContent = st.name;

        tr.append(tdRank, tdName);

        for (let colIdx = 0; colIdx < n; colIdx++) {
            const tdCell = document.createElement("td");
            if (rowIdx === colIdx) {
                tdCell.className = "self-cell";
                tdCell.textContent = "—";
            } else {
                const oppName = standings[colIdx].name;
                const match = h2h[st.name]?.[oppName];
                tdCell.textContent = match?.score || "·";
                if (match?.cls) tdCell.className = match.cls;
            }
            tr.appendChild(tdCell);
        }

        const tdPts = document.createElement("td");
        tdPts.className = "col-pts";
        tdPts.textContent = st.points;
        tr.appendChild(tdPts);

        tbody.appendChild(tr);
    });
}

function checkCompletion(standings) {
    const banner = document.getElementById("champion-banner");
    if (!banner) return;

    const maxRound = Math.max(1, ...Object.keys(tournament.rounds || {}).map(Number));
    if (maxRound < totalRounds) {
        banner.style.display = "none";
        return;
    }

    const finalMatches = tournament.rounds[maxRound] || [];
    const isCompleted = finalMatches.every((m) => m.p2 === "BYE" || m.result !== null);

    if (isCompleted && standings.length > 0) {
        const champ = standings[0];
        banner.style.display = "flex";
        document.getElementById("champion-name").textContent = champ.name;
        document.getElementById("champion-stats").textContent =
            `${champ.points} Points • ${champ.wins} Wins, ${champ.draws} Draws, ${champ.losses} Losses`;
    } else {
        banner.style.display = "none";
    }
}

function exportCSV() {
    const standings = computeStandings();
    if (standings.length === 0) return;

    let csv = "Rank,Participant,Played,Wins,Draws,Losses,Buchholz,SonnebornBerger,Points\n";
    standings.forEach((st, idx) => {
        csv += `${idx + 1},"${st.name.replace(/"/g, '""')}",${st.played},${st.wins},${st.draws},${st.losses},${st.buchholz},${st.sonnebornBerger},${st.points}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const name = (setup?.tournamentName || "tournament").toLowerCase().replace(/[^a-z0-9]/g, "_");
    link.href = url;
    link.download = `${name}_standings.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function exportJSON() {
    const data = {
        setup: load(SETUP_KEY),
        tournament: load(PAIRING_KEY),
        exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const name = (setup?.tournamentName || "tournament").toLowerCase().replace(/[^a-z0-9]/g, "_");
    link.href = url;
    link.download = `${name}_backup.json`;
    link.click();
    URL.revokeObjectURL(url);
}

document.getElementById("print-pairings-btn").onclick = () => window.print();
document.getElementById("print-results-btn").onclick = () => window.print();
document.getElementById("print-standings-btn").onclick = () => window.print();
document.getElementById("export-csv-btn").onclick = exportCSV;
document.getElementById("export-json-btn").onclick = exportJSON;

window.startPairings = startPairings;
window.renderResults = renderResults;
window.renderDetailedStandings = renderDetailedStandings;