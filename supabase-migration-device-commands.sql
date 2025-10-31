-- Create device_commands table for ESP32 cloud communication
CREATE TABLE IF NOT EXISTS device_commands (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL DEFAULT 'farm_001',
    command JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_device_commands_device_id ON device_commands(device_id);
CREATE INDEX IF NOT EXISTS idx_device_commands_status ON device_commands(status);
CREATE INDEX IF NOT EXISTS idx_device_commands_created_at ON device_commands(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE device_commands ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed for production)
CREATE POLICY "Allow all operations on device_commands" ON device_commands
    FOR ALL USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_device_commands_updated_at ON device_commands;
CREATE TRIGGER update_device_commands_updated_at
    BEFORE UPDATE ON device_commands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample command for testing (optional)
-- INSERT INTO device_commands (device_id, command, status) 
-- VALUES ('farm_001', '{"action": "light", "duration_ms": 3000}', 'pending');

COMMENT ON TABLE device_commands IS 'Command queue for ESP32 devices to poll and execute';
COMMENT ON COLUMN device_commands.command IS 'JSON object containing action and parameters';
COMMENT ON COLUMN device_commands.status IS 'Command status: pending, completed, failed, expired';