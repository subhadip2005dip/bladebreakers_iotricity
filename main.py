from fastapi import FastAPI
import pandas as pd
import joblib
from pymongo import MongoClient
import requests
from datetime import datetime
from typing import Dict, Optional
from dotenv import load_dotenv
import os

load_dotenv()

model = joblib.load("irrigation_model.pkl")
# Regressor: Amount of water
amount_model = joblib.load("irrigation_amount_model.pkl")

training_feature_names = [
    "Soil_Moisture_Shallow",
    "Soil_Moisture_Deep",
    "Atmospheric_Temp",
    "Humidity",
    "Rainfall",
    "Hour",
    "Month"
]


def determine_optimal_irrigation_time(temp: float, humidity: float, hour: int, month: int, rainfall: int = 0) -> tuple:
    """
    Determine optimal irrigation time based on environmental conditions

    Args:
        temp: Atmospheric temperature (°C)
        humidity: Humidity percentage
        hour: Current hour (0-23)
        month: Month (1-12)
        rainfall: Rainfall indicator (0=no rain, 1=rain)

    Returns:
        tuple: (recommended_time_description, optimal_hour, reasoning)
    """

    # If raining, defer irrigation
    if rainfall == 1:
        return "Defer irrigation (Rain expected)", None, "Natural precipitation available"

    # Calculate evapotranspiration risk score (higher = more water loss)
    et_risk = max(0, (temp - 20) * 0.1 + (100 - humidity) * 0.05)

    # Define optimal time windows based on conditions
    if et_risk < 2:  # Low risk conditions
        if 5 <= hour <= 8:
            return "Optimal time - Early Morning", hour, f"Low evaporation risk (ET score: {et_risk:.1f}), excellent absorption"
        elif 18 <= hour <= 21:
            return "Good time - Evening", hour, f"Low evaporation risk (ET score: {et_risk:.1f}), good absorption"
        elif hour < 5:
            return "Early Morning (5-8 AM) recommended", 6, f"Current time too early, wait for sunrise"
        elif 9 <= hour <= 17:
            return "Evening (6-9 PM) recommended", 18, f"Avoid midday heat, wait for evening"
        else:
            return "Early Morning (5-8 AM) recommended", 6, f"Late evening, schedule for next morning"

    elif et_risk < 4:  # Moderate risk conditions
        if 5 <= hour <= 7:
            return "Optimal time - Early Morning", hour, f"Moderate evaporation risk (ET score: {et_risk:.1f}), prioritize early irrigation"
        elif 19 <= hour <= 21:
            return "Acceptable time - Late Evening", hour, f"Moderate evaporation risk (ET score: {et_risk:.1f}), evening irrigation acceptable"
        elif hour < 5:
            return "Early Morning (5-7 AM) strongly recommended", 6, f"Wait for optimal morning window"
        else:
            return "Early Morning (5-7 AM) strongly recommended", 6, f"High evaporation risk during day, wait for morning"

    else:  # High risk conditions (hot and dry)
        if 5 <= hour <= 6:
            return "Critical - Early Morning Only", hour, f"High evaporation risk (ET score: {et_risk:.1f}), irrigate immediately"
        elif hour < 5:
            return "Critical - Early Morning (5-6 AM) ONLY", 5, f"Extreme conditions, very narrow optimal window"
        else:
            return "Critical - Wait for Early Morning (5-6 AM)", 5, f"Extreme evaporation risk (ET score: {et_risk:.1f}), avoid all daytime irrigation"


def get_irrigation_efficiency(hour: int, temp: float, humidity: float) -> float:
    """
    Calculate irrigation efficiency score (0-1, higher is better)
    Based on evapotranspiration rates throughout the day
    """
    # Base efficiency by hour (based on typical evaporation patterns)
    hourly_efficiency = {
        0: 0.85, 1: 0.85, 2: 0.85, 3: 0.85, 4: 0.85,
        5: 0.95, 6: 0.95, 7: 0.90, 8: 0.80, 9: 0.70,
        10: 0.60, 11: 0.50, 12: 0.40, 13: 0.35, 14: 0.35,
        15: 0.40, 16: 0.45, 17: 0.55, 18: 0.70, 19: 0.80,
        20: 0.85, 21: 0.85, 22: 0.85, 23: 0.85
    }

    base_eff = hourly_efficiency.get(hour, 0.5)

    # Adjust for temperature (higher temp reduces efficiency)
    temp_adjustment = max(0, 1 - (temp - 25) * 0.02)

    # Adjust for humidity (higher humidity improves efficiency)
    humidity_adjustment = 0.8 + (humidity / 100) * 0.2

    return base_eff * temp_adjustment * humidity_adjustment


