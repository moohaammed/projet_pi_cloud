from fastapi import FastAPI
import joblib
import numpy as np

app = FastAPI()

cdr_model = joblib.load("cdr_model.pkl")
risk_model = joblib.load("risk_model.pkl")


@app.post("/predict-cdr")
def predict_cdr(data: dict):
    features = np.array([
        data["Age"],
        data["EDUC"],
        data["SES"],
        data["MMSE"],
        data["eTIV"],
        data["nWBV"],
        data["ASF"]
    ]).reshape(1, -1)

    prediction = cdr_model.predict(features)[0]

    return {
        "cdr": float(prediction)
    }


@app.post("/predict-risk")
def predict_risk(data: dict):
    features = np.array([
        data["MMSE"],
        data["CDRSB"],
        data["ADAS11"],
        data["ADAS13"]
    ]).reshape(1, -1)

    prediction = int(risk_model.predict(features)[0])

    labels = {
        0: "CN",
        1: "SMC",
        2: "EMCI",
        3: "LMCI",
        4: "AD"
    }

    return {
        "risk_class": prediction,
        "risk_label": labels.get(prediction, "Unknown")
    }
