# 🌱 Smart Irrigation Prediction System

A cutting-edge, machine learning-powered irrigation system that optimizes water usage by intelligently predicting the need for and volume of irrigation. It integrates real-time sensor data with a dual-model AI architecture to promote sustainable agriculture and maximize crop yield.

[![IoT](https://img.shields.io/badge/IoT-Sensor%20Network-blue)](https://github.com/Sowdarjya/bladebreakers_iotricity)
[![ML](https://img.shields.io/badge/Machine%20Learning-RandomForest-green)](https://github.com/Sowdarjya/bladebreakers_iotricity)
[![Python](https://img.shields.io/badge/Python-3.8%2B-yellow)](https://github.com/Sowdarjya/bladebreakers_iotricity)

## ✨ Key Features

*   **Dual-Model AI Engine:** Combines a classification model (to decide *if* to irrigate) with a regression model (to calculate *how much* water to use).
*   **Real-Time Optimization:** Processes live sensor data (soil moisture, temperature, humidity, rainfall) to make instant recommendations.
*   **Smart Scheduling:** Recommends the most efficient irrigation windows (e.g., 5-8 AM) and automatically defers watering if rain is expected.
*   **High Accuracy:** Achieves over 95% prediction accuracy using robust Random Forest algorithms.
*   **Water Conservation:** Significantly reduces water waste and operational costs by preventing over-irrigation.

## 🏗️ System Architecture

The system operates on a clear data pipeline:
1.  **Data Collection:** IoT sensors collect environmental data.
2.  **Data Processing:** The raw data is cleaned and prepared for the model.
3.  **AI Prediction:** The pre-trained models generate an irrigation decision and water volume.
4.  **Action & Insight:** The recommendation is executed by the irrigation system and displayed via the API.

## 🚀 Quick Start Guide

### Prerequisites

*   Python 3.8 or higher
*   `pip` (Python package installer)
*   NodeJS

### Installation & Setup

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/Sowdarjya/bladebreakers_iotricity.git
    cd bladebreakers_iotricity
    ```

2.  **Create a Virtual Environment (Recommended)**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  **Install Required Dependencies**
    ```bash
    pip install -r requirements.txt
    ```

## 🖥️ How to Operate / Usage

The core functionality is accessed through the `predict.py` script. This script loads the pre-trained models and generates predictions based on input data.

### 1. Preparing Your Input Data

Create a Python dictionary or a Pandas DataFrame with the following sensor readings and features:

| Feature | Description | Example Value |
| :--- | :--- | :--- |
| `soil_moisture_0` | Shallow soil moisture level | 12.5 |
| `soil_moisture_10` | Mid-level soil moisture level | 15.2 |
| `soil_moisture_20`| Deep soil moisture level | 17.8 |
| `atmospheric_temperature` | Air temperature in °C | 28.0 |
| `atmospheric_humidity` | Air humidity in % | 65.0 |
| `rain` | Rainfall (1 = yes, 0 = no) | 0 |
| `hour` | Hour of the day (0-23) | 6 |
| `month` | Month of the year (1-12) | 7 |

### 2. Running a Prediction

You can run predictions in two ways:

**Option A: Modify the `main()` block in `predict.py`**
Edit the `sample_data` dictionary in `predict.py` with your values and run the script.
```bash
python src/predict.py
```

**Option B: Import the function into another script**
```python
from src.predict import get_irrigation_prediction

# Your sensor data here
my_sensor_data = {
    'soil_moisture_0': 15.0,
    'soil_moisture_10': 18.0,
    'soil_moisture_20': 20.0,
    'atmospheric_temperature': 30.0,
    'atmospheric_humidity': 55.0,
    'rain': 0,
    'hour': 5,
    'month': 6
}

# Get the prediction
prediction = get_irrigation_prediction(my_sensor_data)
print(prediction)
```

### 3. Understanding the Output

The `get_irrigation_prediction()` function returns a detailed Python dictionary:

```python
{
    'irrigation_required': True,  # Boolean: True if irrigation is needed
    'confidence': 0.96,           # Model's confidence in the decision
    'water_quantity_l_per_m2': 2.1, # Recommended water volume in L/m²
    'efficiency_score': 92.5,     # Estimated efficiency of irrigating now (0-100%)
    'recommendation': "Irrigation recommended. Optimal time window. High efficiency score."
}
```
*   Based on the output, you can trigger your irrigation system solenoid valve for the duration required to apply `water_quantity_l_per_m2`.
*   If `irrigation_required` is `False`, the system should not water. The `recommendation` will often provide a reason (e.g., "Rain detected. Irrigation not required.").

## 🔌 Integration with IoT Hardware

This model is designed to be the brain of an IoT setup.
1.  **Microcontroller (e.g., Arduino, ESP32)** reads data from physical sensors in the field.
2.  **Data is sent** (via WiFi/LoRa) to a central server or gateway running this Python code.
3.  **This prediction script** runs on the server, processes the data, and makes a decision.
4.  **The command** (`ON`/`OFF` + `duration`) is sent back to the microcontroller, which activates a water solenoid valve.

## 📊 Model Training (Optional)

The provided models (`*.pkl` files) are pre-trained. If you wish to retrain them with new data:
1.  Place your training data (CSV file) in the project directory.
2.  Refer to the original training scripts (not included in this minimal deployment repo) to preprocess the data and train new Random Forest models.
3.  Save the new models using `joblib` or `pickle` and replace the old `.pkl` files.

## 🛠️ Dependencies

Core dependencies are listed in `requirements.txt`:
*   `scikit-learn` - Machine learning library for the Random Forest models
*   `pandas` - Data manipulation and analysis
*   `numpy` - Numerical computations
*   `joblib` - For loading the pre-trained models

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**💡 Built with ❤️ by the Blade Breakers IoTricity Team.**
