import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, DollarSign, Store, FileText, Upload, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import ReceiptScannerModal from "./ReceiptScannerModal";
import ReceiptViewer from "./ReceiptViewer";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  receipt_url?: string;
  ocr_text?: string;
  ocr_vendor?: string;
  ocr_amount?: number;
  ocr_date?: string;
}

interface ExpenseDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Transaction | null;
  onRefresh?: () => void;
}

export default function ExpenseDetailsDialog({
  open,
  onOpenChange,
  expense,
  onRefresh
}: ExpenseDetailsDialogProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [showReceiptViewer, setShowReceiptViewer] = useState(false);

  if (!expense) return null;

  const handleReceiptUploaded = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <>
      <ReceiptScannerModal
        open={showScanner}
        onOpenChange={setShowScanner}
        transactionId={expense.id}
        onReceiptUploaded={handleReceiptUploaded}
        mode="attach"
      />
      
      <ReceiptViewer
        receiptPath={expense.receipt_url || null}
        isOpen={showReceiptViewer}
        onOpenChange={setShowReceiptViewer}
      />
      
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Expense Info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Transaction Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{expense.description}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium capitalize">{expense.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium text-lg">${expense.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(new Date(expense.date), "MMM dd, yyyy")}
                  </p>
                </div>
              </div>
            </div>

            {/* OCR Extracted Data */}
            {(expense.ocr_vendor || expense.ocr_date || expense.ocr_amount) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FileText size={20} />
                    Extracted Receipt Data
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {expense.ocr_vendor && (
                      <div className="flex items-start gap-2">
                        <Store size={18} className="text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Vendor</p>
                          <p className="font-medium">{expense.ocr_vendor}</p>
                        </div>
                      </div>
                    )}
                    {expense.ocr_date && (
                      <div className="flex items-start gap-2">
                        <Calendar size={18} className="text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Receipt Date</p>
                          <p className="font-medium">{expense.ocr_date}</p>
                        </div>
                      </div>
                    )}
                    {expense.ocr_amount && (
                      <div className="flex items-start gap-2">
                        <DollarSign size={18} className="text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Receipt Total</p>
                          <p className="font-medium">${expense.ocr_amount.toFixed(2)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Receipt Image Section */}
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <ImageIcon size={20} />
                Receipt
              </h3>
              
              {expense.receipt_url ? (
                <div className="space-y-3">
                  {/* Inline preview */}
                  <ReceiptViewer
                    receiptPath={expense.receipt_url}
                    inline
                  />
                  
                  {/* Option to upload a new one */}
                  <Button
                    onClick={() => setShowScanner(true)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Upload size={16} className="mr-2" />
                    Replace Receipt
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30">
                  <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No receipt attached</p>
                  <Button
                    onClick={() => setShowScanner(true)}
                    variant="outline"
                  >
                    <Upload size={18} className="mr-2" />
                    Upload Receipt
                  </Button>
                </div>
              )}
            </div>

            {/* Raw OCR Text */}
            {expense.ocr_text && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Raw OCR Text</h3>
                  <div className="bg-muted p-4 rounded-lg max-h-64 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {expense.ocr_text}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
