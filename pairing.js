"use strict";

const SETUP_KEY = "TournaMate-setup";
const PAIRING_KEY = "TournaMate-pairings";

let setup = null;
let tournament = null;
let participants = [];
let selectedRound = 1;
let resultsSelectedRound = 1;
let pointsWin = 2;
let pointsDraw = 1;
let totalRounds = 6;
let mode = "TEAM";
let pairingSystem = "SWISS";

function load(key) {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch {
        return null;
    }
}

function save() {
    localStorage.setItem(PAIRING_KEY, JSON.stringify(tournament));
}

function startPairings() {
    selectedRound = 1;
    resultsSelectedRound = 1;
    setup = load(SETUP_KEY);

    if (!setup || (!setup.tournamentName && !setup.teams?.length && !setup.players?.length)) {
        alert("Please set up your tournament first.");
        showView("setup");
        return false;
    }

    mode = setup.mode || "TEAM";
    participants = (mode === "SINGLES" ? setup.players : setup.teams) || [];

    if (participants.length < 2) {
        alert("At least 2 participants are required. Please add them in Setup.");
        showView("setup");
        return false;
    }

    pointsWin = Number(setup.pointsWin ?? 2);
    pointsDraw = Number(setup.pointsDraw ?? 1);
    totalRounds = Number(setup.rounds || setup.totalRounds || 6);
    pairingSystem = setup.pairingSystem || "SWISS";

    // Set page headers and info
    const modeLabel = mode === "SINGLES" ? "Individual" : "Team";
    const typeLabel = mode === "SINGLES" ? "Players" : "Teams";
    const systemLabel = pairingSystem === "ROUND_ROBBIN" ? "Round Robin" : "Swiss System";
    const infoText = `${modeLabel} Tournament • ${systemLabel} • ${totalRounds} Rounds • ${participants.length} ${typeLabel}`;

    const titleEl = document.getElementById("tournament-title");
    if (titleEl) {
        titleEl.textContent = setup.tournamentName
            ? `${setup.tournamentName} - Pairings`
            : "Tournament Pairings";
    }

    const infoEl = document.getElementById("tournament-info");
    if (infoEl) {
        infoEl.textContent = infoText;
    }

    const resTitleEl = document.getElementById("results-tournament-title");
    if (resTitleEl) {
        resTitleEl.textContent = setup.tournamentName
            ? `${setup.tournamentName} - Results`
            : "Tournament Results";
    }

    const resInfoEl = document.getElementById("results-tournament-info");
    if (resInfoEl) {
        resInfoEl.textContent = infoText;
    }

    const participantCol = document.getElementById("participant-column");
    if (participantCol) {
        participantCol.textContent = mode === "SINGLES" ? "Players" : "Teams";
    }

    // Load or initialize tournament pairings
    tournament = load(PAIRING_KEY);
    if (!tournament || !tournament.rounds || !tournament.rounds[1]) {
        tournament = {
            rounds: {}
        };
        generateRound(1);
        save();
    }

    // Populate round selects
    updateRoundSelect();
    updateResultsRoundSelect();

    const generateRoundBtn = document.getElementById("generate-round-btn");
    if (generateRoundBtn) {
        generateRoundBtn.onclick = handleGenerateNextRound;
    }

    if (typeof window.updateNavState === "function") {
        window.updateNavState();
    }

    render();
    renderResults();
    return true;
}

function updateRoundSelect() {
    const roundSelect = document.getElementById("round-select");
    if (!roundSelect) return;

    roundSelect.replaceChildren();

    const maxRoundGenerated = tournament && tournament.rounds
        ? Math.max(1, ...Object.keys(tournament.rounds).map(Number))
        : 1;

    const availableRounds = Math.max(maxRoundGenerated, totalRounds);

    for (let r = 1; r <= availableRounds; r++) {
        const opt = document.createElement("option");
        opt.value = r;
        opt.textContent = `Round ${r}`;
        roundSelect.appendChild(opt);
    }

    roundSelect.value = selectedRound;

    roundSelect.onchange = (e) => {
        selectedRound = Number(e.target.value);
        if (!tournament.rounds[selectedRound]) {
            generateRound(selectedRound);
            save();
            updateResultsRoundSelect();
        }
        render();
    };
}

