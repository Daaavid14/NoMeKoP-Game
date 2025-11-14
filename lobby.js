
const audioManager = {
    mainVolume: 1.0,
    sfxVolume: 1.0,
    musicVolume: 1.0,
    muted: false,

    updateVolumes() {
        const effectiveMusicVolume = this.muted ? 0 : this.mainVolume * this.musicVolume;
        const effectiveSfxVolume = this.muted ? 0 : this.mainVolume * this.sfxVolume;

        const bg = document.getElementById("bgMusic");
        if (bg) bg.volume = effectiveMusicVolume;

        const click = document.getElementById("clickSound");
        if (click) click.volume = effectiveSfxVolume;
    }
};


document.addEventListener("DOMContentLoaded", () => {
    const clickSound = document.getElementById("clickSound");
    const buttons = document.querySelector(".buttons");
    const status = document.getElementById("status");
    const settingsSection = document.getElementById("settingsSection");
    const backToLobby = document.getElementById("backToLobby");

    const findMatch = document.getElementById("find-match");
    const pokeSprites = document.getElementById("poke-sprites");
    const achievements = document.getElementById("achievements");
    const settings = document.getElementById("settings");

    const audioPanel = document.getElementById("audioSettingsPanel");
    const backToSettings = document.getElementById("backToSettings");
    const audioSettingsBtn = document.getElementById("audioSettings");

    const mainVolume = document.getElementById("mainVolume");
    const sfxVolume = document.getElementById("sfxVolume");
    const musicVolume = document.getElementById("musicVolume");

    const pokeSpritesPanel = document.getElementById("pokeSpritesPanel");
    const spritesContainer = document.getElementById("spritesContainer");

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
        clickSound.play();

        status.innerText = msg;
        status.style.display = "block";
        setTimeout(() => status.style.opacity = "1", 50);
    }

    backToLobby.addEventListener("click", () => {
        clickSound.play();
        showLobby();
    });

    settings.addEventListener("click", (e) => {
        e.preventDefault();
        clickSound.play();

        hideLobby();

        setTimeout(() => {
            settingsSection.style.display = "block";
        }, 300);
    });

    findMatch.addEventListener("click", (e) => {
        e.preventDefault();
        showStatus("🔍 Searching for Match...");
    });

    pokeSprites.addEventListener("click", (e) => {
        e.preventDefault();
        clickSound.play();

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
        clickSound.play();

        const arena = document.getElementById("battleArena");

        if (!document.fullscreenElement) {
            arena.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    });

    audioSettingsBtn.addEventListener("click", () => {
        clickSound.play();

        settingsSection.style.display = "none";

        audioPanel.style.display = "block";

        backToSettings.style.display = "block";

        backToLobby.style.display = "none";
    });

    backToSettings.addEventListener("click", () => {
        clickSound.play();

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
        if (spritesContainer.children.length > 0) return;

        const totalSprites = 1123;

        for (let i = 1; i <= totalSprites; i++) {
            const box = document.createElement("div");
            box.classList.add("sprite-box");

            const img = document.createElement("img");
            img.src = `pokeSprites/${i}.gif`;  
            img.alt = `Pokemon ${i}`;

            box.appendChild(img);
            spritesContainer.appendChild(box);
        }
    }


});
