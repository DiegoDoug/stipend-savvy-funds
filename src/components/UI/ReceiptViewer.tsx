import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  X, 
  Download, 
  Maximize2,
  Loader2,
  ImageOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface ReceiptViewerProps {
  receiptPath: string | null;
  onClose?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  inline?: boolean; // Show as inline preview vs full dialog
}

export default function ReceiptViewer({
  receiptPath,
  onClose,
  isOpen = false,
  onOpenChange,
  inline = false
}: ReceiptViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      if (!receiptPath) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Get a signed URL for the receipt
        const { data, error: signError } = await supabase.storage
          .from('receipts')
          .createSignedUrl(receiptPath, 3600); // 1 hour expiry

        if (signError) throw signError;
        
        setImageUrl(data.signedUrl);
      } catch (err) {
        console.error('Error loading receipt:', err);
        setError('Failed to load receipt image');
      } finally {
        setLoading(false);
      }
    };

    if (receiptPath) {
      loadImage();
    }
  }, [receiptPath]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const ImageContent = () => (
    <div className="relative flex items-center justify-center min-h-[200px] bg-muted/30 rounded-lg overflow-hidden">
      {loading ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading receipt...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-8 text-destructive">
          <ImageOff className="w-8 h-8" />
          <p className="text-sm">{error}</p>
        </div>
      ) : imageUrl ? (
        <motion.div
          className="relative cursor-grab active:cursor-grabbing"
          drag
          dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
          dragElastic={0.1}
        >
          <motion.img
            src={imageUrl}
            alt="Receipt"
            className="max-w-full max-h-[60vh] object-contain rounded shadow-lg"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease'
            }}
            onDoubleClick={() => setShowFullscreen(true)}
          />
        </motion.div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <ImageOff className="w-8 h-8" />
          <p className="text-sm">No receipt image available</p>
        </div>
      )}
    </div>
  );

  const Controls = ({ compact = false }: { compact?: boolean }) => (
    <div className={`flex items-center ${compact ? 'gap-1' : 'gap-2'} ${compact ? 'justify-center' : 'justify-between'}`}>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomOut}
          disabled={zoom <= 0.5 || !imageUrl}
          className={compact ? 'h-8 w-8' : ''}
        >
          <ZoomOut className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </Button>
        <span className={`${compact ? 'text-xs w-10' : 'text-sm w-14'} text-center font-medium`}>
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomIn}
          disabled={zoom >= 3 || !imageUrl}
          className={compact ? 'h-8 w-8' : ''}
        >
          <ZoomIn className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </Button>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={handleRotate}
          disabled={!imageUrl}
          className={compact ? 'h-8 w-8' : ''}
        >
          <RotateCw className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </Button>
        {!compact && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={handleDownload}
              disabled={!imageUrl}
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFullscreen(true)}
              disabled={!imageUrl}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
      
      {!compact && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={zoom === 1 && rotation === 0}
        >
          Reset
        </Button>
      )}
    </div>
  );

  // Inline preview mode
  if (inline) {
    return (
      <div className="space-y-3">
        <ImageContent />
        {imageUrl && <Controls compact />}
        
        {/* Fullscreen dialog for inline mode */}
        <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
          <DialogContent className="max-w-4xl max-h-[95vh] p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Receipt Image</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFullscreen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <ImageContent />
              <Controls />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Full dialog mode
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Receipt Image</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange?.(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <ImageContent />
          <Controls />
        </div>
      </DialogContent>
    </Dialog>
  );
}
