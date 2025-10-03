import React, { useMemo, useState, useEffect } from 'react';

export default function App() {
  const [players, setPlayers] = useState([{ name: 'Player 1', score: 0 }]);
  const [newPlayerName, setNewPlayerName] = useState('');

  // Game options
  const [allowMultipleImpostors, setAllowMultipleImpostors] = useState(false);
  const [giveImpostorFakeWord, setGiveImpostorFakeWord] = useState(true);

  // Generation status
  const [genDone, setGenDone] = useState(false);

  // Round setup
  const [category, setCategory] = useState('');
  const [secretWord, setSecretWord] = useState('');
  const [vagueHint, setVagueHint] = useState('');
  const [fakeWordCandidate, setFakeWordCandidate] = useState(null);

  // Assigned per round
  // role: 'word' | 'impostor'
  // word: secretWord (for word holders)
  // fakeWord: (for impostor when giveImpostorFakeWord === true)
  const [roundAssignments, setRoundAssignments] = useState([]);
  const [phase, setPhase] = useState('setup');

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
    setGenDone(false);
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
      setGenDone(false);
      setSecretWord('');
      setVagueHint('');
      setFakeWordCandidate(null);

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
      setFakeWordCandidate(data.fakeWord ?? null);
      setGenDone(true);
    } catch (e) {
      console.error(e);
      setSecretWord('aurora');
      setVagueHint('Common but not the first guess');
      setFakeWordCandidate(null);
      setGenDone(true); // still allow proceeding for local demo
    }
  }

  function assignRolesAndBeginReveal() {
    if (!genDone || !secretWord) {
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
        p *= 0.5;
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
          fakeWord: giveImpostorFakeWord ? (fakeWordCandidate || '—') : null,
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
      // Finished reveals; gate scoring behind a click
      setPhase('gate-score');
    }
  }

  function enterScoring() {
    setPhase('score');
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
                    Generate Word &amp; Hint
                  </button>
                  <button
                    className="btn-subtle"
                    onClick={() => {
                      setSecretWord('');
                      setVagueHint('');
                      setFakeWordCandidate(null);
                      setGenDone(false);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
                {genDone ? (
                  <div style={{ color: '#3be89e' }}>
                    <b>Successful generation.</b> Ready to assign roles.
                  </div>
                ) : (
                  <div>
                    <em style={{ opacity: 0.6 }}>(not generated)</em>
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
                  label="Give impostor a fake word (keeps UI identical)"
                  checked={giveImpostorFakeWord}
                  onChange={setGiveImpostorFakeWord}
                />
              </div>

              <div style={{ marginTop: 16 }}>
                <button
                  className="btn"
                  onClick={assignRolesAndBeginReveal}
                  disabled={!genDone}
                  style={{
                    background: genDone ? '#19a974' : '#4b5563',
                    color: genDone ? 'white' : '#cbd5e1',
                    cursor: genDone ? 'pointer' : 'not-allowed'
                  }}
                >
                  Assign Roles &amp; Start Reveal
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
                giveImpostorFakeWord={giveImpostorFakeWord}
              />
              <button className="btn" onClick={nextRevealStep}>
                {revealIndex < roundAssignments.length - 1
                  ? currentRevealed
                    ? 'Pass to Next Player'
                    : 'Reveal'
                  : currentRevealed
                  ? 'Continue'
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

        {phase === 'gate-score' && (
          <GateOverlay onContinue={enterScoring} />
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

              {/* NOTE: Removed spoiler summary to avoid leaking roles/secret word */}
              <div style={{ border: '1px dashed #2a3b63', borderRadius: 12, padding: 12, background: '#0f1a33', opacity: 0.7 }}>
                No spoilers shown here. Use votes and the impostor guess toggle to score.
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

/**
 * RevealCard rules:
 * - If giveImpostorFakeWord === true:
 *   - UI is identical for all players. Everyone sees "Your secret word".
 *   - Word holders see the real secret word; the impostor sees fakeWord.
 *   - No hint button for anyone.
 * - If giveImpostorFakeWord === false:
 *   - Word holders: see secret word, NO hint button.
 *   - Impostor: sees "You are the Impostor" and CAN use the hint button.
 */
function RevealCard({
  assignment,
  revealed,
  hintVisible,
  onReveal,
  onShowHint,
  giveImpostorFakeWord
}) {
  if (!assignment) return null;

  const isImpostor = assignment.role === 'impostor';
  const showIdenticalUI = giveImpostorFakeWord === true;

  // What word to show under identical UI mode
  const displayWord = isImpostor ? assignment.fakeWord : assignment.word;

  // Hint visibility rules
  const canShowHintButton =
    !showIdenticalUI && isImpostor; // only impostor gets hint when fake-word mode is OFF

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
            {showIdenticalUI ? (
              // Identical UI for everyone: "Your secret word" label, impostor quietly sees fake word
              <div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Your secret word:</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#3be89e', fontFamily: 'monospace' }}>
                  {displayWord || '—'}
                </div>
              </div>
            ) : isImpostor ? (
              // Impostor clearly labeled only when fake-word mode is OFF
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#ffb6c1' }}>You are the Impostor</div>
                <div style={{ marginTop: 10 }}>
                  {!hintVisible ? (
                    canShowHintButton ? (
                      <button className="btn-subtle" onClick={onShowHint}>
                        Show Hint (optional)
                      </button>
                    ) : null
                  ) : (
                    <div style={{ fontSize: 13, opacity: 0.85 }}>
                      Hint: <span style={{ opacity: 1 }}>{assignment.hint}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Word holder (fake-word mode OFF)
              <div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Your secret word:</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#3be89e', fontFamily: 'monospace' }}>
                  {assignment.word}
                </div>
              </div>
            )}
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

function GateOverlay({ onContinue }) {
  return (
    <div className="gate" style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', zIndex: 50
    }}>
      <div style={{ background: '#ffffff', color: '#0b1221', padding: 20, borderRadius: 16, width: 'min(560px, 92vw)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Round complete</h2>
        <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
          Click continue to open the scoring screen. Roles and the secret word will not be shown.
        </p>
        <button
          className="btn"
          onClick={onContinue}
          style={{ background: '#2563eb' }}
        >
          Continue to Scoring
        </button>
      </div>
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
