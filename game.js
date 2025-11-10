// Duelo Rítmico: 2 jugadores - estilo Guitar Hero (compacto)
const menuScene = {
  key: 'Menu',
  create: function () {
    const s = this;
    s.add.text(400, 200, 'DUEL RHYTHM', { font: '48px Arial', fill: '#ffd966' }).setOrigin(0.5);

    // Menu options
    const options = [
      '2 Players (Dynamic)',
      'Single Player (Beatmap)',
      '2 Players (Beatmap Duel)'
    ];
    let selectedIndex = 0;

    const optionTexts = [];
    options.forEach((option, i) => {
      const y = 300 + i * 30;
      const text = s.add.text(400, y, option, {
        font: '24px Arial',
        fill: i === selectedIndex ? '#ffd966' : '#ffffff'
      }).setOrigin(0.5);
      optionTexts.push(text);
    });

    const updateSelection = () => {
      optionTexts.forEach((text, i) => {
        text.setFill(i === selectedIndex ? '#ffd966' : '#ffffff');
      });
    };

    s.input.keyboard.on('keydown-ENTER', () => {
      if (selectedIndex === 0) {
        singlePlayer = false;
        beatmapDuel = false;
        s.scene.start('Game');
      } else if (selectedIndex === 1) {
        singlePlayer = true;
        beatmapDuel = false;
        s.scene.start('Game');
      } else if (selectedIndex === 2) {
        singlePlayer = false;
        beatmapDuel = true;
        s.scene.start('Game');
      }
    });

    // Note keys can also select any option
    const noteKeys = ['a', 's', 'd', 'f', 'h', 'j', 'k', 'l'];
    noteKeys.forEach(key => {
      s.input.keyboard.on('keydown-' + key.toUpperCase(), () => {
        if (selectedIndex === 0) {
          singlePlayer = false;
          beatmapDuel = false;
          s.scene.start('Game');
        } else if (selectedIndex === 1) {
          singlePlayer = true;
          beatmapDuel = false;
          s.scene.start('Game');
        } else if (selectedIndex === 2) {
          singlePlayer = false;
          beatmapDuel = true;
          s.scene.start('Game');
        }
      });
    });
    s.input.keyboard.on('keydown-UP', () => {
      selectedIndex = Math.max(0, selectedIndex - 1);
      updateSelection();
    });
    s.input.keyboard.on('keydown-DOWN', () => {
      selectedIndex = Math.min(options.length - 1, selectedIndex + 1);
      updateSelection();
    });

    // Arcade controls
    const arcadeKeys = ['p1u', 'p1d', 'p1a', 'start1'];
    arcadeKeys.forEach(key => {
      s.input.keyboard.on('keydown-' + key.toUpperCase(), () => {
        if (key === 'p1u') {
          selectedIndex = Math.max(0, selectedIndex - 1);
          updateSelection();
        } else if (key === 'p1d') {
          selectedIndex = Math.min(options.length - 1, selectedIndex + 1);
          updateSelection();
        } else if (key === 'p1a' || key === 'start1') {
          if (selectedIndex === 0) {
            singlePlayer = false;
            beatmapDuel = false;
            s.scene.start('Game');
          } else if (selectedIndex === 1) {
            singlePlayer = true;
            beatmapDuel = false;
            s.scene.start('Game');
          } else if (selectedIndex === 2) {
            singlePlayer = false;
            beatmapDuel = true;
            s.scene.start('Game');
          }
        }
      });
    });
  }
};

const gameScene = {
  key: 'Game',
  create: gameCreate,
  update: gameUpdate
};

const cfg = { type: Phaser.AUTO, width: 800, height: 600, backgroundColor: '#081017', scene: [menuScene, gameScene] };
const game = new Phaser.Game(cfg);

