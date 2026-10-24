
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

document.getElementById("export-csv-btn").onclick = exportCSV;
document.getElementById("export-json-btn").onclick = exportJSON;