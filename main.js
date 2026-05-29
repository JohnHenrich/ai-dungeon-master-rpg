// --- GLOBALS ---
const storyLog = document.getElementById('dm-output');

// --- TYPEWRITER ---
async function typeWriter(element, text, speed = 25) {
    let i = 0;
    return new Promise((resolve) => {
        function type() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                storyLog.scrollTop = storyLog.scrollHeight;
                setTimeout(type, speed);
            } else { resolve(); }
        }
        type();
    });
}

// --- NAVIGATION & GAME START ---
window.initGame = function(username) {
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('dashboard-screen').classList.remove('hidden');
    localStorage.setItem("currentUser", username);
    window.loadUserCampaigns(); // From auth.js logic
};

// UI Triggers
document.getElementById('new-campaign-btn').addEventListener('click', () => {
    document.getElementById('dashboard-screen').classList.add('hidden');
    document.getElementById('creation-screen').classList.remove('hidden');
});

// --- CORE GAME ACTION ---
window.sendAction = async function(type) {
    const input = document.getElementById('player-input');
    const prompt = input.value;
    
    // Fallback prompt if user just clicks the button without typing
    const finalPrompt = prompt || `I perform a ${type} action.`;
    
    appendInstantMessage("player", finalPrompt);
    input.value = "";

    try {
        const response = await fetch("http://localhost:3000/test-ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: finalPrompt, actionType: type })
        });

        const data = await response.json();
        const dmMsgDiv = appendInstantMessage("dm", ""); 
        
        // Handle the nested dice data from your Express server
        if (data.dice && data.dice.roll) {
            dmMsgDiv.innerHTML = `<span class="dice-badge">${data.dice.type}: ${data.dice.roll}</span><br>`;
        }

        await typeWriter(dmMsgDiv, data.narration);
        
        // 🛡️ TRIGGER HP CHECK: If the AI mentions "damage", we can simulate a drop
        if (data.narration.toLowerCase().includes("damage") || data.narration.toLowerCase().includes("hit you")) {
            updateHP(-3); // Lose 3 HP for testing
        }

    } catch (err) {
        console.error(err);
        appendInstantMessage("dm", "The DM is silent. Is the terminal 'npm start' running?");
    }
};

function appendInstantMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    msgDiv.innerHTML = text ? `<strong>${sender.toUpperCase()}:</strong> ${text}` : "";
    storyLog.appendChild(msgDiv);
    storyLog.scrollTop = storyLog.scrollHeight;
    return msgDiv;
}
let currentHP = 20;
const maxHP = 20;

function updateHP(amount) {
    currentHP += amount;
    if (currentHP > maxHP) currentHP = maxHP;
    if (currentHP < 0) currentHP = 0;

    const hpBar = document.getElementById('hp-bar');
    const hpVal = document.getElementById('hp-val');
    
    const percentage = (currentHP / maxHP) * 100;
    hpBar.style.width = percentage + "%";
    hpVal.innerText = currentHP;

    // Visual feedback: Flash red if taking damage
    if (amount < 0) {
        hpBar.style.backgroundColor = "#ff0000";
        setTimeout(() => { hpBar.style.backgroundColor = ""; }, 300);
    }
}
// Bridge for loading
window.enterGame = function(charData) {
    document.querySelectorAll('.container').forEach(c => c.classList.add('hidden'));
    document.getElementById('game-screen').style.display = 'flex';
    document.getElementById('char-display-name').innerText = charData.name;

    // Define Base Stats
    let stats = { str: 10, dex: 10, int: 10, wis: 10 };

    // Modify based on Class
    const charClass = charData.class.toLowerCase();
    if (charClass.includes("mage") || charClass.includes("wizard")) {
        stats = { str: 8, dex: 10, int: 16, wis: 14 };
    } else if (charClass.includes("barbarian") || charClass.includes("warrior")) {
        stats = { str: 17, dex: 13, int: 8, wis: 9 };
    } else if (charClass.includes("rogue")) {
        stats = { str: 10, dex: 16, int: 12, wis: 10 };
    }

    // Update the UI Sidebar
    const statGrid = document.querySelector('.stat-grid');
    statGrid.innerHTML = `
        <div class="stat"><span>STR</span><p>${stats.str}</p></div>
        <div class="stat"><span>DEX</span><p>${stats.dex}</p></div>
        <div class="stat"><span>INT</span><p>${stats.int}</p></div>
        <div class="stat"><span>WIS</span><p>${stats.wis}</p></div>
    `;

    // Load Items
    document.getElementById('item-list').innerHTML = `<li>${charData.weapon || 'Fists'}</li>`;
};