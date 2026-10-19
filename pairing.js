"use strict";

const SETUP_KEY = "TournaMate-setup";
const PAIRING_KEY = "TournaMate-pairings";

let setup, tournament, participants, selectedRound = 1;
let pointsWin, pointsDraw, totalRounds, mode, pairingSystem;

function load(key) {
    return JSON.parse(localStorage.getItem(key));
}

function save() {
    localStorage.setItem(PAIRING_KEY, JSON.stringify(tournament));
}

function init() {
    setup = load(SETUP_KEY);
    if (!setup) {
        location.href = "index.html";
        return;
    }

    mode = setup.mode;
    participants = (mode === "SINGLES" ? setup.players : setup.teams) || [];

    pointsWin = Number(setup.pointsWin ?? 1);
    pointsDraw = Number(setup.pointsWin ?? 0.5);
    totalRounds = Number(setup.totalRounds);
    pairingSystem = String(setup.pairingSystem).toLowerCase().includes("round");


}

function standings() {
    //table
    //a.points += pointsWin; a.wins++;
    //b.points += pointsWin; b.wins++;
}

function generateSwiss() { }

function generateRoundRobbin() { }

function generateRounds() {
    //rounds
    //check round number
    //either genetareSwiss or generateRoundRobbin
    //save
    //render
}

function saveResult() {
    //
}

function render() {
    //
}