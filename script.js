const PLAYER_ORDER = ["red", "green", "yellow", "blue"];
const PLAYER_LABELS = {
  red: "Red",
  green: "Green",
  yellow: "Yellow",
  blue: "Blue",
};

const START_INDEX = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

const SAFE_GLOBAL_TRACKS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const TOKENS_PER_PLAYER = 4;
const FINAL_HOME_PROGRESS = 57;

const boardEl = document.getElementById("board");
const turnTextEl = document.getElementById("turnText");
const diceTextEl = document.getElementById("diceText");
const rollBtn = document.getElementById("rollBtn");
const resetBtn = document.getElementById("resetBtn");

let state;
let trackPoints;
let lanePoints;
let yardPoints;

init();

function init() {
  trackPoints = buildTrackPoints(52, 50, 50, 38);
  lanePoints = buildLanePoints();
  yardPoints = buildYardPoints();

  resetGame();
  rollBtn.addEventListener("click", onRoll);
  resetBtn.addEventListener("click", resetGame);
}

function resetGame() {
  state = {
    currentPlayerIndex: 0,
    rolledValue: null,
    pendingMovables: [],
    winner: null,
    players: PLAYER_ORDER.reduce((acc, player) => {
      acc[player] = {
        tokens: Array.from({ length: TOKENS_PER_PLAYER }, (_, idx) => ({
          id: `${player}-${idx}`,
          progress: -1,
        })),
      };
      return acc;
    }, {}),
  };

  render();
}

function onRoll() {
  if (state.winner || state.rolledValue !== null) {
    return;
  }

  const player = currentPlayer();
  const dice = randomDice();
  state.rolledValue = dice;

  const movable = getMovableTokenIndices(player, dice);
  state.pendingMovables = movable;

  if (movable.length === 0) {
    diceTextEl.textContent = `${PLAYER_LABELS[player]} rolled ${dice}. No valid move.`;
    finalizeTurn(false, false);
    return;
  }

  const suffix = movable.length === 1 ? "token" : "tokens";
  diceTextEl.textContent = `${PLAYER_LABELS[player]} rolled ${dice}. Move ${movable.length} ${suffix}.`;
  render();
}

function onTokenClick(player, tokenIndex) {
  if (state.winner) {
    return;
  }

  const active = currentPlayer();
  if (player !== active || state.rolledValue === null) {
    return;
  }

  if (!state.pendingMovables.includes(tokenIndex)) {
    return;
  }

  const token = state.players[player].tokens[tokenIndex];
  const destination = computeDestination(token.progress, state.rolledValue);
  if (destination === null) {
    return;
  }

  token.progress = destination;
  const capture = maybeCapture(player, token);
  const justWon = checkPlayerWon(player);

  if (justWon) {
    state.winner = player;
    state.rolledValue = null;
    state.pendingMovables = [];
    render();
    return;
  }

  finalizeTurn(state.rolledValue === 6, capture);
}

function finalizeTurn(rolledSix, didCapture) {
  const active = currentPlayer();
  const dice = state.rolledValue;
  const extraTurn = rolledSix || didCapture;

  state.rolledValue = null;
  state.pendingMovables = [];

  if (extraTurn) {
    const why = rolledSix && didCapture ? "6 and a capture" : rolledSix ? "6" : "capture";
    diceTextEl.textContent = `${PLAYER_LABELS[active]} earns an extra turn (${why}).`;
  } else if (dice !== null) {
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % PLAYER_ORDER.length;
  }

  render();
}

function maybeCapture(player, movedToken) {
  if (movedToken.progress < 0 || movedToken.progress > 51) {
    return false;
  }

  const g = toGlobalTrack(player, movedToken.progress);
  if (SAFE_GLOBAL_TRACKS.has(g)) {
    return false;
  }

  let captured = false;
  for (const opponent of PLAYER_ORDER) {
    if (opponent === player) {
      continue;
    }

    for (const token of state.players[opponent].tokens) {
      if (token.progress < 0 || token.progress > 51) {
        continue;
      }

      if (toGlobalTrack(opponent, token.progress) === g) {
        token.progress = -1;
        captured = true;
      }
    }
  }

  return captured;
}

