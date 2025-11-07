-- Migration to fix MQTT command ID tracking
-- This adds proper MQTT command ID tracking to prevent the integer overflow issue

-- Add mqtt_command_id column to store the MQTT timestamp-based command IDs
ALTER TABLE device_commands 
ADD COLUMN IF NOT EXISTS mqtt_command_id VARCHAR(50) NULL;

-- Create index for MQTT command ID lookups
CREATE INDEX IF NOT EXISTS idx_device_commands_mqtt_command_id ON device_commands(mqtt_command_id);

-- Update existing records to have a placeholder MQTT command ID (optional)
UPDATE device_commands 
SET mqtt_command_id = 'legacy_' || id::text 
WHERE mqtt_command_id IS NULL;

COMMENT ON COLUMN device_commands.mqtt_command_id IS 'MQTT command ID from dashboard for tracking ESP32 acknowledgments';