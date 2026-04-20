from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline
from PIL import Image
import io, base64

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

pipe = pipeline("zero-shot-image-classification", model="openai/clip-vit-base-patch32")

LABELS_ALZHEIMER = [
    "safe path",
    "dangerous hole",
    "obstacle on path",
    "stairs",
    "door",
    "clear road",
    # ── Nouveaux labels accident ──
    "car accident",
    "vehicle crash",
    "accident scene",
    "fallen person on ground",
    "injured person",
    "road blocked by accident",
    "emergency situation",
    "fire or smoke",
    "flooding water on path",
]

DANGER_LABELS = {
    "dangerous hole",
    "obstacle on path",
    "car accident",
    "vehicle crash",
    "accident scene",
    "fallen person on ground",
    "injured person",
    "road blocked by accident",
    "emergency situation",
    "fire or smoke",
    "flooding water on path",
}

MESSAGES = {
    "safe path":                  "Le chemin est libre. Vous pouvez avancer.",
    "dangerous hole":             "⚠️ Danger ! Il y a un trou devant vous. Arrêtez-vous !",
    "obstacle on path":           "⚠️ Attention ! Un obstacle bloque le chemin. Faites attention.",
    "stairs":                     "⚠️ Il y a des escaliers devant vous. Soyez prudent.",
    "door":                       "Il y a une porte devant vous.",
    "clear road":                 "La route est dégagée. Vous pouvez avancer.",
    # ── Accidents ──
    "car accident":               "🚨 DANGER ! Un accident de voiture a été détecté. Ne vous approchez pas !",
    "vehicle crash":              "🚨 DANGER ! Un accident de véhicule détecté. Restez à l'écart !",
    "accident scene":             "🚨 DANGER ! Une scène d'accident est présente. Évitez cette zone !",
    "fallen person on ground":    "🚨 URGENT ! Une personne est tombée à terre. Appelez les secours !",
    "injured person":             "🚨 URGENT ! Une personne blessée détectée. Appelez le 15 immédiatement !",
    "road blocked by accident":   "🚨 Route bloquée par un accident. Ne pas avancer !",
    "emergency situation":        "🚨 Situation d'urgence détectée. Restez en place et appelez les secours !",
    "fire or smoke":              "🚨 DANGER ! Feu ou fumée détecté. Éloignez-vous immédiatement !",
    "flooding water on path":     "⚠️ Attention ! Eau ou inondation sur le chemin. Ne pas avancer !",
}

# Seuil minimum de confiance pour considérer le label top comme fiable
CONFIDENCE_THRESHOLD = 0.20

@app.post("/predict")
async def predict(request: Request):
    try:
        payload = await request.json()
        image_base64 = payload.get('inputs')
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))

        result = pipe(image, candidate_labels=LABELS_ALZHEIMER)

        top = result[0]
        label = top['label']
        score = top['score']

        # Si la confiance est trop basse, on considère la scène comme suspecte
        if score < CONFIDENCE_THRESHOLD:
            label = "emergency situation"

        is_danger = label in DANGER_LABELS

        return JSONResponse(content={
            "predictions": result,
            "label": label,
            "confidence": score,
            "message": MESSAGES.get(label, "⚠️ Analyse terminée. Soyez prudent."),
            "danger": is_danger
        })
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)