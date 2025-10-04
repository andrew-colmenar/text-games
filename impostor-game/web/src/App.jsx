import React, { useMemo, useState } from 'react';

export default function App() {
  // ---------------- THEME MODE STATE ----------------
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ---------------- UI THEME ----------------
  // Centralized tokens for color, radius, spacing, shadows, etc.
  const lightColors = {
    bg: '#f5f7fa',
    surface: '#ffffff',
    surfaceSoft: '#fafbfc',
    border: '#e1e6ed',
    text: '#2d3748',
    muted: '#718096',
    accent: '#4fd1c5',
    accentMuted: '#38b2ac',
    primary: '#5b8def',
    warn: '#f56565',
    disabledBg: '#e2e8f0',
    disabledText: '#a0aec0',
    subtleBtnBg: '#f7fafc',
    subtleBtnText: '#4a5568',
    subtleBtnHover: '#edf2f7'
  };

  const darkColors = {
    bg: '#1a202c',
    surface: '#2d3748',
    surfaceSoft: '#252d3a',
    border: '#4a5568',
    text: '#e2e8f0',
    muted: '#a0aec0',
    accent: '#4fd1c5',
    accentMuted: '#38b2ac',
    primary: '#5b8def',
    warn: '#fc8181',
    disabledBg: '#4a5568',
    disabledText: '#718096',
    subtleBtnBg: '#374151',
    subtleBtnText: '#cbd5e0',
    subtleBtnHover: '#4a5568'
  };

  const theme = {
    font: {
      family: `Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"`,
      size: { xs: 11, sm: 13, md: 15, lg: 18, xl: 28, xxl: 32 },
      weight: { reg: 400, med: 500, bold: 700 }
    },
    color: isDarkMode ? darkColors : lightColors,
    radius: { sm: 10, md: 12, lg: 16, xl: 20 },
    shadow: {
      md: isDarkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
      sm: isDarkMode ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.06)'
    },
    spacing: (n) => `${n * 8}px`,
    isDark: isDarkMode
  };

  // ---------------- GAME STATE (UNCHANGED LOGIC) ----------------
  const [players, setPlayers] = useState([{ name: 'Player 1', score: 0 }]);
  const [newPlayerName, setNewPlayerName] = useState('');

  const [allowMultipleImpostors, setAllowMultipleImpostors] = useState(false);
  const [giveImpostorFakeWord, setGiveImpostorFakeWord] = useState(true);

  const [genDone, setGenDone] = useState(false);

  const [category, setCategory] = useState('');
  const [secretWord, setSecretWord] = useState('');
  const [vagueHint, setVagueHint] = useState('');
  const [fakeWordCandidate, setFakeWordCandidate] = useState(null);

  const [roundAssignments, setRoundAssignments] = useState([]);
  const [phase, setPhase] = useState('setup'); // 'setup' | 'round-setup' | 'reveal' | 'gate-score' | 'score' | 'between-rounds'

  const [revealIndex, setRevealIndex] = useState(0);
  const [currentRevealed, setCurrentRevealed] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);

  const [votedPlayerIndex, setVotedPlayerIndex] = useState(-1);
  const [impostorGuessedCorrectly, setImpostorGuessedCorrectly] = useState(false);

  const impostorIndexes = useMemo(
    () => roundAssignments.map((a, i) => (a.role === 'impostor' ? i : -1)).filter((i) => i >= 0),
    [roundAssignments]
  );

  // ---------------- PERSISTENCE ----------------
  // Load saved state on mount (best-effort, ignore parse errors)
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('impostorGame:v1');
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') {
        if (Array.isArray(saved.players)) setPlayers(saved.players);
        if (typeof saved.newPlayerName === 'string') setNewPlayerName(saved.newPlayerName);
        if (typeof saved.allowMultipleImpostors === 'boolean') setAllowMultipleImpostors(saved.allowMultipleImpostors);
        if (typeof saved.giveImpostorFakeWord === 'boolean') setGiveImpostorFakeWord(saved.giveImpostorFakeWord);
        if (typeof saved.category === 'string') setCategory(saved.category);
        if (typeof saved.secretWord === 'string') setSecretWord(saved.secretWord);
        if (typeof saved.vagueHint === 'string') setVagueHint(saved.vagueHint);
        if (saved.fakeWordCandidate === null || typeof saved.fakeWordCandidate === 'string') setFakeWordCandidate(saved.fakeWordCandidate);
        if (Array.isArray(saved.roundAssignments)) setRoundAssignments(saved.roundAssignments);
        if (typeof saved.phase === 'string') setPhase(saved.phase);
        if (typeof saved.revealIndex === 'number') setRevealIndex(saved.revealIndex);
        if (typeof saved.currentRevealed === 'boolean') setCurrentRevealed(saved.currentRevealed);
        if (typeof saved.hintVisible === 'boolean') setHintVisible(saved.hintVisible);
        if (typeof saved.votedPlayerIndex === 'number') setVotedPlayerIndex(saved.votedPlayerIndex);
        if (typeof saved.impostorGuessedCorrectly === 'boolean') setImpostorGuessedCorrectly(saved.impostorGuessedCorrectly);
        if (typeof saved.genDone === 'boolean') setGenDone(saved.genDone);
        if (typeof saved.isDarkMode === 'boolean') setIsDarkMode(saved.isDarkMode);
      }
    } catch {}
  }, []);

  // Save relevant state whenever it changes
  React.useEffect(() => {
    try {
      const data = {
        players,
        newPlayerName,
        allowMultipleImpostors,
        giveImpostorFakeWord,
        category,
        secretWord,
        vagueHint,
        fakeWordCandidate,
        roundAssignments,
        phase,
        revealIndex,
        currentRevealed,
        hintVisible,
        votedPlayerIndex,
        impostorGuessedCorrectly,
        genDone,
        isDarkMode
      };
      localStorage.setItem('impostorGame:v1', JSON.stringify(data));
    } catch {}
  }, [
    players,
    newPlayerName,
    allowMultipleImpostors,
    giveImpostorFakeWord,
    category,
    secretWord,
    vagueHint,
    fakeWordCandidate,
    roundAssignments,
    phase,
    revealIndex,
    currentRevealed,
    hintVisible,
    votedPlayerIndex,
    impostorGuessedCorrectly,
    genDone,
    isDarkMode
  ]);

  // Save before the page is hidden or unloaded (mobile or OS suspend)
  React.useEffect(() => {
    const saveNow = () => {
      try {
        const data = {
          players,
          newPlayerName,
          allowMultipleImpostors,
          giveImpostorFakeWord,
          category,
          secretWord,
          vagueHint,
          fakeWordCandidate,
          roundAssignments,
          phase,
          revealIndex,
          currentRevealed,
          hintVisible,
          votedPlayerIndex,
          impostorGuessedCorrectly,
          genDone,
          isDarkMode
        };
        localStorage.setItem('impostorGame:v1', JSON.stringify(data));
      } catch {}
    };
    const onVis = () => {
      if (document.visibilityState !== 'visible') saveNow();
    };
    const onPageHide = () => saveNow();
    const onBeforeUnload = () => saveNow();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [
    players,
    newPlayerName,
    allowMultipleImpostors,
    giveImpostorFakeWord,
    category,
    secretWord,
    vagueHint,
    fakeWordCandidate,
    roundAssignments,
    phase,
    revealIndex,
    currentRevealed,
    hintVisible,
    votedPlayerIndex,
    impostorGuessedCorrectly,
    genDone,
    isDarkMode
  ]);

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
      setGenDone(true); // proceed for local demo
    }
  }

  function assignRolesAndBeginReveal() {
    if (!genDone || !secretWord) {
      alert('Generate the word & hint first.');
      return;
    }
    const n = players.length;

    // Decide impostor indexes (unchanged)
    let impostors = [];
    if (allowMultipleImpostors) {
      const shuffled = shuffle([...Array(n).keys()]);
      impostors.push(shuffled[0]); // at least 1
      let p = 0.25; // base chance for an extra impostor
      for (let i = 1; i < shuffled.length; i++) {
        p *= 0.25;
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
      setPhase('gate-score'); // gate screen before scoring
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
        roundAssignments.forEach((a, idx) => {
          if (a.role !== 'impostor') updated[idx].score += 1;
        });
      } else {
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

  // ---------------- RENDER ----------------
  return (
    <div style={{ background: theme.color.bg, color: theme.color.text, minHeight: '100vh', fontFamily: theme.font.family, transition: 'background 200ms ease' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: theme.spacing(3) }}>
        <Header theme={theme} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />

        {phase === 'setup' && (
          <Card theme={theme} title="Players & Scores">
            <PlayerManager
              theme={theme}
              players={players}
              onRemove={removePlayer}
              onAdd={addPlayer}
              newPlayerName={newPlayerName}
              setNewPlayerName={setNewPlayerName}
              setPlayers={setPlayers}
            />
            <div style={{ marginTop: theme.spacing(2) }}>
              <Button
                theme={theme}
                onClick={startRoundSetup}
                disabled={players.length < 3}
                ariaLabel="Start Round"
              >
                Start Round
              </Button>
            </div>
          </Card>
        )}

        {phase === 'round-setup' && (
          <>
            <Card theme={theme} title="Players & Scores (Editable Between Rounds)">
              <PlayerManager
                theme={theme}
                players={players}
                onRemove={removePlayer}
                onAdd={addPlayer}
                newPlayerName={newPlayerName}
                setNewPlayerName={setNewPlayerName}
                setPlayers={setPlayers}
              />
            </Card>

            <Card theme={theme} title="Round Setup">
              <div style={{ display: 'grid', gap: theme.spacing(1.5), gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <Label theme={theme}>Category</Label>
                  <Input
                    theme={theme}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., animals, movies, breakfast foods"
                  />
                </div>
                <div style={{ display: 'flex', gap: theme.spacing(1), alignItems: 'end' }}>
                  <Button theme={theme} onClick={() => generateWordAndHintFromCategory(category)}>
                    Generate
                  </Button>
                  <ButtonSubtle
                    theme={theme}
                    onClick={() => {
                      setSecretWord('');
                      setVagueHint('');
                      setFakeWordCandidate(null);
                      setGenDone(false);
                    }}
                  >
                    Clear
                  </ButtonSubtle>
                </div>
              </div>

              <StatusRow theme={theme} ok={genDone} okText="Successful generation. Ready to assign roles." />

              <div style={{ display: 'grid', gap: theme.spacing(1.5), gridTemplateColumns: '1fr 1fr', marginTop: theme.spacing(1.5) }}>
                <Toggle
                  theme={theme}
                  label="Allow multiple impostors"
                  checked={allowMultipleImpostors}
                  onChange={setAllowMultipleImpostors}
                />
                <Toggle
                  theme={theme}
                  label="Give impostor a fake word"
                  checked={giveImpostorFakeWord}
                  onChange={setGiveImpostorFakeWord}
                />
              </div>

              <div style={{ marginTop: theme.spacing(2) }}>
                <Button
                  theme={theme}
                  onClick={assignRolesAndBeginReveal}
                  disabled={!genDone}
                  variant={genDone ? 'primary' : 'disabled'}
                  ariaLabel="Assign Roles & Start Reveal"
                >
                  Assign Roles &amp; Start Reveal
                </Button>
              </div>

            </Card>
          </>
        )}

        {phase === 'reveal' && (
          <Card theme={theme} title={`Private Reveal – ${roundAssignments[revealIndex]?.name || ''}`}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: theme.spacing(2) }}>
              <RevealCard
                theme={theme}
                assignment={roundAssignments[revealIndex]}
                revealed={currentRevealed}
                hintVisible={hintVisible}
                onReveal={() => setCurrentRevealed(true)}
                onShowHint={() => setHintVisible(true)}
                giveImpostorFakeWord={giveImpostorFakeWord}
              />
              <Button theme={theme} onClick={nextRevealStep}>
                {revealIndex < roundAssignments.length - 1
                  ? currentRevealed
                    ? 'Pass to Next Player'
                    : 'Reveal'
                  : currentRevealed
                  ? 'Continue'
                  : 'Reveal'}
              </Button>
            </div>

            <div
              style={{
                display: 'grid',
                gap: theme.spacing(1),
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                marginTop: theme.spacing(2)
              }}
            >
              {roundAssignments.map((a, idx) => (
                <div
                  key={idx}
                  style={{
                    border: `1px solid ${theme.color.border}`,
                    borderRadius: theme.radius.md,
                    padding: theme.spacing(1.5),
                    background: theme.color.surfaceSoft
                  }}
                >
                  <div style={{ fontSize: theme.font.size.xs, color: idx === revealIndex ? theme.color.accent : theme.color.text }}>
                    {a.name}
                  </div>
                  <div style={{ fontSize: theme.font.size.xs, opacity: 0.7 }}>
                    {idx < revealIndex ? 'Done' : idx === revealIndex ? 'Current' : 'Waiting'}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {phase === 'gate-score' && <GateOverlay theme={theme} onContinue={enterScoring} />}

        {phase === 'score' && (
          <Card theme={theme} title="End Round – Scoring">
            <div style={{ display: 'grid', gap: theme.spacing(3), gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <Label theme={theme}>Who was voted as the impostor?</Label>
                <select
                  className="input"
                  value={votedPlayerIndex}
                  onChange={(e) => setVotedPlayerIndex(parseInt(e.target.value))}
                  style={inputStyle(theme)}
                >
                  <option value={-1}>Select player…</option>
                  {players.map((p, i) => (
                    <option key={i} value={i}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <div style={{ marginTop: theme.spacing(1.5) }}>
                  <Toggle
                    theme={theme}
                    label="Did the impostor guess the word? (+1 impostor)"
                    checked={impostorGuessedCorrectly}
                    onChange={setImpostorGuessedCorrectly}
                  />
                </div>

                <Button theme={theme} style={{ marginTop: theme.spacing(2) }} onClick={commitScores}>
                  Apply Scores
                </Button>
              </div>

              {/* No spoilers box */}
              <div
                style={{
                  border: `1px dashed ${theme.color.border}`,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing(1.5),
                  background: theme.color.surface,
                  opacity: 0.8
                }}
              >
                No spoilers shown here. Use votes and the impostor-guess toggle to score.
              </div>
            </div>
          </Card>
        )}

        {phase === 'between-rounds' && (
          <>
            <Card theme={theme} title="Scores & Roster">
              <Scoreboard theme={theme} players={players} />
              <div style={{ marginTop: theme.spacing(2) }}>
                <PlayerManager
                  theme={theme}
                  players={players}
                  onRemove={removePlayer}
                  onAdd={addPlayer}
                  newPlayerName={newPlayerName}
                  setNewPlayerName={setNewPlayerName}
                  setPlayers={setPlayers}
                />
              </div>
              <div style={{ marginTop: theme.spacing(2), display: 'flex', gap: theme.spacing(1) }}>
                <Button theme={theme} onClick={newRound}>
                  Next Round
                </Button>
                <ButtonSubtle theme={theme} onClick={() => setPhase('setup')}>
                  Back to Start
                </ButtonSubtle>
              </div>
            </Card>
          </>
        )}

        <footer style={{ marginTop: theme.spacing(5), fontSize: theme.font.size.xs, opacity: 0.7 }}>
          Local demo. Pass the laptop for private reveals.
        </footer>
      </div>

      {/* minimal base styles shared */}
      <style>{`
        * { box-sizing: border-box }
        .fade-in {
          animation: fade-in 180ms ease-out forwards;
          opacity: 0;
          transform: translateY(4px);
        }
        @keyframes fade-in {
          to { opacity: 1; transform: translateY(0) }
        }
      `}</style>
    </div>
  );
}

/* ---------------- SMALL UI PRIMITIVES ---------------- */

function Header({ theme, isDarkMode, toggleTheme }) {
  return (
    <div className="fade-in" style={{ marginBottom: theme.spacing(2.5), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <h1
        style={{
          fontSize: theme.font.size.xl,
          fontWeight: theme.font.weight.bold,
          margin: 0,
          letterSpacing: 0.2,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing(1)
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            background: theme.color.accent,
            boxShadow: theme.shadow.sm
          }}
        />
        Impostor Game – Local Demo
      </h1>
      <button
        onClick={toggleTheme}
        style={{
          padding: '8px 14px',
          borderRadius: theme.radius.md,
          background: theme.color.subtleBtnBg,
          color: theme.color.subtleBtnText,
          border: `1px solid ${theme.color.border}`,
          cursor: 'pointer',
          fontWeight: theme.font.weight.med,
          fontSize: theme.font.size.sm,
          transition: 'background 120ms ease',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = theme.color.subtleBtnHover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = theme.color.subtleBtnBg)}
      >
        {isDarkMode ? '☀️' : '🌙'} {isDarkMode ? 'Light' : 'Dark'}
      </button>
    </div>
  );
}

function Card({ theme, title, children }) {
  return (
    <section
      className="fade-in"
      style={{
        border: `1px solid ${theme.color.border}`,
        background: theme.color.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing(2),
        marginBottom: theme.spacing(2),
        boxShadow: theme.shadow.sm
      }}
    >
      {title && (
        <h2 style={{ fontSize: theme.font.size.lg, margin: 0, marginBottom: theme.spacing(1), fontWeight: theme.font.weight.med }}>
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

function Button({ theme, children, variant = 'normal', disabled, onClick, style, ariaLabel }) {
  const styles = {
    normal: { background: theme.color.accentMuted, color: '#fff' },
    primary: { background: theme.color.primary, color: '#fff' },
    disabled: { background: theme.color.disabledBg, color: theme.color.disabledText }
  }[disabled ? 'disabled' : variant];

  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '10px 16px',
        borderRadius: theme.radius.md,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'transform 80ms ease',
        fontWeight: theme.font.weight.med,
        ...styles,
        ...style
      }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = 'scale(0.98)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
    >
      {children}
    </button>
  );
}

function ButtonSubtle({ theme, children, onClick, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 12px',
        borderRadius: theme.radius.md,
        background: theme.color.subtleBtnBg,
        color: theme.color.subtleBtnText,
        border: `1px solid ${theme.color.border}`,
        cursor: 'pointer',
        fontWeight: theme.font.weight.med,
        transition: 'background 120ms ease',
        ...style
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = theme.color.subtleBtnHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = theme.color.subtleBtnBg)}
    >
      {children}
    </button>
  );
}

function Label({ theme, children }) {
  return (
    <label style={{ fontSize: theme.font.size.xs, display: 'block', marginBottom: 6, color: theme.color.muted }}>
      {children}
    </label>
  );
}

function inputStyle(theme) {
  return {
    width: '100%',
    padding: '10px 12px',
    borderRadius: theme.radius.sm,
    border: `1px solid ${theme.color.border}`,
    background: theme.color.surfaceSoft,
    color: theme.color.text,
    outline: 'none'
  };
}

function Input({ theme, ...props }) {
  return <input {...props} style={inputStyle(theme)} />;
}

function Toggle({ theme, label, checked, onChange }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        userSelect: 'none',
        padding: '8px 10px',
        borderRadius: theme.radius.sm,
        background: theme.color.surfaceSoft,
        border: `1px solid ${theme.color.border}`
      }}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span style={{ fontSize: theme.font.size.sm }}>{label}</span>
    </label>
  );
}

function StatusRow({ theme, ok, okText }) {
  return (
    <div style={{ marginTop: 8, fontSize: theme.font.size.xs }}>
      {ok ? (
        <div style={{ color: theme.color.accent }}>
          <b>✓ {okText}</b>
        </div>
      ) : (
        <div style={{ opacity: 0.7 }}>
          <em>(not generated)</em>
        </div>
      )}
    </div>
  );
}

/**
 * RevealCard rules (logic unchanged):
 * - If giveImpostorFakeWord === true:
 *   - UI is identical for all players. Everyone sees "Your secret word".
 *   - Word holders see the real word; the impostor sees fakeWord.
 *   - No hint button for anyone.
 * - If giveImpostorFakeWord === false:
 *   - Word holders: see secret word, NO hint button.
 *   - Impostor: sees "You are the Impostor" and CAN use the hint button.
 */
function RevealCard({
  theme,
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
  const displayWord = isImpostor ? assignment.fakeWord : assignment.word;
  const canShowHintButton = !showIdenticalUI && isImpostor;

  return (
    <div style={{ width: '100%', maxWidth: 480 }}>
      <div
        style={{
          border: `1px solid ${theme.color.border}`,
          background: theme.color.surfaceSoft,
          borderRadius: theme.radius.lg,
          padding: theme.spacing(2),
          textAlign: 'center',
          boxShadow: theme.shadow.md
        }}
      >
        {!revealed ? (
          <>
            <div style={{ fontSize: theme.font.size.xs, opacity: 0.8, marginBottom: 10 }}>
              Tap reveal when it's your turn. Keep the screen private!
            </div>
            <Button theme={theme} onClick={onReveal}>
              Reveal
            </Button>
          </>
        ) : (
          <>
            {showIdenticalUI ? (
              <div>
                <div style={{ fontSize: theme.font.size.xs, opacity: 0.8 }}>Your secret word:</div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: theme.font.weight.bold,
                    color: theme.color.accent,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    marginTop: 6
                  }}
                >
                  {displayWord || '—'}
                </div>
              </div>
            ) : isImpostor ? (
              <div>
                <div style={{ fontSize: 22, fontWeight: theme.font.weight.bold, color: theme.color.warn }}>
                  You are the Impostor
                </div>
                <div style={{ marginTop: 10 }}>
                  {!hintVisible ? (
                    canShowHintButton ? (
                      <ButtonSubtle theme={theme} onClick={onShowHint}>
                        Show Hint (optional)
                      </ButtonSubtle>
                    ) : null
                  ) : (
                    <div style={{ fontSize: theme.font.size.sm, opacity: 0.85 }}>
                      Hint: <span style={{ opacity: 1 }}>{assignment.hint}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: theme.font.size.xs, opacity: 0.8 }}>Your secret word:</div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: theme.font.weight.bold,
                    color: theme.color.accent,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    marginTop: 6
                  }}
                >
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

function PlayerManager({ theme, players, onRemove, onAdd, newPlayerName, setNewPlayerName, setPlayers }) {
  return (
    <div>
      <div
        style={{
          overflow: 'auto',
          border: `1px solid ${theme.color.border}`,
          borderRadius: theme.radius.md,
          background: theme.color.surfaceSoft
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: theme.color.surface }}>
            <tr>
              <Th theme={theme}>#</Th>
              <Th theme={theme}>Name</Th>
              <Th theme={theme}>Score</Th>
              <Th theme={theme}>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, idx) => (
              <tr key={idx} style={{ borderTop: `1px solid ${theme.color.border}` }}>
                <Td theme={theme} style={{ opacity: 0.8, width: 56 }}>
                  {idx + 1}
                </Td>
                <Td theme={theme}>
                  <InlineRename
                    theme={theme}
                    value={p.name}
                    onChange={(name) => {
                      setPlayers((prev) => prev.map((pp, i) => (i === idx ? { ...pp, name } : pp)));
                    }}
                  />
                </Td>
                <Td theme={theme} style={{ width: 80, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                  {p.score}
                </Td>
                <Td theme={theme} style={{ width: 120 }}>
                  <ButtonSubtle theme={theme} onClick={() => onRemove(idx)}>
                    Remove
                  </ButtonSubtle>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: theme.spacing(1), marginTop: theme.spacing(1.5) }}>
        <Input
          theme={theme}
          placeholder="Add player name"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        />
        <Button theme={theme} onClick={onAdd}>
          Add
        </Button>
      </div>
    </div>
  );
}

function InlineRename({ theme, value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  return (
    <span>
      {editing ? (
        <span style={{ display: 'inline-flex', gap: 6 }}>
          <Input theme={theme} value={draft} onChange={(e) => setDraft(e.target.value)} style={{ width: 220 }} />
          <Button
            theme={theme}
            onClick={() => {
              const v = draft.trim();
              if (v) onChange(v);
              setEditing(false);
            }}
          >
            Save
          </Button>
          <ButtonSubtle
            theme={theme}
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
          >
            Cancel
          </ButtonSubtle>
        </span>
      ) : (
        <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <span>{value}</span>
          <ButtonSubtle theme={theme} onClick={() => setEditing(true)}>
            Rename
          </ButtonSubtle>
        </span>
      )}
    </span>
  );
}

function Th({ theme, children }) {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '12px 12px',
        fontSize: 12,
        color: theme.color.muted,
        fontWeight: theme.font.weight.med
      }}
    >
      {children}
    </th>
  );
}
function Td({ theme, children, style }) {
  return (
    <td style={{ padding: '12px 12px', fontSize: 14, ...style }}>
      {children}
    </td>
  );
}

function Scoreboard({ theme, players }) {
  return (
    <div
      style={{
        overflow: 'auto',
        border: `1px solid ${theme.color.border}`,
        borderRadius: theme.radius.md,
        background: theme.color.surfaceSoft
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ background: theme.color.surface }}>
          <tr>
            <Th theme={theme}>#</Th>
            <Th theme={theme}>Player</Th>
            <Th theme={theme}>Score</Th>
          </tr>
        </thead>
        <tbody>
          {players
            .map((p, i) => ({ ...p, i }))
            .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
            .map((p, rank) => (
              <tr key={p.i} style={{ borderTop: `1px solid ${theme.color.border}` }}>
                <Td theme={theme} style={{ opacity: 0.8, width: 56 }}>
                  {rank + 1}
                </Td>
                <Td theme={theme}>{p.name}</Td>
                <Td theme={theme} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', width: 100 }}>
                  {p.score}
                </Td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function GateOverlay({ theme, onContinue }) {
  return (
    <div
      className="gate"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 50,
        padding: 16
      }}
    >
      <div
        style={{
          background: theme.color.surface,
          color: theme.color.text,
          padding: 24,
          borderRadius: theme.radius.lg,
          width: 'min(580px, 92vw)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          border: `1px solid ${theme.color.border}`
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8, color: theme.color.text }}>Round complete</h2>
        <p style={{ fontSize: 13, color: theme.color.muted, margin: 0, marginBottom: 16 }}>
          Click continue to open the scoring screen. Roles and the secret word will not be shown.
        </p>
        <Button theme={theme} onClick={onContinue} variant="primary" ariaLabel="Continue to Scoring">
          Continue to Scoring
        </Button>
      </div>
    </div>
  );
}

/* ---------------- UTIL ---------------- */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
