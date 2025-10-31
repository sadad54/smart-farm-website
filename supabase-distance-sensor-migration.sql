-- Add distance field to existing sensor_readings table for ultrasonic sensor HC-SR04
-- This migration adds support for the ultrasonic distance sensor

-- Add distance column to sensor_readings table
ALTER TABLE sensor_readings 
ADD COLUMN IF NOT EXISTS distance DECIMAL(6,2);

-- Add index for distance queries
CREATE INDEX IF NOT EXISTS idx_sensor_readings_distance 
ON sensor_readings(distance) 
WHERE distance IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN sensor_readings.distance IS 'Distance reading from HC-SR04 ultrasonic sensor in centimeters';

-- Update any existing records to have a default distance value if needed
-- (Optional - only if you want to populate existing records)
-- UPDATE sensor_readings SET distance = NULL WHERE distance IS NULL;