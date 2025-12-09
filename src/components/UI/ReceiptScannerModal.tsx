import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { Camera, Upload, RotateCcw, Image as ImageIcon, Sparkles, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAIReceiptAnalysis, AIReceiptData } from "@/hooks/useAIReceiptAnalysis";
import { receiptUploadSchema } from "@/lib/validation";
import { logError, getUserFriendlyErrorMessage } from "@/lib/errorLogger";
import ReceiptAnalysisPreview from "./ReceiptAnalysisPreview";
import { AnimatePresence, motion } from "framer-motion";

interface ReceiptScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // For attaching to existing transaction
  transactionId?: string;
  onReceiptUploaded?: () => void;
  // For creating new expense from receipt
  onCreateExpense?: (data: { amount: number; description: string; category: string; date: string }) => void;
  mode?: 'attach' | 'create';
}

export default function ReceiptScannerModal({
  open,
  onOpenChange,
  transactionId,
  onReceiptUploaded,
  onCreateExpense,
  mode = 'attach'
}: ReceiptScannerModalProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIReceiptData | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { analyzeReceipt, isAnalyzing, error: analysisError } = useAIReceiptAnalysis();

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "environment"
  };

  const handleCapture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setCapturedImage(imageSrc);
    }
  }, [webcamRef]);

  const handleRetake = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const dataURLtoBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleAnalyze = async () => {
    if (!capturedImage) return;

    toast({
      title: "Analyzing receipt",
      description: "AI is extracting data from your receipt...",
    });

    const result = await analyzeReceipt(capturedImage);
    
    if (result) {
      setAnalysisResult(result);
      toast({
        title: "Analysis complete",
        description: `Found ${result.vendor || 'receipt'} - $${result.amount?.toFixed(2) || '0.00'}`,
      });
    } else {
      toast({
        title: "Analysis failed",
        description: analysisError || "Could not extract data from receipt. Please try again or enter manually.",
        variant: "destructive",
      });
    }
  };

  const handleUploadToTransaction = async () => {
    if (!capturedImage || !user || !transactionId) return;

    setUploading(true);
    try {
      const blob = dataURLtoBlob(capturedImage);
      const fileName = `${user.id}/${transactionId}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      receiptUploadSchema.parse({
        transactionId,
        filePath: fileName,
      });

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          receipt_url: fileName,
          ocr_vendor: analysisResult?.vendor,
          ocr_amount: analysisResult?.amount,
          ocr_date: analysisResult?.date,
          ocr_text: analysisResult?.suggestedDescription
        })
        .eq('id', transactionId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Receipt uploaded",
        description: "Receipt saved successfully.",
      });

      onReceiptUploaded?.();
      handleClose();
    } catch (error: any) {
      logError(error, 'ReceiptScannerModal.handleUploadToTransaction');
      toast({
        title: "Upload failed",
        description: getUserFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCreateExpenseFromReceipt = (data: { amount: number; description: string; category: string; date: string }) => {
    onCreateExpense?.(data);
    handleClose();
  };

  const handleClose = () => {
    setCapturedImage(null);
    setUseFallback(false);
    setAnalysisResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {mode === 'create' ? 'Scan Receipt to Create Expense' : 'Scan Receipt'}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {analysisResult ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ReceiptAnalysisPreview
                data={analysisResult}
                onCreateExpense={mode === 'create' ? handleCreateExpenseFromReceipt : handleUploadToTransaction as any}
                onCancel={handleRetake}
              />
            </motion.div>
          ) : (
            <motion.div
              key="capture"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {!capturedImage ? (
                <>
                  {!useFallback ? (
                    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        videoConstraints={videoConstraints}
                        className="w-full h-full object-cover"
                        onUserMediaError={() => setUseFallback(true)}
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-4 p-6">
                      <ImageIcon size={48} className="text-muted-foreground" />
                      <p className="text-sm text-muted-foreground text-center">
                        Camera not available. Please upload an image from your gallery.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {!useFallback && (
                      <Button 
                        onClick={handleCapture} 
                        className="flex-1"
                        size="lg"
                      >
                        <Camera className="mr-2" size={20} />
                        Capture Photo
                      </Button>
                    )}
                    <Button 
                      onClick={() => fileInputRef.current?.click()} 
                      variant="outline"
                      className="flex-1"
                      size="lg"
                    >
                      <Upload className="mr-2" size={20} />
                      Upload from Gallery
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={capturedImage} 
                      alt="Captured receipt" 
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      onClick={handleRetake} 
                      variant="outline"
                      className="flex-1"
                      size="lg"
                      disabled={uploading || isAnalyzing}
                    >
                      <RotateCcw className="mr-2" size={20} />
                      Retake
                    </Button>
                    <Button 
                      onClick={handleAnalyze} 
                      className="flex-1"
                      size="lg"
                      disabled={uploading || isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2" size={20} />
                          Analyze with AI
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