function checkPlayerWon(player) {
  return state.players[player].tokens.every((token) => token.progress === FINAL_HOME_PROGRESS);
}

function getMovableTokenIndices(player, dice) {
  const tokens = state.players[player].tokens;
  const result = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const destination = computeDestination(tokens[i].progress, dice);
    if (destination !== null) {
      result.push(i);
    }
  }

  return result;
}

function computeDestination(progress, dice) {
  if (progress === -1) {
    return dice === 6 ? 0 : null;
  }

  if (progress >= 0 && progress <= 51) {
    const target = progress + dice;
    return target <= FINAL_HOME_PROGRESS ? target : null;
  }

  if (progress >= 52 && progress <= FINAL_HOME_PROGRESS) {
    const target = progress + dice;
    return target <= FINAL_HOME_PROGRESS ? target : null;
  }

  return null;
}

function currentPlayer() {
  return PLAYER_ORDER[state.currentPlayerIndex];
}

function randomDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function toGlobalTrack(player, progress) {
  return (START_INDEX[player] + progress) % 52;
}

function render() {
  renderBoardBackground();
  renderTokens();
  renderLabels();
}

function renderBoardBackground() {
  const svg = `
    <svg viewBox="0 0 100 100" role="img" aria-label="Ludo board graphics">
      <defs>
        <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0.3" stdDeviation="0.35" flood-color="#000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill="#f6f2e8" />

      <circle cx="50" cy="50" r="40" fill="#f8f6f0" stroke="#1f2b38" stroke-width="0.55"/>
      <circle cx="50" cy="50" r="28" fill="#fffdf7" stroke="#1f2b38" stroke-width="0.4"/>

      <rect x="6" y="6" width="26" height="26" rx="2" fill="#ffd6da" stroke="#1f2b38" stroke-width="0.45"/>
      <rect x="68" y="6" width="26" height="26" rx="2" fill="#cdf1eb" stroke="#1f2b38" stroke-width="0.45"/>
      <rect x="68" y="68" width="26" height="26" rx="2" fill="#ffe8cd" stroke="#1f2b38" stroke-width="0.45"/>
      <rect x="6" y="68" width="26" height="26" rx="2" fill="#d5e9f7" stroke="#1f2b38" stroke-width="0.45"/>

      ${renderTrackCellsSvg()}
      ${renderLaneCellsSvg()}

      <circle cx="50" cy="50" r="8" fill="#ffffff" stroke="#1f2b38" stroke-width="0.45" filter="url(#s)" />
      <text x="50" y="51" text-anchor="middle" dominant-baseline="middle" font-size="2.4" font-weight="700" fill="#1f2b38">HOME</text>
    </svg>
  `;

  boardEl.innerHTML = svg;
}

function renderTrackCellsSvg() {
  let out = "";

  for (let i = 0; i < trackPoints.length; i += 1) {
    const p = trackPoints[i];
    const safe = SAFE_GLOBAL_TRACKS.has(i);
    out += `<circle cx="${p.x}" cy="${p.y}" r="2.05" fill="${safe ? "#fff6a2" : "#ffffff"}" stroke="#1f2b38" stroke-width="0.28"/>`;
  }

  return out;
}

function renderLaneCellsSvg() {
  let out = "";
  const laneColor = {
    red: "#f6a0a8",
    green: "#8edecf",
    yellow: "#f8cb90",
    blue: "#9bc8e5",
  };

  for (const player of PLAYER_ORDER) {
    for (let i = 0; i < lanePoints[player].length; i += 1) {
      const p = lanePoints[player][i];
      out += `<circle cx="${p.x}" cy="${p.y}" r="2.05" fill="${laneColor[player]}" stroke="#1f2b38" stroke-width="0.28"/>`;
    }
  }

  return out;
}