def get_irrigation_recommendation(soil_shallow: float, soil_deep: float, temp: float,
                                  humidity: float, rainfall: int, hour: int, month: int) -> Dict:
    """
    Complete irrigation recommendation system

    Returns: Dictionary with full recommendation details
    """

    # Prepare input for models
    model_input = pd.DataFrame([{
        "Soil_Moisture_Shallow": soil_shallow,
        "Soil_Moisture_Deep": soil_deep,
        "Atmospheric_Temp": temp,
        "Humidity": humidity,
        "Rainfall": rainfall,
        "Hour": hour,
        "Month": month
    }], columns=training_feature_names)

    # Get predictions
    irrigation_needed = model.predict(model_input)[0]
    confidence = model.predict_proba(model_input)[:, 1][0]
    amount = amount_model.predict(model_input)[0] if irrigation_needed else 0

    # Get timing recommendation
    timing_rec, optimal_hour, reasoning = determine_optimal_irrigation_time(
        temp, humidity, hour, month, rainfall
    )

    # Calculate current efficiency
    current_eff = get_irrigation_efficiency(hour, temp, humidity)

    # Calculate evapotranspiration risk
    et_risk = max(0, (temp - 20) * 0.1 + (100 - humidity) * 0.05)

    # Make final decision
    if irrigation_needed and rainfall == 0:
        if (5 <= hour <= 8) or (18 <= hour <= 21):
            action = "IRRIGATE_NOW"
            decision = "Irrigate ✅ - Optimal timing"
        elif current_eff > 0.7:
            action = "IRRIGATE_NOW"
            decision = "Irrigate ✅ - Good efficiency"
        else:
            action = "SCHEDULE_IRRIGATION"
            decision = "Schedule irrigation ⏰ - Poor timing now"
    elif rainfall == 1:
        action = "NO_IRRIGATION_RAIN"
        decision = "No irrigation ❌ (Rain expected)"
    else:
        action = "NO_IRRIGATION_SUFFICIENT"
        decision = "No irrigation ❌ (Sufficient moisture)"

    return {
        'action': action,
        'decision': decision,
        'irrigation_needed': bool(irrigation_needed),
        'confidence': round(confidence, 3),
        'amount_liters_per_m2': round(amount, 2) if amount > 0 else 0,
        'timing_recommendation': timing_rec,
        'optimal_hour': optimal_hour,
        'reasoning': reasoning,
        'current_efficiency': round(current_eff, 3),
        'evapotranspiration_risk': round(et_risk, 2),
        'efficiency_rating': 'Excellent' if current_eff > 0.8 else 'Good' if current_eff > 0.6 else 'Fair' if current_eff > 0.4 else 'Poor'
    }


app = FastAPI(title="Smart Irrigation API 🚀", version="2.0",
              description="Enhanced irrigation system with optimal timing and efficiency analysis")

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["irrigation"]
sensor_collection = db["ai_prediction"]

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
CITY = "Kolkata,IN"


def get_weather_data():
    """
    Fetch weather + rainfall forecast from OpenWeatherMap
    """
    url = f"https://api.openweathermap.org/data/2.5/forecast?q={CITY}&appid={OPENWEATHER_API_KEY}&units=metric"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        forecast = data["list"][0]  # Take first forecast (closest)
        temp = forecast["main"]["temp"]
        humidity = forecast["main"]["humidity"]
        rain_mm = forecast.get("rain", {}).get("3h", 0.0)
        rainfall_flag = 1 if rain_mm > 0 else 0
        return {
            "Atmospheric_Temp": temp,
            "Humidity": humidity,
            "Rainfall": rainfall_flag,
            "Rainfall_mm": rain_mm
        }
    except Exception as e:
        return {"Atmospheric_Temp": None, "Humidity": None, "Rainfall": 0, "Rainfall_mm": 0}


@app.get("/")
def root():
    return {
        "message": "Smart Irrigation API v2.0 is running 🚀",
        "features": [
            "ML-based irrigation prediction",
            "Optimal timing recommendations",
            "Irrigation efficiency analysis",
            "Evapotranspiration risk assessment",
            "Weather integration",
            "MongoDB logging"
        ]
    }


