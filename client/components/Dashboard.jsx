import React, { useState, useEffect } from "react";
import {
  Droplets,
  Thermometer,
  Gauge,
  Clock,
  Zap,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Battery,
  RefreshCw,
  TrendingUp,
  CloudRain,
  Sun,
} from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000";

const IrrigationDashboard = () => {
  const [predictionData, setPredictionData] = useState(null);
  const [timingData, setTimingData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch prediction data
      const predictionResponse = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
      });

      if (!predictionResponse.ok) {
        throw new Error(
          `Prediction API error! status: ${predictionResponse.status}`
        );
      }

      const prediction = await predictionResponse.json();
      setPredictionData(prediction);

      // Fetch timing analysis
      try {
        const timingResponse = await fetch(`${API_BASE_URL}/timing-analysis`);
        if (timingResponse.ok) {
          const timing = await timingResponse.json();
          setTimingData(timing);
        }
      } catch (timingError) {
        console.warn("Timing analysis unavailable:", timingError);
      }

      // Fetch recent history
      try {
        const historyResponse = await fetch(`${API_BASE_URL}/history?limit=5`);
        if (historyResponse.ok) {
          const history = await historyResponse.json();
          setHistoryData(history);
        }
      } catch (historyError) {
        console.warn("History data unavailable:", historyError);
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getActionColor = (actionCode) => {
    switch (actionCode) {
      case "IRRIGATE_NOW":
        return "text-green-700 bg-green-100 border-green-300";
      case "SCHEDULE_IRRIGATION":
        return "text-yellow-700 bg-yellow-100 border-yellow-300";
      case "NO_IRRIGATION_RAIN":
        return "text-blue-700 bg-blue-100 border-blue-300";
      case "NO_IRRIGATION_SUFFICIENT":
        return "text-gray-700 bg-gray-100 border-gray-300";
      default:
        return "text-gray-700 bg-gray-100 border-gray-300";
    }
  };

  const getActionIcon = (actionCode) => {
    switch (actionCode) {
      case "IRRIGATE_NOW":
        return <CheckCircle className="w-5 h-5" />;
      case "SCHEDULE_IRRIGATION":
        return <Clock className="w-5 h-5" />;
      case "NO_IRRIGATION_RAIN":
        return <CloudRain className="w-5 h-5" />;
      case "NO_IRRIGATION_SUFFICIENT":
        return <XCircle className="w-5 h-5" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case "Low":
        return "text-green-700 bg-green-100";
      case "Moderate":
        return "text-yellow-700 bg-yellow-100";
      case "High":
        return "text-red-700 bg-red-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  const getEfficiencyColor = (rating) => {
    switch (rating) {
      case "Excellent":
        return "text-green-700 bg-green-100";
      case "Good":
        return "text-blue-700 bg-blue-100";
      case "Fair":
        return "text-yellow-700 bg-yellow-100";
      case "Poor":
        return "text-red-700 bg-red-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  const getRecommendationColor = (recommendation) => {
    switch (recommendation) {
      case "Optimal":
        return "text-green-700 bg-green-100";
      case "Good":
        return "text-blue-700 bg-blue-100";
      case "Acceptable":
        return "text-yellow-700 bg-yellow-100";
      case "Avoid":
        return "text-red-700 bg-red-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  if (loading && !predictionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading irrigation data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !predictionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6 mr-2" />
              <span className="font-semibold">Connection Error</span>
            </div>
            <p>Failed to fetch data: {error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!predictionData) return null;

  // Calculate system status based on available data
  const sensorOnline =
    predictionData.input_data &&
    Object.values(predictionData.input_data).some((val) => val !== null);
  const weatherApiOnline =
    predictionData.environmental_analysis?.temperature &&
    predictionData.environmental_analysis?.humidity;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                <Droplets className="w-8 h-8 text-blue-600 mr-3" />
                Smart Irrigation System
              </h1>
              <p className="text-gray-600 mt-1">
                AI-Powered Irrigation Management Dashboard
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2 mb-2">
                {sensorOnline ? (
                  <Wifi className="w-5 h-5 text-green-600" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-600" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    sensorOnline ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {sensorOnline ? "System Online" : "System Offline"}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Last updated:{" "}
                {lastUpdated ? lastUpdated.toLocaleTimeString() : "Never"}
              </p>
            </div>
          </div>
        </div>

        {/* System Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Gauge
                  className={`w-6 h-6 ${
                    sensorOnline ? "text-green-600" : "text-red-600"
                  }`}
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Sensors
                </span>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  sensorOnline
                    ? "text-green-700 bg-green-100"
                    : "text-red-700 bg-red-100"
                }`}
              >
                {sensorOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CloudRain
                  className={`w-6 h-6 ${
                    weatherApiOnline ? "text-green-600" : "text-red-600"
                  }`}
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Weather API
                </span>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  weatherApiOnline
                    ? "text-green-700 bg-green-100"
                    : "text-red-700 bg-red-100"
                }`}
              >
                {weatherApiOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Zap className="w-6 h-6 text-blue-600" />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  ML Model
                </span>
              </div>
              <span className="px-2 py-1 rounded-full text-xs font-semibold text-green-700 bg-green-100">
                Active
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Confidence
                </span>
              </div>
              <span className="px-2 py-1 rounded-full text-xs font-semibold text-purple-700 bg-purple-100">
                {(predictionData.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Main Decision Card */}
        <div
          className={`bg-white rounded-xl shadow-lg p-6 mb-6 border-l-4 ${getActionColor(
            predictionData.action_code
          )}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {getActionIcon(predictionData.action_code)}
              <div className="ml-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  {predictionData.prediction}
                </h2>
                <p className="text-gray-600 mt-1">
                  Confidence: {(predictionData.confidence * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-700">
                Amount:{" "}
                {predictionData.recommended_amount_liters !== "Not required"
                  ? `${predictionData.recommended_amount_liters} L/m²`
                  : "Not required"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {predictionData.irrigation_needed
                  ? "Irrigation Needed"
                  : "No Irrigation Required"}
              </p>
            </div>
          </div>
        </div>

        {/* Sensor Data and Environmental Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sensor Data Card */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Gauge className="w-6 h-6 text-blue-600 mr-2" />
              Live Sensor Data
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <Droplets className="w-5 h-5 text-blue-600" />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Shallow Soil Moisture
                  </span>
                </div>
                <span className="text-lg font-bold text-blue-600">
                  {predictionData.input_data.Soil_Moisture_Shallow?.toFixed(
                    1
                  ) || "N/A"}
                  %
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                <div className="flex items-center">
                  <Droplets className="w-5 h-5 text-indigo-600" />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Deep Soil Moisture
                  </span>
                </div>
                <span className="text-lg font-bold text-indigo-600">
                  {predictionData.input_data.Soil_Moisture_Deep?.toFixed(1) ||
                    "N/A"}
                  %
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <Thermometer className="w-5 h-5 text-green-600" />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Temperature
                  </span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {predictionData.environmental_analysis.temperature}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-cyan-50 rounded-lg">
                <div className="flex items-center">
                  <Gauge className="w-5 h-5 text-cyan-600" />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Humidity
                  </span>
                </div>
                <span className="text-lg font-bold text-cyan-600">
                  {predictionData.environmental_analysis.humidity}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <CloudRain className="w-5 h-5 text-purple-600" />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Rainfall
                  </span>
                </div>
                <span className="text-lg font-bold text-purple-600">
                  {predictionData.input_data.Rainfall > 0 ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>

          {/* Environmental Analysis Card */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Sun className="w-6 h-6 text-orange-600 mr-2" />
              Environmental Analysis
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Evapotranspiration Risk
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getRiskColor(
                      predictionData.environmental_analysis.risk_level
                    )}`}
                  >
                    {predictionData.environmental_analysis.risk_level}
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-800">
                  {
                    predictionData.environmental_analysis
                      .evapotranspiration_risk
                  }
                </span>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Current Efficiency
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getEfficiencyColor(
                      predictionData.timing.current_time_rating
                    )}`}
                  >
                    {predictionData.timing.current_time_rating}
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-800">
                  {predictionData.timing.current_efficiency}
                </span>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  Rainfall Expected
                </span>
                <div className="flex items-center mt-1">
                  <CloudRain
                    className={`w-4 h-4 mr-1 ${
                      predictionData.environmental_analysis.rainfall_expected
                        ? "text-blue-600"
                        : "text-gray-400"
                    }`}
                  />
                  <span className="text-lg font-bold text-gray-800">
                    {predictionData.environmental_analysis.rainfall_expected
                      ? "Yes"
                      : "No"}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  Current Time
                </span>
                <div className="text-lg font-bold text-gray-800 mt-1">
                  {predictionData.input_data.Hour}:00, Month{" "}
                  {predictionData.input_data.Month}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timing Recommendations Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <Clock className="w-6 h-6 text-purple-600 mr-2" />
            Timing Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">
                  Current Recommendation
                </h4>
                <p className="text-purple-700 font-medium">
                  {predictionData.timing.recommendation}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">
                  Optimal Time
                </h4>
                <p className="text-green-700 font-medium">
                  {predictionData.timing.optimal_hour}
                </p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Reasoning</h4>
              <p className="text-gray-700 text-sm leading-relaxed">
                {predictionData.timing.reasoning}
              </p>
            </div>
          </div>
        </div>

        {/* Timing Analysis Chart */}
        {timingData && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <TrendingUp className="w-6 h-6 text-blue-600 mr-2" />
              24-Hour Efficiency Analysis
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {timingData.hourly_analysis
                .slice(0, 24)
                .map((hourData, index) => (
                  <div
                    key={index}
                    className="p-2 text-center rounded-lg border"
                    style={{
                      backgroundColor:
                        hourData.recommendation === "Optimal"
                          ? "#dcfce7"
                          : hourData.recommendation === "Good"
                          ? "#dbeafe"
                          : hourData.recommendation === "Acceptable"
                          ? "#fef3c7"
                          : "#fecaca",
                    }}
                  >
                    <div className="text-xs font-semibold text-gray-600">
                      {hourData.hour}
                    </div>
                    <div className="text-xs text-gray-800">
                      {hourData.efficiency}
                    </div>
                    <div
                      className={`text-xs px-1 rounded mt-1 ${getRecommendationColor(
                        hourData.recommendation
                      )}`}
                    >
                      {hourData.recommendation}
                    </div>
                  </div>
                ))}
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-1">
                  Best Times
                </h4>
                <ul className="text-sm text-green-700">
                  {timingData.best_times.map((time, index) => (
                    <li key={index}>• {time}</li>
                  ))}
                </ul>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <h4 className="font-semibold text-red-800 mb-1">Avoid Times</h4>
                <ul className="text-sm text-red-700">
                  {timingData.avoid_times.map((time, index) => (
                    <li key={index}>• {time}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Recent History */}
        {historyData && historyData.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Calendar className="w-6 h-6 text-gray-600 mr-2" />
              Recent Sensor History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Shallow Moisture</th>
                    <th className="text-left p-2">Deep Moisture</th>
                    <th className="text-left p-2">Temperature</th>
                    <th className="text-left p-2">Humidity</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.slice(0, 5).map((record, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">
                        {record.Hour ? `${record.Hour}:00` : "N/A"}
                      </td>
                      <td className="p-2">
                        {record.Soil_Moisture_Shallow
                          ? `${record.Soil_Moisture_Shallow}%`
                          : "N/A"}
                      </td>
                      <td className="p-2">
                        {record.Soil_Moisture_Deep
                          ? `${record.Soil_Moisture_Deep}%`
                          : "N/A"}
                      </td>
                      <td className="p-2">
                        {record.Atmospheric_Temp
                          ? `${record.Atmospheric_Temp}°C`
                          : "N/A"}
                      </td>
                      <td className="p-2">
                        {record.Humidity ? `${record.Humidity}%` : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin w-4 h-4 mr-2" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IrrigationDashboard;
