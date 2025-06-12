-- Make branch_id nullable in appointments table
ALTER TABLE appointments 
ALTER COLUMN branch_id DROP NOT NULL;