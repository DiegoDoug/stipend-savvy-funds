import { jsPDF } from "jspdf";
import sagetrackIcon from "@/assets/sagetrack-icon.png";

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
  balanceChange: { value: number; text: string; type: "positive" | "negative" | "neutral" };
  totalSavings: number;
  periodIncome: number;
  incomeChange: { value: number; text: string; type: "positive" | "negative" | "neutral" };
  totalBudget: number;
  totalSpent: number;
  recentTransactions: TransactionData[];
  upcomingTransactions: TransactionData[];
  budgetCategories: BudgetCategoryData[];
  nextRefund?: RefundData;
}

// Exact colors from the template
const BRAND_BLUE = [21, 130, 199]; // #1582C7 - main blue
const BRAND_TEAL = [44, 183, 185]; // #2CB7B9 - teal gradient
const TEXT_DARK = [0, 0, 0]; // Black text
const TEXT_GRAY = [80, 80, 80]; // Gray text
const LIGHT_GRAY = [245, 245, 245]; // Light background

// Helper to load image as base64
const loadImageAsBase64 = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } else {
        reject(new Error("Could not get canvas context"));
      }
    };
    img.onerror = reject;
    img.src = src;
  });
};

export const generateDashboardPDF = async (data: DashboardData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = 0;

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  // ===== HEADER WITH GRADIENT BACKGROUND =====
  const headerHeight = 50;

  // Create gradient effect with rectangles (blue to teal)
  for (let i = 0; i < headerHeight; i++) {
    const ratio = i / headerHeight;
    const r = BRAND_BLUE[0] + (BRAND_TEAL[0] - BRAND_BLUE[0]) * ratio;
    const g = BRAND_BLUE[1] + (BRAND_TEAL[1] - BRAND_BLUE[1]) * ratio;
    const b = BRAND_BLUE[2] + (BRAND_TEAL[2] - BRAND_BLUE[2]) * ratio;
    doc.setFillColor(r, g, b);
    doc.rect(0, i, pageWidth, 1, "F");
  }

  // Add SageTrack logo
  try {
    const logoBase64 = await loadImageAsBase64(sagetrackIcon);
    doc.addImage(logoBase64, "PNG", margin, 10, 30, 30);
  } catch (e) {
    // Fallback: draw placeholder if logo fails to load
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, 12, 26, 26, 3, 3, "F");
    doc.setFillColor(BRAND_BLUE[0], BRAND_BLUE[1], BRAND_BLUE[2]);
    doc.rect(margin + 6, 18, 4, 14, "F");
    doc.rect(margin + 6, 18, 10, 4, "F");
    doc.rect(margin + 6, 24, 7, 3, "F");
  }

  // FINANCIAL REPORT title
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("FINANCIAL REPORT", margin + 38, 32);

  yPos = headerHeight + 15;

  // ===== REPORT METADATA =====
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);

  doc.text(`Date Range: ${data.dateRangeText}`, margin, yPos);
  yPos += 6;
  doc.text(`User: ${data.userName}`, margin, yPos);
  yPos += 6;
  doc.text(
    `Generated Date: ${new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}`,
    margin,
    yPos,
  );
  yPos += 15;

  // ===== SECTION HEADER HELPER =====
  const drawSectionHeader = (title: string, y: number) => {
    doc.setFillColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
    doc.rect(margin - 5, y - 5, pageWidth - 2 * margin + 10, 10, "F");

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(title, margin, y);

    return y + 12;
  };

  // ===== FINANCIAL SUMMARY =====
  yPos = drawSectionHeader("Financial Summary", yPos);

  // Draw info boxes with borders
  const boxWidth = (pageWidth - 2 * margin - 10) / 3;
  const boxHeight = 22;
  const boxY = yPos;

  // Box 1: Available Balance
  doc.setDrawColor(BRAND_BLUE[0], BRAND_BLUE[1], BRAND_BLUE[2]);
  doc.setLineWidth(0.5);
  doc.rect(margin, boxY, boxWidth, boxHeight);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
  doc.text("Available Balance", margin + 3, boxY + 7);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(formatCurrency(data.availableBalance), margin + 3, boxY + 14);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(34, 197, 94); // Green for positive
  doc.text(`(${data.balanceChange.text})`, margin + 3, boxY + 19);

  // Box 2: Total Savings
  doc.setDrawColor(BRAND_BLUE[0], BRAND_BLUE[1], BRAND_BLUE[2]);
  doc.rect(margin + boxWidth + 5, boxY, boxWidth, boxHeight);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
  doc.text("Total Savings", margin + boxWidth + 8, boxY + 7);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(formatCurrency(data.totalSavings), margin + boxWidth + 8, boxY + 14);

  // Box 3: Period Income
  doc.setDrawColor(BRAND_BLUE[0], BRAND_BLUE[1], BRAND_BLUE[2]);
  doc.rect(margin + 2 * boxWidth + 10, boxY, boxWidth, boxHeight);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
  doc.text(`${data.periodLabel} Income`, margin + 2 * boxWidth + 13, boxY + 7);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(formatCurrency(data.periodIncome), margin + 2 * boxWidth + 13, boxY + 14);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(34, 197, 94); // Green for positive
  doc.text(`(${data.incomeChange.text})`, margin + 2 * boxWidth + 13, boxY + 19);

  yPos = boxY + boxHeight + 15;

  // ===== BUDGET STATUS =====
  yPos = drawSectionHeader("Budget Status", yPos);

  const budgetPercentage = data.totalBudget > 0 ? Math.round((data.totalSpent / data.totalBudget) * 100) : 0;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(`Spent: ${formatCurrency(data.totalSpent)} / ${formatCurrency(data.totalBudget)}`, margin, yPos);
  yPos += 7;
  doc.text(`Progress: ${budgetPercentage}%`, margin, yPos);
  yPos += 15;

  // ===== RECENT TRANSACTIONS TABLE =====
  if (data.recentTransactions.length > 0) {
    yPos = drawSectionHeader("Recent Transactions", yPos);

    const tableLeft = margin;
    const tableWidth = pageWidth - 2 * margin;
    const colWidths = [tableWidth * 0.2, tableWidth * 0.4, tableWidth * 0.22, tableWidth * 0.18];

    // Table header
    doc.setFillColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
    doc.rect(tableLeft, yPos, tableWidth, 8, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);

    let xPos = tableLeft + 2;
    doc.text("Date", xPos, yPos + 5.5);
    xPos += colWidths[0];
    doc.text("Description", xPos, yPos + 5.5);
    xPos += colWidths[1];
    doc.text("Category", xPos, yPos + 5.5);
    xPos += colWidths[2];
    doc.text("Amount", xPos, yPos + 5.5);

    yPos += 8;

    // Draw table rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    data.recentTransactions.forEach((transaction, index) => {
      // Check if we need a new page
      if (yPos > pageHeight - 40) {
        addFooter(doc, pageWidth, pageHeight, margin);
        doc.addPage();
        yPos = 25;
      }

      const rowHeight = 8;

      // Alternating row background
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(tableLeft, yPos, tableWidth, rowHeight, "F");
      }

      // Draw horizontal line
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.3);
      doc.line(tableLeft, yPos, tableLeft + tableWidth, yPos);

      // Draw cell content
      doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
      xPos = tableLeft + 2;
      doc.text(formatDate(transaction.date), xPos, yPos + 5.5);
      xPos += colWidths[0];
      doc.text(transaction.description.substring(0, 30), xPos, yPos + 5.5);
      xPos += colWidths[1];
      doc.text(transaction.category.substring(0, 18), xPos, yPos + 5.5);
      xPos += colWidths[2];

      // Amount with color coding
      const amountText =
        transaction.type === "expense" ? `-${formatCurrency(transaction.amount)}` : formatCurrency(transaction.amount);
      doc.setTextColor(
        transaction.type === "expense" ? 220 : 34,
        transaction.type === "expense" ? 38 : 197,
        transaction.type === "expense" ? 38 : 94,
      );
      doc.text(amountText, xPos, yPos + 5.5);

      yPos += rowHeight;
    });

    // Bottom border of table
    doc.setDrawColor(230, 230, 230);
    doc.line(tableLeft, yPos, tableLeft + tableWidth, yPos);
  }

  // Add footer
  addFooter(doc, pageWidth, pageHeight, margin);

  // Save the PDF
  doc.save(`SageTrack-Financial-Report-${new Date().toISOString().split("T")[0]}.pdf`);
};

// Footer function
const addFooter = (doc: jsPDF, pageWidth: number, pageHeight: number, margin: number) => {
  const footerY = pageHeight - 20;

  // Footer line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  // Footer text
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);

  const footerText = `Generated by SageTrack on ${new Date().toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })}`;

  doc.text(footerText, pageWidth / 2, footerY + 8, { align: "center" });
};
