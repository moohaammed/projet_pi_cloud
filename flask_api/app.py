import os
import base64
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import tensorflow as tf
from dotenv import load_dotenv
import json
import pdfplumber
import requests

app = Flask(__name__)
# Allow CORS for the Angular frontend
CORS(app)

load_dotenv()

# --- VGG16 Model for Alzheimer Detection ---
MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../backpi/src/main/java/esprit/tn/backpi/alzheimermodel/vgg16.h5'))

print("Loading model from:", MODEL_PATH)
try:
    model = tf.keras.models.load_model(MODEL_PATH)
    print("Model loaded successfully.")
except Exception as e:
    print("Error loading model:", e)
    model = None

CLASSES = ["Mild Demented", "Moderate Demented", "Non Demented", "Very Mild Demented"]

# --- Local AI (Ollama) Integration ---
def ask_ai(user_input):
    """
    Connect to local Ollama server (mistral model).
    Assumes `ollama run mistral` is active.
    """
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "mistral",
                "prompt": f"""
You are a medical assistant AI. 

Analyze the following patient input and return:
1. Summary
2. Possible conditions
3. Urgent alerts (if any)
4. Simple explanation for a non-medical user

Patient input:
{user_input}
""",
                "stream": False
            }
        )
        data = response.json()
        return data.get("response", "No response from model")
    except Exception as e:
        print("Ollama error:", str(e))
        return "Ollama is not running. Please start it with 'ollama run mistral' in your terminal."

def extract_text_from_report(report_text):
    if not isinstance(report_text, str) or not report_text.strip():
        return None

    raw_b64 = None
    if "base64," in report_text:
        raw_b64 = report_text.split("base64,")[1]
    else:
        raw_b64 = report_text.strip()

    try:
        raw_bytes = base64.b64decode(raw_b64)
        with pdfplumber.open(io.BytesIO(raw_bytes)) as pdf:
            extracted = "\n".join(page.extract_text() or "" for page in pdf.pages)
            if extracted.strip():
                return extracted
    except Exception as ex:
        print("PDF extraction failed:", ex)

    return report_text if len(report_text) < 5000 else None

# --- Routes ---

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Model failed to load on the server.'}), 500
        
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({'error': 'No image provided.'}), 400
        
        image_data = data['image']
        if "base64," in image_data:
            image_data = image_data.split("base64,")[1]
            
        img_bytes = base64.b64decode(image_data)
        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        img = img.resize((224, 224))
        
        img_array = np.array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        
        preds = model.predict(img_array)
        class_idx = np.argmax(preds[0])
        confidence = float(np.max(preds[0]) * 100)
        
        return jsonify({
            'prediction': CLASSES[class_idx],
            'confidence': round(confidence, 2)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON payload provided.'}), 400
            
        # Check both 'message' and 'question' for compatibility
        user_input = data.get("message") or data.get("question", "")
        reply = ask_ai(user_input)

        return jsonify({
            "status": "success",
            "response": reply
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/analyze-report', methods=['POST'])
def analyze_report():
    """
    Legacy analyze-report route refactored to use local AI.
    """
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON payload provided.'}), 400
            
        report_text = data.get('report_text', '')
        extracted = extract_text_from_report(report_text) or report_text
        mri_result = data.get('mri_result', 'N/A')
        cognitive_score = data.get('cognitive_score', 'N/A')

        prompt = f"""
Analyze this medical report:
{extracted}

MRI Result: {mri_result}
Cognitive Score: {cognitive_score}

Return a structured summary for the patient.
"""
        reply = ask_ai(prompt)

        # For compatibility with potential JSON consumers, we try to return it as a string
        # though the frontend might expect a JSON structure. Adding a simple wrapper.
        return jsonify({
            "summary": reply,
            "status": "success"
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/test-ai', methods=['GET'])
def test_ai():
    reply = ask_ai("Health check. Are you operational?")
    return jsonify({"status": "ok", "message": reply}), 200

# Legacy route for backward compatibility
@app.route('/test-gemini', methods=['GET'])
def test_gemini():
    return test_ai()

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