function renderTokens() {
  const occupancy = buildOccupancyMap();

  for (const player of PLAYER_ORDER) {
    const tokens = state.players[player].tokens;

    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      const positionInfo = resolveTokenPosition(player, i, token.progress, occupancy);
      const tokenEl = document.createElement("button");
      tokenEl.className = `token ${player}`;
      tokenEl.textContent = String(i + 1);
      tokenEl.style.left = `${positionInfo.x}%`;
      tokenEl.style.top = `${positionInfo.y}%`;
      tokenEl.style.zIndex = String(4 + positionInfo.stackIndex);

      const isCurrentPlayer = player === currentPlayer();
      const isMovable =
        isCurrentPlayer && state.rolledValue !== null && state.pendingMovables.includes(i) && !state.winner;

      if (isMovable) {
        tokenEl.classList.add("movable");
      }

      tokenEl.addEventListener("click", () => onTokenClick(player, i));
      boardEl.appendChild(tokenEl);
    }
  }
}

function buildOccupancyMap() {
  const map = new Map();

  for (const player of PLAYER_ORDER) {
    const tokens = state.players[player].tokens;
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      const key = toCellKey(player, i, token.progress);
      map.set(key, (map.get(key) || 0) + 1);
    }
  }

  return map;
}

function resolveTokenPosition(player, tokenIndex, progress, occupancyMap) {
  const key = toCellKey(player, tokenIndex, progress);
  const currentCount = occupancyMap.get(key) || 1;
  occupancyMap.set(key, currentCount - 1);
  const stackIndex = currentCount - 1;

  let base;
  if (progress === -1) {
    base = yardPoints[player][tokenIndex];
  } else if (progress <= 51) {
    base = trackPoints[toGlobalTrack(player, progress)];
  } else {
    base = lanePoints[player][progress - 52];
  }

  const offsetAngle = (stackIndex * Math.PI) / 2;
  const spread = Math.min(stackIndex, 3) * 1.15;

  return {
    x: base.x + Math.cos(offsetAngle) * spread,
    y: base.y + Math.sin(offsetAngle) * spread,
    stackIndex,
  };
}

function toCellKey(player, tokenIndex, progress) {
  if (progress === -1) {
    return `yard-${player}-${tokenIndex}`;
  }

  if (progress <= 51) {
    return `track-${toGlobalTrack(player, progress)}`;
  }

  return `lane-${player}-${progress}`;
}

function renderLabels() {
  if (state.winner) {
    turnTextEl.textContent = `${PLAYER_LABELS[state.winner]} wins the game!`;
    diceTextEl.textContent = "Game over. Start a new game to play again.";
    rollBtn.disabled = true;
    return;
  }

  rollBtn.disabled = state.rolledValue !== null;
  turnTextEl.textContent = `Turn: ${PLAYER_LABELS[currentPlayer()]}`;
}

function buildTrackPoints(total, cx, cy, radius) {
  const points = [];

  for (let i = 0; i < total; i += 1) {
    const angle = (-Math.PI / 2) + (2 * Math.PI * i) / total;
    points.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }

  return points;
}

function buildLanePoints() {
  return {
    red: makeLinearPoints(50, 20, 50, 44, 6),
    green: makeLinearPoints(80, 50, 56, 50, 6),
    yellow: makeLinearPoints(50, 80, 50, 56, 6),
    blue: makeLinearPoints(20, 50, 44, 50, 6),
  };
}

function buildYardPoints() {
  return {
    red: makeRectPoints(12, 12, 14),
    green: makeRectPoints(74, 12, 14),
    yellow: makeRectPoints(74, 74, 14),
    blue: makeRectPoints(12, 74, 14),
  };
}

function makeLinearPoints(x1, y1, x2, y2, count) {
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    points.push({
      x: x1 + (x2 - x1) * t,
      y: y1 + (y2 - y1) * t,
    });
  }
  return points;
}

function makeRectPoints(x, y, size) {
  return [
    { x: x + 3.5, y: y + 3.5 },
    { x: x + size - 3.5, y: y + 3.5 },
    { x: x + 3.5, y: y + size - 3.5 },
    { x: x + size - 3.5, y: y + size - 3.5 },
  ];
}
