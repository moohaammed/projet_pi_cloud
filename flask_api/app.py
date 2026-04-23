import os
import base64
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import tensorflow as tf
from dotenv import load_dotenv
from groq import Groq
import json
import pdfplumber
import resend

app = Flask(__name__)
CORS(app)
load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
GROQ_MODEL = "llama-3.1-8b-instant"

MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../backpi/src/main/java/esprit/tn/backpi/alzheimermodel/vgg16.h5'))
print("Loading model from:", MODEL_PATH)
try:
    model = tf.keras.models.load_model(MODEL_PATH)
    print("Model loaded successfully.")
except Exception as e:
    print("Error loading model:", e)
    model = None

CLASSES = ["Mild Demented", "Moderate Demented", "Non Demented", "Very Mild Demented"]

def extract_text_from_report(report_text):
    """Extract plain text from a PDF whether it comes as base64 with or without prefix."""
    if not isinstance(report_text, str) or not report_text.strip():
        return None
    try:
        # Handle base64 with or without data URL prefix
        if "base64," in report_text:
            raw_b64 = report_text.split("base64,")[1]
        else:
            raw_b64 = report_text.strip()
        raw_bytes = base64.b64decode(raw_b64)
        with pdfplumber.open(io.BytesIO(raw_bytes)) as pdf:
            extracted = "\n".join(page.extract_text() or "" for page in pdf.pages)
            if extracted.strip():
                print("PDF text extracted successfully, length:", len(extracted))
                return extracted
    except Exception as ex:
        print("PDF extraction failed:", ex)
    # If not base64 or extraction failed and it looks like plain text, return as is
    if len(report_text) < 10000 and not report_text.startswith("data:"):
        return report_text
    return None

@app.route('/test-groq', methods=['GET'])
def test_groq():
    try:
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": "Say hello"}]
        )
        return jsonify({"status": "ok", "response": response.choices[0].message.content}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

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
            b64_str = image_data.split("base64,")[1]
            image_url = image_data
        else:
            b64_str = image_data
            image_url = f"data:image/jpeg;base64,{image_data}"


        img_bytes = base64.b64decode(b64_str)
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
        print("Prediction error:", e)
        return jsonify({'error': str(e)}), 500

@app.route('/analyze-report', methods=['POST'])
def analyze_report():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON payload provided.'}), 400

        report_text = extract_text_from_report(data.get('report_text', ''))
        mri_result = data.get('mri_result', 'N/A')
        cognitive_score = data.get('cognitive_score', 'N/A')

        if not report_text:
            return jsonify({'error': 'Could not extract text from the medical report.'}), 400

        prompt = f"""You are a medical assistant AI helping patients understand their reports.

Context:
Medical report:
{report_text}

MRI result:
{mri_result}

Cognitive score:
{cognitive_score}

Tasks:
1. Summarize the report in simple terms
2. Extract key findings
3. Detect any serious alerts
4. Give safe recommendations
5. Be clear and reassuring

Rules:
- Do NOT give a final diagnosis
- Use simple language
- If something is serious, clearly warn the user

Return JSON only in this exact format with no extra text:
{{
  "summary": "Simple explanation of the report for the patient",
  "key_findings": ["finding1", "finding2"],
  "alerts": ["important warning if any"],
  "recommendations": ["what the patient should do next"]
}}"""

        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}]
        )
        result_text = response.choices[0].message.content.strip()

        # Clean markdown code blocks if present
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()

        result_json = json.loads(result_text)
        return jsonify(result_json), 200

    except Exception as e:
        print("Analyze report error:", e)
        return jsonify({'error': str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON payload provided.'}), 400

        question = data.get('question', '')
        raw_report = data.get('report_text', '')

        report_text = extract_text_from_report(raw_report)

        if not report_text or not report_text.strip():
            return "This information is not available in your report", 200

        prompt = f"""You are a helpful medical assistant.

Context:
{report_text}

User question:
{question}

Instructions:
- Answer ONLY using the report above
- If the answer is not in the report, say exactly: "This information is not available in your report"
- If unsure about anything medical, say: "Please consult your doctor"
- Keep it simple and reassuring
- Do NOT give a final diagnosis
- Do NOT hallucinate or invent information

Return only the answer as plain text, no markdown."""

        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content.strip(), 200

    except Exception as e:
        print("Chat error:", e)
        return jsonify({'error': str(e)}), 500

@app.route('/send-reminder-email', methods=['POST'])
def send_reminder_email():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON payload provided.'}), 400

        patient_name = data.get('patient_name', 'Patient')
        patient_email = data.get('patient_email')
        message = data.get('message', '')
        date = data.get('date', '')

        if not patient_email:
            return jsonify({'error': 'Patient email is required.'}), 400

        email_html = f"""
        <p>Hello {patient_name},</p>
        <p>You have a new medical reminder from your doctor.</p>
        <p><strong>Reminder:</strong> {message}</p>
        <p><strong>Date:</strong> {date}</p>
        """

        try:
            r = resend.Emails.send({
                "from": "AlzCare <onboarding@resend.dev>",
                "to": [patient_email],
                "subject": "Medical Reminder Notification",
                "html": email_html
            })
            print("Resend Response:", r)
            return jsonify({'status': 'ok', 'message': 'Email sent successfully'}), 200
        except Exception as email_err:
            print("Failed to send email via Resend:", email_err)
            return jsonify({'error': str(email_err)}), 500

    except Exception as e:
        print("Error processing email request:", e)
        # Log the error but Return 200 or 500? The user asked to not break the app. 
        # Returning 500 but handled properly in Java backend
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
