import { jsPDF } from 'jspdf';

interface TransactionData {
  date: string;
  description: string;
  category: string;
  amount: number;
  type: string;
}

interface BudgetCategoryData {
  category: string;
  allocated: number;
  spent: number;
}

interface RefundData {
  amount: number;
  date: string;
  source: string;
}

interface DashboardData {
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
  recentTransactions: TransactionData[];
  upcomingTransactions: TransactionData[];
  budgetCategories: BudgetCategoryData[];
  nextRefund?: RefundData;
}

// Brand colors
const BRAND_PRIMARY = [45, 212, 191]; // Teal #2DD4BF
const BRAND_DARK = [15, 23, 42]; // Slate-900

export const generateDashboardPDF = async (data: DashboardData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = 20;

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Load logo images
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  try {
    // Try to load logos
    const [logoImg, iconImg] = await Promise.all([
      loadImage('/images/fintrack-logo.png').catch(() => null),
      loadImage('/images/fintrack-icon.png').catch(() => null)
    ]);

    // Header with branding
    if (iconImg) {
      doc.addImage(iconImg, 'PNG', margin, yPos - 5, 12, 12);
    }
    
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.text('FinTrack', iconImg ? margin + 15 : margin, yPos + 5);
    
    yPos += 20;

    // Branded header bar
    doc.setFillColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 1, 'F');
    yPos += 8;

    // Title section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.text('FinTrack — Branded Financial Report', margin, yPos);
    yPos += 10;

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2]);
    doc.text('Financial Report', margin, yPos);
    yPos += 10;

    // Report details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Period: ${data.periodLabel}`, margin, yPos);
    yPos += 5;
    doc.text(`Date Range: ${data.dateRangeText}`, margin, yPos);
    yPos += 5;
    doc.text(`User: ${data.userName}`, margin, yPos);
    yPos += 5;
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })}`, margin, yPos);
    yPos += 12;

    // Separator
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 12;

    // Financial Summary Section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2]);
    doc.text('Financial Summary', margin, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const balanceText = `Available Balance: ${formatCurrency(data.availableBalance)}`;
    const balanceChangeText = `(${data.balanceChange.text})`;
    doc.setTextColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2]);
    doc.text(balanceText, margin, yPos);
    doc.setTextColor(
      data.balanceChange.type === 'positive' ? 34 : data.balanceChange.type === 'negative' ? 239 : 100, 
      data.balanceChange.type === 'positive' ? 197 : data.balanceChange.type === 'negative' ? 68 : 100, 
      data.balanceChange.type === 'positive' ? 94 : data.balanceChange.type === 'negative' ? 68 : 100
    );
    doc.text(balanceChangeText, margin + doc.getTextWidth(balanceText) + 2, yPos);
    yPos += 7;

    doc.setTextColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2]);
    doc.text(`Total Savings: ${formatCurrency(data.totalSavings)}`, margin, yPos);
    yPos += 7;

    const incomeText = `${data.periodLabel} Income: ${formatCurrency(data.periodIncome)}`;
    const incomeChangeText = `(${data.incomeChange.text})`;
    doc.text(incomeText, margin, yPos);
    doc.setTextColor(
      data.incomeChange.type === 'positive' ? 34 : data.incomeChange.type === 'negative' ? 239 : 100, 
      data.incomeChange.type === 'positive' ? 197 : data.incomeChange.type === 'negative' ? 68 : 100, 
      data.incomeChange.type === 'positive' ? 94 : data.incomeChange.type === 'negative' ? 68 : 100
    );
    doc.text(incomeChangeText, margin + doc.getTextWidth(incomeText) + 2, yPos);
    yPos += 14;

    // Budget Status Section
    doc.setTextColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2]);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Budget Status', margin, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const budgetPercentage = data.totalBudget > 0 ? Math.round((data.totalSpent / data.totalBudget) * 100) : 0;
    doc.text(`Spent: ${formatCurrency(data.totalSpent)} / ${formatCurrency(data.totalBudget)} (${budgetPercentage}% used)`, margin, yPos);
    yPos += 8;

    // Budget progress bar with teal branding
    const barWidth = pageWidth - 2 * margin;
    const barHeight = 10;
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(margin, yPos, barWidth, barHeight, 2, 2, 'F');
    
    if (data.totalBudget > 0) {
      const fillWidth = Math.min((data.totalSpent / data.totalBudget) * barWidth, barWidth);
      const fillColor = budgetPercentage >= 90 ? [239, 68, 68] : 
                        budgetPercentage >= 75 ? [251, 191, 36] : 
                        BRAND_PRIMARY;
      doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      doc.roundedRect(margin, yPos, fillWidth, barHeight, 2, 2, 'F');
    }
    yPos += 20;

    // Recent Transactions Section
    if (data.recentTransactions.length > 0) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2]);
      doc.text(`Recent Transactions`, margin, yPos);
      yPos += 10;

      const drawTransactionHeader = () => {
        // Table header with teal background
        doc.setFillColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
        doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, 'F');
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Date', margin + 3, yPos);
        doc.text('Description', margin + 40, yPos);
        doc.text('Category', margin + 100, yPos);
        doc.text('Amount', pageWidth - margin - 25, yPos);
        yPos += 6;
      };

      drawTransactionHeader();

      doc.setFont('helvetica', 'normal');
      let isAlternate = false;
      
      data.recentTransactions.forEach((transaction) => {
        // Check if we need a new page
        if (yPos > pageHeight - 40) {
          addFooter(doc, pageWidth, pageHeight, margin);
          doc.addPage();
          yPos = 25;
          drawTransactionHeader();
          isAlternate = false;
        }
        
        // Alternating row background
        if (isAlternate) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 7, 'F');
        }
        isAlternate = !isAlternate;
        
        doc.setFontSize(9);
        doc.setTextColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2]);
        doc.text(formatDate(transaction.date), margin + 3, yPos);
        doc.text(transaction.description.substring(0, 20), margin + 40, yPos);
        doc.text(transaction.category.substring(0, 12), margin + 100, yPos);
        
        const amountText = formatCurrency(transaction.amount);
        doc.setTextColor(
          transaction.type === 'expense' ? 239 : 34, 
          transaction.type === 'expense' ? 68 : 197, 
          transaction.type === 'expense' ? 68 : 94
        );
        doc.text(transaction.type === 'expense' ? `- ${amountText}` : amountText, pageWidth - margin - 25, yPos);
        yPos += 7;
      });
      yPos += 8;
    }

    // Add footer to last page
    addFooter(doc, pageWidth, pageHeight, margin);

    // Save the PDF
    doc.save(`FinTrack-Report-${new Date().toISOString().split('T')[0]}.pdf`);

  } catch (error) {
    console.error('Error generating PDF:', error);
    // Fallback without images
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.text('FinTrack', margin, yPos + 5);
    doc.save(`FinTrack-Report-${new Date().toISOString().split('T')[0]}.pdf`);
  }
};

// Footer function
const addFooter = (doc: jsPDF, pageWidth: number, pageHeight: number, margin: number) => {
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Generated by FinTrack on ${new Date().toLocaleString('en-US')}`, 
    margin, 
    pageHeight - 10
  );
  
  // Teal accent line at bottom
  doc.setFillColor(45, 212, 191);
  doc.rect(margin, pageHeight - 15, pageWidth - 2 * margin, 1, 'F');
};
