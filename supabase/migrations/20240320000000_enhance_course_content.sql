-- Enhance course_templates table with new fields
ALTER TABLE course_templates
ADD COLUMN IF NOT EXISTS short_description TEXT,
ADD COLUMN IF NOT EXISTS learning_objectives TEXT[],
ADD COLUMN IF NOT EXISTS required_equipment TEXT[],
ADD COLUMN IF NOT EXISTS prerequisites TEXT[],
ADD COLUMN IF NOT EXISTS target_audience TEXT,
ADD COLUMN IF NOT EXISTS skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'all_levels')),
ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
ADD COLUMN IF NOT EXISTS additional_notes TEXT;

-- Create course_sections table for structured content
CREATE TABLE IF NOT EXISTS course_sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES course_templates(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    section_type TEXT CHECK (section_type IN ('description', 'schedule', 'materials', 'prerequisites', 'objectives', 'other')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(template_id, order_index)
);

-- Create course_materials table
CREATE TABLE IF NOT EXISTS course_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES course_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT true,
    provided_by_studio BOOLEAN DEFAULT false,
    additional_cost DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create course_reviews table
CREATE TABLE IF NOT EXISTS course_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES course_instances(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enhance course_instances table
ALTER TABLE course_instances
ADD COLUMN IF NOT EXISTS waitlist_capacity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_waitlist INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS session_times JSONB[],
ADD COLUMN IF NOT EXISTS room_details TEXT,
ADD COLUMN IF NOT EXISTS specific_instructions TEXT,
ADD COLUMN IF NOT EXISTS is_fully_booked BOOLEAN DEFAULT false;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_course_sections_updated_at
    BEFORE UPDATE ON course_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_materials_updated_at
    BEFORE UPDATE ON course_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_reviews_updated_at
    BEFORE UPDATE ON course_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_sections_template_id ON course_sections(template_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_template_id ON course_materials(template_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_course_id ON course_reviews(course_id); 