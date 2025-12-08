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

// Brand colors matching the template
const BRAND_NAVY = [26, 32, 53]; // Dark navy #1A2035
const BRAND_CYAN = [45, 212, 191]; // Teal/Cyan #2DD4BF
const BRAND_PURPLE = [100, 100, 200]; // Purple accent
const BRAND_YELLOW = [234, 179, 8]; // Yellow accent for section bars
const BRAND_LIGHT_BG = [243, 244, 246]; // Light gray background

export const generateDashboardPDF = async (data: DashboardData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = 0;

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
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  // Load icon image
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
    const iconImg = await loadImage('/images/fintrack-icon.png').catch(() => null);

    // ===== HEADER SECTION =====
    const headerHeight = 65;
    
    // Navy background
    doc.setFillColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');
    
    // Decorative corner squares - top left
    doc.setFillColor(100, 100, 180); // Purple
    doc.rect(0, 0, 25, 30, 'F');
    doc.setFillColor(70, 130, 180); // Blue
    doc.rect(25, 0, 20, 20, 'F');
    
    // Decorative corner squares - top right
    doc.setFillColor(240, 230, 200); // Cream
    doc.rect(pageWidth - 40, 0, 40, 25, 'F');
    doc.setFillColor(70, 130, 180); // Blue
    doc.rect(pageWidth - 20, 25, 20, 15, 'F');
    
    // FINTRACK text with gradient effect (simulated with two colors)
    doc.setFontSize(42);
    doc.setFont('helvetica', 'bold');
    // Cyan part "FIN"
    doc.setTextColor(BRAND_CYAN[0], BRAND_CYAN[1], BRAND_CYAN[2]);
    doc.text('FIN', pageWidth / 2 - 45, 30);
    // Transition to purple "TRACK"
    doc.setTextColor(130, 140, 200);
    doc.text('TRACK', pageWidth / 2, 30);
    
    // FINANCIAL REPORT subtitle
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('FINANCIAL REPORT', pageWidth / 2, 50, { align: 'center' });
    
    yPos = headerHeight + 15;

    // ===== REPORT DETAILS =====
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(60, 60, 60);
    doc.text(`Date Range: `, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(data.dateRangeText, margin + 28, yPos);
    yPos += 8;
    
    doc.setFont('helvetica', 'italic');
    doc.text(`User: `, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(data.userName, margin + 12, yPos);
    yPos += 8;
    
    doc.setFont('helvetica', 'italic');
    doc.text(`Generated Date: `, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    }), margin + 38, yPos);
    yPos += 15;

    // ===== FINANCIAL SUMMARY SECTION =====
    const drawSectionHeader = (title: string, y: number) => {
      // Yellow left accent bar
      doc.setFillColor(BRAND_YELLOW[0], BRAND_YELLOW[1], BRAND_YELLOW[2]);
      doc.rect(margin, y, 4, 12, 'F');
      // Navy background
      doc.setFillColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
      doc.rect(margin + 4, y, pageWidth - 2 * margin - 4, 12, 'F');
      // White text
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(title, margin + 10, y + 8);
    };

    drawSectionHeader('FINANCIAL SUMMARY', yPos);
    yPos += 20;

    // 3-column layout for financial summary
    const colWidth = (pageWidth - 2 * margin) / 3;
    
    // Labels
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Available Balance', margin, yPos);
    doc.text('Total Savings', margin + colWidth, yPos);
    doc.text(`${data.periodLabel} Income`, margin + colWidth * 2, yPos);
    yPos += 8;
    
    // Values
    doc.setFont('helvetica', 'normal');
    const balanceText = `${formatCurrency(data.availableBalance)} (${data.balanceChange.text})`;
    const incomeText = `${formatCurrency(data.periodIncome)} (${data.incomeChange.text})`;
    doc.text(balanceText, margin, yPos);
    doc.text(formatCurrency(data.totalSavings), margin + colWidth, yPos);
    doc.text(incomeText, margin + colWidth * 2, yPos);
    yPos += 18;

    // ===== BUDGET STATUS SECTION =====
    drawSectionHeader('BUDGET STATUS', yPos);
    yPos += 20;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    const budgetPercentage = data.totalBudget > 0 ? Math.round((data.totalSpent / data.totalBudget) * 100) : 0;
    doc.text(`Spent: ${formatCurrency(data.totalSpent)} / ${formatCurrency(data.totalBudget)}`, margin, yPos);
    yPos += 8;
    doc.text(`Progress: ${budgetPercentage}%`, margin, yPos);
    yPos += 18;

    // ===== RECENT TRANSACTIONS SECTION =====
    if (data.recentTransactions.length > 0) {
      drawSectionHeader('RECENT TRANSACTIONS', yPos);
      yPos += 18;

      const tableLeft = margin;
      const tableWidth = pageWidth - 2 * margin;
      const colWidths = [tableWidth * 0.2, tableWidth * 0.35, tableWidth * 0.25, tableWidth * 0.2];

      const drawTableHeader = () => {
        // Header row with navy background
        doc.setFillColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
        doc.rect(tableLeft, yPos, tableWidth, 10, 'F');
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        
        let xPos = tableLeft + 3;
        doc.text('Date', xPos, yPos + 7);
        xPos += colWidths[0];
        doc.text('Description', xPos, yPos + 7);
        xPos += colWidths[1];
        doc.text('Category', xPos, yPos + 7);
        xPos += colWidths[2];
        doc.text('Amount', xPos, yPos + 7);
        
        yPos += 10;
      };

      drawTableHeader();

      doc.setFont('helvetica', 'normal');
      
      data.recentTransactions.forEach((transaction, index) => {
        // Check if we need a new page
        if (yPos > pageHeight - 40) {
          addFooter(doc, pageWidth, pageHeight, margin, iconImg);
          doc.addPage();
          yPos = 25;
          drawTableHeader();
        }
        
        const rowHeight = 10;
        
        // Alternating row background
        if (index % 2 === 1) {
          doc.setFillColor(BRAND_LIGHT_BG[0], BRAND_LIGHT_BG[1], BRAND_LIGHT_BG[2]);
          doc.rect(tableLeft, yPos, tableWidth, rowHeight, 'F');
        }
        
        // Draw cell borders
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        let xPos = tableLeft;
        for (let i = 0; i < colWidths.length; i++) {
          doc.rect(xPos, yPos, colWidths[i], rowHeight);
          xPos += colWidths[i];
        }
        
        // Draw cell content
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        xPos = tableLeft + 3;
        doc.text(formatDate(transaction.date), xPos, yPos + 7);
        xPos += colWidths[0];
        doc.text(transaction.description.substring(0, 25), xPos, yPos + 7);
        xPos += colWidths[1];
        doc.text(transaction.category.substring(0, 18), xPos, yPos + 7);
        xPos += colWidths[2];
        
        // Amount with color
        const amountText = transaction.type === 'expense' 
          ? `-${formatCurrency(transaction.amount)}` 
          : formatCurrency(transaction.amount);
        doc.setTextColor(
          transaction.type === 'expense' ? 180 : 40, 
          40, 
          40
        );
        doc.text(amountText, xPos, yPos + 7);
        
        yPos += rowHeight;
      });
    }

    // Add footer to last page
    addFooter(doc, pageWidth, pageHeight, margin, iconImg);

    // Clean up temp file and save
    doc.save(`FinTrack-Report-${new Date().toISOString().split('T')[0]}.pdf`);

  } catch (error) {
    console.error('Error generating PDF:', error);
    // Fallback without images
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_CYAN[0], BRAND_CYAN[1], BRAND_CYAN[2]);
    doc.text('FinTrack', margin, 30);
    doc.save(`FinTrack-Report-${new Date().toISOString().split('T')[0]}.pdf`);
  }
};

// Footer function
const addFooter = (doc: jsPDF, pageWidth: number, pageHeight: number, margin: number, iconImg: HTMLImageElement | null) => {
  // Gray line above footer
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);
  
  // Footer text
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(
    `Generated by FinTrack on ${new Date().toLocaleString('en-US', { 
      month: 'numeric', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })}`, 
    margin, 
    pageHeight - 17
  );
  
  // Icon on the right
  if (iconImg) {
    doc.addImage(iconImg, 'PNG', pageWidth - margin - 20, pageHeight - 30, 20, 20);
  }
};
