-- =======================================================
-- 🌿 SMART FARM DATABASE - SENSOR READINGS & MOTION EVENTS SETUP
-- =======================================================
-- Complete database setup for PIR motion sensor and ultrasonic sensor data
-- Run this in the Supabase SQL Editor

-- 1. Create sensor_readings table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL DEFAULT 'farm_001',
  metric VARCHAR(50) NOT NULL, -- 'temperature', 'humidity', 'soil_moisture', 'water_level', 'light_level', 'steam', 'distance', 'motion_detected'
  value DECIMAL(10,4) NOT NULL,
  unit VARCHAR(20) NOT NULL, -- '°C', '%', 'lux', 'cm', 'boolean', etc.
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create motion_events table for detailed motion tracking
CREATE TABLE IF NOT EXISTS motion_events (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL DEFAULT 'farm_001',
  motion_detected BOOLEAN NOT NULL,
  sensor_type VARCHAR(20) DEFAULT 'PIR', -- 'PIR', 'ultrasonic', 'combined'
  distance_cm DECIMAL(6,2) NULL, -- Distance from ultrasonic sensor
  pir_triggered BOOLEAN DEFAULT FALSE, -- Specific PIR sensor trigger
  ultrasonic_triggered BOOLEAN DEFAULT FALSE, -- Specific ultrasonic sensor trigger
  animal_type VARCHAR(50) NULL, -- 'chicken', 'butterfly', 'rabbit', 'bird', 'unknown'
  confidence_score INTEGER DEFAULT 75 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  sensor_data JSONB DEFAULT '{}', -- Additional sensor metadata
  alarm_triggered BOOLEAN DEFAULT FALSE, -- Whether buzzer/LED alarm was activated
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create device_status table for connection monitoring
CREATE TABLE IF NOT EXISTS device_status (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(50) UNIQUE NOT NULL DEFAULT 'farm_001',
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  firmware_version VARCHAR(20) DEFAULT NULL,
  sensor_count INTEGER DEFAULT 0,
  last_motion_detection TIMESTAMPTZ DEFAULT NULL,
  last_distance_reading DECIMAL(6,2) DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_metric 
ON sensor_readings(device_id, metric);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp 
ON sensor_readings(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_motion_events_device_timestamp 
ON motion_events(device_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_motion_events_motion_detected 
ON motion_events(motion_detected) 
WHERE motion_detected = true;

CREATE INDEX IF NOT EXISTS idx_device_status_device_id 
ON device_status(device_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE motion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_status ENABLE ROW LEVEL SECURITY;

-- 6. Create policies for access control
CREATE POLICY "Allow all operations on sensor_readings" 
ON sensor_readings FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on motion_events" 
ON motion_events FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on device_status" 
ON device_status FOR ALL 
USING (true) 
WITH CHECK (true);

-- 7. Create function to update device_status automatically
CREATE OR REPLACE FUNCTION update_device_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update device status when new sensor reading is received
  INSERT INTO device_status (device_id, is_online, last_seen, updated_at)
  VALUES (NEW.device_id, true, NOW(), NOW())
  ON CONFLICT (device_id) 
  DO UPDATE SET 
    is_online = true,
    last_seen = NOW(),
    updated_at = NOW(),
    sensor_count = device_status.sensor_count + 1,
    last_motion_detection = CASE 
      WHEN NEW.metric = 'motion_detected' AND NEW.value = 1 THEN NOW()
      ELSE device_status.last_motion_detection
    END,
    last_distance_reading = CASE 
      WHEN NEW.metric = 'distance' THEN NEW.value
      ELSE device_status.last_distance_reading
    END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to auto-update device status
DROP TRIGGER IF EXISTS update_device_status_trigger ON sensor_readings;
CREATE TRIGGER update_device_status_trigger
  AFTER INSERT ON sensor_readings
  FOR EACH ROW
  EXECUTE FUNCTION update_device_status();

-- 9. Create function to log motion events from sensor readings
CREATE OR REPLACE FUNCTION log_motion_event()
RETURNS TRIGGER AS $$
BEGIN
  -- When motion_detected sensor reading is inserted, create detailed motion event
  IF NEW.metric = 'motion_detected' THEN
    INSERT INTO motion_events (
      device_id, 
      motion_detected, 
      sensor_type, 
      pir_triggered,
      sensor_data,
      timestamp
    )
    VALUES (
      NEW.device_id,
      NEW.value::boolean,
      'PIR',
      NEW.value::boolean,
      jsonb_build_object('sensor_value', NEW.value, 'unit', NEW.unit),
      NEW.timestamp
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to auto-log motion events
DROP TRIGGER IF EXISTS log_motion_event_trigger ON sensor_readings;
CREATE TRIGGER log_motion_event_trigger
  AFTER INSERT ON sensor_readings
  FOR EACH ROW
  EXECUTE FUNCTION log_motion_event();

-- 11. Create view for latest sensor readings by metric
CREATE OR REPLACE VIEW latest_sensor_readings AS
SELECT DISTINCT ON (device_id, metric) 
  device_id,
  metric,
  value,
  unit,
  timestamp
FROM sensor_readings 
ORDER BY device_id, metric, timestamp DESC;

-- 12. Create view for motion detection summary
CREATE OR REPLACE VIEW motion_detection_summary AS
SELECT 
  device_id,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE motion_detected = true) as motion_detected_count,
  COUNT(*) FILTER (WHERE motion_detected = false) as no_motion_count,
  MAX(timestamp) as last_event_time,
  AVG(confidence_score) as avg_confidence,
  ARRAY_AGG(DISTINCT animal_type) FILTER (WHERE animal_type IS NOT NULL) as detected_animals
FROM motion_events 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY device_id;

-- 13. Insert sample data for testing (optional)
INSERT INTO sensor_readings (device_id, metric, value, unit) VALUES
('farm_001', 'temperature', 23.5, '°C'),
('farm_001', 'humidity', 65.2, '%'),
('farm_001', 'soil_moisture', 45.8, '%'),
('farm_001', 'water_level', 78.3, '%'),
('farm_001', 'light_level', 1250, 'lux'),
('farm_001', 'steam', 0, 'level'),
('farm_001', 'distance', 15.6, 'cm'),
('farm_001', 'motion_detected', 0, 'boolean')
ON CONFLICT DO NOTHING;

-- 14. Add comments for documentation
COMMENT ON TABLE sensor_readings IS 'Real-time sensor data from ESP32 including PIR motion and ultrasonic distance sensors';
COMMENT ON TABLE motion_events IS 'Detailed motion detection events with sensor correlation and animal identification';
COMMENT ON TABLE device_status IS 'Device connection and health monitoring';
COMMENT ON VIEW latest_sensor_readings IS 'Latest reading for each sensor metric by device';
COMMENT ON VIEW motion_detection_summary IS 'Motion detection statistics and summary for the last 24 hours';

-- =======================================================
-- ✅ SENSOR DATA & MOTION DETECTION SETUP COMPLETE!
-- =======================================================
-- 
-- Tables created:
-- • sensor_readings: All sensor data (temperature, humidity, distance, motion, etc.)
-- • motion_events: Detailed motion detection with animal identification
-- • device_status: ESP32 connection monitoring and health
-- 
-- Features added:
-- • Automatic device status updates when sensor data received
-- • Motion event logging triggered by PIR sensor readings
-- • Performance optimized with proper indexes
-- • Real-time views for latest readings and motion summaries
-- • Support for both PIR and ultrasonic sensor correlation
-- • Animal type classification and confidence scoring
-- • Alarm triggering status tracking
-- 
-- Data Flow:
-- ESP32 → /api/sensor-data → sensor_readings → (triggers) → motion_events + device_status
-- Frontend ← /api/sensor-readings/latest ← sensor_readings (via views)
-- 
-- =======================================================