import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const ai = new GoogleGenAI(); // uses process.env.GEMINI_API_KEY
const files = [
  "2026-03-28 20.40.42.jpg",
  "2026-03-28 20.40.50.jpg",
  "2026-03-28 20.40.56.jpg",
  "2026-03-28 20.41.04.jpg"
];

async function run() {
  for (const file of files) {
    const data = fs.readFileSync(`/Users/klai/Desktop/${file}`);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        "What color is the plate holding the borsch/soup in this image? Reply with just the color.",
        {
          inlineData: {
            data: Buffer.from(data).toString("base64"),
            mimeType: "image/jpeg"
          }
        }
      ]
    });
    console.log(`${file}: ${response.text}`);
  }
}

run().catch(console.error);
