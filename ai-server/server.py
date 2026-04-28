from functools import lru_cache
from pathlib import Path
from typing import Literal

import torch
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline
from PIL import Image
import io, base64
from pydantic import BaseModel, Field
from torch import nn
from torchvision import models, transforms
from hospital_prediction import router as hospital_prediction_router, search_hospitals

app = FastAPI()
app.include_router(hospital_prediction_router)
app.get("/search-hospitals")(search_hospitals)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = Path(__file__).with_name("model.pth")
LOCATION_CONFIDENCE_THRESHOLD = 0.40


class LocationPredictionRequest(BaseModel):
    image: str = Field(..., description="Base64 image or data URL")
    patient_id: str | int


class LocationPredictionResponse(BaseModel):
    lieu: str
    confiance: str
    statut: Literal["ZONE_CONNUE", "ZONE_INCONNUE"]


def decode_location_image(image_base64: str) -> Image.Image:
    payload = image_base64.split(",", 1)[1] if "," in image_base64 else image_base64
    try:
        image_bytes = base64.b64decode(payload, validate=True)
        return Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Image base64 invalide.") from exc


def build_location_model(num_classes: int) -> nn.Module:
    model = models.mobilenet_v2(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


@lru_cache(maxsize=1)
def load_location_model():
    if not MODEL_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail="model.pth introuvable. Lancez: python train.py --dataset dataset --output model.pth",
        )

    checkpoint = torch.load(MODEL_PATH, map_location="cpu")
    class_names = checkpoint.get("class_names")
    if not class_names:
        raise HTTPException(status_code=500, detail="model.pth ne contient pas class_names.")

    model = build_location_model(len(class_names))
    state_dict = checkpoint.get("model_state_dict", checkpoint)
    model.load_state_dict(state_dict)
    model.eval()
    return model, class_names


location_preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


@app.get("/health")
def health():
    return {"status": "UP", "model": MODEL_PATH.exists()}


@app.post("/predict-location", response_model=LocationPredictionResponse)
def predict_location(payload: LocationPredictionRequest):
    model, class_names = load_location_model()
    image = decode_location_image(payload.image)
    tensor = location_preprocess(image).unsqueeze(0)

    with torch.no_grad():
        probabilities = torch.softmax(model(tensor), dim=1)[0]
        confidence, index = torch.max(probabilities, dim=0)

    score = float(confidence.item())
    lieu = class_names[int(index.item())]
    statut = "ZONE_CONNUE" if score >= LOCATION_CONFIDENCE_THRESHOLD else "ZONE_INCONNUE"

    return {
        "lieu": lieu,
        "confiance": f"{round(score * 100)}%",
        "statut": statut,
    }
//detecte danger/sécuité
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
