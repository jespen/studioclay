-- Create log levels enum
DO $$ BEGIN
    CREATE TYPE log_level AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create log entries table
CREATE TABLE IF NOT EXISTS log_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level log_level NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    request_id TEXT,
    source TEXT,
    trace TEXT
);

-- Create indexes for log_entries table
CREATE INDEX IF NOT EXISTS idx_log_entries_level ON log_entries(level);
CREATE INDEX IF NOT EXISTS idx_log_entries_created_at ON log_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_log_entries_metadata ON log_entries USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_log_entries_request_id ON log_entries(request_id);

-- Create function for adding logs
CREATE OR REPLACE FUNCTION log_message(
    p_level log_level,
    p_message TEXT,
    p_metadata JSONB DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL,
    p_source TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO log_entries (
        level,
        message,
        metadata,
        request_id,
        source
    ) VALUES (
        p_level,
        p_message,
        COALESCE(p_metadata, '{}'::jsonb),
        p_request_id,
        p_source
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Create function for debug logs
CREATE OR REPLACE FUNCTION log_debug(
    p_message TEXT,
    p_metadata JSONB DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL,
    p_source TEXT DEFAULT NULL
) RETURNS UUID AS $$
BEGIN
    RETURN log_message('DEBUG', p_message, p_metadata, p_request_id, p_source);
END;
$$ LANGUAGE plpgsql;

-- Create function for info logs
CREATE OR REPLACE FUNCTION log_info(
    p_message TEXT,
    p_metadata JSONB DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL,
    p_source TEXT DEFAULT NULL
) RETURNS UUID AS $$
BEGIN
    RETURN log_message('INFO', p_message, p_metadata, p_request_id, p_source);
END;
$$ LANGUAGE plpgsql;

-- Create function for warning logs
CREATE OR REPLACE FUNCTION log_warn(
    p_message TEXT,
    p_metadata JSONB DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL,
    p_source TEXT DEFAULT NULL
) RETURNS UUID AS $$
BEGIN
    RETURN log_message('WARN', p_message, p_metadata, p_request_id, p_source);
END;
$$ LANGUAGE plpgsql;

-- Create function for error logs
CREATE OR REPLACE FUNCTION log_error(
    p_message TEXT,
    p_metadata JSONB DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL,
    p_source TEXT DEFAULT NULL
) RETURNS UUID AS $$
BEGIN
    RETURN log_message('ERROR', p_message, p_metadata, p_request_id, p_source);
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE log_entries IS 'Central logging table for application events and errors';
COMMENT ON COLUMN log_entries.level IS 'Severity level of the log entry';
COMMENT ON COLUMN log_entries.message IS 'Main log message';
COMMENT ON COLUMN log_entries.metadata IS 'Additional structured data related to the log entry';
COMMENT ON COLUMN log_entries.request_id IS 'Unique identifier for tracking related log entries';
COMMENT ON COLUMN log_entries.source IS 'Source of the log entry (e.g., component name, function)';
COMMENT ON COLUMN log_entries.trace IS 'Stack trace for error logs'; 