-- Add OCR fields to transactions table
ALTER TABLE public.transactions
ADD COLUMN ocr_text TEXT,
ADD COLUMN ocr_vendor TEXT,
ADD COLUMN ocr_amount NUMERIC,
ADD COLUMN ocr_date DATE;