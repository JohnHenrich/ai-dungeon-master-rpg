import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDY_eCDkyCIcW-g02lgcadc1IfvdDhvyk8",
    authDomain: "dndproject-dfbfc.firebaseapp.com",
    projectId: "dndproject-dfbfc",
    storageBucket: "dndproject-dfbfc.firebasestorage.app",
    messagingSenderId: "1088276058010",
    appId: "1:1088276058010:web:2ae7c28945e017eeb8b423"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- LOAD SAVED GAMES ---
window.loadUserCampaigns = async function() {
    const username = localStorage.getItem("currentUser");
    const list = document.getElementById('campaign-list');
    list.innerHTML = "Gathering party...";

    const q = query(collection(db, "characters"), where("createdBy", "==", username));
    const snap = await getDocs(q);

    list.innerHTML = "";
    snap.forEach((doc) => {
        const data = doc.data();
        const btn = document.createElement('button');
        btn.className = "save-slot";
        btn.innerText = `${data.name} the ${data.class}`;
        btn.onclick = () => window.enterGame(data);
        list.appendChild(btn);
    });
};

// --- CREATE NEW CAMPAIGN (MATCHING YOUR SCREENSHOTS) ---
document.getElementById('begin-quest-btn').addEventListener('click', async () => {
    const username = localStorage.getItem("currentUser");
    const charData = {
        name: document.getElementById('char-name').value,
        class: document.getElementById('char-class').value,
        weapon: document.getElementById('char-weapon').value,
        description: document.getElementById('world-desc').value,
        createdBy: username,
        createdAt: new Date().toISOString()
    };

    const docId = `${charData.name}_${username}_${Date.now()}`;
    await setDoc(doc(db, "characters", docId), charData);
    
    window.enterGame(charData);
});

// --- Standard Auth Logic ---
const mainBtn = document.getElementById("mainBtn");
mainBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        window.initGame(userDoc.exists() ? userDoc.data().username : "Traveler");
    } catch (e) { alert(e.message); }
});