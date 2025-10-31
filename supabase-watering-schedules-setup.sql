-- Create watering_schedules table for scheduled watering functionality
CREATE TABLE IF NOT EXISTS watering_schedules (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL DEFAULT 'farm_001',
    name VARCHAR(100) NOT NULL,
    plant_type VARCHAR(50) NOT NULL,
    water_amount_ml INTEGER NOT NULL DEFAULT 250,
    duration_ms INTEGER NOT NULL DEFAULT 3000,
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('once', 'daily', 'weekly', 'custom')),
    scheduled_time TIME NOT NULL,
    scheduled_days INTEGER[] DEFAULT NULL, -- Array of weekdays (1-7, where 1=Monday)
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE DEFAULT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT TRUE,
    last_executed TIMESTAMPTZ DEFAULT NULL,
    next_execution TIMESTAMPTZ DEFAULT NULL,
    execution_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_watering_schedules_device_active 
ON watering_schedules(device_id, is_active);

CREATE INDEX IF NOT EXISTS idx_watering_schedules_next_execution 
ON watering_schedules(next_execution) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_watering_schedules_schedule_type 
ON watering_schedules(schedule_type);

-- Enable Row Level Security (RLS)
ALTER TABLE watering_schedules ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now
CREATE POLICY "Allow all operations on watering_schedules" 
ON watering_schedules FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to calculate next execution time
CREATE OR REPLACE FUNCTION calculate_next_execution(
    p_schedule_type VARCHAR,
    p_scheduled_time TIME,
    p_scheduled_days INTEGER[],
    p_start_date DATE,
    p_end_date DATE,
    p_timezone VARCHAR DEFAULT 'UTC'
) RETURNS TIMESTAMPTZ AS $$
DECLARE
    next_exec TIMESTAMPTZ;
    current_time TIMESTAMPTZ;
    target_date DATE;
    target_datetime TIMESTAMPTZ;
    day_of_week INTEGER;
    days_to_add INTEGER;
    i INTEGER;
BEGIN
    current_time := NOW() AT TIME ZONE p_timezone;
    
    IF p_schedule_type = 'once' THEN
        target_datetime := (p_start_date + p_scheduled_time) AT TIME ZONE p_timezone;
        IF target_datetime > current_time THEN
            RETURN target_datetime;
        ELSE
            RETURN NULL; -- Past execution time
        END IF;
    
    ELSIF p_schedule_type = 'daily' THEN
        target_date := current_time::DATE;
        target_datetime := (target_date + p_scheduled_time) AT TIME ZONE p_timezone;
        
        -- If today's time has passed, schedule for tomorrow
        IF target_datetime <= current_time THEN
            target_date := target_date + 1;
            target_datetime := (target_date + p_scheduled_time) AT TIME ZONE p_timezone;
        END IF;
        
        -- Check if within date range
        IF p_end_date IS NOT NULL AND target_date > p_end_date THEN
            RETURN NULL;
        END IF;
        
        RETURN target_datetime;
    
    ELSIF p_schedule_type = 'weekly' AND p_scheduled_days IS NOT NULL THEN
        target_date := current_time::DATE;
        day_of_week := EXTRACT(DOW FROM target_date); -- 0=Sunday, 1=Monday, etc.
        
        -- Convert to Monday=1 system
        IF day_of_week = 0 THEN
            day_of_week := 7;
        END IF;
        
        -- Find next scheduled day
        days_to_add := NULL;
        
        -- First, check if today is a scheduled day and time hasn't passed
        IF day_of_week = ANY(p_scheduled_days) THEN
            target_datetime := (target_date + p_scheduled_time) AT TIME ZONE p_timezone;
            IF target_datetime > current_time THEN
                days_to_add := 0;
            END IF;
        END IF;
        
        -- If not today, find next scheduled day
        IF days_to_add IS NULL THEN
            FOR i IN 1..7 LOOP
                IF ((day_of_week + i - 1) % 7 + 1) = ANY(p_scheduled_days) THEN
                    days_to_add := i;
                    EXIT;
                END IF;
            END LOOP;
        END IF;
        
        IF days_to_add IS NOT NULL THEN
            target_date := target_date + days_to_add;
            target_datetime := (target_date + p_scheduled_time) AT TIME ZONE p_timezone;
            
            -- Check if within date range
            IF p_end_date IS NOT NULL AND target_date > p_end_date THEN
                RETURN NULL;
            END IF;
            
            RETURN target_datetime;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update next_execution when schedule is created/updated
CREATE OR REPLACE FUNCTION update_next_execution_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.next_execution := calculate_next_execution(
        NEW.schedule_type,
        NEW.scheduled_time,
        NEW.scheduled_days,
        NEW.start_date,
        NEW.end_date,
        NEW.timezone
    );
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_next_execution
    BEFORE INSERT OR UPDATE ON watering_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_next_execution_trigger();

-- Insert sample watering schedules
INSERT INTO watering_schedules (
    name, plant_type, water_amount_ml, duration_ms, 
    schedule_type, scheduled_time, scheduled_days, timezone
) VALUES
    ('Morning Crop Watering', 'main_crops', 500, 5000, 'daily', '07:00:00', NULL, 'UTC'),
    ('Evening Garden Care', 'garden_plants', 300, 3000, 'daily', '18:00:00', NULL, 'UTC'),
    ('Weekly Deep Watering', 'main_crops', 1000, 8000, 'weekly', '06:00:00', ARRAY[1,4], 'UTC'),
    ('Herb Garden Care', 'herbs', 150, 2000, 'weekly', '09:00:00', ARRAY[2,5], 'UTC')
ON CONFLICT DO NOTHING;

-- Create watering_schedule_logs table for execution tracking
CREATE TABLE IF NOT EXISTS watering_schedule_logs (
    id BIGSERIAL PRIMARY KEY,
    schedule_id BIGINT REFERENCES watering_schedules(id) ON DELETE CASCADE,
    device_id VARCHAR(50) NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    water_amount_ml INTEGER,
    duration_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watering_schedule_logs_schedule_id 
ON watering_schedule_logs(schedule_id);

CREATE INDEX IF NOT EXISTS idx_watering_schedule_logs_executed_at 
ON watering_schedule_logs(executed_at DESC);

-- Enable RLS for logs
ALTER TABLE watering_schedule_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on watering_schedule_logs" 
ON watering_schedule_logs FOR ALL 
USING (true) 
WITH CHECK (true);