-- =======================================================
-- 🌿 SMART FARM DATABASE - PLANT HEALTH ANALYTICS
-- =======================================================
-- This script creates additional tables for plant health tracking
-- Run this in the Supabase SQL Editor after existing tables

-- 1. Create plant_health_metrics table for calculated health data
CREATE TABLE IF NOT EXISTS plant_health_metrics (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  plant_health_percentage NUMERIC(5,2) NOT NULL CHECK (plant_health_percentage >= 0 AND plant_health_percentage <= 100),
  soil_score NUMERIC(5,2) NOT NULL,
  temperature_score NUMERIC(5,2) NOT NULL,
  humidity_score NUMERIC(5,2) NOT NULL,
  
  -- Reference sensor values used for calculation
  soil_moisture NUMERIC(5,2),
  temperature NUMERIC(5,2),
  humidity NUMERIC(5,2),
  
  -- Health status categories
  health_status TEXT NOT NULL CHECK (health_status IN ('excellent', 'good', 'fair', 'poor', 'critical')),
  
  -- Recommendations and alerts
  recommendations TEXT[],
  alert_level TEXT CHECK (alert_level IN ('none', 'low', 'medium', 'high', 'critical')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_plant_health_device_id ON plant_health_metrics(device_id);
CREATE INDEX IF NOT EXISTS idx_plant_health_created_at ON plant_health_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_plant_health_status ON plant_health_metrics(health_status);
CREATE INDEX IF NOT EXISTS idx_plant_health_alert ON plant_health_metrics(alert_level);

-- 3. Create a view for latest plant health data
CREATE OR REPLACE VIEW latest_plant_health AS
SELECT DISTINCT ON (device_id) 
  device_id,
  plant_health_percentage,
  health_status,
  alert_level,
  recommendations,
  soil_moisture,
  temperature,
  humidity,
  created_at
FROM plant_health_metrics 
ORDER BY device_id, created_at DESC;

-- 4. Create function to calculate health status based on percentage
CREATE OR REPLACE FUNCTION get_health_status(percentage NUMERIC)
RETURNS TEXT AS $$
BEGIN
  CASE
    WHEN percentage >= 90 THEN RETURN 'excellent';
    WHEN percentage >= 75 THEN RETURN 'good';
    WHEN percentage >= 60 THEN RETURN 'fair';
    WHEN percentage >= 40 THEN RETURN 'poor';
    ELSE RETURN 'critical';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to generate recommendations
CREATE OR REPLACE FUNCTION get_plant_recommendations(
  soil_moisture NUMERIC,
  temperature NUMERIC, 
  humidity NUMERIC
) RETURNS TEXT[] AS $$
DECLARE
  recommendations TEXT[] := '{}';
BEGIN
  -- Soil moisture recommendations
  IF soil_moisture < 40 THEN
    recommendations := array_append(recommendations, 'Soil is too dry - increase watering frequency');
  ELSIF soil_moisture > 80 THEN
    recommendations := array_append(recommendations, 'Soil is too wet - reduce watering or improve drainage');
  END IF;
  
  -- Temperature recommendations  
  IF temperature < 20 THEN
    recommendations := array_append(recommendations, 'Temperature is too low - consider heating or moving to warmer location');
  ELSIF temperature > 30 THEN
    recommendations := array_append(recommendations, 'Temperature is too high - increase ventilation or provide shade');
  END IF;
  
  -- Humidity recommendations
  IF humidity < 50 THEN
    recommendations := array_append(recommendations, 'Air humidity is low - consider misting or humidifier');
  ELSIF humidity > 80 THEN
    recommendations := array_append(recommendations, 'Air humidity is high - improve air circulation');
  END IF;
  
  -- If no issues, add positive feedback
  IF array_length(recommendations, 1) IS NULL THEN
    recommendations := array_append(recommendations, 'Plant conditions are optimal - keep up the great work!');
  END IF;
  
  RETURN recommendations;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_plant_health_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_plant_health_updated_at
  BEFORE UPDATE ON plant_health_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_plant_health_updated_at();

-- 7. Insert some example data (optional - remove in production)
INSERT INTO plant_health_metrics (
  device_id, 
  plant_health_percentage,
  soil_score,
  temperature_score,
  humidity_score,
  soil_moisture,
  temperature,
  humidity,
  health_status,
  recommendations,
  alert_level
) VALUES (
  'farm_001',
  75.5,
  80.0,
  90.0,
  60.0,
  65.2,
  24.5,
  58.3,
  get_health_status(75.5),
  get_plant_recommendations(65.2, 24.5, 58.3),
  'none'
);

-- 8. Grant permissions (adjust as needed for your setup)
-- ALTER TABLE plant_health_metrics ENABLE ROW LEVEL SECURITY;
-- GRANT ALL ON plant_health_metrics TO authenticated;
-- GRANT SELECT ON latest_plant_health TO authenticated;

-- =======================================================
-- ✅ PLANT HEALTH ANALYTICS SETUP COMPLETE!
-- =======================================================
-- 
-- New features added:
-- • plant_health_metrics table for storing calculated health data
-- • Automatic health status categorization (excellent/good/fair/poor/critical)
-- • AI-powered recommendations based on sensor readings
-- • Alert levels for proactive monitoring
-- • Performance optimized with proper indexes
-- • Real-time view for latest health data
-- • Auto-updating timestamps
-- 
-- Usage:
-- • Dashboard can now store plant health calculations
-- • Historical health trends can be tracked
-- • Recommendations can be displayed to users
-- • Alert system can notify of plant health issues
-- 
-- =======================================================