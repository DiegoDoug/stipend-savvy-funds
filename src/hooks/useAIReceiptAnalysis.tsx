import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/errorLogger';

export interface ReceiptItem {
  name: string;
  price: number;
}

export interface AIReceiptData {
  vendor: string | null;
  amount: number | null;
  date: string | null;
  items: ReceiptItem[];
  suggestedCategory: string;
  suggestedDescription: string;
  currency: string;
  confidence: number;
}

export function useAIReceiptAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeReceipt = async (imageData: string): Promise<AIReceiptData | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-receipt', {
        body: { imageData }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to analyze receipt');
      }

      return data.data as AIReceiptData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze receipt';
      setError(errorMessage);
      logError(err, 'useAIReceiptAnalysis:analyzeReceipt');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyzeReceipt,
    isAnalyzing,
    error,
    clearError: () => setError(null)
  };
}
