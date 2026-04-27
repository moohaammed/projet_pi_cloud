"""
pkl_inference_api — Heart-rate AI inference bridge.

Loads the trained Random Forest model (best_model_Random_Forest.pkl)
and exposes a /predict endpoint for the smartwatch-service.

Runs on port 5001 (separate from the existing flask_api on port 5000).
"""

import os
import numpy as np
import pandas as pd
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ─── Load the trained model ─────────────────────────────────────────
MODEL_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..', 'pkl', 'best_model_Random_Forest.pkl')
)
print(f"[PKL-API] Loading model from: {MODEL_PATH}")

try:
    model = joblib.load(MODEL_PATH)
    print("[PKL-API] ✅ Model loaded successfully.")
except Exception as e:
    print(f"[PKL-API] ❌ Error loading model: {e}")
    model = None

# ─── Feature column names (must match training order) ───────────────
FEATURE_COLS = [
    'bpm_mean', 'bpm_std', 'bpm_max', 'bpm_min',
    'bpm_delta', 'bpm_slope', 'hrv_rmssd',
    'bpm_current', 'bpm_iqr'
]

WINDOW_SIZE = 60


def compute_features(bpm_values):
    """
    Compute the 9 statistical features from a 60-read BPM window.
    Matches exactly the create_features_dataset function from the training notebook.
    """
    window = np.array(bpm_values[-WINDOW_SIZE:], dtype=float)

    features = {
        'bpm_mean':    np.mean(window),
        'bpm_std':     np.std(window),
        'bpm_max':     np.max(window),
        'bpm_min':     np.min(window),
        'bpm_delta':   window[-1] - window[0],
        'bpm_slope':   np.polyfit(range(WINDOW_SIZE), window, 1)[0],
        'hrv_rmssd':   np.sqrt(np.mean(np.diff(window) ** 2)),
        'bpm_current': window[-1],
        'bpm_iqr':     np.percentile(window, 75) - np.percentile(window, 25)
    }

    return pd.DataFrame([features], columns=FEATURE_COLS)


def apply_patient_modifiers(proba, age, poids):
    """
    Apply patient-specific risk modifiers as defined in the notebook.
    """
    if age is not None and age > 80:
        proba = min(proba * 1.10, 1.0)
    if poids is not None and poids < 55:
        proba = min(proba * 1.05, 1.0)
    return proba


def classify_risk(proba):
    """
    Map probability to risk level and recommended action.
    Thresholds match the notebook's alerte_temps_reel function.
    """
    if proba > 0.75:
        return "ALERTE", "Appeler soignant"
    elif proba > 0.45:
        return "SURVEILLANCE", "Observer"
    elif proba > 0.20:
        return "ATTENTION", "Vérifier 5min"
    else:
        return "NORMAL", "Aucune action"


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "UP",
        "model_loaded": model is not None
    }), 200


@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict heart-rate crisis risk from a 60-read BPM sliding window.

    Expected JSON body:
    {
        "bpm_values": [72, 73, ...],   // exactly 60 values
        "age": 78,                      // patient age (optional)
        "poids": 65.0,                  // patient weight in kg (optional)
        "sexe": "F"                     // patient sex (optional, for context)
    }
    """
    if model is None:
        return jsonify({"error": "Model not loaded on server."}), 500

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON payload provided."}), 400

        bpm_values = data.get('bpm_values')
        if not bpm_values or len(bpm_values) < WINDOW_SIZE:
            return jsonify({
                "error": f"bpm_values must contain at least {WINDOW_SIZE} readings. "
                         f"Got {len(bpm_values) if bpm_values else 0}."
            }), 400

        age = data.get('age')
        poids = data.get('poids')
        sexe = data.get('sexe', 'Unknown')

        # Compute features
        features_df = compute_features(bpm_values)

        # Get prediction probability
        proba = model.predict_proba(features_df)[0][1]

        # Apply patient modifiers
        proba = apply_patient_modifiers(proba, age, poids)

        # Classify risk
        risk_level, action = classify_risk(proba)

        # Determine prediction label
        prediction = "PRE_CRISE" if proba > 0.5 else "NORMAL"

        result = {
            "prediction": prediction,
            "probability": round(float(proba), 4),
            "riskLevel": risk_level,
            "action": action,
            "bpmCurrent": float(bpm_values[-1]),
            "bpmMean": round(float(np.mean(bpm_values[-WINDOW_SIZE:])), 1),
            "patientInfo": {
                "age": age,
                "poids": poids,
                "sexe": sexe
            }
        }

        print(f"[PKL-API] Prediction: {prediction} | Probability: {proba:.4f} | "
              f"Risk: {risk_level} | BPM: {bpm_values[-1]}")

        return jsonify(result), 200

    except Exception as e:
        print(f"[PKL-API] ❌ Prediction error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
