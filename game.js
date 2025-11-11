// Duelo Rítmico: 2 jugadores - estilo Guitar Hero (compacto)
const menuScene = {
  key: 'Menu',
  create: function () {
    const s = this;
    s.add.text(400, 200, 'DUEL RHYTHM', { font: '48px Arial', fill: '#ffd966' }).setOrigin(0.5);

    // Menu options
    const options = [
      '2 Player VS',
      'Single Player Practice',
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

    // song selector state
    let menuSelectorOpen = false;

    // Open a simple song selector overlay for single or duel beatmaps
    function openSongSelector(mode) {
      menuSelectorOpen = true;
      const choices = songList.filter(it => (mode === 'single' ? it.players === 1 : it.players === 2));
      // hide main menu texts
      optionTexts.forEach(t => t.setVisible(false));
      if (choices.length === 0) {
        const msg = s.add.text(400, 320, 'No songs available', { font: '20px Arial', fill: '#ff6666' }).setOrigin(0.5);
        s.time.delayedCall(1000, () => { msg.destroy(); optionTexts.forEach(t => t.setVisible(true)); menuSelectorOpen = false; });
        return;
      }
      const selTexts = [];
      let sel = 0;
      const startY = 260;
      choices.forEach((ch, i) => {
        const y = startY + i * 28;
        selTexts.push(s.add.text(400, y, ch.title, { font: '20px Arial', fill: i === sel ? '#ffd966' : '#ffffff' }).setOrigin(0.5));
      });
      const updateSel = () => {
        selTexts.forEach((t, i) => t.setFill(i === sel ? '#ffd966' : '#ffffff'));
      };
      const upH = () => { sel = Math.max(0, sel - 1); updateSel(); };
      const downH = () => { sel = Math.min(choices.length - 1, sel + 1); updateSel(); };
      const enterH = () => {
        const chosen = choices[sel];
        // assign global beatmaps according to choice
        if (mode === 'single') {
          singlePlayer = true; beatmapDuel = false; beatmap = chosen.beatmap;
        } else {
          singlePlayer = false; beatmapDuel = true; beatmap1 = chosen.beatmap1; beatmap2 = chosen.beatmap2;
        }
        // cleanup
        selTexts.forEach(t => t.destroy());
        optionTexts.forEach(t => t.setVisible(true));
        s.input.keyboard.off('keydown-UP', upH);
        s.input.keyboard.off('keydown-DOWN', downH);
        s.input.keyboard.off('keydown-ENTER', enterH);
        s.input.keyboard.off('keydown-ESC', escH);
        menuSelectorOpen = false;
        s.scene.start('Game');
      };
      const escH = () => {
        selTexts.forEach(t => t.destroy());
        optionTexts.forEach(t => t.setVisible(true));
        s.input.keyboard.off('keydown-UP', upH);
        s.input.keyboard.off('keydown-DOWN', downH);
        s.input.keyboard.off('keydown-ENTER', enterH);
        s.input.keyboard.off('keydown-ESC', escH);
        menuSelectorOpen = false;
      };
      s.input.keyboard.on('keydown-UP', upH);
      s.input.keyboard.on('keydown-DOWN', downH);
      s.input.keyboard.on('keydown-ENTER', enterH);
      s.input.keyboard.on('keydown-ESC', escH);
    }

    s.input.keyboard.on('keydown-ENTER', () => {
      if (menuSelectorOpen) return;
      if (selectedIndex === 0) {
        singlePlayer = false;
        beatmapDuel = false;
        s.scene.start('Game');
      } else if (selectedIndex === 1) {
        // open single-player song selector
        openSongSelector('single');
      } else if (selectedIndex === 2) {
        // open duel song selector
        openSongSelector('duel');
      }
    });

    // Note keys can also select any option
    const noteKeys = ['a', 's', 'd', 'f', 'h', 'j', 'k', 'l'];
    noteKeys.forEach(key => {
      s.input.keyboard.on('keydown-' + key.toUpperCase(), () => {
        if (menuSelectorOpen) return;
        if (selectedIndex === 0) {
          singlePlayer = false;
          beatmapDuel = false;
          s.scene.start('Game');
        } else if (selectedIndex === 1) {
          openSongSelector('single');
        } else if (selectedIndex === 2) {
          openSongSelector('duel');
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
        if (menuSelectorOpen) return;
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
            openSongSelector('single');
          } else if (selectedIndex === 2) {
            openSongSelector('duel');
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
let dMult = 1.0;
// visual note size
let nW = 64;
let labelTexts1 = [];
let labelTexts2 = [];
// separator between players
const sW = 36;
let halfWidth;
// key states for simultaneous presses
let keysDown = {};
// base probability for multi-notes
const baseMultiProb = 0.1;
// game mode
let singlePlayer = false;
let beatmapDuel = false;
// beatmap for single player: [time_ms, frequency_hz, change_type]
let beatmap = [];
// beatmaps for duel mode
let beatmap1 = [];
let beatmap2 = [];

let beatmapIndex = 0;
let lastLane = 0;
let totalPossibleScore = 0;
// beatmap indices for duel mode
let beatmapIndex1 = 0;
let beatmapIndex2 = 0;
let lastLane1 = 0;
let lastLane2 = 0;
// last lanes arrays to allow repeating multi-lane notes when change=1
let lastLanes1 = [0];
let lastLanes2 = [0];
function gameCreate() {
  const s = this;
  // reset runtime state (useful when scene restarts)
  notes1 = [];
  notes2 = [];
  score1 = 0; score2 = 0;
  speed = 220;
  spawnRate = 420;
  dMult = 1.0;
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
  halfWidth = (cfg.width - sW) / 2;
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
    // calculate total possible score (handle repeats change===1 and arrays)
    totalPossibleScore = 0;
    let lastNumNotes = 1;
    for (let i = 0; i < beatmap.length; i++) {
      const [, , c] = beatmap[i];
      let numNotes = 1;
      if (c === 1) {
        // repeat: use previous known number of notes
        numNotes = lastNumNotes || 1;
      } else if (c === 2) {
        numNotes = 1;
      } else if (c === 3) {
        numNotes = 2;
      } else if (c === 4) {
        numNotes = 3;
      } else {
        numNotes = 1;
      }
      lastNumNotes = numNotes;
      totalPossibleScore += 100 * numNotes;
    }
    // schedule beatmap notes
    function scheduleBeatmapNote(index) {
      if (index >= beatmap.length) return;
      const [time, freq, change] = beatmap[index];
      s.time.delayedCall(time, () => {
        // spawn note and let spawnBeatmapNoteForPlayer manage lastLanes updates
        spawnBeatmapNoteForPlayer(freq, change, 0);
        beatmapIndex = index + 1;
        scheduleBeatmapNote(index + 1);
      });
    }
    scheduleBeatmapNote(0);
  } else if (beatmapDuel) {
    // calculate total possible score for both players
    const computeMax = (bm) => {
      let s = 0; let lastNum = 1;
      for (let i = 0; i < bm.length; i++) {
        const [, f, c] = bm[i];
        let n = 1;
        if (Array.isArray(f)) n = f.length;
        else if (c === 1) n = lastNum || 1;
        else if (c === 2) n = 1;
        else if (c === 3) n = 2;
        else if (c === 4) n = 3;
        else n = 1;
        lastNum = n;
        s += 100 * n;
      }
      return s;
    };
    const score1Total = computeMax(beatmap1);
    const score2Total = computeMax(beatmap2);
    totalPossibleScore = Math.max(score1Total, score2Total);

    // schedule beatmap notes for both players
    function scheduleBeatmapNote1(index) {
      if (index >= beatmap1.length) return;
      const [time, freq, change] = beatmap1[index];
      s.time.delayedCall(time, () => {
        // spawn note and let spawnBeatmapNoteForPlayer manage lastLanes updates
        spawnBeatmapNoteForPlayer(freq, change, 0);
        beatmapIndex1 = index + 1;
        scheduleBeatmapNote1(index + 1);
      });
    }
    function scheduleBeatmapNote2(index) {
      if (index >= beatmap2.length) return;
      const [time, freq, change] = beatmap2[index];
      s.time.delayedCall(time, () => {
        // spawn note and let spawnBeatmapNoteForPlayer manage lastLanes updates
        spawnBeatmapNoteForPlayer(freq, change, 1);
        beatmapIndex2 = index + 1;
        scheduleBeatmapNote2(index + 1);
      });
    }
    scheduleBeatmapNote1(0);
    scheduleBeatmapNote2(0);
  } else {
    // dynamic duel mode: cycle random single-player beatmaps from songList
    const singleMapsPool = songList.filter(it => it.players === 1).map(it => it.beatmap).filter(Boolean);

    function scheduleBeatmapCycle() {
      if (!running) return;
      if (singleMapsPool.length === 0) {
        // fallback to random dynamic spawn if no single beatmaps available
        function scheduleSpawn() {
          s.time.delayedCall(spawnRate, () => {
            if (Math.random() < 0.75) {
              const isMulti = Math.random() < baseMultiProb * dMult;
              if (isMulti) {
                let count = 2;
                if (Math.random() < baseMultiProb * dMult) count = 3;
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
        return;
      }

      // pick a random single-player beatmap and assign to both players (use copies)
      const map = singleMapsPool[Math.floor(Math.random() * singleMapsPool.length)];
      beatmap1 = JSON.parse(JSON.stringify(map));
      beatmap2 = JSON.parse(JSON.stringify(map));
      beatmapIndex1 = 0; beatmapIndex2 = 0;

      // schedule playback for both players and when both finish, pick another map
      let finished1 = false, finished2 = false;

      function scheduleBeatmapNote1(index) {
        if (index >= beatmap1.length) { finished1 = true; if (finished2) scheduleBeatmapCycle(); return; }
        const [time, freq, change] = beatmap1[index];
        s.time.delayedCall(time, () => {
          spawnBeatmapNoteForPlayer(freq, change, 0);
          beatmapIndex1 = index + 1;
          scheduleBeatmapNote1(index + 1);
        });
      }

      function scheduleBeatmapNote2(index) {
        if (index >= beatmap2.length) { finished2 = true; if (finished1) scheduleBeatmapCycle(); return; }
        const [time, freq, change] = beatmap2[index];
        s.time.delayedCall(time, () => {
          spawnBeatmapNoteForPlayer(freq, change, 1);
          beatmapIndex2 = index + 1;
          scheduleBeatmapNote2(index + 1);
        });
      }

      scheduleBeatmapNote1(0);
      scheduleBeatmapNote2(0);
    }

    scheduleBeatmapCycle();

    // every 45s increase difficulty: speed * 1.2 and (conceptually) make notes feel denser by adjusting dMult
    s.time.addEvent({
      delay: 45000, loop: true, callback: () => {
        speed = Math.round(speed + 50);
        spawnRate = Math.max(50, Math.floor(spawnRate + 95));
        dMult += 0.2;
        timerText.setText('Diff x' + dMult.toFixed(2));
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
      const x2 = halfWidth + sW + i * laneW + laneW / 2;
      labelTexts2[i] = s.add.text(x2, labelY, keysP2[i], { font: '18px Arial', fill: '#99ddff' }).setOrigin(0.5, 0.5);
    }
  }
}

// Catalog of available songs for the menu selector
let songList = [
  {
    title: 'Channel of Mii (EZ+)', players: 1, beatmap: [
      [4, [294, 370, 123], 3],
      [509, [370, 440], 2],
      [246, [440, 554], 2],
      [498, [370, 440], 2],
      [493, [294, 370], 2],
      [249, [294, 208], 2],
      [264, [294, 208], 1],
      [248, [294, 208], 1],
      [1237, [277, 175], 2],
      [249, [294, 123, 185], 3],
      [264, [294, 370], 2],
      [248, [370, 440], 2],
      [246, [440, 554], 2],
      [498, [370, 440], 2],
      [493, [294, 370], 2],
      [249, [330, 415, 659, 208], 4],
      [759, [311, 392, 622, 196], 4],
      [249, [294, 370, 587, 185], 4],
      [991, [415, 110], 2],
      [512, [554, 277, 330], 3],
      [246, 370, 2],
      [498, [554, 165], 2],
      [493, [415, 208], 2],
      [514, [554, 277, 330], 3],
      [494, [392, 196], 2],
      [249, [370, 185], 2],
      [495, [330, 277], 2],
      [496, [185, 262, 73], 3],
      [264, [185, 262, 73], 1],
      [248, [185, 262, 73], 1],
      [991, [185, 262, 73], 1],
      [246, [185, 262, 73], 1],
      [249, [185, 262, 73], 1],
      [1008, [208, 247, 311], 3],
      [495, [196, 233, 294], 3],
      [496, [294, 370, 185, 220, 277], 4],
      [512, [370, 440], 2],
      [246, [440, 554], 2],
      [498, [370, 440], 2],
      [493, [311, 370, 294], 3],
      [249, [330, 208, 294], 3],
      [264, [330, 208, 294], 1],
      [248, [330, 208, 294], 1],
      [495, [415, 659], 2],
      [249, [415, 659], 1],
      [246, [415, 659], 1],
      [496, 123, 2],
      [264, [294, 370], 2],
      [248, [370, 440], 2],
      [246, [440, 554], 2],
      [499, [370, 440], 2],
      [503, [294, 370], 2],
      [258, [330, 415, 554, 165], 4],
      [1013, [294, 370, 494, 147], 4],
      [991, [494, 165], 2],
      [264, 392, 2],
      [248, [294, 247], 2],
      [246, [277, 110], 2],
      [498, [494, 220, 277], 3],
      [246, 392, 2],
      [246, 277, 2],
      [249, [440, 147], 2],
      [264, 370, 2],
      [248, [262, 220], 2],
      [246, [247, 98], 2],
      [498, [349, 196, 247], 3],
      [246, 294, 2],
      [246, 247, 2],
      [249, [185, 277, 123, 165], 4],
      [264, [185, 277, 123, 165], 1],
      [248, [185, 277, 123, 165], 1],
      [1237, [466, 139], 2],
      [249, [494, 147], 2],
      [264, [554, 196], 2],
      [248, [587, 208], 2],
      [246, [740, 277], 2],
      [249, [880, 392], 2],
      [2000, 220, 2],
      [495, 233, 2],
      [496, [247, 165], 2],
      [512, [165, 196], 2],
      [246, [233, 123], 2],
      [249, 247, 2],
      [249, [165, 196], 2],
      [742, 110, 2],
      [264, [165, 196], 2],
      [248, 220, 2],
      [246, [233, 165], 2],
      [249, 247, 2],
      [249, 370, 2],
      [246, [185, 196, 247], 4],
      [246, 277, 2],
      [249, [247, 147], 2],
      [512, [185, 220], 2],
      [246, [233, 110], 2],
      [249, 247, 2],
      [249, [185, 220], 2],
      [493, 139, 2],
      [249, 147, 2],
      [264, [185, 220], 2],
      [494, 110, 2],
      [249, 247, 2],
      [495, [262, 185, 220], 3],
      [496, [277, 92], 2],
      [512, [156, 247], 2],
      [246, [262, 139], 2],
      [249, 277, 2],
      [249, [139, 233], 2],
      [493, 87, 2],
      [249, 92, 2],
      [264, [139, 233], 2],
      [248, 277, 2],
      [246, [262, 69], 2],
      [249, 277, 2],
      [249, 415, 2],
      [246, [139, 233], 2],
      [246, 311, 2],
      [249, [277, 92], 2],
      [512, [185, 220], 2],
      [246, [311, 123], 2],
      [249, 247, 2],
      [249, [185, 220], 2],
      [493, 277, 2],
      [249, [294, 82], 2],
      [264, [370, 440], 2],
      [494, 294, 2],
      [249, [330, 415, 139, 247], 4],
      [249, [330, 415, 139, 247], 1],
      [246, [330, 415, 139, 247], 1],
    ]
  },
  {
    title: 'Caramel (EZ)', players: 1, beatmap: [
      [0, 392, 1],
      [208, 440, 2],
      [208, 494, 2],
      [208, 523, 2],
      [208, 587, 2],
      [312, 587, 1],
      [312, 587, 1],
      [416, 587, 1],
      [208, 659, 2],
      [208, 587, 2],
      [1041, 587, 1],
      [208, 659, 2],
      [208, 587, 2],
      [208, 523, 2],
      [208, 494, 2],
      [312, 494, 1],
      [312, 494, 1],
      [416, 523, 2],
      [208, 494, 2],
      [208, 392, 2],
      [1041, 392, 1],
      [208, 440, 2],
      [208, 494, 2],
      [208, 523, 2],
      [208, 587, 2],
      [312, 587, 1],
      [312, 587, 1],
      [416, 587, 1],
      [208, 659, 2],
      [208, 587, 2],
      [1041, 587, 1],
      [208, 659, 2],
      [208, 587, 2],
      [208, 523, 2],
      [208, 494, 2],
      [312, 494, 1],
      [312, 494, 1],
      [416, 494, 1],
      [208, 440, 2],
      [208, 392, 2],
      [1041, 392, 1],
      [208, 440, 2],
      [208, 494, 2],
      [208, 523, 2],
      [208, 587, 2],
      [1666, 494, 2],
      [312, 494, 1],
      [312, 494, 1],
      [312, 523, 2],
      [312, 392, 2],
      [208, 494, 2],
      [208, 440, 2],
      [312, 440, 1],
      [312, 440, 1],
      [312, 587, 2],
      [312, 370, 2],
      [208, 440, 2],
      [208, 392, 2],
      [312, 392, 1],
      [312, 392, 1],
      [312, 392, 1],
      [312, 330, 2],
      [208, 440, 2],
      [208, 392, 2],
      [312, 392, 1],
      [312, 392, 1],
      [312, 370, 2],
      [312, 392, 2],
      [208, 440, 2],
      [208, 494, 2],
      [312, 494, 1],
      [312, 494, 1],
      [312, 523, 2],
      [312, 392, 2],
      [208, 494, 2],
      [208, 440, 2],
      [312, 440, 1],
      [312, 440, 1],
      [312, 587, 2],
      [312, 370, 2],
      [208, 440, 2],
      [208, 392, 2],
      [312, 392, 1],
      [312, 392, 1],
      [312, 392, 1],
      [312, 330, 2],
      [208, 440, 2],
      [208, 392, 2],
      [312, 392, 1],
      [312, 392, 1],
      [312, 370, 2],
      [312, 392, 2],
      [208, 440, 2],
      [208, 392, 2],
      [208, 392, 1],
      [208, 392, 1],
      [208, 392, 1],
      [208, 392, 1],
      [416, 392, 1],
      [208, 392, 1],
      [208, 440, 2],
      [208, 494, 2],
      [416, 494, 1],
      [1041, 587, 2],
      [208, 392, 2],
      [208, 392, 1],
      [208, 392, 1],
      [208, 392, 1],
      [416, 392, 1],
      [208, 392, 1],
      [208, 494, 2],
      [208, 440, 2],
      [416, 392, 2],
      [1041, 370, 2],
      [416, 330, 2],
      [208, 294, 2],
      [1250, 294, 1],
      [416, 294, 1],
      [416, 294, 1],
      [208, 330, 2],
      [208, 370, 2],
      [208, 392, 2],
      [416, 330, 2],
      [208, 294, 2],
      [1041, 784, 2],
      [416, 659, 2],
      [208, 587, 2],
      [833, 294, 2],
      [208, 392, 2],
      [208, 392, 1],
      [208, 392, 1],
      [208, 392, 1],
      [208, 392, 1],
      [416, 392, 1],
      [208, 392, 1],
      [208, 440, 2],
      [208, 494, 2],
      [416, 494, 1],
      [833, 294, 2],
      [208, 392, 2],
      [208, 392, 1],
      [208, 392, 1],
      [208, 392, 1],
      [208, 392, 1],
      [416, 392, 1],
      [208, 392, 1],
      [208, 587, 2],
      [208, 523, 2],
      [416, 494, 2],
      [1041, 370, 2],
      [416, 440, 2],
      [208, 294, 2],
      [1458, 294, 1],
      [208, 294, 1],
      [416, 294, 1],
      [208, 494, 2],
      [208, 440, 2],
      [208, 392, 2],
      [833, 392, 1],
      [1041, 392, 1],
      [208, [494, 392], 2],
      [416, [494, 370], 2],
      [416, 440, 2],
      [208, 392, 2],
      [208, 294, 2],
      [416, 494, 2],
      [208, 440, 2],
      [208, 392, 2],
      [625, 440, 2],
      [416, 392, 2],
      [208, 440, 2],
      [208, 392, 2],
      [208, 440, 2],
      [416, 494, 2],
      [416, 330, 2],
      [416, 494, 2],
      [208, 440, 2],
      [208, 392, 2],
      [208, 392, 1],
      [208, 392, 1],
      [208, 440, 2],
      [416, 392, 2],
      [208, 440, 2],
      [208, 494, 2],
      [208, 440, 2],
      [416, 392, 2],
      [416, 294, 2],
      [416, 494, 2],
      [208, 440, 2],
      [208, 392, 2],
      [625, 440, 2],
      [416, 392, 2],
      [208, 440, 2],
      [208, 392, 2],
      [208, 440, 2],
      [416, 494, 2],
      [416, 587, 2],
      [416, 523, 2],
      [208, 494, 2],
      [208, 392, 2],
      [208, 392, 1],
      [208, 392, 1],
      [208, 440, 2],
      [416, 440, 1],
      [208, 494, 2],
      [416, 440, 2],
      [416, 392, 2],
      [416, 440, 2],
      [416, 440, 1],
      [416, 440, 1],
      [208, 494, 2],
      [208, 294, 2],
      [208, 294, 1],
      [416, 880, 2],
      [416, 880, 1],
      [416, 880, 1],
      [208, 880, 1],
      [416, 440, 2],
      [416, 440, 1],
      [416, 440, 1],
      [208, 494, 2],
      [208, 294, 2],
      [208, 294, 1],
      [416, 330, 2],
      [208, 294, 2],
      [1250, 494, 2],
      [416, 494, 1],
      [416, 494, 1],
      [208, 587, 2],
      [208, 494, 2],
      [208, 440, 2],
      [416, 880, 2],
      [416, 880, 1],
      [416, 880, 1],
      [208, 880, 1],
      [416, 440, 2],
      [416, 440, 1],
      [416, 440, 1],
      [208, 494, 2],
      [208, 294, 2],
      [208, 294, 1],
      [416, 330, 2],
      [208, 294, 2],
      [1041, 294, 1],
      [208, 392, 2],
      [208, 392, 1],
      [208, 392, 1],
      [208, 392, 1],
      [208, 392, 1],
      [416, 392, 1],
      [208, 392, 1],
      [208, 440, 2],
      [208, 494, 2],
      [416, 494, 1],
      [1041, 587, 2],
      [208, 392, 2],
      [208, 392, 1],
      [208, 392, 1],
      [208, 392, 1],
      [416, 392, 1],
      [208, 392, 1],
      [208, 494, 2],
      [208, 440, 2],
      [416, 392, 2],
      [1041, 370, 2],
      [416, 330, 2],
      [208, 294, 2],
      [1250, 294, 1],
      [416, 294, 1],
      [416, 294, 1],
      [208, 330, 2],
      [208, 370, 2],
      [208, 392, 2],
      [416, 330, 2],
      [208, 294, 2],
      [1041, 784, 2],
      [416, 659, 2],
      [208, 587, 2],
      [833, 294, 2],
      [208, 392, 2],
      [208, 392, 1],
      [208, 392, 1],
      [208, 392, 1],
      [208, 392, 1],
      [416, 392, 1],
      [416, 440, 2],
      [208, 494, 2],
      [416, 494, 1],
      [833, 294, 2],
      [208, 392, 2],
      [208, 392, 1],
      [208, 392, 1],
      [208, 392, 1],
      [208, 392, 1],
      [416, 392, 1],
      [208, 392, 1],
      [208, 587, 2],
      [208, 523, 2],
      [416, 494, 2],
      [1041, 370, 2],
      [416, 440, 2],
      [208, 294, 2],
      [1458, 294, 1],
      [208, 294, 1],
      [416, 294, 1],
      [208, 494, 2],
      [208, 440, 2],
      [208, 392, 2],
      [1875, 494, 2],
      [416, 494, 1],
      [416, 440, 2],
      [625, 294, 2],
      [416, 494, 2],
      [208, 440, 2],
      [208, 392, 2],
      [625, 440, 2],
      [416, 392, 2],
      [208, 440, 2],
      [208, 392, 2],
      [208, 440, 2],
      [416, 494, 2],
      [416, 330, 2],
      [416, 494, 2],
      [208, 440, 2],
      [208, 392, 2],
      [208, 392, 1],
      [208, 392, 1],
      [208, 440, 2],
      [416, 392, 2],
      [208, 440, 2],
      [208, 494, 2],
      [208, 440, 2],
      [416, 392, 2],
      [416, 294, 2],
      [416, 494, 2],
      [208, 440, 2],
      [208, 392, 2],
      [625, 440, 2],
      [416, 392, 2],
      [208, 440, 2],
      [208, 392, 2],
      [208, 440, 2],
      [416, 494, 2],
      [416, 587, 2],
      [416, 523, 2],
      [208, 494, 2],
      [208, 392, 2],
      [208, 392, 1],
      [208, 392, 1],
      [208, 440, 2],
      [416, 440, 1],
      [208, 494, 2],
      [416, 440, 2],
      [416, 392, 2],
      [416, 294, 2],
      [312, 494, 2],
      [312, 494, 1],
      [312, 523, 2],
      [312, 392, 2],
      [208, 494, 2],
      [208, 440, 2],
      [312, 440, 1],
      [312, 440, 1],
      [312, 587, 2],
      [312, 370, 2],
      [208, 440, 2],
      [208, 392, 2],
      [312, 392, 1],
      [312, 392, 1],
      [312, 392, 1],
      [312, 330, 2],
      [208, 440, 2],
      [208, 392, 2],
      [312, 392, 1],
      [312, 392, 1],
      [312, 370, 2],
      [312, 392, 2],
      [208, 440, 2],
      [208, 294, 2],
      [312, 494, 2],
      [312, 494, 1],
      [312, 523, 2],
      [312, 392, 2],
      [208, 494, 2],
      [208, 440, 2],
      [312, 440, 1],
      [312, 440, 1],
      [312, 587, 2],
      [312, 370, 2],
      [208, 440, 2],
      [208, 392, 2],
      [312, 392, 1],
      [312, 392, 1],
      [312, 392, 1],
      [312, 330, 2],
      [208, 440, 2],
      [208, 392, 2],
      [312, 392, 1],
      [312, 392, 1],
      [312, 370, 2],
      [312, 392, 2],
      [208, 440, 2],
      [208, 494, 2],
      [416, 494, 1],
      [208, 494, 1],
      [208, 494, 1],
      [625, 440, 2],
      [416, 440, 1],
      [208, 440, 1],
      [208, 392, 2],
      [208, 440, 2],
      [416, 494, 2],
      [416, 392, 2],
      [416, 392, 1],
      [208, 392, 1],
      [208, 392, 1],
      [416, 392, 1],
      [208, 330, 2],
      [416, 330, 1],
      [208, 370, 2],
      [208, 370, 1],
      [208, 392, 2],
      [416, 440, 2],
      [416, 494, 2],
      [416, 494, 1],
      [208, 494, 1],
      [208, 494, 1],
      [625, 440, 2],
      [416, 440, 1],
      [208, 587, 2],
      [208, 587, 1],
      [208, 523, 2],
      [416, 494, 2],
      [416, 392, 2],
      [416, 392, 1],
      [208, 392, 1],
      [208, 392, 1],
      [416, 392, 1],
      [208, 587, 2],
      [416, 587, 1],
      [208, 392, 2],
      [416, 392, 1],
      [416, 370, 2],
      [416, 440, 2],
      [416, 440, 1],
      [416, 440, 1],
      [208, 494, 2],
      [208, 294, 2],
      [208, 294, 1],
      [416, 880, 2],
      [416, 880, 1],
      [416, 880, 1],
      [208, 880, 1],
      [416, 440, 2],
      [416, 440, 1],
      [416, 440, 1],
      [208, 494, 2],
      [208, 294, 2],
      [208, 294, 1],
      [416, 330, 2],
      [208, 294, 2],
      [1250, 494, 2],
      [416, 494, 1],
      [416, 494, 1],
      [208, 587, 2],
      [208, 494, 2],
      [208, 440, 2],
      [416, 880, 2],
      [416, 880, 1],
      [416, 880, 1],
      [208, 880, 1],
      [416, 440, 2],
      [416, 440, 1],
      [416, 440, 1],
      [208, 494, 2],
      [208, 294, 2],
      [208, 294, 1],
      [416, 330, 2],
      [208, 494, 2],
      [416, 494, 1],
      [416, 440, 2],
      [416, [294, 587], 2],
      [416, [494, 988], 2],
      [208, [440, 880], 2],
      [208, [392, 784], 2],
      [625, [440, 880], 2],
      [416, [392, 784], 2],
      [208, [440, 880], 2],
      [208, [392, 784], 2],
      [208, [440, 880], 2],
      [416, [494, 988], 2],
      [416, [330, 659], 2],
      [416, [494, 988], 2],
      [208, [440, 880], 2],
      [208, [392, 784], 2],
      [208, [392, 784], 1],
      [208, [392, 784], 1],
      [208, [440, 880], 2],
      [416, [392, 784], 2],
      [208, [440, 880], 2],
      [208, [494, 988], 2],
      [208, [440, 880], 2],
      [416, [392, 784], 2],
      [416, [294, 587], 2],
      [416, [494, 988], 2],
      [208, [440, 880], 2],
      [208, [392, 784], 2],
      [625, [440, 880], 2],
      [208, [440, 880], 1],
      [208, [392, 784], 2],
      [208, [440, 880], 2],
      [208, [392, 784], 2],
      [208, [440, 880], 2],
      [416, [494, 988], 2],
      [416, [587, 1175], 2],
      [416, [523, 1047], 2],
      [208, [494, 988], 2],
      [208, [392, 784], 2],
      [208, [392, 784], 1],
      [208, [392, 784], 1],
      [208, [440, 880], 2],
      [416, [440, 880], 1],
      [208, [494, 988], 2],
      [416, [440, 880], 2],
      [416, [392, 784], 2],
      [416, [294, 587], 2],
      [416, [494, 988], 2],
      [208, [440, 880], 2],
      [208, [392, 784], 2],
      [625, [440, 880], 2],
      [416, [392, 784], 2],
      [208, [440, 880], 2],
      [208, [392, 784], 2],
      [208, [440, 880], 2],
      [416, [494, 988], 2],
      [416, [330, 659], 2],
      [416, [494, 988], 2],
      [208, [440, 880], 2],
      [208, [392, 784], 2],
      [208, [392, 784], 1],
      [208, [392, 784], 1],
      [208, [440, 880], 2],
      [416, [392, 784], 2],
      [208, [440, 880], 2],
      [208, [494, 988], 2],
      [208, [440, 880], 2],
      [416, [392, 784], 2],
      [416, [294, 587], 2],
      [416, [494, 988], 2],
      [208, [440, 880], 2],
      [208, [392, 784], 2],
      [625, [440, 880], 2],
      [208, [440, 880], 1],
      [208, [392, 784], 2],
      [208, [440, 880], 2],
      [208, [392, 784], 2],
      [208, [440, 880], 2],
      [416, [494, 988], 2],
      [416, [587, 1175], 2],
      [416, [523, 1047], 2],
      [208, [494, 988], 2],
      [208, [392, 784], 2],
      [208, [392, 784], 1],
      [208, [392, 784], 1],
      [208, [440, 880], 2],
      [416, [440, 880], 1],
      [208, [494, 988], 2],
      [416, [440, 880], 2],
      [416, [392, 784], 2],
    ]
  },
  {
    title: 'DDD KING (NM+)', players: 1, beatmap: [
      [0, [196, 98, 147], 3],
      [1454, [247, 349, 466], 3],
      [181, [220, 294, 392], 3],
      [363, [466, 349, 247], 3],
      [181, [220, 294, 392], 3],
      [363, [466, 247, 349], 3],
      [181, [247, 294, 392], 3],
      [3090, 622, 2],
      [181, 523, 2],
      [727, 466, 2],
      [181, 523, 2],
      [181, 622, 2],
      [363, 523, 2],
      [727, 698, 2],
      [181, 784, 2],
      [363, 622, 2],
      [90, 587, 2],
      [90, 523, 2],
      [727, 392, 2],
      [181, 622, 2],
      [181, 523, 2],
      [363, 466, 2],
      [181, 523, 2],
      [363, 466, 2],
      [181, 523, 2],
      [363, 466, 2],
      [181, 698, 2],
      [181, 622, 2],
      [727, 698, 2],
      [181, 622, 2],
      [363, 523, 2],
      [181, 622, 2],
      [363, 523, 2],
      [181, 622, 2],
      [181, 698, 2],
      [181, 740, 2],
      [181, 784, 2],
      [181, 932, 2],
      [181, 784, 2],
      [909, 932, 2],
      [181, 784, 2],
      [909, 932, 2],
      [181, 784, 2],
      [181, [147, 196], 2],
      [181, [175, 233], 2],
      [181, [466, 622], 2],
      [181, [392, 523], 2],
      [727, [349, 466], 2],
      [181, [392, 523], 2],
      [181, [466, 622], 2],
      [363, [392, 523], 2],
      [727, [523, 698], 2],
      [181, [587, 784], 2],
      [363, [466, 622], 2],
      [90, [440, 587], 2],
      [90, [392, 523], 2],
      [727, [294, 392], 2],
      [181, [466, 622], 2],
      [181, [392, 523], 2],
      [363, [349, 466], 2],
      [181, [392, 523], 2],
      [363, [349, 466], 2],
      [181, [392, 523], 2],
      [363, [349, 466], 2],
      [181, [523, 698], 2],
      [181, [466, 622], 2],
      [727, [523, 698], 2],
      [181, [466, 622], 2],
      [363, [392, 523], 2],
      [181, [466, 622], 2],
      [363, [392, 523], 2],
      [181, [466, 622], 2],
      [181, [523, 698], 2],
      [181, [554, 740], 2],
      [181, [587, 784], 2],
      [181, [698, 932], 2],
      [181, [587, 784], 2],
      [909, [698, 932], 2],
      [181, [587, 784], 2],
      [909, [698, 932], 2],
      [181, [784, 587], 2],
      [363, [392, 466], 2],
      [181, [523, 415], 2],
      [181, [415, 523], 1],
      [181, [415, 523], 1],
      [181, [466, 587], 2],
      [181, [523, 622], 2],
      [181, [523, 622], 1],
      [181, [466, 587], 2],
      [181, [415, 523], 2],
      [181, [392, 466], 2],
      [181, [523, 392], 2],
      [363, [392, 311], 2],
      [909, [415, 523], 2],
      [181, [415, 523], 1],
      [181, [415, 523], 1],
      [181, [466, 587], 2],
      [181, [523, 622], 2],
      [181, [523, 622], 1],
      [181, [587, 698], 2],
      [181, [523, 622], 2],
      [181, [698, 587], 2],
      [181, [622, 784], 2],
      [363, [784, 622], 1],
      [727, [523, 622], 2],
      [90, [466, 587], 2],
      [90, [415, 523], 2],
      [181, [415, 523], 1],
      [181, [415, 523], 1],
      [181, [466, 587], 2],
      [181, [523, 622], 2],
      [181, [523, 622], 1],
      [181, [466, 587], 2],
      [181, [415, 523], 2],
      [181, [466, 392], 2],
      [181, [523, 392], 2],
      [363, [392, 311], 2],
      [727, [262, 311], 2],
      [90, [311, 392], 2],
      [90, [415, 523], 2],
      [181, [415, 523], 1],
      [181, [415, 523], 1],
      [181, [466, 587], 2],
      [181, [415, 523], 2],
      [181, [415, 523], 1],
      [181, [349, 466], 2],
      [181, [294, 392], 2],
      [181, [294, 349], 2],
      [181, [311, 392], 2],
      [181, [233, 311], 2],
      [181, [196, 262], 2],
      [909, 587, 2],
      [545, 523, 2],
      [90, 587, 2],
      [90, 466, 2],
      [363, 880, 2],
      [272, 698, 2],
      [90, 622, 2],
      [272, 698, 2],
      [90, 784, 2],
      [848, 523, 2],
      [109, 554, 2],
      [132, 587, 2],
      [545, 523, 2],
      [90, 587, 2],
      [90, 466, 2],
      [238, 880, 2],
      [268, 698, 2],
      [310, 1047, 2],
      [878, 523, 2],
      [242, 784, 2],
      [242, 1047, 2],
      [545, 932, 2],
      [90, 831, 2],
      [90, 784, 2],
      [272, 698, 2],
      [272, 784, 2],
      [181, 932, 2],
      [545, 831, 2],
      [90, 784, 2],
      [90, 698, 2],
      [272, 622, 2],
      [272, 698, 2],
      [181, 587, 2],
      [272, 784, 2],
      [90, 784, 1],
      [1090, [349, 466, 247], 3],
      [181, [294, 392, 220], 3],
      [363, [349, 466, 247], 3],
      [181, [294, 392, 220], 3],
      [363, [349, 466, 247], 3],
      [181, [294, 392, 247], 3],
      [181, 622, 2],
      [181, 523, 2],
      [727, 466, 2],
      [181, 523, 2],
      [181, 622, 2],
      [363, 523, 2],
      [727, 698, 2],
      [181, 784, 2],
      [363, 622, 2],
      [90, 587, 2],
      [90, 523, 2],
      [727, 392, 2],
      [181, 622, 2],
      [181, 523, 2],
      [363, 466, 2],
      [181, 523, 2],
      [363, 466, 2],
      [181, 523, 2],
      [363, 466, 2],
      [181, 698, 2],
      [181, 622, 2],
      [727, 698, 2],
      [181, 622, 2],
      [363, 523, 2],
      [181, 622, 2],
      [363, 523, 2],
      [181, 622, 2],
      [181, 698, 2],
      [181, 740, 2],
      [181, 784, 2],
      [181, 932, 2],
      [181, 784, 2],
      [909, 932, 2],
      [181, 784, 2],
      [909, 932, 2],
      [181, 784, 2],
      [181, [147, 196], 2],
      [181, [175, 233], 2],
      [181, [466, 622], 2],
      [181, [392, 523], 2],
      [727, [349, 466], 2],
      [181, [392, 523], 2],
      [181, [466, 622], 2],
      [363, [392, 523], 2],
      [727, [523, 698], 2],
      [181, [587, 784], 2],
      [363, [466, 622], 2],
      [90, [440, 587], 2],
      [90, [392, 523], 2],
      [727, [294, 392], 2],
      [181, [466, 622], 2],
      [181, [392, 523], 2],
      [363, [349, 466], 2],
      [181, [392, 523], 2],
      [363, [349, 466], 2],
      [181, [392, 523], 2],
      [363, [349, 466], 2],
      [181, [523, 698], 2],
      [181, [466, 622], 2],
      [727, [523, 698], 2],
      [181, [466, 622], 2],
      [363, [392, 523], 2],
      [181, [466, 622], 2],
      [363, [392, 523], 2],
      [181, [466, 622], 2],
      [181, [523, 698], 2],
      [181, [554, 740], 2],
      [181, [587, 784], 2],
      [181, [698, 932], 2],
      [181, [587, 784], 2],
      [909, [698, 932], 2],
      [181, [587, 784], 2],
      [909, [698, 932], 2],
      [181, [784, 587], 2],
      [363, [392, 466], 2],
      [181, [523, 415], 2],
      [181, [415, 523], 1],
      [181, [415, 523], 1],
      [181, [466, 587], 2],
      [181, [523, 622], 2],
      [181, [523, 622], 1],
      [181, [466, 587], 2],
      [181, [415, 523], 2],
      [181, [392, 466], 2],
      [181, [523, 392], 2],
      [363, [392, 311], 2],
      [909, [415, 523], 2],
      [181, [415, 523], 1],
      [181, [415, 523], 1],
      [181, [466, 587], 2],
      [181, [523, 622], 2],
      [181, [523, 622], 1],
      [181, [587, 698], 2],
      [181, [523, 622], 2],
      [181, [698, 587], 2],
      [181, [622, 784], 2],
      [363, [784, 622], 1],
      [727, [523, 622], 2],
      [90, [466, 587], 2],
      [90, [415, 523], 2],
      [181, [415, 523], 1],
      [181, [415, 523], 1],
      [181, [466, 587], 2],
      [181, [523, 622], 2],
      [181, [523, 622], 1],
      [181, [466, 587], 2],
      [181, [415, 523], 2],
      [181, [466, 392], 2],
      [181, [523, 392], 2],
      [363, [392, 311], 2],
      [727, [262, 311], 2],
      [90, [311, 392], 2],
      [90, [415, 523], 2],
      [181, [415, 523], 1],
      [181, [415, 523], 1],
      [181, [466, 587], 2],
      [181, [415, 523], 2],
      [181, [415, 523], 1],
      [181, [349, 466], 2],
      [181, [294, 392], 2],
      [181, [294, 349], 2],
      [181, [311, 392], 2],
      [181, [233, 311], 2],
      [181, [196, 262], 2],
      [909, 587, 2],
      [545, 523, 2],
      [90, 587, 2],
      [90, 466, 2],
      [363, 880, 2],
      [272, 698, 2],
      [90, 622, 2],
      [272, 698, 2],
      [90, 784, 2],
      [848, 523, 2],
      [109, 554, 2],
      [132, 587, 2],
      [545, 523, 2],
      [90, 587, 2],
      [90, 466, 2],
      [238, 880, 2],
      [268, 698, 2],
      [310, 1047, 2],
      [878, 523, 2],
      [242, 784, 2],
      [242, 1047, 2],
      [545, 932, 2],
      [90, 831, 2],
      [90, 784, 2],
      [272, 698, 2],
      [272, 784, 2],
      [181, 932, 2],
      [545, 831, 2],
      [90, 784, 2],
      [90, 698, 2],
      [272, 622, 2],
      [272, 698, 2],
      [181, 587, 2],
      [272, 784, 2],
      [90, 784, 1],
      [1090, [349, 466, 247], 3],
      [181, [294, 392, 220], 3],
      [363, [349, 466, 247], 3],
      [181, [294, 392, 220], 3],
      [363, [349, 466, 247], 3],
      [181, [294, 392, 247], 3],
    ]
  },
  {
    title: 'Laggedtrain (EZ+)', players: 1, beatmap: [
      [1428, 659, 1],
      [102, 880, 2],
      [102, 988, 2],
      [408, 659, 2],
      [408, 740, 2],
      [408, 988, 2],
      [204, 659, 2],
      [408, 1175, 2],
      [1428, 988, 2],
      [408, 659, 2],
      [408, 740, 2],
      [408, 659, 2],
      [204, 494, 2],
      [1836, 494, 1],
      [204, 440, 2],
      [204, 494, 2],
      [204, 659, 2],
      [204, 740, 2],
      [408, 494, 2],
      [204, 659, 2],
      [204, 740, 2],
      [408, 494, 2],
      [204, 740, 2],
      [204, 784, 2],
      [408, 494, 2],
      [204, 988, 2],
      [204, 880, 2],
      [408, 784, 2],
      [408, 740, 2],
      [306, 784, 2],
      [51, 740, 2],
      [51, 659, 2],
      [204, 1175, 2],
      [408, 1175, 1],
      [204, 1175, 1],
      [204, 1175, 1],
      [408, 988, 2],
      [204, 988, 1],
      [408, 494, 2],
      [204, 440, 2],
      [204, 494, 2],
      [204, 659, 2],
      [204, 740, 2],
      [408, 494, 2],
      [204, 659, 2],
      [204, 740, 2],
      [408, 494, 2],
      [204, 740, 2],
      [204, 784, 2],
      [408, 1175, 2],
      [204, 988, 2],
      [408, 988, 1],
      [204, 880, 2],
      [408, 784, 2],
      [204, 740, 2],
      [408, 659, 2],
      [204, 740, 2],
      [408, 740, 1],
      [408, 740, 1],
      [204, 659, 2],
      [204, 659, 1],
      [408, [988, 494], 2],
      [204, [880, 440], 2],
      [204, [988, 494], 2],
      [204, [1319, 659], 2],
      [204, [1480, 740], 2],
      [408, [988, 494], 2],
      [204, [1319, 659], 2],
      [204, [1480, 740], 2],
      [408, [988, 494], 2],
      [204, [1480, 740], 2],
      [204, [1568, 784], 2],
      [408, [988, 494], 2],
      [204, [1976, 988], 2],
      [204, [1760, 880], 2],
      [408, [1568, 784], 2],
      [408, [1480, 740], 2],
      [306, [1568, 784], 2],
      [51, [1480, 740], 2],
      [51, [1319, 659], 2],
      [204, [2349, 1175], 2],
      [408, [2349, 1175], 1],
      [204, [2349, 1175], 1],
      [204, [2349, 1175], 1],
      [408, [1976, 988], 2],
      [204, [1976, 988], 1],
      [408, [988, 494], 2],
      [204, [880, 440], 2],
      [204, [988, 494], 2],
      [204, [1319, 659], 2],
      [204, [1480, 740], 2],
      [408, [988, 494], 2],
      [204, [1319, 659], 2],
      [204, [1480, 740], 2],
      [408, [988, 494], 2],
      [204, [2349, 1175], 2],
      [204, [2349, 1175], 1],
      [408, [2349, 1175], 1],
      [204, [1976, 988], 2],
      [408, [1976, 988], 1],
      [204, [1760, 880], 2],
      [408, [1568, 784], 2],
      [204, [1480, 740], 2],
      [408, [1319, 659], 2],
      [204, [1480, 740], 2],
      [204, [1480, 740], 1],
      [204, [1480, 740], 1],
      [204, [1319, 659], 2],
      [204, [1480, 740], 2],
      [408, [1568, 784], 2],
      [408, [1319, 988, 659], 3],
      [408, 659, 2],
      [408, 740, 2],
      [408, 988, 2],
      [204, 659, 2],
      [408, 1175, 2],
      [408, 587, 2],
      [204, 554, 2],
      [204, 587, 2],
      [204, 554, 2],
      [204, 494, 2],
      [204, 988, 2],
      [408, 659, 2],
      [408, 740, 2],
      [408, 988, 2],
      [204, 659, 2],
      [408, 494, 2],
      [408, 494, 1],
      [204, 466, 2],
      [204, 494, 2],
      [204, 466, 2],
      [204, 440, 2],
      [204, 988, 2],
      [408, 659, 2],
      [408, 740, 2],
      [408, 988, 2],
      [204, 659, 2],
      [408, 1175, 2],
      [408, 587, 2],
      [204, 554, 2],
      [204, 587, 2],
      [204, 554, 2],
      [204, 494, 2],
      [204, 988, 2],
      [408, 659, 2],
      [408, 740, 2],
      [408, 659, 2],
      [204, 494, 2],
      [1836, 494, 1],
      [408, 494, 1],
      [204, 587, 2],
      [204, 587, 1],
      [1428, 587, 1],
      [204, 587, 1],
      [204, 587, 1],
      [204, 659, 2],
      [204, 587, 2],
      [204, 494, 2],
      [408, 494, 1],
      [408, 494, 1],
      [204, 587, 2],
      [408, 440, 2],
      [204, 440, 1],
      [204, 440, 1],
      [408, 494, 2],
      [204, 466, 2],
      [204, 494, 2],
      [204, 466, 2],
      [204, 440, 2],
      [204, 494, 2],
      [204, 494, 1],
      [204, 494, 1],
      [204, 587, 2],
      [204, 587, 1],
      [1428, 587, 1],
      [204, 587, 1],
      [204, 587, 1],
      [204, 659, 2],
      [204, 587, 2],
      [204, 659, 2],
      [408, 659, 1],
      [204, 587, 2],
      [204, 659, 2],
      [204, 587, 2],
      [408, 659, 2],
      [408, 988, 2],
      [408, 659, 2],
      [612, 740, 2],
      [204, 784, 2],
      [612, 740, 2],
      [204, 740, 1],
      [612, 659, 2],
      [204, 988, 2],
      [612, 740, 2],
      [204, 740, 1],
      [408, 659, 2],
      [408, 988, 2],
      [612, 740, 2],
      [102, 740, 1],
      [102, 740, 1],
      [612, 659, 2],
      [204, 659, 1],
      [408, 740, 2],
      [204, 740, 1],
      [816, 494, 2],
      [204, 494, 1],
      [612, 740, 2],
      [204, 740, 1],
      [612, 659, 2],
      [204, 988, 2],
      [612, 740, 2],
      [204, 740, 1],
      [612, 659, 2],
      [204, 988, 2],
      [612, 740, 2],
      [204, 740, 1],
      [612, 494, 2],
      [204, 740, 2],
      [408, 740, 1],
      [408, 740, 1],
      [408, 784, 2],
      [204, 740, 2],
      [408, 988, 2],
      [204, 880, 2],
      [204, 988, 2],
      [204, 1319, 2],
      [204, 1480, 2],
      [408, 988, 2],
      [204, 1319, 2],
      [204, 1480, 2],
      [408, 988, 2],
      [204, 1480, 2],
      [204, 1568, 2],
      [408, [988, 494], 2],
      [204, [1976, 988], 2],
      [204, [1760, 880], 2],
      [408, [1568, 784], 2],
      [408, [1480, 740], 2],
      [306, [1568, 784], 2],
      [51, [1480, 740], 2],
      [51, [1319, 659], 2],
      [204, [2349, 1175], 2],
      [408, [2349, 1175], 1],
      [204, [2349, 1175], 1],
      [204, [2349, 1175], 1],
      [408, [1976, 988], 2],
      [204, [1976, 988], 1],
      [408, [988, 494], 2],
      [204, [880, 440], 2],
      [204, [988, 494], 2],
      [204, [1319, 659], 2],
      [204, [1480, 740], 2],
      [408, [988, 494], 2],
      [204, [1319, 659], 2],
      [204, [1480, 740], 2],
      [408, [988, 494], 2],
      [204, [2349, 1175], 2],
      [204, [2349, 1175], 1],
      [408, [2349, 1175], 1],
      [204, [1976, 988], 2],
      [408, [1976, 988], 1],
      [204, [1760, 880], 2],
      [408, [1568, 784], 2],
      [204, [1480, 740], 2],
      [408, [1319, 659], 2],
      [204, [1480, 740], 2],
      [408, 1480, 2],
      [408, 1480, 1],
      [204, 1319, 2],
      [204, 1319, 1],
      [204, 1480, 2],
      [204, [1976, 988], 2],
      [204, [988, 494], 2],
      [204, [1976, 988], 2],
      [204, [1760, 880], 2],
      [204, [1760, 880], 1],
      [408, [1568, 784], 2],
      [204, [1480, 740], 2],
      [204, [1480, 740], 1],
      [204, [1568, 784], 2],
      [204, [1480, 740], 2],
      [204, [1319, 659], 2],
      [204, [988, 494], 2],
      [408, [988, 494], 1],
      [204, [1976, 988], 2],
      [204, [1760, 880], 2],
      [408, [1568, 784], 2],
      [408, [1480, 740], 2],
      [306, [1568, 784], 2],
      [51, [1480, 740], 2],
      [51, [1319, 659], 2],
      [204, [2349, 1175], 2],
      [408, [2349, 1175], 1],
      [204, [2349, 1175], 1],
      [204, [2349, 1175], 1],
      [408, [1976, 988], 2],
      [204, [1976, 988], 1],
      [408, [988, 494], 2],
      [204, [880, 440], 2],
      [204, [988, 494], 2],
      [204, [1319, 659], 2],
      [204, [1480, 740], 2],
      [408, [988, 494], 2],
      [204, [1319, 659], 2],
      [204, [1480, 740], 2],
      [408, [988, 494], 2],
      [204, [2349, 1175], 2],
      [204, [2349, 1175], 1],
      [408, [2349, 1175], 1],
      [204, [1976, 988], 2],
      [408, [1976, 988], 1],
      [204, [1760, 880], 2],
      [408, [1568, 784], 2],
      [204, [1480, 740], 2],
      [408, [1319, 659], 2],
      [204, [1480, 740], 2],
      [204, [1480, 740], 1],
      [204, [1480, 740], 1],
      [204, [1319, 659], 2],
      [204, [1480, 740], 2],
      [408, [1568, 784], 2],
      [408, [1319, 988, 659], 3],
      [408, 659, 2],
      [408, 740, 2],
      [408, 988, 2],
      [204, 659, 2],
      [408, 1175, 2],
      [408, 587, 2],
      [204, 554, 2],
      [204, 587, 2],
      [204, 554, 2],
      [204, 494, 2],
      [204, 988, 2],
      [408, 659, 2],
      [408, 740, 2],
      [408, 988, 2],
      [204, 659, 2],
      [408, 494, 2],
      [408, 494, 1],
      [204, 466, 2],
      [204, 494, 2],
      [204, 466, 2],
      [204, 440, 2],
      [204, 988, 2],
      [408, 659, 2],
      [408, 740, 2],
      [408, 988, 2],
      [204, 659, 2],
      [408, 1175, 2],
      [408, 587, 2],
      [204, 554, 2],
      [204, 587, 2],
      [204, 554, 2],
      [204, 494, 2],
      [204, 988, 2],
      [408, 659, 2],
      [408, 740, 2],
      [408, 659, 2],
      [204, 494, 2],
      [1836, 494, 1],
      [204, 494, 1],
      [204, 494, 1],
      [204, 587, 2],
      [204, 587, 1],
      [1428, 587, 1],
      [204, 587, 1],
      [204, 587, 1],
      [204, 659, 2],
      [204, 587, 2],
      [204, 494, 2],
      [408, 494, 1],
      [408, 494, 1],
      [204, 587, 2],
      [204, 587, 1],
      [204, 440, 2],
      [204, 440, 1],
      [204, 440, 1],
      [408, 494, 2],
      [204, 659, 2],
      [204, 659, 1],
      [408, 659, 1],
      [204, 494, 2],
      [204, 494, 1],
      [204, 494, 1],
      [204, 587, 2],
      [204, 587, 1],
      [1428, 587, 1],
      [204, 587, 1],
      [204, 587, 1],
      [204, 659, 2],
      [204, 587, 2],
      [204, 659, 2],
      [408, 587, 2],
      [408, 659, 2],
      [204, 587, 2],
      [204, 587, 1],
      [204, 659, 2],
      [408, 988, 2],
      [408, 988, 1],
      [612, 740, 2],
      [204, 784, 2],
      [612, 740, 2],
      [204, 740, 1],
      [612, 659, 2],
      [204, 988, 2],
      [612, 740, 2],
      [204, 740, 1],
      [408, 659, 2],
      [408, 988, 2],
      [612, 740, 2],
      [204, 740, 1],
      [408, 659, 2],
      [408, 988, 2],
      [1428, 494, 2],
      [204, 494, 1],
      [612, 740, 2],
      [204, 740, 1],
      [612, 659, 2],
      [204, 988, 2],
      [612, 740, 2],
      [204, 740, 1],
      [408, 494, 2],
      [408, 988, 2],
      [612, 740, 2],
      [204, 740, 1],
      [408, 494, 2],
      [408, 988, 2],
      [612, 740, 2],
      [204, 740, 1],
      [612, 740, 1],
      [204, 784, 2],
      [612, 740, 2],
      [204, 740, 1],
      [612, 659, 2],
      [204, 988, 2],
      [612, 740, 2],
      [204, 740, 1],
      [408, 659, 2],
      [408, 988, 2],
      [612, 740, 2],
      [204, 740, 1],
      [612, 659, 2],
      [204, 659, 1],
      [408, 740, 2],
      [204, 740, 1],
      [816, 494, 2],
      [204, 494, 1],
      [612, 740, 2],
      [204, 740, 1],
      [612, 659, 2],
      [204, 988, 2],
      [612, 740, 2],
      [204, 740, 1],
      [612, 659, 2],
      [204, 988, 2],
      [612, 740, 2],
      [204, 740, 1],
      [612, 494, 2],
      [204, 740, 2],
      [408, 740, 1],
      [408, 740, 1],
      [408, 784, 2],
      [204, 740, 2],
      [408, [1976, 988], 2],
      [204, [988, 494], 2],
      [204, [1976, 988], 2],
      [204, [1760, 880], 2],
      [204, [1760, 880], 1],
      [408, [1568, 784], 2],
      [204, [1480, 740], 2],
      [204, [1480, 740], 1],
      [204, [1568, 784], 2],
      [204, [1480, 740], 2],
      [204, [1319, 659], 2],
      [204, [988, 494], 2],
      [408, [988, 494], 1],
      [204, [1976, 988], 2],
      [204, [1760, 880], 2],
      [408, [1568, 784], 2],
      [408, [1480, 740], 2],
      [306, [1568, 784], 2],
      [51, [1480, 740], 2],
      [51, [1319, 659], 2],
      [204, [2349, 1175], 2],
      [408, [2349, 1175], 1],
      [204, [2349, 1175], 1],
      [204, [2349, 1175], 1],
      [408, [1976, 988], 2],
      [204, [1976, 988], 1],
      [408, [988, 494], 2],
      [204, [880, 440], 2],
      [204, [988, 494], 2],
      [204, [1319, 659], 2],
      [204, [1480, 740], 2],
      [408, [988, 494], 2],
      [204, [1319, 659], 2],
      [204, [1480, 740], 2],
      [408, [988, 494], 2],
      [204, [2349, 1175], 2],
      [204, [2349, 1175], 1],
      [408, [2349, 1175], 1],
      [204, [1976, 988], 2],
      [408, [1976, 988], 1],
      [204, [1760, 880], 2],
      [408, [1568, 784], 2],
      [204, [1480, 740], 2],
      [408, [1319, 659], 2],
      [204, [1480, 740], 2],
      [204, [1480, 740], 1],
      [204, [1480, 740], 1],
      [204, [1319, 659], 2],
      [204, [1480, 740], 2],
      [408, [1568, 784], 2],
      [408, [1319, 988, 659], 3],
      [204, 659, 2],
      [204, 988, 2],
      [204, 880, 2],
      [204, 880, 1],
      [408, 784, 2],
      [204, 740, 2],
      [204, 784, 2],
      [408, 784, 1],
      [204, 740, 2],
      [204, 494, 2],
      [408, 494, 1],
      [204, 587, 2],
      [408, [988, 659], 2],
      [204, [988, 659], 1],
      [204, [740, 659], 2],
      [204, [784, 659], 2],
      [408, [784, 494], 2],
      [204, [1175, 988], 2],
      [408, [1175, 988], 1],
      [204, [988, 659], 2],
      [204, [1175, 988], 2],
      [408, [1175, 988], 1],
      [204, [988, 659], 2],
      [408, 988, 2],
      [204, 659, 2],
      [204, 988, 2],
      [204, 880, 2],
      [204, 880, 1],
      [408, 784, 2],
      [204, 740, 2],
      [204, 784, 2],
      [408, 784, 1],
      [204, 1175, 2],
      [204, 1175, 1],
      [408, 784, 2],
      [204, 1175, 2],
      [408, [988, 659], 2],
      [204, [988, 659], 1],
      [204, [740, 659], 2],
      [204, [784, 659], 2],
      [408, [784, 494], 2],
      [204, [740, 587], 2],
      [408, [740, 587], 1],
      [204, [659, 494], 2],
      [204, [740, 587], 2],
      [408, [988, 659], 2],
      [204, [988, 659], 1],
      [816, 494, 2],
      [204, 494, 1],
      [612, 740, 2],
      [204, 740, 1],
      [612, 740, 1],
      [204, 740, 1],
      [612, 784, 2],
      [204, 740, 2],
      [612, 988, 2],
      [204, 740, 2],
      [612, 988, 2],
      [204, 740, 2],
      [612, 784, 2],
      [204, 740, 2],
      [408, 494, 2],
      [204, 494, 1],
      [204, 440, 2],
      [612, 494, 2],
      [204, 440, 2],
      [612, 494, 2],
      [204, 740, 2],
      [612, 784, 2],
      [204, 740, 2],
      [612, 988, 2],
      [204, 740, 2],
      [612, 988, 2],
      [204, 740, 2],
      [612, 698, 2],
      [204, 698, 1],
      [612, 698, 1],
      [204, 698, 1],
      [408, 740, 2],
      [204, 740, 1],
      [816, 659, 2],
      [204, 659, 1],
      [612, 988, 2],
      [204, 988, 1],
      [612, 988, 1],
      [204, 988, 1],
      [612, 988, 1],
      [204, 784, 2],
      [612, 784, 1],
      [204, 494, 2],
      [612, 784, 2],
      [204, 494, 2],
      [612, 784, 2],
      [204, 740, 2],
      [408, 494, 2],
      [204, 494, 1],
      [204, 440, 2],
      [612, 494, 2],
      [204, 494, 1],
      [612, 494, 1],
      [204, 988, 2],
      [612, 988, 1],
      [204, 494, 2],
      [612, 494, 1],
      [204, 880, 2],
      [612, 880, 1],
      [204, 880, 1],
      [612, 880, 1],
      [204, 880, 1],
      [408, 880, 1],
      [408, 880, 1],
      [408, 784, 2],
      [204, 740, 2],
      [408, 988, 2],
      [204, 659, 2],
      [204, 988, 2],
      [204, 880, 2],
      [204, 880, 1],
      [408, 784, 2],
      [204, 740, 2],
      [204, 784, 2],
      [408, 784, 1],
      [204, 740, 2],
      [204, 494, 2],
      [816, [2093, 1047], 2],
      [204, [1047, 523], 2],
      [204, [2093, 1047], 2],
      [204, [1865, 932], 2],
      [204, [1865, 932], 1],
      [408, [1661, 831], 2],
      [204, [1568, 784], 2],
      [204, [1568, 784], 1],
      [204, [1661, 831], 2],
      [204, [1568, 784], 2],
      [204, [1397, 698], 2],
      [204, [1047, 523], 2],
      [408, [1047, 523], 1],
      [204, [2093, 1047], 2],
      [204, [1865, 932], 2],
      [408, [1661, 831], 2],
      [408, [1568, 784], 2],
      [306, [1661, 831], 2],
      [51, [1568, 784], 2],
      [51, [1397, 698], 2],
      [204, [2489, 1245], 2],
      [408, [2489, 1245], 1],
      [204, [2489, 1245], 1],
      [204, [2489, 1245], 1],
      [408, [2093, 1047], 2],
      [204, [2093, 1047], 1],
      [408, [1047, 523], 2],
      [204, [932, 466], 2],
      [204, [1047, 523], 2],
      [204, [1397, 698], 2],
      [204, [1568, 784], 2],
      [408, [1047, 523], 2],
      [204, [1397, 698], 2],
      [204, [1568, 784], 2],
      [408, [1047, 523], 2],
      [204, [2489, 1245], 2],
      [204, [2489, 1245], 1],
      [408, [2489, 1245], 1],
      [204, [2093, 1047], 2],
      [408, [2093, 1047], 1],
      [204, [1865, 932], 2],
      [408, [1661, 831], 2],
      [204, [1568, 784], 2],
      [408, [1397, 698], 2],
      [204, [1568, 784], 2],
      [408, [1568, 784], 1],
      [408, [1568, 784], 1],
      [204, [1397, 698], 2],
      [204, [1397, 698], 1],
      [204, [1568, 784], 2],
      [204, [2093, 1047], 2],
      [204, [1047, 523], 2],
      [204, [2093, 1047], 2],
      [204, [1865, 932], 2],
      [204, [1865, 932], 1],
      [408, [1661, 831], 2],
      [204, [1568, 784], 2],
      [204, [1568, 784], 1],
      [204, [1661, 831], 2],
      [204, [1568, 784], 2],
      [204, [1397, 698], 2],
      [204, [1047, 523], 2],
      [408, [1047, 523], 1],
      [204, [2093, 1047], 2],
      [204, [1865, 932], 2],
      [408, [1661, 831], 2],
      [408, [1568, 784], 2],
      [306, [1661, 831], 2],
      [51, [1568, 784], 2],
      [51, [1397, 698], 2],
      [204, [2489, 1245], 2],
      [408, [2489, 1245], 1],
      [204, [2489, 1245], 1],
      [204, [2489, 1245], 1],
      [408, [2794, 1397], 2],
      [204, [2093, 1047], 2],
      [408, [1047, 523], 2],
      [204, [932, 466], 2],
      [204, [1047, 523], 2],
      [204, [1397, 698], 2],
      [204, [1568, 784], 2],
      [408, [1047, 523], 2],
      [204, [1397, 698], 2],
      [204, [1568, 784], 2],
      [408, [1047, 523], 2],
      [204, [2489, 1245], 2],
      [204, [2489, 1245], 1],
      [408, [2489, 1245], 1],
      [204, [2093, 1047], 2],
      [408, [2093, 1047], 1],
      [204, [1865, 932], 2],
      [408, [1661, 831], 2],
      [204, [1568, 784], 2],
      [408, [1397, 698], 2],
      [204, [1568, 784], 2],
      [204, [1568, 784], 1],
      [204, [1568, 784], 1],
      [204, [1397, 698], 2],
      [204, [1568, 784], 2],
      [408, [1661, 831], 2],
      [204, [1397, 698], 2],
      [204, [1397, 1047, 698], 3],
      [408, 698, 2],
      [408, 784, 2],
      [408, 1047, 2],
      [204, 698, 2],
      [408, 1245, 2],
      [408, 622, 2],
      [204, 587, 2],
      [204, 622, 2],
      [204, 587, 2],
      [204, 523, 2],
      [204, 1047, 2],
      [408, 698, 2],
      [408, 784, 2],
      [408, 1047, 2],
      [204, 698, 2],
      [408, 523, 2],
      [408, 523, 1],
      [204, 494, 2],
      [204, 523, 2],
      [204, 494, 2],
      [204, 466, 2],
      [204, 1047, 2],
      [408, 698, 2],
      [408, 784, 2],
      [408, 1047, 2],
      [204, 698, 2],
      [408, 1245, 2],
      [408, 622, 2],
      [204, 587, 2],
      [204, 622, 2],
      [204, 587, 2],
      [204, 523, 2],
      [204, 1047, 2],
      [408, 698, 2],
      [408, 784, 2],
      [408, 698, 2],
      [204, 523, 2],
      [204, 698, 2],
      [204, 523, 2],
      [204, 698, 2],
      [204, 523, 2],
      [204, 698, 2],
      [204, 523, 2],
      [204, 698, 2],
      [204, 523, 2],
      [204, 698, 2],
      [204, 523, 2],
      [204, 698, 2],
      [204, 523, 2],
      [204, 698, 2],
      [204, 523, 2],
      [204, 698, 2],
      [204, 523, 2],
    ]
  },
  {
    title: 'The Pirate (HD)', players: 1, beatmap:
      [[0, 294, 1],
      [300, 294, 1],
      [150, 294, 1],
      [300, 294, 1],
      [150, 294, 1],
      [300, 294, 1],
      [150, 294, 1],
      [150, 294, 1],
      [150, 294, 1],
      [150, 294, 1],
      [300, 294, 1],
      [150, 294, 1],
      [300, 294, 1],
      [150, 294, 1],
      [300, 294, 1],
      [150, 294, 1],
      [150, 294, 1],
      [150, 294, 1],
      [150, 294, 1],
      [300, 294, 1],
      [150, 294, 1],
      [300, 294, 1],
      [150, 294, 1],
      [300, 294, 1],
      [150, 294, 1],
      [150, 220, 2],
      [150, 262, 2],
      [150, [175, 220, 294], 3],
      [300, [175, 220, 294], 1],
      [300, [175, 220, 294], 1],
      [150, [220, 262, 330], 3],
      [150, [233, 294, 349], 3],
      [300, [233, 294, 349], 1],
      [300, [233, 294, 349], 1],
      [150, [294, 392], 2],
      [150, [220, 262, 330], 3],
      [300, [220, 262, 330], 1],
      [300, [220, 294], 2],
      [150, [196, 262], 2],
      [150, [220, 262], 2],
      [150, [220, 294], 2],
      [450, 220, 2],
      [150, 262, 2],
      [150, [175, 233, 294], 3],
      [300, [175, 233, 294], 1],
      [300, [233, 294], 2],
      [150, [233, 330], 2],
      [150, [220, 262, 349], 3],
      [300, [220, 262, 349], 1],
      [300, [262, 349], 2],
      [150, [262, 392], 2],
      [150, [220, 262, 330], 3],
      [300, [220, 262, 330], 1],
      [300, [220, 294], 2],
      [150, [196, 262], 2],
      [150, [175, 220, 294], 3],
      [600, 220, 2],
      [150, 262, 2],
      [150, [175, 220, 294], 3],
      [300, [175, 220, 294], 1],
      [300, [220, 294], 2],
      [150, [220, 349], 2],
      [150, [233, 294, 392], 3],
      [300, [233, 294, 392], 1],
      [300, [294, 392], 2],
      [150, [294, 440], 2],
      [150, [294, 392, 466], 3],
      [300, [294, 392, 466], 1],
      [300, [349, 440], 2],
      [150, [330, 392], 2],
      [150, [349, 440], 2],
      [150, 294, 2],
      [450, 294, 1],
      [150, 330, 2],
      [150, [233, 294, 349], 3],
      [300, [233, 294, 349], 1],
      [300, [233, 294, 392], 3],
      [300, [349, 440], 2],
      [150, 294, 2],
      [450, 294, 1],
      [150, 349, 2],
      [150, [220, 277, 330], 3],
      [300, [220, 277, 330], 1],
      [300, [294, 349], 2],
      [150, [247, 294], 2],
      [150, [220, 277, 330], 3],
      [600, 440, 2],
      [150, 523, 2],
      [150, [349, 440, 587], 3],
      [300, [349, 440, 587], 1],
      [300, [349, 440, 587], 1],
      [150, [440, 523, 659], 3],
      [150, [466, 587, 698], 3],
      [300, [466, 587, 698], 1],
      [300, [466, 587, 698], 1],
      [150, [587, 784], 2],
      [150, [440, 523, 659], 3],
      [300, [440, 523, 659], 1],
      [300, [440, 587], 2],
      [150, [392, 523], 2],
      [150, [440, 523], 2],
      [150, [440, 587], 2],
      [450, 440, 2],
      [150, 523, 2],
      [150, [349, 466, 587], 3],
      [300, [349, 466, 587], 1],
      [300, [466, 587], 2],
      [150, [466, 659], 2],
      [150, [440, 523, 698], 3],
      [300, [440, 523, 698], 1],
      [300, [523, 698], 2],
      [150, [523, 784], 2],
      [150, [523, 659], 2],
      [300, [523, 659], 1],
      [300, [440, 587], 2],
      [150, 523, 2],
      [150, [349, 440, 587], 4],
      [600, 440, 2],
      [150, 523, 2],
      [150, [349, 440, 587], 3],
      [300, [349, 440, 587], 1],
      [300, [440, 587], 2],
      [150, [440, 698], 2],
      [150, [466, 587, 784], 3],
      [300, [466, 587, 784], 1],
      [300, [587, 784], 2],
      [150, [587, 880], 2],
      [150, [587, 784, 932], 3],
      [300, [587, 784, 932], 1],
      [300, [698, 880], 2],
      [150, [659, 784], 2],
      [150, [698, 880], 2],
      [150, 587, 2],
      [450, 587, 1],
      [150, 659, 2],
      [150, [466, 587, 698], 3],
      [300, [466, 587, 698], 1],
      [300, [466, 587, 784], 3],
      [300, [698, 880], 2],
      [150, 587, 2],
      [450, 587, 1],
      [150, 698, 2],
      [150, [440, 554, 659], 3],
      [300, [440, 554, 659], 1],
      [300, 587, 2],
      [150, 554, 2],
      [150, [440, 587], 2],
      [300, [440, 587], 1],
      [300, [440, 523, 659], 3],
      [300, [523, 587, 698], 3],
      [300, 698, 2],
      [150, 698, 1],
      [150, [466, 587, 784], 3],
      [300, [587, 880], 2],
      [150, 698, 2],
      [450, [440, 698], 2],
      [150, [440, 587], 2],
      [150, 440, 2],
      [900, [587, 784, 932], 3],
      [600, [466, 784], 2],
      [150, [466, 587], 2],
      [150, 466, 2],
      [900, [277, 330], 2],
      [150, [277, 330], 1],
      [300, [196, 294], 2],
      [450, [220, 277, 349], 3],
      [600, 349, 2],
      [150, 392, 2],
      [150, [294, 349, 440], 3],
      [300, [294, 349, 440], 1],
      [300, [294, 349, 440], 1],
      [300, [294, 349, 466], 3],
      [150, [294, 349, 440], 3],
      [750, [262, 330, 392], 3],
      [300, [262, 330, 392], 1],
      [300, [262, 330, 392], 1],
      [300, [262, 330, 392], 1],
      [150, [262, 349, 440], 3],
      [750, [294, 349, 440], 3],
      [300, [294, 349, 440], 1],
      [300, [294, 349, 440], 1],
      [300, [294, 349, 466], 3],
      [150, [294, 349, 440], 3],
      [750, [277, 330, 392], 3],
      [300, [277, 349], 2],
      [300, [220, 330], 2],
      [300, [175, 220, 294], 3],
      [600, 294, 2],
      [150, 330, 2],
      [150, [220, 294, 349], 4],
      [600, 392, 2],
      [150, 440, 2],
      [150, [262, 392], 2],
      [300, [262, 349], 2],
      [300, [262, 330], 2],
      [300, [220, 262, 349], 3],
      [300, [220, 262, 392], 3],
      [300, [220, 262, 440], 3],
      [300, [262, 330, 392], 3],
      [600, 349, 2],
      [150, 392, 2],
      [150, [262, 349, 440], 4],
      [600, 392, 2],
      [150, 349, 2],
      [150, [277, 330], 2],
      [300, [277, 349], 2],
      [300, [277, 330], 2],
      [300, [175, 220, 294], 3],
      [600, 330, 2],
      [150, 262, 2],
      [150, [175, 220, 294], 4],
      [600, 587, 2],
      [150, 659, 2],
      [150, [440, 587, 698], 4],
      [600, 659, 2],
      [150, 698, 2],
      [150, [523, 784], 2],
      [300, [523, 698], 2],
      [300, [523, 784], 2],
      [300, [698, 880], 2],
      [300, [523, 784], 2],
      [300, [523, 698], 2],
      [300, [349, 466, 587], 3],
      [600, 587, 2],
      [150, 659, 2],
      [150, [440, 587, 698], 3],
      [300, [440, 587, 784], 3],
      [300, [587, 880], 2],
      [300, [466, 587, 932], 3],
      [300, [466, 587], 2],
      [300, [466, 784], 2],
      [300, [440, 698], 2],
      [600, 784, 2],
      [150, 659, 2],
      [150, [440, 587], 2],
      [600, 659, 2],
      [150, 554, 2],
      [150, [587, 698, 880], 3],
      [900, [587, 784, 932], 3],
      [900, [523, 698, 880], 3],
      [300, [523, 698, 880], 1],
      [300, [523, 698, 880], 1],
      [300, [523, 659, 880], 3],
      [150, 784, 2],
      [750, [466, 587, 784], 3],
      [900, [440, 587, 698], 3],
      [900, [440, 698], 2],
      [300, [440, 784], 2],
      [300, [440, 659], 2],
      [300, [349, 440, 587], 3],
      [450, 587, 2],
      [150, 659, 2],
      [150, 698, 2],
      [150, [587, 698, 880], 4],
      [450, 587, 2],
      [150, 659, 2],
      [150, 698, 2],
      [150, [587, 698, 932], 4],
      [450, 587, 2],
      [150, 659, 2],
      [150, 698, 2],
      [150, [523, 698, 880], 3],
      [300, [523, 698, 880], 1],
      [300, [698, 1047], 2],
      [300, [523, 659, 880], 3],
      [150, 784, 2],
      [750, [466, 587, 784], 3],
      [900, [440, 587, 698], 3],
      [900, [440, 698], 2],
      [300, [440, 784], 2],
      [300, [440, 659], 2],
      [300, [349, 440, 587], 3],
      [900, 294, 2],]
  },
  {
    title: 'DUI (NM)', players: 1, beatmap: [
      [0, [208, 330], 1],
      [265, [330, 208], 1],
      [265, [415, 247], 2],
      [265, [247, 415], 1],
      [265, [370, 277], 2],
      [652, 370, 2],
      [130, 415, 2],
      [260, 277, 2],
      [391, 311, 2],
      [391, 330, 2],
      [260, 415, 2],
      [1043, 330, 2],
      [521, 415, 2],
      [521, 370, 2],
      [652, 370, 1],
      [130, 415, 2],
      [260, 277, 2],
      [391, 311, 2],
      [391, 494, 2],
      [260, 415, 2],
      [1043, 415, 1],
      [260, 415, 1],
      [260, 440, 2],
      [260, 440, 1],
      [260, [330, 494], 2],
      [782, [370, 554], 2],
      [260, [330, 208], 2],
      [391, [247, 370], 2],
      [391, [415, 277], 2],
      [260, [494, 311], 2],
      [782, [554, 330], 2],
      [260, [311, 185], 2],
      [391, [622, 370], 2],
      [391, [494, 311], 2],
      [260, [415, 277], 2],
      [1826, [440, 294], 2],
      [130, [277, 415], 2],
      [130, [247, 370], 2],
      [1043, [208, 330], 2],
      [260, [208, 330], 1],
      [260, [247, 415], 2],
      [260, [247, 415], 1],
      [260, [277, 370], 2],
      [652, 370, 2],
      [130, 415, 2],
      [260, 277, 2],
      [391, 311, 2],
      [391, 330, 2],
      [260, 415, 2],
      [1043, 330, 2],
      [521, 415, 2],
      [521, 370, 2],
      [652, 370, 1],
      [130, 415, 2],
      [260, 277, 2],
      [391, 311, 2],
      [391, 494, 2],
      [260, 415, 2],
      [1043, 415, 1],
      [260, 415, 1],
      [260, 440, 2],
      [260, 440, 1],
      [260, [330, 494], 2],
      [782, [370, 554], 2],
      [260, [330, 208], 2],
      [391, [247, 370], 2],
      [391, [415, 277], 2],
      [260, [494, 311], 2],
      [782, [330, 554], 2],
      [260, [311, 185], 2],
      [391, [622, 370], 2],
      [391, [494, 311], 2],
      [260, [415, 277], 2],
      [1826, [440, 294], 2],
      [130, [277, 415], 2],
      [130, [247, 370], 2],
      [1043, [330, 208], 2],
      [261, [330, 208], 1],
      [261, [311, 185], 2],
      [261, [311, 185], 1],
      [261, 277, 2],
      [130, 330, 2],
      [130, 311, 2],
      [130, 330, 2],
      [130, 277, 2],
      [392, 277, 1],
      [261, 311, 2],
      [130, 330, 2],
      [130, 494, 2],
      [130, 415, 2],
      [523, 277, 2],
      [130, 330, 2],
      [130, 311, 2],
      [130, 330, 2],
      [130, 277, 2],
      [392, 277, 1],
      [261, 311, 2],
      [130, 330, 2],
      [130, 494, 2],
      [130, 415, 2],
      [523, 277, 2],
      [130, 330, 2],
      [130, 311, 2],
      [130, 330, 2],
      [130, 277, 2],
      [392, 277, 1],
      [261, 311, 2],
      [130, 330, 2],
      [130, 494, 2],
      [130, 415, 2],
      [523, 247, 2],
      [392, 370, 2],
      [392, 330, 2],
      [228, 294, 2],
      [33, 311, 2],
      [130, 277, 2],
      [261, 247, 2],
      [326, 277, 2],
      [33, 294, 2],
      [32, 311, 2],
      [261, 277, 2],
      [130, 330, 2],
      [130, 311, 2],
      [130, 330, 2],
      [130, 277, 2],
      [392, 277, 1],
      [261, 311, 2],
      [130, 330, 2],
      [130, 494, 2],
      [130, 415, 2],
      [523, 277, 2],
      [130, 330, 2],
      [130, 311, 2],
      [130, 330, 2],
      [130, 277, 2],
      [392, 277, 1],
      [261, 311, 2],
      [130, 330, 2],
      [130, 494, 2],
      [130, 415, 2],
      [523, 277, 2],
      [130, 330, 2],
      [130, 311, 2],
      [130, 330, 2],
      [130, 277, 2],
      [392, 277, 1],
      [261, 311, 2],
      [130, 330, 2],
      [130, 494, 2],
      [130, 415, 2],
      [523, [247, 123], 2],
      [391, [185, 370], 2],
      [392, [165, 330], 2],
      [229, [147, 294], 2],
      [33, [311, 156], 2],
      [130, [277, 139], 2],
      [261, [247, 123], 2],
      [326, [277, 139], 2],
      [32, [294, 147], 2],
      [33, [311, 156], 2],
    ]
  },
];

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
  const baseX = side === 0 ? 0 : halfWidth + sW;
  // for multi, center on the first lane, but draw each
  const x = baseX + lanesForNote[0] * laneW + laneW / 2 - Math.floor(nW / 2);
  arr.push({ x: x, y: -30, lanes: lanesForNote, side: side, hit: false });
  if (singlePlayer) maxPossibleScore += 100 * lanesForNote.length;
}

function spawnBeatmapNoteForPlayer(freq, change, side) {
  if (!running) return;
  let lanesForNote = [];
  // Choose which lastLanes array to use
  const lastLanesRef = side === 0 ? lastLanes1 : lastLanes2;
  if (change === 1) {
    // repeat previous lanes (works for single, double or triple)
    lanesForNote = lastLanesRef.slice();
  } else if (change === 2) {
    // single, choose a new lane different from previous primary lane
    let newLane;
    const prevPrimary = lastLanesRef && lastLanesRef.length ? lastLanesRef[0] : -1;
    do {
      newLane = Math.floor(Math.random() * lanes);
    } while (newLane === prevPrimary);
    lanesForNote = [newLane];
    if (side === 0) lastLanes1 = lanesForNote.slice(); else lastLanes2 = lanesForNote.slice();
  } else if (change === 3) {
    // double: 2 random lanes
    const available = [0, 1, 2, 3];
    for (let i = 0; i < 2; i++) {
      const idx = Math.floor(Math.random() * available.length);
      lanesForNote.push(available.splice(idx, 1)[0]);
    }
    if (side === 0) lastLanes1 = lanesForNote.slice(); else lastLanes2 = lanesForNote.slice();
  } else if (change === 4) {
    // triple: 3 random lanes
    const available = [0, 1, 2, 3];
    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(Math.random() * available.length);
      lanesForNote.push(available.splice(idx, 1)[0]);
    }
    if (side === 0) lastLanes1 = lanesForNote.slice(); else lastLanes2 = lanesForNote.slice();
  }
  const baseX = side === 0 ? 0 : halfWidth + sW;
  const x = baseX + lanesForNote[0] * laneW + laneW / 2 - Math.floor(nW / 2);
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
    const baseX = side === 0 ? 0 : halfWidth + sW;
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
    g.fillStyle(0x081424, 1); g.fillRect(halfWidth, 60, sW, cfg.height - 140);
  }

  // aesthetic hit bars for each player's lanes (just below hit line)
  const barY = hitY + 8;
  for (let i = 0; i < lanes; i++) {
    const bx1 = 0 + i * laneW + 4;
    g.fillStyle(0x003300, 0.6); g.fillRect(bx1, barY, Math.max(8, laneW - 8), 10);
    if (!singlePlayer || beatmapDuel) {
      const bx2 = halfWidth + sW + i * laneW + 4;
      g.fillStyle(0x002244, 0.6); g.fillRect(bx2, barY, Math.max(8, laneW - 8), 10);
    }
  }

  // notes
  notes1.forEach(n => {
    n.lanes.forEach(lane => {
      const nx = (n.side === 0 ? 0 : halfWidth + sW) + lane * laneW + laneW / 2 - Math.floor(nW / 2);
      g.fillStyle(0xffcc33, 1); g.fillRect(nx, n.y, nW, 20);
    });
  });
  if (!singlePlayer || beatmapDuel) {
    notes2.forEach(n => {
      n.lanes.forEach(lane => {
        const nx = (n.side === 0 ? 0 : halfWidth + sW) + lane * laneW + laneW / 2 - Math.floor(nW / 2);
        g.fillStyle(0x66ccff, 1); g.fillRect(nx, n.y, nW, 20);
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
  const now = ctx.currentTime;

  // Oscilador principal
  const osc = ctx.createOscillator();
  osc.type = freq < 100 ? 'sawtooth' : 'sine'; // Sawtooth para bajos, sine para medios
  osc.frequency.value = freq;

  // Sub-oscilador para frecuencias muy bajas (< 100 Hz)
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = freq / 2; // Una octava abajo

  // Ganancias
  const mainGain = ctx.createGain();
  const subGain = ctx.createGain();
  const masterGain = ctx.createGain();

  // Ajustes dinámicos según frecuencia
  let mainGainValue = 0.6;
  let subGainValue = 0.0; // Por defecto sin sub
  let filterFreq = 1200;

  if (freq < 60) {
    // Subgraves extremos
    mainGainValue = 0.4;
    subGainValue = 0.8;
    filterFreq = 200;
  } else if (freq < 100) {
    // Graves profundos
    mainGainValue = 0.5;
    subGainValue = 0.6;
    filterFreq = 300;
  } else if (freq < 200) {
    // Graves
    mainGainValue = 0.7;
    subGainValue = 0.2;
    filterFreq = 600;
  }

  mainGain.gain.value = mainGainValue;
  subGain.gain.value = subGainValue;

  // Waveshaper suave para saturación
  const shaper = ctx.createWaveShaper();
  const curveLen = 2048;
  const curve = new Float32Array(curveLen);
  const drive = freq < 100 ? 0.08 : 0.04; // Más saturación en bajos
  for (let i = 0; i < curveLen; ++i) {
    const x = (i * 2) / (curveLen - 1) - 1;
    curve[i] = (1 + drive * 50) * x / (1 + drive * 50 * Math.abs(x));
  }
  shaper.curve = curve;
  shaper.oversample = '2x';

  // Filtro de paso bajo
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = filterFreq;
  lp.Q.value = 1.2;

  // Cadena de señal
  osc.connect(mainGain);
  sub.connect(subGain);
  mainGain.connect(shaper);
  subGain.connect(shaper);
  shaper.connect(lp);
  lp.connect(masterGain);
  masterGain.connect(ctx.destination);

  // Envolvente simple
  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.linearRampToValueAtTime(1.0, now + 0.005); // Ataque rápido
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  // Start/stop
  osc.start(now);
  if (subGainValue > 0) sub.start(now);
  osc.stop(now + dur + 0.05);
  if (subGainValue > 0) sub.stop(now + dur + 0.05);
}

// Initialize beatmaps for duel mode (using the same beatmap for both players for now)
beatmap1.push(...beatmap);
beatmap2.push(...beatmap);

// Test beatmaps - simple sequences for testing
if (beatmap.length === 0) {
  // Simple test beatmap for single player
  beatmap.push(
    [500, 261.63, 2],
  );
}

if (beatmap1.length === 0) {
  beatmap1.push(
    [250, 261.63, 2],
  );
}

// Different beatmap for player 2 in duel mode
if (beatmap2.length === 0) {
  beatmap2.push(
    [500, 329.63, 2],
  );
}
