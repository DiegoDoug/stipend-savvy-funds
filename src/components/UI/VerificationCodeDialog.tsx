import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Mail } from "lucide-react";

interface VerificationCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: 'email_change' | 'account_reactivation' | 'account_deletion';
  email: string;
  newEmail?: string;
  onVerified: () => void;
}

export default function VerificationCodeDialog({
  open,
  onOpenChange,
  actionType,
  email,
  newEmail,
  onVerified
}: VerificationCodeDialogProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const { toast } = useToast();

  // Calculate time left
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        toast({
          title: "Code Expired",
          description: "Please request a new verification code.",
          variant: "destructive",
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, toast]);

  // Auto-send code when dialog opens
  useEffect(() => {
    if (open && !expiresAt) {
      handleSendCode();
    }
  }, [open]);

  const handleSendCode = async () => {
    setSendingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-code', {
        body: { 
          actionType, 
          email,
          newEmail 
        }
      });

      if (error) throw error;

      setExpiresAt(new Date(data.expiresAt));
      
      toast({
        title: "Code Sent",
        description: `A verification code has been sent to ${newEmail || email}`,
      });
    } catch (error: any) {
      console.error('Error sending code:', error);
      toast({
        title: "Error",
        description: "Failed to send verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Verify code in database
      const { data: verificationCode, error: fetchError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('user_id', user.id)
        .eq('action_type', actionType)
        .eq('code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!verificationCode) {
        toast({
          title: "Invalid Code",
          description: "The verification code is incorrect or has expired.",
          variant: "destructive",
        });
        return;
      }

      // Mark code as used
      const { error: updateError } = await supabase
        .from('verification_codes')
        .update({ used: true })
        .eq('id', verificationCode.id);

      if (updateError) throw updateError;

      toast({
        title: "Verified",
        description: "Verification successful!",
      });

      onVerified();
      onOpenChange(false);
      setCode("");
    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        title: "Error",
        description: "Verification failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getActionTitle = () => {
    switch (actionType) {
      case 'email_change': return 'Verify Email Change';
      case 'account_reactivation': return 'Verify Account Reactivation';
      case 'account_deletion': return 'Verify Account Deletion';
    }
  };

  const getActionDescription = () => {
    switch (actionType) {
      case 'email_change': 
        return `We've sent a verification code to ${newEmail}. Please enter it below to confirm your email change.`;
      case 'account_reactivation': 
        return `We've sent a verification code to ${email}. Please enter it below to reactivate your account.`;
      case 'account_deletion': 
        return `⚠️ We've sent a verification code to ${email}. This will permanently delete your account and all data.`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield size={20} />
            {getActionTitle()}
          </DialogTitle>
          <DialogDescription className={actionType === 'account_deletion' ? 'text-destructive' : ''}>
            {getActionDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="text-center text-2xl tracking-widest font-mono"
              disabled={loading || timeLeft === 0}
            />
            {expiresAt && timeLeft > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Code expires in {formatTime(timeLeft)}
              </p>
            )}
            {timeLeft === 0 && (
              <p className="text-sm text-destructive text-center">
                Code has expired
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleVerify}
              disabled={loading || code.length !== 6 || timeLeft === 0}
              className={actionType === 'account_deletion' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </Button>

            <Button
              onClick={handleSendCode}
              disabled={sendingCode || (timeLeft > 540)} // Don't allow resend until < 1 min left
              variant="outline"
              className="flex items-center gap-2"
            >
              <Mail size={16} />
              {sendingCode ? 'Sending...' : 'Resend Code'}
            </Button>
          </div>
        </div>

        <DialogFooter className="text-xs text-muted-foreground">
          Didn't receive the code? Check your spam folder or try resending.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
