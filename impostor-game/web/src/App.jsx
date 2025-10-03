import React, { useMemo, useState } from 'react';


export default function App() {
const [players, setPlayers] = useState([{ name: 'Player 1', score: 0 }]);
const [newPlayerName, setNewPlayerName] = useState('');


const [allowMultipleImpostors, setAllowMultipleImpostors] = useState(false);
const [giveImpostorFakeWord, setGiveImpostorFakeWord] = useState(true);


const [category, setCategory] = useState('');
const [secretWord, setSecretWord] = useState('');
const [vagueHint, setVagueHint] = useState('');


const [roundAssignments, setRoundAssignments] = useState([]);
const [phase, setPhase] = useState('setup');


const [revealIndex, setRevealIndex] = useState(0);
const [currentRevealed, setCurrentRevealed] = useState(false);
const [hintVisible, setHintVisible] = useState(false);


const [votedPlayerIndex, setVotedPlayerIndex] = useState(-1);
const [impostorGuessedCorrectly, setImpostorGuessedCorrectly] = useState(false);


const impostorIndexes = useMemo(
() => roundAssignments.map((a, i) => (a.role === 'impostor' ? i : -1)).filter((i) => i >= 0),
[roundAssignments]
);


function addPlayer() {
const name = newPlayerName.trim();
if (!name) return;
setPlayers((p) => [...p, { name, score: 0 }]);
setNewPlayerName('');
}


function removePlayer(index) { setPlayers((p) => p.filter((_, i) => i !== index)); }


function resetRoundLocalState() {
setRoundAssignments([]); setRevealIndex(0); setCurrentRevealed(false); setHintVisible(false);
setVotedPlayerIndex(-1); setImpostorGuessedCorrectly(false);
}


function startRoundSetup() {
if (players.length < 3) { alert('Need at least 3 players.'); return; }
resetRoundLocalState(); setPhase('round-setup');
}

async function generateWordAndHintFromCategory(cat) {
    try {
    const r = await fetch('/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: cat, allowMultipleImpostors, giveImpostorFakeWord })
    });
    const data = await r.json();
    setSecretWord(data.word || 'aurora');
    setVagueHint(data.hint || 'Common but not obvious');
    setFakeWordCandidate(data.fakeWord || null);
    } catch (e) {
    console.error(e);
    setSecretWord('aurora');
    setVagueHint('Common but not the first guess');
    }
    }
    
    
    const [fakeWordCandidate, setFakeWordCandidate] = useState(null);
    
    
    function assignRolesAndBeginReveal() {
    if (!secretWord) { alert('Generate the word & hint first.'); return; }
    const n = players.length;
    
    
    let impostors = [];
    if (allowMultipleImpostors) {
    const shuffled = shuffle([...Array(n).keys()]);
    impostors.push(shuffled[0]);
    let p = 0.35;
    for (let i = 1; i < shuffled.length; i++) { p *= 0.5; if (Math.random() < p) impostors.push(shuffled[i]); }
    } else {
    impostors = [Math.floor(Math.random() * n)];
    }
    
    
    const assignments = players.map((p, idx) => {
    if (impostors.includes(idx)) {
    return { name: p.name, role: 'impostor', fakeWord: giveImpostorFakeWord ? fakeWordCandidate : null, hint: vagueHint };
    } else {
    return { name: p.name, role: 'word', word: secretWord, hint: vagueHint };
    }
    });

    