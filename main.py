from fastapi import FastAPI
import pandas as pd
import joblib
from pymongo import MongoClient

# Load trained model
model = joblib.load("irrigation_model.pkl")

# Feature order (must match training)
training_feature_names = [
    "Soil_Moisture_Shallow",
    "Soil_Moisture_Deep",
    "Atmospheric_Temp",
    "Humidity",
    "Hour",
    "Month"
]

app = FastAPI()

# MongoDB connection
MONGO_URI = "mongodb+srv://Bladebreakers:bladebreakers.123@irrigation.torjqrv.mongodb.net/?retryWrites=true&w=majority&appName=Irrigation"
client = MongoClient(MONGO_URI)
db = client["irrigation"]   # Database
sensor_collection = db["sensor"]   # Collection


@app.get("/")
def root():
    return {"message": "Smart Irrigation API is running 🚀"}


@app.post("/predict")
def predict(data: dict):
    # Convert input into DataFrame
    test_input = pd.DataFrame([data], columns=training_feature_names)

    # Get prediction
    prediction = model.predict(test_input)[0]
    probability = model.predict_proba(test_input)[:, 1][0]

    # Save input + prediction to MongoDB
    sensor_collection.insert_one({
        "prediction": int(prediction),
        "confidence": float(round(probability, 3))
    })

    return {
        "prediction": "Irrigate ✅" if prediction == 1 else "No irrigation ❌",
        "confidence": round(float(probability), 3),
        "input": data
    }


@app.get("/history")
def get_history():
    """Fetch last 10 predictions from DB"""
    records = list(sensor_collection.find().sort("_id", -1).limit(10))
    for r in records:
        r["_id"] = str(r["_id"])  # convert ObjectId to string for JSON
    return records
