import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { Camera, Upload, RotateCcw, X, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useReceiptOCR } from "@/hooks/useReceiptOCR";
import { Progress } from "@/components/ui/progress";
import { ocrDataSchema, receiptUploadSchema } from "@/lib/validation";
import { logError, getUserFriendlyErrorMessage } from "@/lib/errorLogger";

interface ReceiptScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incomeId: string;
  onReceiptUploaded: () => void;
}

export default function ReceiptScannerModal({
  open,
  onOpenChange,
  incomeId,
  onReceiptUploaded
}: ReceiptScannerModalProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { extractReceiptData, isProcessing, progress } = useReceiptOCR();

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "environment" // Use rear camera on mobile
  };

  const handleCapture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setCapturedImage(imageSrc);
    }
  }, [webcamRef]);

  const handleRetake = () => {
    setCapturedImage(null);
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

  const handleUpload = async () => {
    if (!capturedImage || !user) return;

    setUploading(true);
    try {
      // Run OCR on the image
      toast({
        title: "Processing receipt",
        description: "Extracting data from receipt image...",
      });

      const ocrResult = await extractReceiptData(capturedImage);

      // Convert base64 to blob
      const blob = dataURLtoBlob(capturedImage);
      const fileName = `${user.id}/${incomeId}/${Date.now()}.jpg`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Validate OCR data before storing
      const validatedOCRData = ocrDataSchema.parse({
        text: ocrResult.text?.substring(0, 5000), // Limit text length
        vendor: ocrResult.vendor,
        amount: ocrResult.amount,
        date: ocrResult.date
      });

      // Validate receipt upload data
      receiptUploadSchema.parse({
        transactionId: incomeId,
        filePath: fileName,
        ocrData: validatedOCRData
      });

      // Get signed URL with 1-hour expiration (SECURITY FIX)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('receipts')
        .createSignedUrl(fileName, 3600); // 1 hour expiration

      if (signedUrlError) throw signedUrlError;

      // Store only the file path in the database, not the full URL
      // The signed URL will be regenerated when needed
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          receipt_url: fileName, // Store path, not URL
          ocr_text: validatedOCRData.text,
          ocr_vendor: validatedOCRData.vendor,
          ocr_amount: validatedOCRData.amount,
          ocr_date: validatedOCRData.date
        })
        .eq('id', incomeId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Receipt uploaded",
        description: "Receipt and extracted data saved successfully.",
      });

      onReceiptUploaded();
      onOpenChange(false);
      setCapturedImage(null);
    } catch (error: any) {
      logError(error, 'ReceiptScannerModal.handleUpload');
      
      // Handle validation errors specifically
      if (error?.name === 'ZodError') {
        const firstError = error.errors?.[0];
        toast({
          title: "Validation Error",
          description: firstError?.message || "Receipt data is invalid.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Upload failed",
          description: getUserFriendlyErrorMessage(error),
          variant: "destructive",
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setCapturedImage(null);
    setUseFallback(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Scan Receipt</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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

              <div className="space-y-3">
                {isProcessing && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground text-center">
                      Processing receipt... {progress}%
                    </p>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}
                
                <div className="flex gap-3">
                  <Button 
                    onClick={handleRetake} 
                    variant="outline"
                    className="flex-1"
                    size="lg"
                    disabled={uploading || isProcessing}
                  >
                    <RotateCcw className="mr-2" size={20} />
                    Retake
                  </Button>
                  <Button 
                    onClick={handleUpload} 
                    className="flex-1"
                    size="lg"
                    disabled={uploading || isProcessing}
                  >
                    {uploading || isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        {isProcessing ? 'Processing...' : 'Uploading...'}
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2" size={20} />
                        Upload Receipt
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