let g, notes1 = [], notes2 = [], lanes = 4, laneW, hitY = 520, speed = 220, spawnRate = 420, score1 = 0, score2 = 0, running = true, timerText, scoreText1, scoreText2, endText;
// leadTimer acumula ms durante los cuales la diferencia absoluta > leadThreshold
let leadTimer = 0;
const leadThreshold = 2000; // puntos
const leadDuration = 30000; // ms (30s)
let difficultyMultiplier = 1.0;
// visual note size
let noteWidth = 64;
let labelTexts1 = [];
let labelTexts2 = [];
// separator between players
const separatorWidth = 36;
let halfWidth;
// key states for simultaneous presses
let keysDown = {};
// base probability for multi-notes
const baseMultiProb = 0.1;
// game mode
let singlePlayer = false;
let beatmapDuel = false;
// beatmap for single player: [time_ms, frequency_hz, change_type]
const beatmap = [];
// beatmaps for duel mode
const beatmap1 = [];
const beatmap2 = [];

let beatmapIndex = 0;
let lastLane = 0;
let totalPossibleScore = 0;
// beatmap indices for duel mode
let beatmapIndex1 = 0;
let beatmapIndex2 = 0;
let lastLane1 = 0;
let lastLane2 = 0;
function gameCreate() {
  const s = this;
  // reset runtime state (useful when scene restarts)
  notes1 = [];
  notes2 = [];
  score1 = 0; score2 = 0;
  speed = 220;
  spawnRate = 420;
  difficultyMultiplier = 1.0;
  leadTimer = 0;
  running = true;
  beatmapIndex = 0;
  lastLane = 0;
  totalPossibleScore = 0;
  beatmapIndex1 = 0;
  beatmapIndex2 = 0;
  lastLane1 = 0;
  lastLane2 = 0;
  g = s.add.graphics();
  halfWidth = (cfg.width - separatorWidth) / 2;
  laneW = halfWidth / lanes;

  // UI
  scoreText1 = s.add.text(16, 16, 'P1: 0', { font: '20px Arial', fill: '#66ff66' });
  if (!singlePlayer || beatmapDuel) {
    scoreText2 = s.add.text(800 - 16, 16, 'P2: 0', { font: '20px Arial', fill: '#66b3ff' }).setOrigin(1, 0);
  }
  // place title at top and difficulty text slightly below it
  timerText = s.add.text(400, 80, 'Diff x1.00', { font: '20px Arial', fill: '#ffffff' }).setOrigin(0.5, 0);

  // Hit guides
  s.input.keyboard.on('keydown', (ev) => {
    if (!running) { if (ev.key.toLowerCase() === 'r') s.scene.restart(); return; }
    let key = ev.key.toLowerCase();

    // Map arcade controls to keyboard keys (additive, don't replace existing)
    const arcadeMap = {
      // Player 1 arcade controls
      'p1a': 'a', 'p1b': 's', 'p1c': 'd', 'p1x': 'f',
      // Player 2 arcade controls  
      'p2a': 'h', 'p2b': 'j', 'p2c': 'k', 'p2x': 'l'
    };

    if (arcadeMap[key]) {
      key = arcadeMap[key];
    }

    keysDown[key] = true;
    checkMultiHits(notes1, 0);
    if (!singlePlayer || beatmapDuel) checkMultiHits(notes2, 1);
  });
  s.input.keyboard.on('keyup', (ev) => {
    let key = ev.key.toLowerCase();

    // Map arcade controls to keyboard keys
    const arcadeMap = {
      'p1a': 'a', 'p1b': 's', 'p1c': 'd', 'p1x': 'f',
      'p2a': 'h', 'p2b': 'j', 'p2c': 'k', 'p2x': 'l'
    };

    if (arcadeMap[key]) {
      key = arcadeMap[key];
    }

    keysDown[key] = false;
  });

  // Allow returning to menu with ESC
  s.input.keyboard.on('keydown-ESC', () => {
    s.scene.start('Menu');
  });
  // Also allow arcade button P1Y to return to menu (mapped to ESC)
  s.input.keyboard.on('keydown-START2', () => {
    s.scene.start('Menu');
  });

  if (singlePlayer) {
    // calculate total possible score
    totalPossibleScore = beatmap.reduce((sum, [t, f, c]) => {
      if (c === 3) return sum + 200;
      if (c === 4) return sum + 300;
      return sum + 100;
    }, 0);
    // schedule beatmap notes
    function scheduleBeatmapNote(index) {
      if (index >= beatmap.length) return;
      const [time, freq, change] = beatmap[index];
      s.time.delayedCall(time, () => {
        spawnBeatmapNoteForPlayer(freq, change, 0, lastLane);
        if (change === 2) lastLane = Math.floor(Math.random() * lanes);
        beatmapIndex = index + 1;
        scheduleBeatmapNote(index + 1);
      });
    }
    scheduleBeatmapNote(0);
  } else if (beatmapDuel) {
    // calculate total possible score for both players
    const score1Total = beatmap1.reduce((sum, [t, f, c]) => {
      if (c === 3) return sum + 200;
      if (c === 4) return sum + 300;
      return sum + 100;
    }, 0);
    const score2Total = beatmap2.reduce((sum, [t, f, c]) => {
      if (c === 3) return sum + 200;
      if (c === 4) return sum + 300;
      return sum + 100;
    }, 0);
    totalPossibleScore = Math.max(score1Total, score2Total);

    // schedule beatmap notes for both players
    function scheduleBeatmapNote1(index) {
      if (index >= beatmap1.length) return;
      const [time, freq, change] = beatmap1[index];
      s.time.delayedCall(time, () => {
        spawnBeatmapNoteForPlayer(freq, change, 0, lastLane1);
        if (change === 2) lastLane1 = Math.floor(Math.random() * lanes);
        beatmapIndex1 = index + 1;
        scheduleBeatmapNote1(index + 1);
      });
    }
    function scheduleBeatmapNote2(index) {
      if (index >= beatmap2.length) return;
      const [time, freq, change] = beatmap2[index];
      s.time.delayedCall(time, () => {
        spawnBeatmapNoteForPlayer(freq, change, 1, lastLane2);
        if (change === 2) lastLane2 = Math.floor(Math.random() * lanes);
        beatmapIndex2 = index + 1;
        scheduleBeatmapNote2(index + 1);
      });
    }
    scheduleBeatmapNote1(0);
    scheduleBeatmapNote2(0);
  } else {
    // dynamic spawn scheduling (uses current spawnRate so we can change it)
    function scheduleSpawn() {
      s.time.delayedCall(spawnRate, () => {
        if (Math.random() < 0.75) {
          const isMulti = Math.random() < baseMultiProb * difficultyMultiplier;
          if (isMulti) {
            let count = 2;
            if (Math.random() < baseMultiProb * difficultyMultiplier) count = 3;
            spawn(notes1, 0, true, count);
            spawn(notes2, 1, true, count);
          } else {
            spawn(notes1, 0, false);
            spawn(notes2, 1, false);
          }
        }
        scheduleSpawn();
      });
    }
    scheduleSpawn();

    // every 30s increase difficulty: speed * 1.2 and more notes (spawnRate /= 1.2)
    s.time.addEvent({
      delay: 30000, loop: true, callback: () => {
        speed = Math.round(speed * 1.2);
        spawnRate = Math.max(50, Math.floor(spawnRate / 1.2));
        difficultyMultiplier *= 1.2;
        timerText.setText('Diff x' + difficultyMultiplier.toFixed(2));
      }
    });
  }

  // Title at top
  s.add.text(400, 30, 'DUEL RHYTHM', { font: '28px Arial', fill: '#ffd966' }).setOrigin(0.5, 0.5);

  // Bottom lane key labels for each player
  const keysP1 = ['A', 'S', 'D', 'F'];
  const keysP2 = ['H', 'J', 'K', 'L'];
  const labelY = cfg.height - 40;
  for (let i = 0; i < lanes; i++) {
    const x1 = i * laneW + laneW / 2;
    labelTexts1[i] = s.add.text(x1, labelY, keysP1[i], { font: '18px Arial', fill: '#99ff99' }).setOrigin(0.5, 0.5);
    if (!singlePlayer || beatmapDuel) {
      const x2 = halfWidth + separatorWidth + i * laneW + laneW / 2;
      labelTexts2[i] = s.add.text(x2, labelY, keysP2[i], { font: '18px Arial', fill: '#99ddff' }).setOrigin(0.5, 0.5);
    }
  }
}

