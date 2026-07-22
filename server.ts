import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Increase request size limit for base64 images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini SDK lazily to prevent startup crash if GEMINI_API_KEY is not defined
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("La variable d'environnement GEMINI_API_KEY est requise pour utiliser l'Auto-Diagnostic IA.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// AI Diagnosis Endpoint
app.post("/api/gemini/diagnose", async (req, res) => {
  try {
    const { image, partType } = req.body;

    if (!image) {
      return res.status(400).json({ error: "L'image base64 est requise pour le diagnostic." });
    }

    // Extract raw base64 data and mime type
    const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: "Format d'image base64 invalide." });
    }

    const mimeType = match[1];
    const base64Data = match[2];

    const ai = getGeminiClient();

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    const textPart = {
      text: `Analyse cette photo de pièce mécanique de type "${partType || 'Non spécifié'}". 
Identifie les signes d'usure, de fatigue mécanique, d'oxydation, de fissures, de fuites ou de dommages visibles.
Propose un diagnostic précis en français et suggère les actions correctives immédiates à mener.`,
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            wearLevel: {
              type: Type.STRING,
              description: "Niveau d'usure estimé : 'Sécurisé' (normal/correct), 'Attention' (usure moyenne), ou 'Critique' (panne imminente ou avérée)."
            },
            wearPercentage: {
              type: Type.NUMBER,
              description: "Pourcentage estimé d'usure ou de dégradation de la pièce mécanique (un entier entre 0 et 100)."
            },
            diagnosis: {
              type: Type.STRING,
              description: "Analyse visuelle détaillée de la pièce en français, mentionnant l'état d'usure, les défauts constatés et les risques associés."
            },
            correctiveAction: {
              type: Type.STRING,
              description: "Action corrective immédiate recommandée pour le technicien terrain (en français)."
            },
            partsRequired: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Liste des pièces de rechange ou consommables potentiellement requis pour la réparation."
            },
            recommendedPriority: {
              type: Type.STRING,
              description: "Priorité recommandée de l'intervention de maintenance : 'Basse', 'Moyenne', 'Haute', ou 'Critique'."
            }
          },
          required: ["wearLevel", "wearPercentage", "diagnosis", "correctiveAction", "partsRequired", "recommendedPriority"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Le modèle Gemini n'a renvoyé aucune réponse.");
    }

    const jsonResult = JSON.parse(resultText.trim());
    res.json(jsonResult);
  } catch (error: any) {
    console.error("Gemini diagnosis API error:", error);
    res.status(500).json({ 
      error: error.message || "Une erreur est survenue lors de l'analyse par l'intelligence artificielle." 
    });
  }
});

// Vite Middleware & Static files routing
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode serving static dist files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
