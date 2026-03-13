import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@repo/ui/components/input-otp";
import { authClient } from "@repo/auth/client";
import QRCode from "qrcode";

interface TwoFactorSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totpUri: string;
  onVerified: () => void;
}

export function TwoFactorSetupDialog({
  open,
  onOpenChange,
  totpUri,
  onVerified,
}: TwoFactorSetupDialogProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (totpUri) {
      QRCode.toDataURL(totpUri, { width: 200, margin: 2 })
        .then(setQrCodeUrl)
        .catch(console.error);
    }
  }, [totpUri]);

  const getTotpSecret = () => {
    if (!totpUri) return null;
    const match = totpUri.match(/secret=([A-Z0-9]+)/i);
    return match ? match[1] : null;
  };

  const handleVerify = async () => {
    if (code.length < 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await authClient.twoFactor.verifyTotp({ code });
      if (result.error) {
        setError(result.error.message || "Invalid code. Please try again.");
        return;
      }
      setCode("");
      onVerified();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCode("");
      setError("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="md:min-w-xl">
        <DialogHeader>
          <DialogTitle>Set Up Authenticator App</DialogTitle>
          <DialogDescription>
            Scan the QR code with your authenticator app, then enter the 6-digit
            code to confirm.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex flex-col items-center gap-4">
          {qrCodeUrl && (
            <div className="flex flex-col items-center gap-2">
              <img src={qrCodeUrl} alt="2FA QR Code" className="rounded-lg" />
              <p className="text-xs text-muted-foreground">
                Or enter this code manually:
              </p>
              <p className="font-mono text-sm bg-accent px-3 py-1.5 rounded select-all">
                {getTotpSecret()}
              </p>
            </div>
          )}
          <div className="flex flex-col items-center gap-2 w-full">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your app:
            </p>
            <InputOTP
              value={code}
              onChange={(value) => {
                setCode(value);
                setError("");
              }}
              maxLength={6}
              className="gap-2"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={loading || code.length < 6}>
            {loading ? "Verifying..." : "Verify & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
