document.addEventListener("DOMContentLoaded", () => {
    const clickSound = document.getElementById("clickSound");
    const status = document.getElementById("status");
    const buttonsContainer = document.querySelector(".buttons");
    const backToLobby = document.getElementById("backToLobby");

    const findMatch = document.getElementById("find-match");
    const pokeSprites = document.getElementById("poke-sprites");
    const achievements = document.getElementById("achievements");
    const settings = document.getElementById("settings");

    function showStatus(message, duration = 3000) {
        clickSound.play();

        buttonsContainer.style.opacity = "0";
        setTimeout(() => (buttonsContainer.style.display = "none"), 400);

        status.innerText = message;
        status.style.display = "block";
        status.style.opacity = "1";

        backToLobby.style.display = "block";
        backToLobby.style.opacity = "1";
    }

    backToLobby.addEventListener("click", () => {
        clickSound.play();

        status.style.opacity = "0";
        backToLobby.style.display = "none";

        setTimeout(() => {
            status.style.display = "none";
            buttonsContainer.style.display = "flex";
            setTimeout(() => (buttonsContainer.style.opacity = "1"), 50);
        }, 400);
    });

    findMatch.addEventListener("click", (e) => {
        e.preventDefault();
        showStatus("🔍 Searching for a match...");
        setTimeout(() => showStatus("⚡ Opponent found! Prepare for battle!", 2000), 2000);
    });

    pokeSprites.addEventListener("click", (e) => {
        e.preventDefault();
        showStatus("🖼️ Displaying Pokémon Sprites...");
    });

    achievements.addEventListener("click", (e) => {
        e.preventDefault();
        showStatus("🏆 Viewing Achievements...");
    });

    settings.addEventListener("click", (e) => {
        e.preventDefault();
        showStatus("⚙️Settings...");
    });
});
