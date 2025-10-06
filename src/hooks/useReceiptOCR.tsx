import { useState } from 'react';
import { createWorker } from 'tesseract.js';

interface OCRResult {
  text: string;
  vendor: string | null;
  date: string | null;
  amount: number | null;
}

export function useReceiptOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const extractReceiptData = async (imageData: string): Promise<OCRResult> => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const { data } = await worker.recognize(imageData);
      await worker.terminate();

      const text = data.text;
      const lines = text.split('\n').filter(line => line.trim().length > 0);

      // Extract vendor (first substantial line)
      const vendor = lines.find(line => line.length > 3)?.trim() || null;

      // Extract date (look for common date patterns)
      const dateRegex = /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/;
      const dateMatch = text.match(dateRegex);
      const date = dateMatch ? dateMatch[0] : null;

      // Extract amount (look for TOTAL, AMOUNT, BALANCE followed by a number)
      const amountRegex = /(?:total|amount|balance|sum)[:\s]*\$?\s*(\d+[,.]?\d*\.?\d{2})/i;
      const amountMatch = text.match(amountRegex);
      let amount: number | null = null;
      
      if (amountMatch) {
        const amountStr = amountMatch[1].replace(/,/g, '');
        amount = parseFloat(amountStr);
      } else {
        // Fallback: look for any dollar amount
        const fallbackRegex = /\$\s*(\d+[,.]?\d*\.?\d{2})/;
        const fallbackMatch = text.match(fallbackRegex);
        if (fallbackMatch) {
          const amountStr = fallbackMatch[1].replace(/,/g, '');
          amount = parseFloat(amountStr);
        }
      }

      setIsProcessing(false);
      return { text, vendor, date, amount };
    } catch (error) {
      setIsProcessing(false);
      console.error('OCR Error:', error);
      throw error;
    }
  };

  return {
    extractReceiptData,
    isProcessing,
    progress,
  };
}