function updateResultsRoundSelect() {
    const resultsRoundSelect = document.getElementById("results-round-select");
    if (!resultsRoundSelect) return;

    resultsRoundSelect.replaceChildren();

    const maxRoundGenerated = tournament && tournament.rounds
        ? Math.max(1, ...Object.keys(tournament.rounds).map(Number))
        : 1;

    for (let r = 1; r <= maxRoundGenerated; r++) {
        const opt = document.createElement("option");
        opt.value = r;
        opt.textContent = `Round ${r}`;
        resultsRoundSelect.appendChild(opt);
    }

    if (resultsSelectedRound > maxRoundGenerated) {
        resultsSelectedRound = maxRoundGenerated;
    }

    resultsRoundSelect.value = resultsSelectedRound;

    resultsRoundSelect.onchange = (e) => {
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
            points: 0
        };
    });

    if (tournament && tournament.rounds) {
        Object.values(tournament.rounds).forEach((roundMatches) => {
            roundMatches.forEach((match) => {
                const { p1, p2, result } = match;

                // Handle BYE match
                if (p2 === "BYE") {
                    if (stats[p1]) {
                        stats[p1].played++;
                        stats[p1].wins++;
                        stats[p1].points += pointsWin;
                    }
                    return;
                }

                if (!result) return; // match pending

                if (stats[p1]) stats[p1].played++;
                if (stats[p2]) stats[p2].played++;

                if (result === "1-0") {
                    if (stats[p1]) {
                        stats[p1].wins++;
                        stats[p1].points += pointsWin;
                    }
                    if (stats[p2]) stats[p2].losses++;
                } else if (result === "0-1") {
                    if (stats[p2]) {
                        stats[p2].wins++;
                        stats[p2].points += pointsWin;
                    }
                    if (stats[p1]) stats[p1].losses++;
                } else if (result === "0.5-0.5") {
                    if (stats[p1]) {
                        stats[p1].draws++;
                        stats[p1].points += pointsDraw;
                    }
                    if (stats[p2]) {
                        stats[p2].draws++;
                        stats[p2].points += pointsDraw;
                    }
                }
            });
        });
    }

    return Object.values(stats).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.played !== a.played) return b.played - a.played;
        return a.name.localeCompare(b.name);
    });
}

function hasPlayedBefore(p1, p2) {
    if (!tournament || !tournament.rounds) return false;

    for (const roundMatches of Object.values(tournament.rounds)) {
        for (const m of roundMatches) {
            if (
                (m.p1 === p1 && m.p2 === p2) ||
                (m.p1 === p2 && m.p2 === p1)
            ) {
                return true;
            }
        }
    }
    return false;
}

function generateSwiss(roundNum) {
    const standingsList = computeStandings();
    const pool = [...standingsList.map((s) => s.name)];
    const matches = [];

    // If odd, award BYE to the lowest ranked player who hasn't had one yet
    if (pool.length % 2 !== 0) {
        let byeIdx = pool.length - 1;
        for (let i = pool.length - 1; i >= 0; i--) {
            if (!hasPlayedBefore(pool[i], "BYE")) {
                byeIdx = i;
                break;
            }
        }
        const byePlayer = pool.splice(byeIdx, 1)[0];
        matches.push({
            id: `${roundNum}-bye`,
            p1: byePlayer,
            p2: "BYE",
            result: "1-0"
        });
    }

    // Pair remaining participants
    let matchId = 1;
    while (pool.length > 0) {
        const p1 = pool.shift();
        let opponentIdx = 0;

        // Try to find someone they haven't played yet
        let found = false;
        for (let i = 0; i < pool.length; i++) {
            if (!hasPlayedBefore(p1, pool[i])) {
                opponentIdx = i;
                found = true;
                break;
            }
        }

        const p2 = pool.splice(opponentIdx, 1)[0];
        matches.unshift({
            id: `${roundNum}-${matchId++}`,
            p1,
            p2,
            result: null
        });
    }

    return matches;
}

function generateRoundRobin(roundNum) {
    const list = [...participants];
    if (list.length % 2 !== 0) {
        list.push("BYE");
    }

    const n = list.length;
    const r = roundNum - 1; // 0-based
    const matches = [];

    // Circle method rotation
    const current = [list[0]];
    const rest = list.slice(1);
    const offset = r % (n - 1);

    const rotatedRest = rest.slice(offset).concat(rest.slice(0, offset));
    current.push(...rotatedRest);

    for (let i = 0; i < n / 2; i++) {
        const p1 = current[i];
        const p2 = current[n - 1 - i];

        if (p1 === "BYE") {
            matches.push({
                id: `${roundNum}-${i + 1}`,
                p1: p2,
                p2: "BYE",
                result: "1-0"
            });
        } else if (p2 === "BYE") {
            matches.push({
                id: `${roundNum}-${i + 1}`,
                p1,
                p2: "BYE",
                result: "1-0"
            });
        } else {
            matches.push({
                id: `${roundNum}-${i + 1}`,
                p1,
                p2,
                result: null
            });
        }
    }

    return matches;
}

function generateRound(roundNum) {
    if (!tournament.rounds[roundNum]) {
        if (pairingSystem === "ROUND_ROBBIN") {
            tournament.rounds[roundNum] = generateRoundRobin(roundNum);
        } else {
            tournament.rounds[roundNum] = generateSwiss(roundNum);
        }
    }
}

