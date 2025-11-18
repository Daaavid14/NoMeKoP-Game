/* lobby.js - match + VS splash + battle integration
   Updated: automatic matchmaking → immediate VS splash → battle
*/

const spriteFiles = [
    "Abomasnow_Female.gif",
    "Abomasnow_Mega.gif",
    "Abra.gif",
    "Absol.gif",
    "Absol_Mega.gif",
    "Accelgor.gif",
    "Aegislash_Blade.gif",
    "Aerodactyl.gif",
    "Aggron.gif",
    "Aipom.gif",
    "Alakazam.gif",
    "Alomomola.gif",
    "Altaria.gif",
    "Ambipom.gif",
    "Amoonguss.gif",
    "Ampharos_Mega.gif"

];

/* ---------- simple audio manager ---------- */
const audioManager = {
    mainVolume: 1.0,
    sfxVolume: 1.0,
    musicVolume: 1.0,
    muted: false,

    updateVolumes() {
        const effectiveMusicVolume = this.muted ? 0 : Number(this.mainVolume) * Number(this.musicVolume);
        const effectiveSfxVolume = this.muted ? 0 : Number(this.mainVolume) * Number(this.sfxVolume);

        const bg = document.getElementById("bgMusic");
        if (bg) bg.volume = effectiveMusicVolume;

        const click = document.getElementById("clickSound");
        if (click) click.volume = effectiveSfxVolume;
    }
};

/* ---------- simple match client abstraction (simulated) ---------- */
const MatchClient = (function(){
    let connected = false;
    let ws = null;

    return {
        connect() {
            connected = true;
            console.info("MatchClient: connected (simulated)");
        },

        disconnect() {
            if (ws) ws.close();
            connected = false;
        },

        isConnected() { return connected; },

        findMatch({onSearching, onFound, onError}) {
            if (!connected) {
                if (onError) onError("Not connected to match server");
                return { cancel: () => {} };
            }

            let cancelled = false;
            onSearching && onSearching();

            let ticks = 0;
            const tickInterval = setInterval(() => {
                ticks++;
                if (cancelled) {
                    clearInterval(tickInterval);
                } else {
                    onSearching && onSearching(`Searching... ${ticks * 2}s`);
                }
            }, 1000);

            const time = 1200 + Math.floor(Math.random() * 2200);
            const timer = setTimeout(() => {
                if (cancelled) return;
                clearInterval(tickInterval);
                const opp = {
                    id: "opp-" + Math.floor(Math.random() * 10000),
                    name: ["Ryu","Mika","Zeru","Kora","Ash","Moe","Lina"][Math.floor(Math.random()*7)],
                    level: 1 + Math.floor(Math.random()*35),
                    sprite: spriteFiles[Math.floor(Math.random()*spriteFiles.length)]
                };
                onFound && onFound(opp);
            }, time);

            return {
                cancel() {
                    cancelled = true;
                    clearTimeout(timer);
                    clearInterval(tickInterval);
                }
            };
        }
    };
})();