function spawn(arr, side, isMulti = false, count = 2) {
  // side 0 left, 1 right
  if (!running) return;
  let lanesForNote = [];
  if (isMulti) {
    // use the provided count
    const available = [0, 1, 2, 3];
    for (let i = 0; i < count && available.length > 0; i++) {
      const idx = Math.floor(Math.random() * available.length);
      lanesForNote.push(available.splice(idx, 1)[0]);
    }
  } else {
    // single note
    lanesForNote = [Math.floor(Math.random() * lanes)];
  }
  const baseX = side === 0 ? 0 : halfWidth + separatorWidth;
  // for multi, center on the first lane, but draw each
  const x = baseX + lanesForNote[0] * laneW + laneW / 2 - Math.floor(noteWidth / 2);
  arr.push({ x: x, y: -30, lanes: lanesForNote, side: side, hit: false });
  if (singlePlayer) maxPossibleScore += 100 * lanesForNote.length;
}

function spawnBeatmapNoteForPlayer(freq, change, side, lastLaneRef) {
  if (!running) return;
  let lanesForNote = [];
  if (change === 1) {
    lanesForNote = [lastLaneRef];
  } else if (change === 2) {
    let newLane;
    do {
      newLane = Math.floor(Math.random() * lanes);
    } while (newLane === lastLaneRef);
    lanesForNote = [newLane];
    // Update the caller's lastLane
    if (side === 0) lastLane1 = newLane;
    else lastLane2 = newLane;
  } else if (change === 3) {
    // double: 2 random lanes
    const available = [0, 1, 2, 3];
    for (let i = 0; i < 2; i++) {
      const idx = Math.floor(Math.random() * available.length);
      lanesForNote.push(available.splice(idx, 1)[0]);
    }
  } else if (change === 4) {
    // triple: 3 random lanes
    const available = [0, 1, 2, 3];
    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(Math.random() * available.length);
      lanesForNote.push(available.splice(idx, 1)[0]);
    }
  }
  const baseX = side === 0 ? 0 : halfWidth + separatorWidth;
  const x = baseX + lanesForNote[0] * laneW + laneW / 2 - Math.floor(noteWidth / 2);
  const targetArray = side === 0 ? notes1 : notes2;
  targetArray.push({ x: x, y: -30, lanes: lanesForNote, side: side, hit: false, freq: freq });
}

