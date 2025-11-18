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

function createBattle(playerSpriteFile, opponent) {
    window.lastOpponentUsed = opponent;

    const state = {
        maxHP: 100,
        playerHP: 100,
        oppHP: 100,
        energy: 5,
        maxEnergy: 10,
        turn: "player",
        running: true
    };

    const skills = [
        { name: "Quick Hit", dmg: 15, cost: 1 },
        { name: "Focused Strike", dmg: 25, cost: 2 },
        { name: "Gale Jab", dmg: 30, cost: 3 },
        { name: "Primal Burst", dmg: 55, cost: 5, ultimate: true }
    ];

    const oppSprite = document.getElementById("oppSprite");
    const playerSprite = document.getElementById("playerSprite");

    const oppHPBar = document.getElementById("oppHP");
    const playerHPBar = document.getElementById("playerHP");

    const oppHPText = document.getElementById("oppHPText");
    const playerHPText = document.getElementById("playerHPText");

    const skillCards = document.getElementById("skillCards");
    const energyDots = document.getElementById("energyDots");
    const energyCount = document.getElementById("energyCount");

    const skipTurnBtn = document.getElementById("skipTurnBtn");
    const forfeitBtn = document.getElementById("forfeitBtn");

    const battleOverlay = document.getElementById("battleOverlay");
    const damageLayer = document.getElementById("damageLayer");

    document.getElementById("playerSprite").src = `pokeSprites/${playerSpriteFile}`;
    document.getElementById("oppSprite").src = `pokeSprites/${opponent.sprite}`;

    battleOverlay.setAttribute("aria-hidden","false");

    /* --------------------
       UI Update Functions
    -------------------- */
    function updateEnergy() {
        energyDots.innerHTML = "";
        for (let i = 0; i < state.energy; i++) {
            const dot = document.createElement("div");
            dot.classList.add("energyDot");
            energyDots.appendChild(dot);
        }
        energyCount.textContent = `${state.energy} / ${state.maxEnergy}`;
    }

    function updateHP() {
        const p = (state.playerHP / state.maxHP) * 100;
        const o = (state.oppHP / state.maxHP) * 100;

        playerHPBar.style.width = p + "%";
        oppHPBar.style.width = o + "%";

        playerHPText.textContent = `${state.playerHP} / ${state.maxHP}`;
        oppHPText.textContent = `${state.oppHP} / ${state.maxHP}`;
    }

    function showDamage(target, amount) {
        const txt = document.createElement("div");
        txt.classList.add("damageText");
        txt.textContent = `-${amount}`;

        const rect = target.getBoundingClientRect();
        txt.style.left = rect.left + rect.width/2 + "px";
        txt.style.top = rect.top + "px";

        damageLayer.appendChild(txt);
        setTimeout(()=>txt.remove(), 1000);
    }

    /* --------------------
       Skill Cards
    -------------------- */
    function loadSkillCards() {
        skillCards.innerHTML = "";

        skills.forEach((skill, i) => {
            const card = document.createElement("div");
            card.classList.add("skill-card");

            card.innerHTML = `
                <div class="skill-name">${skill.name}</div>
                <div class="skill-cost">⚡ ${skill.cost}</div>
            `;

            card.onclick = () => useSkill(skill);

            skillCards.appendChild(card);
        });

        refreshSkillStates();
    }

    function refreshSkillStates() {
        [...skillCards.children].forEach((card, idx) => {
            const skill = skills[idx];
            if (state.energy < skill.cost) {
                card.classList.add("disabled");
            } else {
                card.classList.remove("disabled");
            }
        });
    }

    /* --------------------
       Player Skill Use
    -------------------- */
    function useSkill(skill) {
        if (!state.running || state.turn !== "player") return;
        if (state.energy < skill.cost) return;

        state.energy -= skill.cost;
        updateEnergy();
        refreshSkillStates();

        // Damage opponent
        state.oppHP -= skill.dmg;
        if (state.oppHP < 0) state.oppHP = 0;

        showDamage(oppSprite, skill.dmg);
        updateHP();

        if (state.oppHP <= 0) {
            return endBattle("win");
        }

        // Opponent’s turn
        state.turn = "opponent";
        setTimeout(opponentTurn, 800);
    }

    /* --------------------
       Opponent AI
    -------------------- */
    function opponentTurn() {
        if (!state.running) return;

        const dmg = 10 + Math.floor(Math.random()*18);
        state.playerHP -= dmg;
        if (state.playerHP < 0) state.playerHP = 0;

        showDamage(playerSprite, dmg);
        updateHP();

        if (state.playerHP <= 0) return endBattle("lose");

        // End → back to player turn
        state.energy = Math.min(state.energy + 1, state.maxEnergy);
        updateEnergy();
        refreshSkillStates();

        state.turn = "player";
    }

    /* --------------------
       Skip Turn
    -------------------- */
    skipTurnBtn.onclick = () => {
        state.energy = Math.min(state.energy + 2, state.maxEnergy);

        updateEnergy();
        refreshSkillStates();

        state.turn = "opponent";
        setTimeout(opponentTurn, 600);
    };

    /* --------------------
       Forfeit
    -------------------- */
    forfeitBtn.onclick = () => {
        endBattle("lose");
    };

    /* --------------------
       End Battle
    -------------------- */
    function endBattle(result) {
        state.running = false;

        battleOverlay.setAttribute("aria-hidden","true");

        const w = document.getElementById("winnerOverlay");
        const title = document.getElementById("winnerTitle");
        const sprite = document.getElementById("winnerSprite");

        sprite.style.maxHeight = "200px"; // Winner size D fix

        if (result === "win") {
            title.textContent = "YOU WIN!";
            sprite.src = `pokeSprites/${playerSpriteFile}`;
        } else {
            title.textContent = "YOU LOSE!";
            sprite.src = `pokeSprites/${opponent.sprite}`;
        }

        w.setAttribute("aria-hidden","false");
    }

    /* Start battle! */
    updateHP();
    updateEnergy();
    loadSkillCards();
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
