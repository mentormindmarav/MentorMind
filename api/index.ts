import express from "express";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

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
    
    files.forEach((file) => {
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

export default app;
