import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateDashboardPDF } from '@/lib/pdfExport';
import { toast } from 'sonner';
import { logError } from '@/lib/errorLogger';

interface ExportPDFButtonProps {
  userName: string;
  periodLabel: string;
  dateRangeText: string;
  availableBalance: number;
  balanceChange: { value: number; text: string; type: 'positive' | 'negative' | 'neutral' };
  totalSavings: number;
  periodIncome: number;
  incomeChange: { value: number; text: string; type: 'positive' | 'negative' | 'neutral' };
  totalBudget: number;
  totalSpent: number;
  recentTransactions: any[];
  upcomingTransactions: any[];
  budgetCategories: any[];
  nextRefund?: {
    amount: number;
    date: string;
    source: string;
  };
}

export default function ExportPDFButton({
  userName,
  periodLabel,
  dateRangeText,
  availableBalance,
  balanceChange,
  totalSavings,
  periodIncome,
  incomeChange,
  totalBudget,
  totalSpent,
  recentTransactions,
  upcomingTransactions,
  budgetCategories,
  nextRefund,
}: ExportPDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      await generateDashboardPDF({
        userName,
        periodLabel,
        dateRangeText,
        availableBalance,
        balanceChange,
        totalSavings,
        periodIncome,
        incomeChange,
        totalBudget,
        totalSpent,
        recentTransactions,
        upcomingTransactions,
        budgetCategories,
        nextRefund,
      });

      toast.success('PDF exported successfully!');
    } catch (error) {
      logError(error, 'ExportPDFButton:handleExport');
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      className="gap-2"
    >
      <FileDown className="h-4 w-4" />
      {isExporting ? 'Exporting...' : 'Export PDF'}
    </Button>
  );
}