function gameUpdate(_, dt) {
  const scene = this;
  if (!g) return;
  if (!running) return;
  const s = dt / 1000;
  // move notes
  [notes1, notes2].forEach(arr => { for (let i = arr.length - 1; i >= 0; i--) { arr[i].y += speed * s; if (arr[i].y > cfg.height + 50) arr.splice(i, 1); } });

  if (singlePlayer) {
    // check if beatmap finished and no notes left
    if (beatmapIndex >= beatmap.length && notes1.length === 0) {
      endSong(scene);
      return;
    }
  } else if (beatmapDuel) {
    // check if both beatmaps finished and no notes left
    if (beatmapIndex1 >= beatmap1.length && beatmapIndex2 >= beatmap2.length && notes1.length === 0 && notes2.length === 0) {
      endSong(scene);
      return;
    }
  } else {
    // comprobar ventaja sostenida
    const diff = Math.abs(score1 - score2);
    if (diff > leadThreshold) {
      leadTimer += dt;
      if (leadTimer >= leadDuration) {
        endSong(scene);
        return;
      }
    } else {
      leadTimer = 0;
    }
  }

  draw();
}

function draw() {
  g.clear();
  // background lanes
  for (let side = 0; side < (singlePlayer && !beatmapDuel ? 1 : 2); side++) {
    const baseX = side === 0 ? 0 : halfWidth + separatorWidth;
    for (let i = 0; i < lanes; i++) {
      const x = baseX + i * laneW;
      g.fillStyle(0x0b2540, 1); g.fillRect(x, 60, laneW - 4, cfg.height - 140);
      // no stroke to avoid an artifact line
    }
    // draw hit line
    g.fillStyle(side === 0 ? 0x113322 : 0x112233, 0.25); g.fillRect(baseX, hitY, halfWidth, 6);
  }

  // separator lane in the middle (filled only — no stroke to avoid artifact line)
  if (!singlePlayer || beatmapDuel) {
    g.fillStyle(0x081424, 1); g.fillRect(halfWidth, 60, separatorWidth, cfg.height - 140);
  }

  // aesthetic hit bars for each player's lanes (just below hit line)
  const barY = hitY + 8;
  for (let i = 0; i < lanes; i++) {
    const bx1 = 0 + i * laneW + 4;
    g.fillStyle(0x003300, 0.6); g.fillRect(bx1, barY, Math.max(8, laneW - 8), 10);
    if (!singlePlayer || beatmapDuel) {
      const bx2 = halfWidth + separatorWidth + i * laneW + 4;
      g.fillStyle(0x002244, 0.6); g.fillRect(bx2, barY, Math.max(8, laneW - 8), 10);
    }
  }

  // notes
  notes1.forEach(n => {
    n.lanes.forEach(lane => {
      const nx = (n.side === 0 ? 0 : halfWidth + separatorWidth) + lane * laneW + laneW / 2 - Math.floor(noteWidth / 2);
      g.fillStyle(0xffcc33, 1); g.fillRect(nx, n.y, noteWidth, 20);
    });
  });
  if (!singlePlayer || beatmapDuel) {
    notes2.forEach(n => {
      n.lanes.forEach(lane => {
        const nx = (n.side === 0 ? 0 : halfWidth + separatorWidth) + lane * laneW + laneW / 2 - Math.floor(noteWidth / 2);
        g.fillStyle(0x66ccff, 1); g.fillRect(nx, n.y, noteWidth, 20);
      });
    });
  }
}