@app.post("/predict")
def predict(data: dict):
    """
    Enhanced irrigation prediction with timing optimization and efficiency analysis
    """
    # Get current time if not provided
    now = datetime.now()
    current_hour = data.get("Hour", now.hour)
    current_month = data.get("Month", now.month)

    # Fetch weather data
    weather = get_weather_data()

    # Fill missing input values with weather data
    temp = data.get("Atmospheric_Temp") or weather["Atmospheric_Temp"] or 30.0
    humidity = data.get("Humidity") or weather["Humidity"] or 50.0
    rainfall = data.get("Rainfall", weather["Rainfall"])

    # Update data dictionary
    data.update({
        "Atmospheric_Temp": temp,
        "Humidity": humidity,
        "Rainfall": rainfall,
        "Hour": current_hour,
        "Month": current_month
    })

    # Get comprehensive irrigation recommendation
    recommendation = get_irrigation_recommendation(
        data.get("Soil_Moisture_Shallow", 0),
        data.get("Soil_Moisture_Deep", 0),
        temp,
        humidity,
        rainfall,
        current_hour,
        current_month
    )

    # Prepare response
    response = {
        "prediction": recommendation["decision"],
        "action_code": recommendation["action"],
        "confidence": recommendation["confidence"],
        "irrigation_needed": recommendation["irrigation_needed"],
        "recommended_amount_liters": recommendation["amount_liters_per_m2"] if recommendation["amount_liters_per_m2"] > 0 else "Not required",

        # Enhanced timing information
        "timing": {
            "current_time_rating": recommendation["efficiency_rating"],
            "current_efficiency": f"{recommendation['current_efficiency']:.1%}",
            "recommendation": recommendation["timing_recommendation"],
            "reasoning": recommendation["reasoning"],
            "optimal_hour": f"{recommendation['optimal_hour']:02d}:00" if recommendation["optimal_hour"] else "N/A"
        },

        # Environmental analysis
        "environmental_analysis": {
            "evapotranspiration_risk": recommendation["evapotranspiration_risk"],
            "risk_level": "Low" if recommendation["evapotranspiration_risk"] < 2 else "Moderate" if recommendation["evapotranspiration_risk"] < 4 else "High",
            "temperature": f"{temp}°C",
            "humidity": f"{humidity}%",
            "rainfall_expected": bool(rainfall)
        },

        # Input data
        "input_data": data,
        "weather_data": weather,
        "timestamp": now.isoformat()
    }

    # Save enhanced prediction to MongoDB
    sensor_collection.insert_one({
        "timestamp": now,
        "prediction_v2": recommendation,
        "response": response,
        "input_data": data,
        "weather_used": weather
    })

    return response


@app.get("/timing-analysis")
def get_timing_analysis():
    """
    Get irrigation timing analysis for the next 24 hours
    """
    now = datetime.now()
    current_month = now.month

    # Get current weather for analysis
    weather = get_weather_data()
    temp = weather.get("Atmospheric_Temp", 30.0)
    humidity = weather.get("Humidity", 50.0)

    timing_analysis = []

    for hour in range(24):
        efficiency = get_irrigation_efficiency(hour, temp, humidity)
        et_risk = max(0, (temp - 20) * 0.1 + (100 - humidity) * 0.05)

        # Determine time period
        if 5 <= hour <= 8:
            period = "Early Morning"
            recommendation = "Optimal"
        elif 18 <= hour <= 21:
            period = "Evening"
            recommendation = "Good"
        elif 9 <= hour <= 17:
            period = "Midday"
            recommendation = "Avoid" if efficiency < 0.5 else "Acceptable"
        else:
            period = "Night"
            recommendation = "Acceptable"

        timing_analysis.append({
            "hour": f"{hour:02d}:00",
            "period": period,
            "efficiency": f"{efficiency:.1%}",
            "recommendation": recommendation,
            "water_savings": f"{(1-efficiency)*100:.0f}% loss" if efficiency < 1 else "Minimal loss"
        })

    return {
        "analysis_date": now.date().isoformat(),
        "conditions": {
            "temperature": f"{temp}°C",
            "humidity": f"{humidity}%",
            "evapotranspiration_risk": et_risk
        },
        "hourly_analysis": timing_analysis,
        "best_times": [
            "05:00-08:00 (Early Morning) - Highest efficiency",
            "18:00-21:00 (Evening) - Good alternative",
            "22:00-04:00 (Night) - Acceptable for urgent needs"
        ],
        "avoid_times": [
            "11:00-16:00 (Midday) - High evaporation losses"
        ]
    }


@app.get("/history")
def get_history(limit: int = 10):
    """
    Get last N predictions from MongoDB
    """
    records = list(sensor_collection.find().sort("_id", -1).limit(limit))
    for r in records:
        r["_id"] = str(r["_id"])
    return records
