
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