function handleGenerateNextRound() {
    const maxCurrentRound = Math.max(1, ...Object.keys(tournament.rounds).map(Number));

    if (maxCurrentRound >= totalRounds) {
        alert(`All ${totalRounds} scheduled rounds have been generated!`);
        return;
    }
    // Check if current matches are done
    const currentMatches = tournament.rounds[maxCurrentRound] || [];
    const pendingCount = currentMatches.filter((m) => m.p2 !== "BYE" && !m.result).length;

    if (pendingCount > 0) {
        const confirmGen = confirm(
            `Round ${maxCurrentRound} still has ${pendingCount} unfinished match(es). Generate next round anyway?`
        );
        if (!confirmGen) return;
    }

    const nextRound = maxCurrentRound + 1;
    generateRound(nextRound);
    save();

    selectedRound = nextRound;
    resultsSelectedRound = nextRound;
    updateRoundSelect();
    updateResultsRoundSelect();
    render();
    renderResults();
}

function setResult(roundNum, matchIndex, result) {
    if (!tournament.rounds[roundNum]) return;

    const match = tournament.rounds[roundNum][matchIndex];
    if (!match) return;

    const validResults = ["1-0", "0.5-0.5", "0-1"];
    if (!validResults.includes(result)) return;

    // Toggle off if clicking the already selected result
    match.result = match.result === result ? null : result;
    save();
    render();
    renderResults();
}

function render() {
    const roundTitle = document.getElementById("round-title");
    if (roundTitle) {
        roundTitle.textContent = `Round ${selectedRound}`;
    }

    const pairingsList = document.getElementById("pairings-list");
    if (pairingsList) {
        pairingsList.replaceChildren();

        const matches = (tournament.rounds && tournament.rounds[selectedRound]) || [];

        if (matches.length === 0) {
            const emptyMsg = document.createElement("p");
            emptyMsg.className = "text-muted";
            emptyMsg.textContent = "No matches for this round.";
            pairingsList.appendChild(emptyMsg);
        } else {
            matches.forEach((match, idx) => {
                const card = document.createElement("div");
                card.className = "match-card";

                const info = document.createElement("div");
                info.className = "match-info";

                const p1Span = document.createElement("span");
                p1Span.className = "match-participant p1";
                p1Span.textContent = match.p1;

                const vsSpan = document.createElement("span");
                vsSpan.className = "match-vs";
                vsSpan.textContent = "vs";

                const p2Span = document.createElement("span");
                p2Span.className = "match-participant p2";
                p2Span.textContent = match.p2;

                info.append(p1Span, vsSpan, p2Span);

                const actions = document.createElement("div");
                actions.className = "match-actions";

                if (match.p2 === "BYE") {
                    const badge = document.createElement("span");
                    badge.className = "bye-badge";
                    badge.textContent = "BYE (Win)";
                    actions.appendChild(badge);
                } else {
                    const btnP1 = document.createElement("button");
                    btnP1.type = "button";
                    btnP1.className = `btn-result ${match.result === "1-0" ? "active" : ""}`;
                    btnP1.textContent = `${match.p1} Win`;
                    btnP1.onclick = () => setResult(selectedRound, idx, "1-0");

                    const btnDraw = document.createElement("button");
                    btnDraw.type = "button";
                    btnDraw.className = `btn-result ${match.result === "0.5-0.5" ? "active" : ""}`;
                    btnDraw.textContent = "Draw";
                    btnDraw.onclick = () => setResult(selectedRound, idx, "0.5-0.5");

                    const btnP2 = document.createElement("button");
                    btnP2.type = "button";
                    btnP2.className = `btn-result ${match.result === "0-1" ? "active" : ""}`;
                    btnP2.textContent = `${match.p2} Win`;
                    btnP2.onclick = () => setResult(selectedRound, idx, "0-1");

                    actions.append(btnP1, btnDraw, btnP2);
                }

                card.append(info, actions);
                pairingsList.appendChild(card);
            });
        }
    }

    renderStandings();
}