/* ---------- battle system (unchanged) ---------- */
function createBattle(playerChoiceSprite, opponent) {
    window.lastOpponentUsed = opponent;
    const state = {
        maxHP: 100,
        playerHP: 100,
        oppHP: 100,
        playerGuard: false,
        oppGuard: false,
        playerSprite: playerChoiceSprite,
        opponent: opponent,
        turn: 'player',
        running: true
    };

    const battleOverlay = document.getElementById("battleOverlay");
    const battleLog = document.getElementById("battleLog");
    const oppSprite = document.getElementById("oppSprite");
    const playerSprite = document.getElementById("playerSprite");
    const oppHPbar = document.getElementById("oppHP");
    const playerHPbar = document.getElementById("playerHP");
    const oppHPText = document.getElementById("oppHPText");
    const playerHPText = document.getElementById("playerHPText");
    const attackBtn = document.getElementById("attackBtn");
    const defendBtn = document.getElementById("defendBtn");
    const itemBtn = document.getElementById("itemBtn");
    const forfeitBtn = document.getElementById("forfeitBtn");
    const returnToLobbyBtn = document.getElementById("returnToLobbyBtn");
    const rematchBtn = document.getElementById("rematchBtn");
    const playerLabel = document.getElementById("playerLabel");
    const oppLabel = document.getElementById("oppLabel");

    oppSprite.src = `pokeSprites/${state.opponent.sprite}`;
    playerSprite.src = `pokeSprites/${state.playerSprite}`;
    playerLabel.innerText = "You";
    oppLabel.innerText = `${state.opponent.name} (Lv ${state.opponent.level})`;

    function log(msg) {
        battleLog.innerHTML += `<div>• ${msg}</div>`;
        battleLog.scrollTop = battleLog.scrollHeight;
    }

    function updateHP() {
        const oppPct = Math.max(0, Math.round((state.oppHP / state.maxHP) * 100));
        const playerPct = Math.max(0, Math.round((state.playerHP / state.maxHP) * 100));
        oppHPbar.style.width = oppPct + '%';
        playerHPbar.style.width = playerPct + '%';
        oppHPText.innerText = `${Math.max(0,state.oppHP)} / ${state.maxHP}`;
        playerHPText.innerText = `${Math.max(0,state.playerHP)} / ${state.maxHP}`;
    }

    function endBattle(result, reason) {
        state.running = false;
        log(reason || (result === 'win' ? 'You won!' : 'You lost.'));
        attackBtn.disabled = true;
        defendBtn.disabled = true;
        itemBtn.disabled = true;
        forfeitBtn.disabled = true;

        showWinnerScreen(result, state.playerSprite, state.opponent);

    }

    function opponentAction() {
        if (!state.running) return;
        const choice = Math.random();
        if (choice < 0.65) {
            const base = 8 + Math.floor(Math.random()*10);
            const dmg = state.playerGuard ? Math.max(1, Math.round(base*0.4)) : base;
            state.playerHP = Math.max(0, state.playerHP - dmg);
            log(`${state.opponent.name} attacked for ${dmg} damage.`);
            state.playerGuard = false;
            updateHP();
            if (state.playerHP <= 0) {
                endBattle('lose', `${state.opponent.name} destroyed your HP.`);
            } else {
                state.turn = 'player';
                attackBtn.disabled = false;
                defendBtn.disabled = false;
                itemBtn.disabled = false;
            }
        } else {
            state.oppGuard = true;
            log(`${state.opponent.name} is guarding!`);
            state.turn = 'player';
            attackBtn.disabled = false;
            defendBtn.disabled = false;
            itemBtn.disabled = false;
        }
    }

    // player actions
    attackBtn.onclick = () => {
        if (!state.running || state.turn !== 'player') return;
        audioManager.updateVolumes();
        attackBtn.disabled = true;
        defendBtn.disabled = true;
        itemBtn.disabled = true;

        const base = 10 + Math.floor(Math.random()*12);
        const dmg = state.oppGuard ? Math.max(1, Math.round(base*0.45)) : base;
        state.oppHP = Math.max(0, state.oppHP - dmg);
        log(`You attacked for ${dmg} damage.`);
        state.oppGuard = false;
        updateHP();

        if (state.oppHP <= 0) {
            endBattle('win', 'You knocked out the opponent!');
            return;
        }

        state.turn = 'opponent';
        setTimeout(() => opponentAction(), 800 + Math.floor(Math.random()*600));
    };

    defendBtn.onclick = () => {
        if (!state.running || state.turn !== 'player') return;
        state.playerGuard = true;
        log('You brace yourself and guard (reduce next incoming damage).');
        attackBtn.disabled = true;
        defendBtn.disabled = true;
        itemBtn.disabled = true;
        state.turn = 'opponent';
        setTimeout(() => opponentAction(), 600 + Math.floor(Math.random()*600));
    };

    itemBtn.onclick = () => {
        if (!state.running || state.turn !== 'player') return;
        if (state.playerHP >= state.maxHP) {
            log('You are already at full HP.');
        } else {
            const heal = Math.min(20, state.maxHP - state.playerHP);
            state.playerHP += heal;
            log(`You used a Potion and healed ${heal} HP.`);
            updateHP();
        }
        attackBtn.disabled = true;
        defendBtn.disabled = true;
        itemBtn.disabled = true;
        state.turn = 'opponent';
        setTimeout(() => opponentAction(), 700 + Math.floor(Math.random()*700));
    };

    forfeitBtn.onclick = () => {
        if (!state.running) return;
        state.running = false;
        log('You forfeited the match.');
        endBattle('lose', 'You forfeited the match.');
    };

    rematchBtn.onclick = () => {
        document.getElementById("returnToLobbyBtn").style.display = 'none';
        rematchBtn.style.display = 'none';
        attackBtn.disabled = false;
        defendBtn.disabled = false;
        itemBtn.disabled = false;
        state.playerHP = state.maxHP;
        state.oppHP = state.maxHP;
        state.playerGuard = false;
        state.oppGuard = false;
        state.running = true;
        log('Rematch started!');
        updateHP();
        state.turn = Math.random() < 0.5 ? 'player' : 'opponent';
        if (state.turn === 'opponent') {
            attackBtn.disabled = true; defendBtn.disabled = true; itemBtn.disabled = true;
            setTimeout(() => opponentAction(), 700 + Math.floor(Math.random()*900));
        }
    };

    returnToLobbyBtn.onclick = () => {
        closeBattle();
        showLobby();
    };

    function openBattle() {
        battleOverlay.setAttribute('aria-hidden','false');
        battleOverlay.classList.add('fade-in');
        updateHP();
        log(`Battle vs ${state.opponent.name} begins!`);
        state.turn = Math.random() < 0.6 ? 'player' : 'opponent';
        if (state.turn === 'player') {
            log('Your turn. Choose an action.');
            attackBtn.disabled = false; defendBtn.disabled = false; itemBtn.disabled = false;
        } else {
            attackBtn.disabled = true; defendBtn.disabled = true; itemBtn.disabled = true;
            log(`${state.opponent.name} goes first...`);
            setTimeout(() => opponentAction(), 700 + Math.floor(Math.random()*900));
        }
    }

    function closeBattle() {
        battleOverlay.setAttribute('aria-hidden','true');
        attackBtn.disabled = false;
        defendBtn.disabled = false;
        itemBtn.disabled = false;
        returnToLobbyBtn.style.display = 'none';
        rematchBtn.style.display = 'none';
        battleLog.innerHTML = "Battle ended.";
    }

    openBattle();

    return {
        state,
        log,
        close: closeBattle
    };
}

