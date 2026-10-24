var SETUP_KEY = "TournaMate-setup";
var THEME_KEY = "TournaMate-theme";
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

const SCORING_PRESETS = {
    FIDE: { win: 1, draw: 0.5 },
    TEAM_POINTS: { win: 2, draw: 1 },
    LEAGUE_3_1: { win: 3, draw: 1 }
};

const SAMPLE_DATA = {
    TEAM: [
        "Real Madrid", "Manchester City", "Bayern Munich",
        "Paris Saint-Germain", "Arsenal FC", "FC Barcelona",
        "Inter Milan", "Liverpool FC"
    ],
    SINGLES: [
        "Magnus Carlsen", "Hikaru Nakamura", "Fabiano Caruana",
        "Ding Liren", "Alireza Firouzja", "Gukesh D",
        "Ian Nepomniachtchi", "Praggnanandhaa R"
    ]
};