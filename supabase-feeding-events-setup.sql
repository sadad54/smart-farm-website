-- Create feeding_events table for Scenario 1: Intelligent Feeding System
CREATE TABLE IF NOT EXISTS feeding_events (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL DEFAULT 'farm_001',
    feeding_time TIMESTAMPTZ NOT NULL,
    trigger_type VARCHAR(20) NOT NULL CHECK (trigger_type IN ('automatic', 'manual')),
    distance DECIMAL(5,2),
    motion_detected BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_feeding_events_device_timestamp 
ON feeding_events(device_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_feeding_events_trigger_type 
ON feeding_events(trigger_type);

-- Enable Row Level Security (RLS)
ALTER TABLE feeding_events ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (you can restrict this based on your needs)
CREATE POLICY "Allow all operations on feeding_events" 
ON feeding_events FOR ALL 
USING (true) 
WITH CHECK (true);

-- Insert some sample data for testing
INSERT INTO feeding_events (device_id, feeding_time, trigger_type, distance, motion_detected) VALUES
('farm_001', NOW() - INTERVAL '2 hours', 'automatic', 3.5, true),
('farm_001', NOW() - INTERVAL '4 hours', 'manual', null, false),
('farm_001', NOW() - INTERVAL '6 hours', 'automatic', 2.8, true),
('farm_001', NOW() - INTERVAL '8 hours', 'automatic', 4.1, true)
ON CONFLICT DO NOTHING;