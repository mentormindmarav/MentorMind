import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const upload = multer({ storage: multer.memoryStorage() });

const app = express();

async function startServer() {
  const PORT = 3000;
  app.use(express.json());

  // ElevenLabs Proxy: Create Voice
  app.post("/api/voices/add", upload.array("files"), async (req, res) => {
    try {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        return res.status(401).json({ error: "ELEVENLABS_API_KEY not configured" });
      }

      const { name, description } = req.body;
      const files = req.files as Express.Multer.File[];

      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description || "");
      
      files.forEach((file, index) => {
        const blob = new Blob([file.buffer], { type: file.mimetype });
        formData.append("files", blob, file.originalname);
      });

      const response = await fetch("https://api.elevenlabs.io/v1/voices/add", {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
        },
        body: formData,
      });

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("ElevenLabs Add Voice Error:", error);
      res.status(500).json({ error: "Failed to add voice" });
    }
  });

  // ElevenLabs Proxy: TTS
  app.post("/api/tts", async (req, res) => {
    try {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        return res.status(401).json({ error: "ELEVENLABS_API_KEY not configured" });
      }

      const { text, voiceId } = req.body;

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return res.status(response.status).json(errorData);
      }

      const audioBuffer = await response.arrayBuffer();
      res.setHeader("Content-Type", "audio/mpeg");
      res.send(Buffer.from(audioBuffer));
    } catch (error) {
      console.error("ElevenLabs TTS Error:", error);
      res.status(500).json({ error: "Failed to synthesize speech" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Only start listening if not running on Vercel
  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
