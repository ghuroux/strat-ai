-- Migration 006: Rename focus_area_id to area_id in tasks table
-- This aligns with the Areas rename from Focus Areas

-- Check if the column exists and rename it
DO $$
BEGIN
    -- Rename the column if it exists with old name
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'focus_area_id'
    ) THEN
        ALTER TABLE tasks RENAME COLUMN focus_area_id TO area_id;

        -- Drop old index if exists
        DROP INDEX IF EXISTS idx_tasks_focus_area;

        -- Create new index
        CREATE INDEX IF NOT EXISTS idx_tasks_area ON tasks(area_id) WHERE area_id IS NOT NULL AND deleted_at IS NULL;

        -- Update foreign key constraint to reference areas table
        -- First drop the old constraint
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_focus_area_id_fkey;

        -- Add new constraint referencing areas table
        ALTER TABLE tasks ADD CONSTRAINT tasks_area_id_fkey
            FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL;

        RAISE NOTICE 'Renamed focus_area_id to area_id in tasks table';
    ELSE
        RAISE NOTICE 'Column already named area_id or tasks table does not exist';
    END IF;
END $$;
