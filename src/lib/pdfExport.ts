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
  availableBalance: number;
  balanceChange: { value: number; text: string; type: 'positive' | 'negative' | 'neutral' };
  totalSavings: number;
  monthlyIncome: number;
  incomeChange: { value: number; text: string; type: 'positive' | 'negative' | 'neutral' };
  totalBudget: number;
  totalSpent: number;
  recentTransactions: TransactionData[];
  upcomingTransactions: TransactionData[];
  budgetCategories: BudgetCategoryData[];
  nextRefund?: RefundData;
}

export const generateDashboardPDF = (data: DashboardData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
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

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Report', margin, yPos);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  })}`, margin, yPos + 7);
  doc.text(`User: ${data.userName}`, margin, yPos + 12);
  
  yPos += 25;

  // Draw separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Financial Summary Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Financial Summary', margin, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const balanceText = `Available Balance: ${formatCurrency(data.availableBalance)}`;
  const balanceChangeText = `(${data.balanceChange.text})`;
  doc.text(balanceText, margin, yPos);
  doc.setTextColor(data.balanceChange.type === 'positive' ? 0 : data.balanceChange.type === 'negative' ? 200 : 100, 
                    data.balanceChange.type === 'positive' ? 150 : 0, 0);
  doc.text(balanceChangeText, margin + doc.getTextWidth(balanceText) + 2, yPos);
  yPos += 6;

  doc.setTextColor(0, 0, 0);
  doc.text(`Total Savings: ${formatCurrency(data.totalSavings)}`, margin, yPos);
  yPos += 6;

  const incomeText = `Monthly Income: ${formatCurrency(data.monthlyIncome)}`;
  const incomeChangeText = `(${data.incomeChange.text})`;
  doc.text(incomeText, margin, yPos);
  doc.setTextColor(data.incomeChange.type === 'positive' ? 0 : data.incomeChange.type === 'negative' ? 200 : 100, 
                    data.incomeChange.type === 'positive' ? 150 : 0, 0);
  doc.text(incomeChangeText, margin + doc.getTextWidth(incomeText) + 2, yPos);
  yPos += 12;

  // Budget Status Section
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Budget Status', margin, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const budgetPercentage = data.totalBudget > 0 ? Math.round((data.totalSpent / data.totalBudget) * 100) : 0;
  doc.text(`Spent: ${formatCurrency(data.totalSpent)} / ${formatCurrency(data.totalBudget)} (${budgetPercentage}% used)`, margin, yPos);
  yPos += 6;

  // Budget progress bar
  const barWidth = pageWidth - 2 * margin;
  const barHeight = 8;
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, barWidth, barHeight, 'F');
  
  if (data.totalBudget > 0) {
    const fillWidth = (data.totalSpent / data.totalBudget) * barWidth;
    const fillColor = budgetPercentage >= 90 ? [239, 68, 68] : 
                      budgetPercentage >= 75 ? [251, 191, 36] : 
                      [34, 197, 94];
    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    doc.rect(margin, yPos, Math.min(fillWidth, barWidth), barHeight, 'F');
  }
  yPos += 18;

  // Recent Transactions Section
  if (data.recentTransactions.length > 0) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Transactions', margin, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Date', margin, yPos);
    doc.text('Description', margin + 35, yPos);
    doc.text('Category', margin + 95, yPos);
    doc.text('Amount', pageWidth - margin - 30, yPos);
    yPos += 2;
    
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    data.recentTransactions.slice(0, 5).forEach((transaction) => {
      doc.text(formatDate(transaction.date), margin, yPos);
      doc.text(transaction.description.substring(0, 25), margin + 35, yPos);
      doc.text(transaction.category.substring(0, 15), margin + 95, yPos);
      
      const amountText = formatCurrency(transaction.amount);
      doc.setTextColor(transaction.type === 'expense' ? 200 : 0, transaction.type === 'income' ? 150 : 0, 0);
      doc.text(transaction.type === 'expense' ? `-${amountText}` : amountText, pageWidth - margin - 30, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 5;
    });
    yPos += 8;
  }

  // Check if we need a new page
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  // Upcoming Transactions Section
  if (data.upcomingTransactions.length > 0) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Upcoming Transactions', margin, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Date', margin, yPos);
    doc.text('Description', margin + 35, yPos);
    doc.text('Category', margin + 95, yPos);
    doc.text('Amount', pageWidth - margin - 30, yPos);
    yPos += 2;
    
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    data.upcomingTransactions.slice(0, 5).forEach((transaction) => {
      doc.text(formatDate(transaction.date), margin, yPos);
      doc.text(transaction.description.substring(0, 25), margin + 35, yPos);
      doc.text(transaction.category.substring(0, 15), margin + 95, yPos);
      
      const amountText = formatCurrency(transaction.amount);
      doc.setTextColor(transaction.type === 'expense' ? 200 : 0, transaction.type === 'income' ? 150 : 0, 0);
      doc.text(transaction.type === 'expense' ? `-${amountText}` : amountText, pageWidth - margin - 30, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 5;
    });
    yPos += 8;
  }

  // Next Refund Section
  if (data.nextRefund) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Next Refund', margin, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Amount: ${formatCurrency(data.nextRefund.amount)} from ${data.nextRefund.source}`, margin, yPos);
    yPos += 6;
    doc.text(`Expected: ${formatDate(data.nextRefund.date)}`, margin, yPos);
    yPos += 10;
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated by FinTrack on ${new Date().toLocaleString('en-US')}`, margin, doc.internal.pageSize.getHeight() - 10);

  // Save the PDF
  doc.save(`FinTrack-Report-${new Date().toISOString().split('T')[0]}.pdf`);
};
