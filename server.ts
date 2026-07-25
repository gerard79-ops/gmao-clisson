import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Load environment variables
dotenv.config({ path: ".env.local" });

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

// // ===================== ADMIN SDK - Gestion des collaborateurs =====================

// Initialise le SDK Admin Firebase à partir du fichier de clé de service
function initFirebaseAdmin() {
  if (getApps().length > 0) return;
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  console.log("DEBUG - FIREBASE_SERVICE_ACCOUNT_PATH =", JSON.stringify(keyPath));
  console.log("DEBUG - Variables contenant FIREBASE :", Object.keys(process.env).filter(k => k.includes("FIREBASE")));
  try {
    console.log("DEBUG - Contenu de /etc/secrets :", fs.readdirSync("/etc/secrets"));
  } catch (e: any) {
    console.log("DEBUG - Impossible de lister /etc/secrets :", e.message);
  }
  if (!keyPath || !fs.existsSync(keyPath)) {
    console.warn(
      "FIREBASE_SERVICE_ACCOUNT_PATH non défini ou fichier introuvable : les routes d'administration des utilisateurs seront indisponibles."
    );
    return;
  }

  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
  initializeApp({
    credential: cert(serviceAccount),
  });
  console.log("Firebase Admin SDK initialisé.");
}
initFirebaseAdmin();

// Middleware : vérifie que l'appelant est bien connecté ET a le rôle Administrateur
async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    if (!getApps().length) {
      return res.status(503).json({ error: "Service d'administration non configuré côté serveur." });
    }
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Authentification requise." });
    }
const decoded = await getAuth().verifyIdToken(token);
    const profileQuery = await getFirestore()
      .collection("utilisateurs")
      .where("email", "==", decoded.email)
      .limit(1)
      .get();
    const profile = profileQuery.empty ? null : profileQuery.docs[0].data();
    if (!profile || profile.role !== "Administrateur") {
      return res.status(403).json({ error: "Accès réservé aux administrateurs." });
    }    
    next();
  } catch (err: any) {
    console.error("Auth check failed:", err);
    res.status(401).json({ error: "Session invalide, reconnectez-vous." });
  }
}

// Créer un collaborateur : vrai compte de connexion + fiche profil Firestore
app.post("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const { prenom, nom, email, telephone, role, droits, password } = req.body;
    if (!email || !prenom || !nom || !role) {
      return res.status(400).json({ error: "Champs requis manquants (prénom, nom, email, rôle)." });
    }
    const tempPassword = password || Math.random().toString(36).slice(-10) + "A1!";
    const userRecord = await getAuth().createUser({
      email,
      password: tempPassword,
      displayName: `${prenom} ${nom}`,
    });
    const profile = {
      id: userRecord.uid,
      prenom,
      nom,
      email,
      telephone: telephone || "",
      role,
      mustChangePassword: true,
      droits: droits || {
        equipements: 1,
        interventions: 1,
        stock: 1,
        planning: 1,
        achats: 0,
        reporting: 0,
        parametres: 0,
      },
    };
    await getFirestore().collection("utilisateurs").doc(userRecord.uid).set(profile);
    res.json({ ...profile, tempPassword });
  } catch (error: any) {
    console.error("Create user error:", error);
    res.status(400).json({ error: error.message || "Erreur lors de la création du compte." });
  }
});

// Modifier un collaborateur : profil + éventuellement email / mot de passe / activation
app.put("/api/admin/users/:uid", requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { prenom, nom, email, telephone, role, droits, newPassword, disabled } = req.body;

    const authUpdates: any = {};
    if (email) authUpdates.email = email;
    if (newPassword) authUpdates.password = newPassword;
    if (typeof disabled === "boolean") authUpdates.disabled = disabled;
    if (Object.keys(authUpdates).length > 0) {
      await getAuth().updateUser(uid, authUpdates);
    }

    const profileUpdates: Record<string, any> = {};
    if (prenom !== undefined) profileUpdates.prenom = prenom;
    if (nom !== undefined) profileUpdates.nom = nom;
    if (email !== undefined) profileUpdates.email = email;
    if (telephone !== undefined) profileUpdates.telephone = telephone;
    if (role !== undefined) profileUpdates.role = role;
    if (droits !== undefined) profileUpdates.droits = droits;

    if (Object.keys(profileUpdates).length > 0) {
      await getFirestore().collection("utilisateurs").doc(uid).set(profileUpdates, { merge: true });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Update user error:", error);
    res.status(400).json({ error: error.message || "Erreur lors de la mise à jour du compte." });
  }
});

// Réinitialiser le mot de passe d'un collaborateur
app.post("/api/admin/users/:uid/reset-password", requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const newPassword = Math.random().toString(36).slice(-10) + "A1!";
    await getAuth().updateUser(uid, { password: newPassword });
    await getFirestore().collection("utilisateurs").doc(uid).set({ mustChangePassword: true }, { merge: true });
    res.json({ success: true, newPassword });
  } catch (error: any) {
    console.error("Reset password error:", error);
    res.status(400).json({ error: error.message || "Erreur lors de la réinitialisation du mot de passe." });
  }
});

// Supprimer un collaborateur : compte de connexion + fiche profil
app.delete("/api/admin/users/:uid", requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    await getAuth()
      .deleteUser(uid)
      .catch((err: any) => {
        if (err.code !== "auth/user-not-found") throw err;
      });
    await getFirestore().collection("utilisateurs").doc(uid).delete();
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete user error:", error);
    res.status(400).json({ error: error.message || "Erreur lors de la suppression du compte." });
  }
});

// Middleware : vérifie juste que l'appelant est authentifié (pas besoin d'être admin)
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Authentification requise." });
    const decoded = await getAuth().verifyIdToken(token);
    (req as any).uid = decoded.uid;
    next();
  } catch (err) {
    res.status(401).json({ error: "Session invalide, reconnectez-vous." });
  }
}

// Un utilisateur confirme avoir changé son mot de passe
app.post("/api/users/me/password-changed", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    await getFirestore().collection("utilisateurs").doc(uid).set({ mustChangePassword: false }, { merge: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erreur lors de la mise à jour." });
  }
});

// ===================== FIN ADMIN SDK =====================


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
