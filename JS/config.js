var SETUP_KEY = "TournaMate-setup";
var THEME_KEY = "TournaMate-theme";
var PAIRING_KEY = "TournaMate-pairings";



var setup = null;
var tournament = null;
var participants = [];
var selectedRound = 1;
var resultsSelectedRound = 1;
var pointsWin = 2;
var pointsDraw = 1;
var totalRounds = 5;
var mode = "TEAM";
var pairingSystem = "SWISS";

var undoStack = [];
var redoStack = [];

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