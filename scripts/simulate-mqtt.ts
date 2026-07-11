import * as mqtt from 'mqtt';
import 'dotenv/config';

const BROKER_URL = process.env.MQTT_BROKER_URL ?? 'mqtt://localhost:1883';
const DEVICE_ID = 'ESP32-001';
const TELEMETRY_TOPIC = `agrimotion/device/${DEVICE_ID}/telemetry`;
const STATUS_TOPIC = `agrimotion/device/${DEVICE_ID}/status`;
const INTERVAL_MS = 5000;

function randomFloat(min: number, max: number, decimals = 1): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function generateTelemetry() {
  return {
    deviceId: DEVICE_ID,
    temperature: randomFloat(25, 38),
    humidity: randomFloat(50, 95),
    soilMoisture: randomFloat(20, 80),
    ph: randomFloat(5.5, 7.5),
    nitrogen: randomFloat(200, 500, 0),
    phosphorus: randomFloat(50, 200, 0),
    potassium: randomFloat(100, 400, 0),
    lux: randomFloat(5000, 25000, 0),
  };
}

console.log(`🚀 AGRI-MOTION MQTT Simulator`);
console.log(`📡 Connecting to broker: ${BROKER_URL}`);
console.log(`📤 Telemetry topic: ${TELEMETRY_TOPIC}`);
console.log(`📤 Status topic:    ${STATUS_TOPIC}`);
console.log(`⏱️  Interval: ${INTERVAL_MS / 1000}s\n`);

const client = mqtt.connect(BROKER_URL, {
  clientId: `agrimotion-simulator-${Date.now()}`,
  // Last Will and Testament: broker publishes OFFLINE if simulator disconnects
  will: {
    topic: STATUS_TOPIC,
    payload: Buffer.from('OFFLINE'),
    qos: 1,
    retain: true,
  },
});

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker\n');

  // Publish ONLINE status
  client.publish(STATUS_TOPIC, 'ONLINE', { qos: 1, retain: true }, (err) => {
    if (err) {
      console.error('❌ Failed to publish ONLINE status:', err.message);
    } else {
      console.log(`📡 Status published: ONLINE\n`);
    }
  });

  // Start sending telemetry
  setInterval(() => {
    const data = generateTelemetry();
    const payload = JSON.stringify(data);
    client.publish(TELEMETRY_TOPIC, payload, { qos: 1 }, (err) => {
      if (err) {
        console.error('❌ Publish error:', err.message);
      } else {
        const now = new Date().toLocaleTimeString();
        console.log(`[${now}] Published:`);
        console.log(`  🌡️  Temp: ${data.temperature}°C | 💧 Humidity: ${data.humidity}%`);
        console.log(`  🌱 Soil: ${data.soilMoisture}% | ☀️  Lux: ${data.lux}`);
        console.log(`  🧪 pH: ${data.ph} | N: ${data.nitrogen} P: ${data.phosphorus} K: ${data.potassium}`);
        console.log('');
      }
    });
  }, INTERVAL_MS);
});

client.on('error', (err) => {
  console.error('❌ MQTT error:', err.message);
});

client.on('close', () => {
  console.log('🔌 Disconnected from broker');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down simulator...');
  // Publish OFFLINE before disconnect
  client.publish(STATUS_TOPIC, 'OFFLINE', { qos: 1, retain: true }, () => {
    client.end(false, () => {
      process.exit(0);
    });
  });
});