function showWinnerScreen(result, playerSpriteFile, opponent) {
    const overlay = document.getElementById("winnerOverlay");
    const title = document.getElementById("winnerTitle");
    const sprite = document.getElementById("winnerSprite");

    const victorySound = document.getElementById("victorySound");
    const defeatSound = document.getElementById("defeatSound");

    // Stop battle music if any
    const bgMusic = document.getElementById("bgMusic");
    if (bgMusic) bgMusic.pause();

    // WIN or LOSE text + sprite
    if (result === "win") {
        title.textContent = "YOU WIN!";
        sprite.src = `pokeSprites/${playerSpriteFile}`;

        victorySound.currentTime = 0;
        victorySound.volume = 1.0;
        victorySound.play().catch(()=>{});
    } else {
        title.textContent = "YOU LOSE!";
        sprite.src = `pokeSprites/${opponent.sprite}`;

        defeatSound.currentTime = 0;
        defeatSound.volume = 1.0;
        defeatSound.play().catch(()=>{});
    }

    overlay.setAttribute("aria-hidden", "false");

    startFireworks(); // fireworks start
}



/* ---------- UI logic + wiring ---------- */
document.addEventListener("DOMContentLoaded", () => {
    const clickSound = document.getElementById("clickSound");
    const buttons = document.querySelector(".buttons");
    const status = document.getElementById("status");
    const settingsSection = document.getElementById("settingsSection");
    const backToLobby = document.getElementById("backToLobby");

    const findMatchBtn = document.getElementById("find-match");
    const pokeSprites = document.getElementById("poke-sprites");
    const achievements = document.getElementById("achievements");
    const settingsBtn = document.getElementById("settings");

    const audioPanel = document.getElementById("audioSettingsPanel");
    const backToSettings = document.getElementById("backToSettings");
    const audioSettingsBtn = document.getElementById("audioSettings");

    const mainVolume = document.getElementById("mainVolume");
    const sfxVolume = document.getElementById("sfxVolume");
    const musicVolume = document.getElementById("musicVolume");

    const pokeSpritesPanel = document.getElementById("pokeSpritesPanel");
    const spritesContainer = document.getElementById("spritesContainer");

    const matchOverlay = document.getElementById("matchOverlay");
    const searchingView = document.getElementById("searchingView");
    const foundView = document.getElementById("foundView");
    const cancelSearchBtn = document.getElementById("cancelSearch");
    const oppAvatar = document.getElementById("oppAvatar");
    const oppName = document.getElementById("oppName");
    const oppInfo = document.getElementById("oppInfo");

    const vsOverlay = document.getElementById("vsOverlay");
    const vsFlash = document.getElementById("vsFlash");
    const vsSparks = document.getElementById("vsSparks");
    const vsImpact = document.getElementById("vsImpact");
    const vsSound = document.getElementById("vsSound");
    const vsPlayerSprite = document.getElementById("vsPlayerSprite");
    const vsOppSprite = document.getElementById("vsOppSprite");
    const vsPlayerName = document.getElementById("vsPlayerName");
    const vsOppName = document.getElementById("vsOppName");

    const battleOverlay = document.getElementById("battleOverlay");

    const winnerOverlay = document.getElementById("winnerOverlay");
    const winnerLobbyBtn = document.getElementById("winnerLobbyBtn");
    const winnerRematchBtn = document.getElementById("winnerRematchBtn");

    winnerLobbyBtn.addEventListener("click", () => {
        winnerOverlay.setAttribute("aria-hidden", "true");
        // Close battle and go lobby
        const battleOverlay = document.getElementById("battleOverlay");
        battleOverlay.setAttribute("aria-hidden", "true");
        showLobby();
    });

    winnerRematchBtn.addEventListener("click", () => {
        winnerOverlay.setAttribute("aria-hidden", "true");

        // start a fresh battle with same settings
        const playerSprite = spriteFiles[0]; // replace if dynamic
        createBattle(playerSprite, lastOpponentUsed);
    });


    mainVolume.value = audioManager.mainVolume;
    sfxVolume.value = audioManager.sfxVolume;
    musicVolume.value = audioManager.musicVolume;
    audioManager.updateVolumes();

    function hideLobby() {
        buttons.style.opacity = "0";
        setTimeout(() => buttons.style.display = "none", 300);
        backToLobby.style.display = "block";
    }

    function showLobby() {
        settingsSection.style.display = "none";
        audioPanel.style.display = "none";
        pokeSpritesPanel.style.display = "none";

        buttons.style.display = "flex";
        buttons.style.opacity = "1";
        backToLobby.style.display = "none";
    }   

    function showStatus(msg) {
        hideLobby();
        if (clickSound) clickSound.play();

        status.innerText = msg;
        status.style.display = "block";
        setTimeout(() => status.style.opacity = "1", 50);
    }

    backToLobby.addEventListener("click", () => {
        if (clickSound) clickSound.play();
        showLobby();
    });

    settingsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (clickSound) clickSound.play();
        hideLobby();
        setTimeout(() => {
            settingsSection.style.display = "block";
        }, 300);
    });

    pokeSprites.addEventListener("click", (e) => {
        e.preventDefault();
        if (clickSound) clickSound.play();
        hideLobby();
        pokeSpritesPanel.style.display = "block";
        backToLobby.style.display = "block";
        loadAllSprites();
    });

    achievements.addEventListener("click", (e) => {
        e.preventDefault();
        showStatus("🏆 Opening Achievements...");
    });

    document.getElementById("fullscreenToggle").addEventListener("click", () => {
        if (clickSound) clickSound.play();
        const arena = document.getElementById("battleArena");
        if (!document.fullscreenElement) {
            arena.requestFullscreen().catch(()=>{});
        } else {
            document.exitFullscreen().catch(()=>{});
        }
    });

    audioSettingsBtn.addEventListener("click", () => {
        if (clickSound) clickSound.play();
        settingsSection.style.display = "none";
        audioPanel.style.display = "block";
        backToSettings.style.display = "block";
        backToLobby.style.display = "none";
    });

    backToSettings.addEventListener("click", () => {
        if (clickSound) clickSound.play();
        audioPanel.style.display = "none";
        settingsSection.style.display = "block";
        backToSettings.style.display = "none";
        backToLobby.style.display = "block";
    });

    mainVolume.addEventListener("input", (e) => {
        audioManager.mainVolume = e.target.value;
        audioManager.updateVolumes();
    });

    sfxVolume.addEventListener("input", (e) => {
        audioManager.sfxVolume = e.target.value;
        audioManager.updateVolumes();
    });

    musicVolume.addEventListener("input", (e) => {
        audioManager.musicVolume = e.target.value;
        audioManager.updateVolumes();
    });

    function loadAllSprites() {
        if (spritesContainer.children.length) return;
        spriteFiles.forEach(file => {
            const box = document.createElement("div");
            box.classList.add("sprite-box");

            const img = document.createElement("img");
            img.src = `pokeSprites/${file}`;
            img.alt = file;
            box.appendChild(img);

            spritesContainer.appendChild(box);
        });
    }

    /* ---------- Matchmaking flow ---------- */
    MatchClient.connect();

    let currentSearch = null;
    let currentOpponent = null;

    function openMatchOverlay() {
        matchOverlay.setAttribute('aria-hidden','false');
    }
    function closeMatchOverlay() {
        matchOverlay.setAttribute('aria-hidden','true');
        searchingView.style.display = '';
        foundView.style.display = 'none';
    }

    findMatchBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (clickSound) clickSound.play();

        hideLobby();
        openMatchOverlay();
        searchingView.style.display = 'block';
        foundView.style.display = 'none';

        currentSearch = MatchClient.findMatch({
            onSearching: (msg) => {
                searchingView.querySelector('h3').innerText = typeof msg === 'string' ? msg : 'Searching for match...';
            },
            onFound: (opp) => {
                currentOpponent = opp;
                // Immediately transition to VS splash (no accept/decline)
                closeMatchOverlay();
                startVsSplash();
            },
            onError: (err) => {
                showStatus("Match error: " + err);
                closeMatchOverlay();
            }
        });
    });

    cancelSearchBtn.addEventListener('click', (e) => {
        if (clickSound) clickSound.play();
        if (currentSearch && currentSearch.cancel) currentSearch.cancel();
        currentSearch = null;
        closeMatchOverlay();
        showLobby();
    });

    /* ESC handling: cancel searching or ignore if in battle */
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
            if (matchOverlay.getAttribute('aria-hidden') === 'false') {
                if (currentSearch && currentSearch.cancel) currentSearch.cancel();
                currentSearch = null;
                closeMatchOverlay();
                showLobby();
            }
        }
    });

    /* Preload sprites */
    (function preloadSprites() {
        spriteFiles.forEach(f => {
            const img = new Image();
            img.src = `pokeSprites/${f}`;
        });
    })();

    /* ---------- VS splash controller ---------- */
    function startVsSplash() {
        if (!currentOpponent) {
            console.warn("startVsSplash called without opponent");
            showLobby();
            return;
        }

        // set sprites and names
        vsPlayerSprite.src = `pokeSprites/${spriteFiles[0]}`; // player choice; change as needed
        vsOppSprite.src = `pokeSprites/${currentOpponent.sprite}`;
        vsPlayerName.textContent = "YOU";
        vsOppName.textContent = currentOpponent.name;

        // open VS overlay
        vsOverlay.setAttribute("aria-hidden", "false");

        // visual effects
        vsFlash.style.animation = "flashEffect .9s ease-out";
        vsSparks.style.opacity = "1";
        vsSparks.style.animation = "sparksFlash .7s ease-out";
        vsImpact.style.opacity = "1";
        vsImpact.style.animation = "impactPunch .45s ease-out";

        // sound
        if (vsSound) { vsSound.volume = 1.0; vsSound.play().catch(()=>{}); }
        if (clickSound) clickSound.play();

        // clear temporary effects
        setTimeout(() => {
            vsFlash.style.animation = "";
            vsSparks.style.opacity = "0";
            vsImpact.style.opacity = "0";
        }, 3000);

        // after the animation, close VS and open battle
        setTimeout(() => {
            vsOverlay.setAttribute("aria-hidden", "true");
            // start battle
            const playerSprite = spriteFiles[0];
            createBattle(playerSprite, currentOpponent);
            currentOpponent = null;
        }, 3000);
    }

});