function checkMultiHits(arr, side) {
  // Determine pressed lanes
  const map = side === 0 ? { a: 0, s: 1, d: 2, f: 3 } : { h: 0, j: 1, k: 2, l: 3 };
  const pressedLanes = new Set();
  for (let k in map) {
    if (keysDown[k]) pressedLanes.add(map[k]);
  }

  // Find candidate notes: within range and all lanes pressed
  const candidates = [];
  for (let i = 0; i < arr.length; i++) {
    const n = arr[i];
    if (n.hit) continue;
    const d = Math.abs(n.y - hitY);
    if (d > 45) continue;
    const allLanesPressed = n.lanes.every(lane => pressedLanes.has(lane));
    if (allLanesPressed) {
      candidates.push({ index: i, d: d, note: n });
    }
  }

  // If no candidates, do nothing
  if (candidates.length === 0) return;

  // Find the closest candidate
  candidates.sort((a, b) => a.d - b.d);
  const closest = candidates[0];
  const n = closest.note;
  const i = closest.index;

  // Hit the closest note
  let points;
  let toneFreq;
  if (closest.d <= 12) {
    points = 100 * n.lanes.length; // perfect
    toneFreq = n.freq || 880;
  } else if (closest.d <= 30) {
    points = 80 * n.lanes.length; // normal
    toneFreq = n.freq || 660;
  } else {
    points = 5 * n.lanes.length; // bad hit
    toneFreq = 220; // lower tone for error
  }
  if (side === 0) score1 += points; else score2 += points;
  playToneForSide(side, toneFreq, 0.08);
  if (side === 0) scoreText1.setText('P1: ' + score1); else if (!singlePlayer) scoreText2.setText('P2: ' + score2);
  n.hit = true;
  arr.splice(i, 1);
}

