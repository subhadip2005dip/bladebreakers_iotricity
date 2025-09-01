const mqtt = require("mqtt");
const { MongoClient } = require("mongodb");

// ==========================
// CONFIGURATION
// ==========================
const MQTT_BROKER = "mqtt://broker.hivemq.com:1883";
const mqttSensorTopic = "iotricity2_bladebreakers/irrigation/data"; // ESP → Backend
const mqttControlTopic = "iotricity2_bladebreakers/irrigation/control"; // Backend → ESP

const uri =
  "mongodb+srv://Bladebreakers:bladebreakers.123@irrigation.torjqrv.mongodb.net/?retryWrites=true&w=majority&appName=Irrigation";

// Irrigation constants
const BIGHA_AREA_M2 = 1346; // Considering 1 bigha area as 1346 m² (adjust this to your field!)
const PUMP_FLOW_LPM = 100; // Pump flow rate in liters per minute (adjust this to your pump!)

// ==========================
// HELPERS
// ==========================
function calculateDurationSeconds(amountLitersPerM2) {
  const totalLiters = amountLitersPerM2 * BIGHA_AREA_M2;
  const minutes = totalLiters / PUMP_FLOW_LPM;
  return Math.round(minutes * 60); // convert minutes → seconds
}

// ==========================
// MAIN SCRIPT
// ==========================
const mqttClient = mqtt.connect(MQTT_BROKER);
const mongoClient = new MongoClient(uri);

async function run() {
  try {
    await mongoClient.connect();
    console.log("✅ Connected to MongoDB Atlas!");

    const database = mongoClient.db("irrigation");
    const sensorCollection = database.collection("sensor");
    const predictionCollection = database.collection("ai_prediction");

    // ==========================
    // MQTT CONNECTION
    // ==========================
    mqttClient.on("connect", () => {
      console.log("✅ Connected to MQTT Broker");

      mqttClient.subscribe(mqttSensorTopic, (err) => {
        if (!err) {
          console.log(`📡 Subscribed to topic: ${mqttSensorTopic}`);
        }
      });
    });

    // ==========================
    // HANDLE SENSOR DATA (ESP → MQTT → DB)
    // ==========================
    mqttClient.on("message", async (topic, message) => {
      if (topic === mqttSensorTopic) {
        try {
          const data = JSON.parse(message.toString());
          console.log("📥 Received sensor data:", data);

          data.server_received_at = new Date();

          const result = await sensorCollection.insertOne(data);
          console.log(`✅ Sensor data inserted with _id: ${result.insertedId}`);
        } catch (err) {
          console.error("❌ Error processing sensor message:", err);
        }
      }
    });

    // ==========================
    // WATCH AI PREDICTIONS (DB → MQTT → ESP)
    // ==========================
    const changeStream = predictionCollection.watch([
      { $match: { operationType: "insert" } },
    ]);
    console.log("👀 Watching ai_prediction collection for new predictions...");

    changeStream.on("change", (change) => {
      const newPrediction = change.fullDocument;
      console.log("🤖 New AI Prediction received:", newPrediction);

      try {
        // Extract liters/m2 from prediction
        const amountLitersPerM2 =
          newPrediction?.prediction?.amount_liters_per_m2 ||
          newPrediction?.ml_prediction?.recommended_amount_liters;

        const irrigationNeeded =
          newPrediction?.prediction?.irrigation_needed ||
          newPrediction?.ml_prediction?.irrigation_needed;

        if (irrigationNeeded && amountLitersPerM2) {
          const durationSeconds = calculateDurationSeconds(amountLitersPerM2);
          const totalLiters = Math.round(amountLitersPerM2 * BIGHA_AREA_M2);

          const payload = {
            irrigation_needed: true,
            duration: durationSeconds, // ESP will turn relay ON for this time
            area_m2: BIGHA_AREA_M2,
            pump_flow_lpm: PUMP_FLOW_LPM,
            liters_total: totalLiters,
            timestamp: newPrediction.timestamp || new Date(),
          };

          mqttClient.publish(
            mqttControlTopic,
            JSON.stringify(payload),
            { qos: 1 },
            (err) => {
              if (err) {
                console.error("❌ Failed to publish prediction:", err);
              } else {
                console.log(
                  `✅ Published control to ${mqttControlTopic}:`,
                  payload
                );
              }
            }
          );
        } else {
          console.log(
            "⚠️ AI says no irrigation needed or missing liters/m² value."
          );
        }
      } catch (err) {
        console.error("❌ Error handling AI prediction:", err);
      }
    });
  } catch (err) {
    console.error("❌ Error with MongoDB:", err);
    await mongoClient.close();
  }
}

run().catch(console.dir);
