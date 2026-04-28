import base64
import io
from functools import lru_cache
from pathlib import Path
from typing import Literal

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image
from torch import nn
from torchvision import models, transforms
from hospital_prediction import router as hospital_prediction_router, search_hospitals


MODEL_PATH = Path(__file__).with_name("model.pth")
CONFIDENCE_THRESHOLD = 0.40

app = FastAPI(title="AlzCare Location Recognition AI")
app.include_router(hospital_prediction_router)
app.get("/search-hospitals")(search_hospitals)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictionRequest(BaseModel):
    image: str = Field(..., description="Base64 image or data URL")
    patient_id: str | int


class PredictionResponse(BaseModel):
    lieu: str
    confiance: str
    statut: Literal["ZONE_CONNUE", "ZONE_INCONNUE"]


def decode_image(image_base64: str) -> Image.Image:
    payload = image_base64.split(",", 1)[1] if "," in image_base64 else image_base64
    try:
        image_bytes = base64.b64decode(payload, validate=True)
        return Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Image base64 invalide.") from exc


def build_model(num_classes: int) -> nn.Module:
    model = models.mobilenet_v2(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


@lru_cache(maxsize=1)
def load_model():
    if not MODEL_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail="model.pth introuvable. Lancez d'abord: python train.py --dataset dataset",
        )

    checkpoint = torch.load(MODEL_PATH, map_location="cpu")
    class_names = checkpoint.get("class_names")
    if not class_names:
        raise HTTPException(status_code=500, detail="model.pth ne contient pas class_names.")

    model = build_model(len(class_names))
    state_dict = checkpoint.get("model_state_dict", checkpoint)
    model.load_state_dict(state_dict)
    model.eval()
    return model, class_names


preprocess = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ]
)


@app.get("/health")
def health():
    return {"status": "UP", "model": MODEL_PATH.exists()}


@app.post("/predict-location", response_model=PredictionResponse)
def predict_location(payload: PredictionRequest):
    model, class_names = load_model()
    image = decode_image(payload.image)
    tensor = preprocess(image).unsqueeze(0)

    with torch.no_grad():
        probabilities = torch.softmax(model(tensor), dim=1)[0]
        confidence, index = torch.max(probabilities, dim=0)

    score = float(confidence.item())
    lieu = class_names[int(index.item())]
    statut = "ZONE_CONNUE" if score >= CONFIDENCE_THRESHOLD else "ZONE_INCONNUE"

    return {
        "lieu": lieu,
        "confiance": f"{round(score * 100)}%",
        "statut": statut,
    }
