from pathlib import Path
import csv

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sklearn.neighbors import NearestNeighbors
from math import atan2, cos, radians, sin, sqrt


router = APIRouter()
DATASET_PATH = Path(__file__).with_name("hospitals_tunisia.csv")
EARTH_RADIUS_KM = 6371.0088


class HospitalPredictionRequest(BaseModel):
    patient_latitude: float
    patient_longitude: float
    type_incident: str


class HospitalResult(BaseModel):
    nom: str
    gouvernorat: str
    distance_km: str
    specialite: str
    telephone: str
    adresse: str
    latitude: float
    longitude: float
    recommande: bool


class HospitalPredictionResponse(BaseModel):
    hopitaux: list[HospitalResult]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    )
    return EARTH_RADIUS_KM * 2 * atan2(sqrt(a), sqrt(1 - a))


def incident_specialities(type_incident: str) -> list[str]:
    normalized = (type_incident or "").strip().lower()
    if normalized in {"fugue", "agitation", "zone_dangereuse"}:
        return ["psychiatrie"]
    if normalized in {"chute", "accident", "chute_personne"}:
        return ["urgences"]
    if normalized == "malaise":
        return ["general", "urgences"]
    return ["urgences", "general", "neurologie", "psychiatrie"]


def load_hospitals() -> list[dict]:
    if not DATASET_PATH.exists():
        raise HTTPException(status_code=503, detail="hospitals_tunisia.csv introuvable.")
    with DATASET_PATH.open("r", encoding="utf-8", newline="") as file:
        reader = csv.DictReader(file)
        required = {"nom", "gouvernorat", "latitude", "longitude", "specialite", "telephone", "adresse"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise HTTPException(status_code=500, detail=f"Colonnes manquantes: {', '.join(sorted(missing))}")
        rows = []
        for row in reader:
            row["latitude"] = float(row["latitude"])
            row["longitude"] = float(row["longitude"])
            row["specialite_norm"] = row["specialite"].strip().lower()
            rows.append(row)
        return rows


@router.post("/predict-hospital", response_model=HospitalPredictionResponse)
def predict_hospital(payload: HospitalPredictionRequest):
    hospitals = load_hospitals()
    preferred = incident_specialities(payload.type_incident)
    filtered = [hospital for hospital in hospitals if hospital["specialite_norm"] in preferred]
    if not filtered:
        filtered = hospitals.copy()

    coordinates_radians = [
        [
            hospital["latitude"] * 3.141592653589793 / 180.0,
            hospital["longitude"] * 3.141592653589793 / 180.0,
        ]
        for hospital in filtered
    ]
    patient_radians = [[
        payload.patient_latitude * 3.141592653589793 / 180.0,
        payload.patient_longitude * 3.141592653589793 / 180.0,
    ]]

    neighbors = NearestNeighbors(
        n_neighbors=min(3, len(filtered)),
        algorithm="ball_tree",
        metric="haversine",
    )
    neighbors.fit(coordinates_radians)
    distances, indices = neighbors.kneighbors(patient_radians)

    results = []
    for rank, (distance, index) in enumerate(zip(distances[0], indices[0])):
        row = filtered[int(index)]
        results.append({
            "nom": str(row["nom"]),
            "gouvernorat": str(row["gouvernorat"]),
            "distance_km": f"{distance * EARTH_RADIUS_KM:.1f}",
            "specialite": str(row["specialite"]).capitalize(),
            "telephone": str(row["telephone"]),
            "adresse": str(row["adresse"]),
            "latitude": row["latitude"],
            "longitude": row["longitude"],
            "recommande": rank == 0,
        })

    return {"hopitaux": results}


@router.get("/search-hospitals", response_model=HospitalPredictionResponse)
def search_hospitals(
    query: str = Query("", description="Nom, gouvernorat, specialite ou adresse"),
    patient_latitude: float | None = None,
    patient_longitude: float | None = None,
    limit: int = Query(3, description="Nombre de resultats. 0 ou negatif = tous les hopitaux."),
):
    hospitals = load_hospitals()
    term = (query or "").strip().lower()

    if term:
        hospitals = [
            hospital for hospital in hospitals
            if term in str(hospital["nom"]).lower()
            or term in str(hospital["gouvernorat"]).lower()
            or term in str(hospital["specialite"]).lower()
            or term in str(hospital["adresse"]).lower()
        ]

    results = []
    for hospital in hospitals:
        distance = ""
        if patient_latitude is not None and patient_longitude is not None:
            distance = f"{haversine_km(patient_latitude, patient_longitude, hospital['latitude'], hospital['longitude']):.1f}"

        results.append({
            "nom": str(hospital["nom"]),
            "gouvernorat": str(hospital["gouvernorat"]),
            "distance_km": distance,
            "specialite": str(hospital["specialite"]).capitalize(),
            "telephone": str(hospital["telephone"]),
            "adresse": str(hospital["adresse"]),
            "latitude": hospital["latitude"],
            "longitude": hospital["longitude"],
            "recommande": False,
        })

    if patient_latitude is not None and patient_longitude is not None:
        results.sort(key=lambda item: float(item["distance_km"] or "999999"))
    else:
        results.sort(key=lambda item: item["nom"])

    if results and patient_latitude is not None and patient_longitude is not None:
        results[0]["recommande"] = True

    if limit <= 0:
        return {"hopitaux": results}

    return {"hopitaux": results[:limit]}