function renderResults() {
    const resultsRoundTitle = document.getElementById("results-round-title");
    if (resultsRoundTitle) {
        resultsRoundTitle.textContent = `Round ${resultsSelectedRound} Results`;
    }

    const resultsList = document.getElementById("results-list");
    if (!resultsList) return;

    resultsList.replaceChildren();

    const matches = (tournament && tournament.rounds && tournament.rounds[resultsSelectedRound]) || [];

    const statusEl = document.getElementById("results-round-status");
    if (statusEl) {
        if (matches.length === 0) {
            statusEl.textContent = "No matches";
            statusEl.className = "results-status-badge";
        } else {
            const completedCount = matches.filter((m) => m.p2 === "BYE" || m.result).length;
            const isAllComplete = completedCount === matches.length;
            statusEl.textContent = isAllComplete
                ? `✓ All ${matches.length} matches completed`
                : `${completedCount} of ${matches.length} matches completed`;
            statusEl.className = `results-status-badge ${isAllComplete ? "complete" : ""}`;
        }
    }

    if (matches.length === 0) {
        const emptyMsg = document.createElement("p");
        emptyMsg.className = "text-muted";
        emptyMsg.textContent = "No matches or results for this round yet.";
        resultsList.appendChild(emptyMsg);
        return;
    }

    matches.forEach((match, idx) => {
        const card = document.createElement("div");
        card.className = "match-card";

        const info = document.createElement("div");
        info.className = "match-info";

        const boardBadge = document.createElement("span");
        boardBadge.className = "board-badge";
        boardBadge.textContent = `Board ${idx + 1}`;

        const isP1Win = match.result === "1-0" || match.p2 === "BYE";
        const isP2Win = match.result === "0-1";

        const p1Span = document.createElement("span");
        p1Span.className = `match-participant p1 ${isP1Win ? "winner" : isP2Win ? "loser" : ""}`;
        p1Span.textContent = match.p1;

        const scoreSpan = document.createElement("span");
        if (match.p2 === "BYE") {
            scoreSpan.className = "result-score bye";
            scoreSpan.textContent = "1 – 0 (BYE)";
        } else if (match.result === "1-0") {
            scoreSpan.className = "result-score win";
            scoreSpan.textContent = "1 – 0";
        } else if (match.result === "0-1") {
            scoreSpan.className = "result-score win";
            scoreSpan.textContent = "0 – 1";
        } else if (match.result === "0.5-0.5") {
            scoreSpan.className = "result-score draw";
            scoreSpan.textContent = "½ – ½";
        } else {
            scoreSpan.className = "result-score pending";
            scoreSpan.textContent = "Pending";
        }

        const p2Span = document.createElement("span");
        p2Span.className = `match-participant p2 ${isP2Win ? "winner" : isP1Win ? "loser" : ""}`;
        p2Span.textContent = match.p2;

        info.append(boardBadge, p1Span, scoreSpan, p2Span);

        const actions = document.createElement("div");
        actions.className = "match-actions";

        if (match.p2 === "BYE") {
            const badge = document.createElement("span");
            badge.className = "bye-badge";
            badge.textContent = "BYE (Win)";
            actions.appendChild(badge);
        } else {
            const btnP1 = document.createElement("button");
            btnP1.type = "button";
            btnP1.className = `btn-result ${match.result === "1-0" ? "active" : ""}`;
            btnP1.textContent = `${match.p1} Win`;
            btnP1.onclick = () => setResult(resultsSelectedRound, idx, "1-0");

            const btnDraw = document.createElement("button");
            btnDraw.type = "button";
            btnDraw.className = `btn-result ${match.result === "0.5-0.5" ? "active" : ""}`;
            btnDraw.textContent = "Draw";
            btnDraw.onclick = () => setResult(resultsSelectedRound, idx, "0.5-0.5");

            const btnP2 = document.createElement("button");
            btnP2.type = "button";
            btnP2.className = `btn-result ${match.result === "0-1" ? "active" : ""}`;
            btnP2.textContent = `${match.p2} Win`;
            btnP2.onclick = () => setResult(resultsSelectedRound, idx, "0-1");

            actions.append(btnP1, btnDraw, btnP2);
        }

        card.append(info, actions);
        resultsList.appendChild(card);
    });
}

function renderStandings() {
    const standingsBody = document.getElementById("standings-body");
    if (!standingsBody) return;

    standingsBody.replaceChildren();

    const standings = computeStandings();

    standings.forEach((st, idx) => {
        const tr = document.createElement("tr");

        const rankTd = document.createElement("td");
        rankTd.textContent = idx + 1;

        const nameTd = document.createElement("td");
        nameTd.innerHTML = `<strong>${st.name}</strong>`;

        const playedTd = document.createElement("td");
        playedTd.textContent = st.played;

        const winsTd = document.createElement("td");
        winsTd.textContent = st.wins;

        const drawsTd = document.createElement("td");
        drawsTd.textContent = st.draws;

        const lossesTd = document.createElement("td");
        lossesTd.textContent = st.losses;

        const pointsTd = document.createElement("td");
        pointsTd.innerHTML = `<strong>${st.points}</strong>`;

        tr.append(rankTd, nameTd, playedTd, winsTd, drawsTd, lossesTd, pointsTd);
        standingsBody.appendChild(tr);
    });
}

window.startPairings = startPairings;
window.renderResults = renderResults;
window.updateResultsRoundSelect = updateResultsRoundSelect;