import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { Camera, Upload, RotateCcw, X, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

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

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      // Update transaction with receipt URL
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ receipt_url: publicUrl })
        .eq('id', incomeId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Receipt uploaded",
        description: "Receipt has been successfully attached to this income entry.",
      });

      onReceiptUploaded();
      onOpenChange(false);
      setCapturedImage(null);
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload receipt. Please try again.",
        variant: "destructive",
      });
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

              <div className="flex gap-3">
                <Button 
                  onClick={handleRetake} 
                  variant="outline"
                  className="flex-1"
                  size="lg"
                  disabled={uploading}
                >
                  <RotateCcw className="mr-2" size={20} />
                  Retake
                </Button>
                <Button 
                  onClick={handleUpload} 
                  className="flex-1"
                  size="lg"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2" size={20} />
                      Upload Receipt
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
