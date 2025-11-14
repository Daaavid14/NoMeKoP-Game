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

    function hideLobby() {
        buttons.style.opacity = "0";
        setTimeout(() => buttons.style.display = "none", 300);
        backToLobby.style.display = "block";
    }

    function showLobby() {
        settingsSection.style.display = "none";
        status.style.display = "none";

        buttons.style.display = "flex";
        setTimeout(() => (buttons.style.opacity = "1"), 50);

        backToLobby.style.display = "none";
    }

    function showStatus(msg) {
        hideLobby();
        clickSound.play();

        status.innerText = msg;
        status.style.display = "block";
        setTimeout(() => status.style.opacity = "1", 50);
    }

    // Back button
    backToLobby.addEventListener("click", () => {
        clickSound.play();
        showLobby();
    });

    // Settings button
    settings.addEventListener("click", (e) => {
        e.preventDefault();
        clickSound.play();

        hideLobby();

        setTimeout(() => {
            settingsSection.style.display = "block";
        }, 300);
    });

    // Menu button actions
    findMatch.addEventListener("click", (e) => {
        e.preventDefault();
        showStatus("🔍 Searching for Match...");
    });

    pokeSprites.addEventListener("click", (e) => {
        e.preventDefault();
        showStatus("🖼️ Loading Pokémon Sprites...");
    });

    achievements.addEventListener("click", (e) => {
        e.preventDefault();
        showStatus("🏆 Opening Achievements...");
    });

    // Settings sub-option: Fullscreen
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

});
