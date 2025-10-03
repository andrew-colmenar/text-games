import React, { useMemo, useState } from 'react';

export default function App() {
  const [players, setPlayers] = useState([{ name: 'Player 1', score: 0 }]);
  const [newPlayerName, setNewPlayerName] = useState('');

  // Game options
  const [allowMultipleImpostors, setAllowMultipleImpostors] = useState(false);
  const [giveImpostorFakeWord, setGiveImpostorFakeWord] = useState(true);

  // Round setup
  const [category, setCategory] = useState('');
  const [secretWord, setSecretWord] = useState('');
  const [vagueHint, setVagueHint] = useState('');
  const [fakeWordCandidate, setFakeWordCandidate] = useState(null);

  // Assigned per round
  const [roundAssignments, setRoundAssignments] = useState([]); // [{name, role:'word'|'impostor', word?, fakeWord?, hint}]
  const [phase, setPhase] = useState('setup'); // 'setup' | 'round-setup' | 'reveal' | 'score' | 'between-rounds'

  // Reveal sequence
  const [revealIndex, setRevealIndex] = useState(0);
  const [currentRevealed, setCurrentRevealed] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);

  // Scoring choices
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
  function removePlayer(index) {
    setPlayers((p) => p.filter((_, i) => i !== index));
  }

  function resetRoundLocalState() {
    setRoundAssignments([]);
    setRevealIndex(0);
    setCurrentRevealed(false);
    setHintVisible(false);
    setVotedPlayerIndex(-1);
    setImpostorGuessedCorrectly(false);
  }

  function startRoundSetup() {
    if (players.length < 3) {
      alert('Need at least 3 players.');
      return;
    }
    resetRoundLocalState();
    setPhase('round-setup');
  }

  async function generateWordAndHintFromCategory(cat) {
    try {
      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: cat,
          allowMultipleImpostors,
          giveImpostorFakeWord
        })
      });
      if (!r.ok) throw new Error('Generate failed');
      const data = await r.json();
      setSecretWord(data.word || 'aurora');
      setVagueHint(data.hint || 'Common but not obvious');
      setFakeWordCandidate(data.fakeWord || null);
    } catch (e) {
      console.error(e);
      setSecretWord('aurora');
      setVagueHint('Common but not the first guess');
      setFakeWordCandidate(null);
    }
  }

  function assignRolesAndBeginReveal() {
    if (!secretWord) {
      alert('Generate the word & hint first.');
      return;
    }
    const n = players.length;

    // Decide impostor indexes
    let impostors = [];
    if (allowMultipleImpostors) {
      const shuffled = shuffle([...Array(n).keys()]);
      impostors.push(shuffled[0]); // at least 1
      let p = 0.35; // base chance for an extra impostor
      for (let i = 1; i < shuffled.length; i++) {
        p *= 0.5; // continuously less likely
        if (Math.random() < p) impostors.push(shuffled[i]);
      }
    } else {
      impostors = [Math.floor(Math.random() * n)];
    }

    const assignments = players.map((p, idx) => {
      if (impostors.includes(idx)) {
        return {
          name: p.name,
          role: 'impostor',
          fakeWord: giveImpostorFakeWord ? fakeWordCandidate : null,
          hint: vagueHint
        };
      } else {
        return { name: p.name, role: 'word', word: secretWord, hint: vagueHint };
      }
    });

    setRoundAssignments(assignments);
    setPhase('reveal');
  }

  function nextRevealStep() {
    if (!currentRevealed) {
      setCurrentRevealed(true);
      return;
    }
    if (revealIndex < roundAssignments.length - 1) {
      setRevealIndex((i) => i + 1);
      setCurrentRevealed(false);
      setHintVisible(false);
    } else {
      setPhase('score');
    }
  }

  function commitScores() {
    if (votedPlayerIndex < 0 || votedPlayerIndex >= players.length) {
      alert('Pick who was voted.');
      return;
    }
    const votedIsImpostor = impostorIndexes.includes(votedPlayerIndex);

    setPlayers((prev) => {
      const updated = prev.map((p) => ({ ...p }));
      if (votedIsImpostor) {
        // Everyone except impostors +1
        roundAssignments.forEach((a, idx) => {
          if (a.role !== 'impostor') updated[idx].score += 1;
        });
      } else {
        // Impostors +1
        impostorIndexes.forEach((idx) => {
          updated[idx].score += 1;
        });
      }
      if (impostorGuessedCorrectly) {
        // Impostor bonus +1 (all impostors share in multi mode)
        impostorIndexes.forEach((idx) => {
          updated[idx].score += 1;
        });
      }
      return updated;
    });

    setPhase('between-rounds');
  }

  function newRound() {
    setCategory('');
    setSecretWord('');
    setVagueHint('');
    setFakeWordCandidate(null);
    resetRoundLocalState();
    setPhase('round-setup');
  }

  return (
    <div style={{ background: '#0b1221', color: '#e6f0ff', minHeight: '100vh' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Impostor Game – Local Demo</h1>

        {phase === 'setup' && (
          <Card title="Players & Scores">
            <PlayerManager
              players={players}
              onRemove={removePlayer}
              onAdd={addPlayer}
              newPlayerName={newPlayerName}
              setNewPlayerName={setNewPlayerName}
              setPlayers={setPlayers}
            />
            <div style={{ marginTop: 16 }}>
              <button className="btn" onClick={startRoundSetup} disabled={players.length < 3}>
                Start Round
              </button>
            </div>
          </Card>
        )}

        {phase === 'round-setup' && (
          <>
            <Card title="Players & Scores (Editable Between Rounds)">
              <PlayerManager
                players={players}
                onRemove={removePlayer}
                onAdd={addPlayer}
                newPlayerName={newPlayerName}
                setNewPlayerName={setNewPlayerName}
                setPlayers={setPlayers}
              />
            </Card>

            <Card title="Round Setup">
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label style={{ fontSize: 12 }}>Category (host enters)</label>
                  <input
                    className="input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., animals, movies, breakfast foods"
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
                  <button className="btn" onClick={() => generateWordAndHintFromCategory(category)}>
                    Generate Word & Hint
                  </button>
                  <button
                    className="btn-subtle"
                    onClick={() => {
                      setSecretWord('');
                      setVagueHint('');
                      setFakeWordCandidate(null);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
                <div>
                  <b>Secret Word:</b> {secretWord || <em style={{ opacity: 0.6 }}>(not generated)</em>}
                </div>
                <div>
                  <b>Vague Hint:</b> {vagueHint || <em style={{ opacity: 0.6 }}>(not generated)</em>}
                </div>
                {giveImpostorFakeWord && (
                  <div>
                    <b>Fake Word (for impostor):</b> {fakeWordCandidate || <em style={{ opacity: 0.6 }}>(not generated)</em>}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', marginTop: 12 }}>
                <Toggle
                  label="Allow multiple impostors"
                  checked={allowMultipleImpostors}
                  onChange={setAllowMultipleImpostors}
                />
                <Toggle
                  label="Give impostor a fake word"
                  checked={giveImpostorFakeWord}
                  onChange={setGiveImpostorFakeWord}
                />
              </div>

              <div style={{ marginTop: 16 }}>
                <button className="btn" onClick={assignRolesAndBeginReveal} disabled={!secretWord}>
                  Assign Roles & Start Reveal
                </button>
              </div>

              <p style={{ marginTop: 8, fontSize: 11, opacity: 0.7 }}>
                The generator calls the backend at <code>/api/generate</code>.
              </p>
            </Card>
          </>
        )}

        {phase === 'reveal' && (
          <Card title={`Private Reveal – ${roundAssignments[revealIndex]?.name || ''}`}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <RevealCard
                assignment={roundAssignments[revealIndex]}
                revealed={currentRevealed}
                hintVisible={hintVisible}
                onReveal={() => setCurrentRevealed(true)}
                onShowHint={() => setHintVisible(true)}
              />
              <button className="btn" onClick={nextRevealStep}>
                {revealIndex < roundAssignments.length - 1
                  ? currentRevealed
                    ? 'Pass to Next Player'
                    : 'Reveal'
                  : currentRevealed
                  ? 'Continue to Scoring'
                  : 'Reveal'}
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gap: 8,
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                marginTop: 16
              }}
            >
              {roundAssignments.map((a, idx) => (
                <div key={idx} style={{ border: '1px solid #1f2b45', borderRadius: 12, padding: 12, background: '#0f1a33' }}>
                  <div style={{ fontSize: 12, color: idx === revealIndex ? '#3be89e' : '#c6d4ff' }}>{a.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>
                    {idx < revealIndex ? 'Done' : idx === revealIndex ? 'Current' : 'Waiting'}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {phase === 'score' && (
          <Card title="End Round – Scoring">
            <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label style={{ fontSize: 12 }}>Who was voted as the impostor?</label>
                <select
                  className="input"
                  value={votedPlayerIndex}
                  onChange={(e) => setVotedPlayerIndex(parseInt(e.target.value))}
                >
                  <option value={-1}>Select player…</option>
                  {players.map((p, i) => (
                    <option key={i} value={i}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <div style={{ marginTop: 12 }}>
                  <Toggle
                    label="Did the impostor guess the word? (+1 impostor)"
                    checked={impostorGuessedCorrectly}
                    onChange={setImpostorGuessedCorrectly}
                  />
                </div>

                <button className="btn" style={{ marginTop: 16 }} onClick={commitScores}>
                  Apply Scores
                </button>
              </div>

              <div>
                <RoundSummary assignments={roundAssignments} secretWord={secretWord} />
              </div>
            </div>
          </Card>
        )}

        {phase === 'between-rounds' && (
          <>
            <Card title="Scores & Roster">
              <Scoreboard players={players} />
              <div style={{ marginTop: 16 }}>
                <PlayerManager
                  players={players}
                  onRemove={removePlayer}
                  onAdd={addPlayer}
                  newPlayerName={newPlayerName}
                  setNewPlayerName={setNewPlayerName}
                  setPlayers={setPlayers}
                />
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button className="btn" onClick={newRound}>
                  Next Round
                </button>
                <button className="btn-subtle" onClick={() => setPhase('setup')}>
                  Back to Start
                </button>
              </div>
            </Card>
          </>
        )}

        <footer style={{ marginTop: 40, fontSize: 11, opacity: 0.7 }}>
          Local demo. Pass the laptop for private reveals. Keys stay on your server.
        </footer>
      </div>

      {/* Minimal styles */}
      <style>{`
        .btn { padding: 8px 14px; border-radius: 12px; background:#19a974; color:white; border:none; cursor:pointer }
        .btn:hover { filter: brightness(1.05) }
        .btn-subtle { padding: 8px 12px; border-radius: 12px; background:#1f2b45; color:#c6d4ff; border:1px solid #2a3b63; cursor:pointer }
        .input { width:100%; padding:8px 10px; border-radius: 10px; border:1px solid #2a3b63; background:#0f1a33; color:#e6f0ff }
        table { width: 100%; border-collapse: collapse }
        th, td { padding: 10px }
      `}</style>
    </div>
  );
}

function PlayerManager({ players, onRemove, onAdd, newPlayerName, setNewPlayerName, setPlayers }) {
  return (
    <div>
      <div style={{ overflow: 'auto', border: '1px solid #1f2b45', borderRadius: 12 }}>
        <table>
          <thead style={{ background: '#0f1a33' }}>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Score</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, idx) => (
              <tr key={idx} style={{ borderTop: '1px solid #1f2b45' }}>
                <td style={{ opacity: 0.8 }}>{idx + 1}</td>
                <td>
                  <InlineRename
                    value={p.name}
                    onChange={(name) => {
                      setPlayers((prev) => prev.map((pp, i) => (i === idx ? { ...pp, name } : pp)));
                    }}
                  />
                </td>
                <td>{p.score}</td>
                <td>
                  <button className="btn-subtle" onClick={() => onRemove(idx)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          className="input"
          placeholder="Add player name"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        />
        <button className="btn" onClick={onAdd}>
          Add
        </button>
      </div>
    </div>
  );
}

function InlineRename({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  return (
    <span>
      {editing ? (
        <span style={{ display: 'inline-flex', gap: 6 }}>
          <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} style={{ width: 200 }} />
          <button
            className="btn"
            onClick={() => {
              const v = draft.trim();
              if (v) onChange(v);
              setEditing(false);
            }}
          >
            Save
          </button>
          <button
            className="btn-subtle"
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
          >
            Cancel
          </button>
        </span>
      ) : (
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span>{value}</span>
          <button className="btn-subtle" onClick={() => setEditing(true)}>
            Rename
          </button>
        </span>
      )}
    </span>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ border: '1px solid #1f2b45', background: '#0f1a33', borderRadius: 16, padding: 16, marginBottom: 16 }}>
      {title && <h2 style={{ fontSize: 18, margin: 0, marginBottom: 8 }}>{title}</h2>}
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span style={{ fontSize: 13 }}>{label}</span>
    </label>
  );
}

function RevealCard({ assignment, revealed, hintVisible, onReveal, onShowHint }) {
  if (!assignment) return null;
  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <div style={{ border: '1px solid #1f2b45', background: '#0f1a33', borderRadius: 16, padding: 16, textAlign: 'center' }}>
        {!revealed ? (
          <>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
              Tap reveal when it's your turn. Keep the screen private!
            </div>
            <button className="btn" onClick={onReveal}>
              Reveal
            </button>
          </>
        ) : (
          <>
            {assignment.role === 'impostor' ? (
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#ffb6c1' }}>You are the Impostor</div>
                {assignment.fakeWord && (
                  <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
                    Fake word: <span style={{ fontFamily: 'monospace' }}>{assignment.fakeWord}</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Your secret word:</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#3be89e', fontFamily: 'monospace' }}>
                  {assignment.word}
                </div>
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              {!hintVisible ? (
                <button className="btn-subtle" onClick={onShowHint}>
                  Show Hint (optional)
                </button>
              ) : (
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  Hint: <span style={{ opacity: 1 }}>{assignment.hint}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Scoreboard({ players }) {
  return (
    <div style={{ overflow: 'auto', border: '1px solid #1f2b45', borderRadius: 12 }}>
      <table>
        <thead style={{ background: '#0f1a33' }}>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {players
            .map((p, i) => ({ ...p, i }))
            .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
            .map((p, rank) => (
              <tr key={p.i} style={{ borderTop: '1px solid #1f2b45' }}>
                <td style={{ opacity: 0.8 }}>{rank + 1}</td>
                <td>{p.name}</td>
                <td style={{ fontFamily: 'monospace' }}>{p.score}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function RoundSummary({ assignments, secretWord }) {
  return (
    <div style={{ border: '1px solid #1f2b45', borderRadius: 12, padding: 12, background: '#0f1a33' }}>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Round Summary</div>
      <div style={{ fontSize: 13 }}>
        Secret word was:{' '}
        <b style={{ fontFamily: 'monospace', color: '#3be89e' }}>{secretWord}</b>
      </div>
      <ul style={{ marginTop: 8, fontSize: 13 }}>
        {assignments.map((a, idx) => (
          <li key={idx}>
            <b>{a.name}</b>: {a.role === 'impostor' ? 'Impostor' : 'Word Holder'}
            {a.role === 'impostor' && a.fakeWord ? <span style={{ opacity: 0.7 }}> (fake: {a.fakeWord})</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
