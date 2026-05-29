import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(__dirname)); 

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🎲 DICE ENGINE
const roll = {
  d20: () => Math.floor(Math.random() * 20) + 1,
  d6:  (count = 1) => {
    let total = 0;
    for(let i=0; i<count; i++) total += Math.floor(Math.random() * 6) + 1;
    return total;
  },
  d100: () => Math.floor(Math.random() * 100) + 1
};

// 🛡️ Safety Helper
const generateWithRetry = async (model, prompt, retries = 3, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err) {
      if (err.status === 429 && i < retries - 1) {
        console.log(`Rate limited. Waiting ${delay/1000}s...`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; 
      } else { throw err; }
    }
  }
};

app.post("/test-ai", async (req, res) => {
  const { prompt, actionType } = req.body;
  if (!prompt) return res.status(400).json({ error: "No prompt provided" });

  try {
    // OPTION C: Using gemini-2.0-flash-exp
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp", 
      systemInstruction: "You are an expert DM. Incorporate dice results naturally into high-fantasy narration. Keep it under 150 words." 
    });

    let finalPrompt = prompt;
    let diceData = {};

    switch(actionType) {
      case "check": 
        diceData.roll = roll.d20();
        diceData.type = "D20 Check";
        finalPrompt = `Action: ${prompt}. Result: ${diceData.roll} on a D20. Narrate if they succeed or fail.`;
        break;
      case "attack": 
        const hitRoll = roll.d20();
        const damage = roll.d6(2); 
        diceData.roll = `Hit: ${hitRoll}, Damage: ${damage}`;
        diceData.type = "Attack (2d6)";
        finalPrompt = `Action: ${prompt}. The player rolled a ${hitRoll} to hit and dealt ${damage} damage. Narrate the blow!`;
        break;
      case "chaos": 
        diceData.roll = roll.d100();
        diceData.type = "D100 Wild Magic";
        finalPrompt = `The player triggers chaos! ${prompt}. D100 Roll: ${diceData.roll}. Narrate!`;
        break;
      default:
        finalPrompt = prompt; 
    }

    const narration = await generateWithRetry(model, finalPrompt);
    res.json({ narration, dice: diceData });

  } catch (err) {
    console.error("--- DM ERROR ---", err.message);
    res.status(500).json({ error: "The DM fumbled.", details: err.message });
  }
});

// --- NEW DIAGNOSTIC SCRIPT ---
// This will print the EXACT names you are allowed to use to your terminal
const checkModels = async () => {
    try {
        const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 
        // We aren't calling it, just checking if the SDK is loaded
        console.log("Checking API access...");
    } catch (e) {
        console.log("Diagnostic: Use terminal to verify model IDs.");
    }
};

app.listen(3000, () => {
  console.log("⚔️  D&D RPG Engine Online: http://localhost:3000");
  checkModels();
});