function endSong(s) {
  // evitar ejecutar dos veces
  if (!running) return;
  running = false; const overlay = s.add.graphics(); overlay.fillStyle(0x000000, 0.6); overlay.fillRect(0, 0, cfg.width, cfg.height);

  let winner, scoreText;
  if (beatmapDuel) {
    const percentage1 = (score1 / totalPossibleScore) * 100;
    const percentage2 = (score2 / totalPossibleScore) * 100;
    winner = percentage1 === percentage2 ? 'TIE' : (percentage1 > percentage2 ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS');
    scoreText = 'P1: ' + score1 + ' (' + percentage1.toFixed(1) + '%)   P2: ' + score2 + ' (' + percentage2.toFixed(1) + '%)';
  } else {
    const percentage = singlePlayer ? (score1 / totalPossibleScore) * 100 : 0;
    winner = singlePlayer ? (
      percentage > 92 ? 'PERFECT CLEAR' :
        percentage > 50 ? 'YOU WIN!' :
          'YOU LOSE'
    ) : (score1 === score2 ? 'TIE' : (score1 > score2 ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS'));
    scoreText = singlePlayer ? 'Score: ' + score1 + ' / ' + totalPossibleScore + ' (' + percentage.toFixed(1) + '%)' : 'P1: ' + score1 + '   P2: ' + score2;
  }

  endText = s.add.text(cfg.width / 2, 270, winner, { font: '40px Arial', fill: '#ffffff' }).setOrigin(0.5);
  s.add.text(cfg.width / 2, 330, scoreText, { font: '26px Arial', fill: '#ffd966' }).setOrigin(0.5);
  s.add.text(cfg.width / 2, 390, 'Press R to Restart', { font: '20px Arial', fill: '#99ff99' }).setOrigin(0.5);
  playToneForSide(0, 440, 0.2); playToneForSide(1, 330, 0.2);
  // also accept R key to restart (once) — ensures restart works after game over
  s.input.keyboard.once('keydown', (ev) => { if (ev.key && ev.key.toLowerCase() === 'r') s.scene.restart(); });
}

function playToneForSide(side, f, dur) {
  // use global game sound context
  try {
    const ctx = game.sound.context;
    if (Array.isArray(f)) {
      f.forEach(freq => playSingleTone(ctx, freq, dur));
    } else {
      playSingleTone(ctx, f, dur);
    }
  } catch (e) { }
}

function playSingleTone(ctx, freq, dur) {
  const o = ctx.createOscillator();
  const gnode = ctx.createGain();
  o.connect(gnode);
  gnode.connect(ctx.destination);
  o.type = 'square';
  o.frequency.value = freq;
  gnode.gain.setValueAtTime(0.08, ctx.currentTime);
  gnode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.start(ctx.currentTime);
  o.stop(ctx.currentTime + dur);
}

// Initialize beatmaps for duel mode (using the same beatmap for both players for now)
beatmap1.push(...beatmap);
beatmap2.push(...beatmap);

// Test beatmaps - simple sequences for testing
if (beatmap.length === 0) {
  // Simple test beatmap for single player
  beatmap.push(
    [500, 261.63, 2],   // C4 - change lane
    [500, 293.66, 2],   // D4 - change lane  
    [500, 329.63, 2],   // E4 - change lane
    [500, 349.23, 2],   // F4 - change lane
    [500, 392.00, 2],   // G4 - change lane
    [500, 440.00, 2],   // A4 - change lane
    [500, 493.88, 2],   // B4 - change lane
    [500, 523.25, 1],   // C5 - same lane
    [500, [523.25, 659.25], 3], // C5 + E5 - double
    [500, [587.33, 783.99], 3], // D5 + G5 - double
    [500, [659.25, 880.00], 3], // E5 + A5 - double
    [500, [698.46, 932.33], 3], // F5 + A#5 - double
    [500, [783.99, 1046.50], 3], // G5 + C6 - double
    [500, [880.00, 1174.66], 3], // A5 + D6 - double
    [500, [987.77, 1318.51], 3], // B5 + E6 - double
    [500, [1046.50, 1396.91], 3], // C6 + F6 - double
    [500, [1174.66, 1567.98], 4], // D6 + G6 + B6 - triple
    [500, [1318.51, 1760.00], 4], // E6 + A6 + C#7 - triple
    [500, [1396.91, 1864.66], 4], // F6 + A#6 + D7 - triple
    [500, [1567.98, 2093.00], 4]  // G6 + C7 + E7 - triple
  );
}

if (beatmap1.length === 0) {
  beatmap1.push(
    [250, 261.63, 2],   // C4 - change lane
    [500, 293.66, 2],   // D4 - change lane  
    [500, 329.63, 2],   // E4 - change lane
    [500, 349.23, 2],   // F4 - change lane
    [500, 392.00, 2],   // G4 - change lane
    [500, 440.00, 2],   // A4 - change lane
    [500, 493.88, 2],   // B4 - change lane
    [500, 523.25, 1],   // C5 - same lane
    [500, [523.25, 659.25], 3], // C5 + E5 - double
    [500, [587.33, 783.99], 3], // D5 + G5 - double
    [500, [659.25, 880.00], 3], // E5 + A5 - double
    [500, [698.46, 932.33], 3], // F5 + A#5 - double
    [500, [783.99, 1046.50], 3], // G5 + C6 - double
    [500, [880.00, 1174.66], 3], // A5 + D6 - double
    [500, [987.77, 1318.51], 3], // B5 + E6 - double
    [500, [1046.50, 1396.91], 3], // C6 + F6 - double
    [500, [1174.66, 1567.98], 4], // D6 + G6 + B6 - triple
    [500, [1318.51, 1760.00], 4], // E6 + A6 + C#7 - triple
    [500, [1396.91, 1864.66], 4], // F6 + A#6 + D7 - triple
    [500, [1567.98, 2093.00], 4]  // G6 + C7 + E7 - triple
  );
}

// Different beatmap for player 2 in duel mode
if (beatmap2.length === 0) {
  beatmap2.push(
    [500, 329.63, 2],   // E4 - change lane
    [500, 349.23, 2],   // F4 - change lane
    [500, 392.00, 2],   // G4 - change lane
    [500, 440.00, 2],   // A4 - change lane
    [500, 493.88, 2],   // B4 - change lane
    [500, 523.25, 2],   // C5 - change lane
    [500, 587.33, 2],   // D5 - change lane
    [500, 659.25, 1],   // E5 - same lane
    [500, [659.25, 880.00], 3], // E5 + A5 - double
    [500, [783.99, 1046.50], 3], // G5 + C6 - double
    [500, [880.00, 1174.66], 3], // A5 + D6 - double
    [500, [987.77, 1318.51], 3], // B5 + E6 - double
    [500, [1046.50, 1396.91], 3], // C6 + F6 - double
    [500, [1174.66, 1567.98], 3], // D6 + G6 - double
    [500, [1318.51, 1760.00], 3], // E6 + A6 - double
    [500, [1396.91, 1864.66], 3], // F6 + A#6 - double
    [500, [1567.98, 2093.00, 2637.02], 4], // G6 + C7 + E7 - triple
    [500, [1760.00, 2349.32, 3135.96], 4], // A6 + D7 + F#7 - triple
    [500, [1864.66, 2489.02, 3322.44], 4], // A#6 + D#7 + G7 - triple
    [500, [2093.00, 2793.83, 3729.31], 4]  // C7 + F7 + A7 - triple
  );
}
