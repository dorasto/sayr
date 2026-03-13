import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { IconDownload, IconAlertTriangle } from "@tabler/icons-react";
import { authClient } from "@repo/auth/client";
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard";

interface GenerateBackupCodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function handleDownloadBackupCodes(codes: string[]) {
  const content = codes.join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "backup-codes.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function GenerateBackupCodesDialog({
  open,
  onOpenChange,
}: GenerateBackupCodesDialogProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!password) {
      setError("Password is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await authClient.twoFactor.generateBackupCodes({
        password,
      });
      if (result.error) {
        setError(result.error.message || "Failed to generate backup codes");
        return;
      }
      if (result.data?.backupCodes) {
        setGeneratedCodes(result.data.backupCodes);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setError("");
    setGeneratedCodes([]);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate New Backup Codes</DialogTitle>
          <DialogDescription>
            {generatedCodes.length === 0
              ? "Generating new codes will invalidate your existing ones. Enter your password to continue."
              : "Your new backup codes are below. Save them somewhere safe — each can only be used once."}
          </DialogDescription>
        </DialogHeader>
        {generatedCodes.length === 0 ? (
          <>
            <div className="py-4">
              <Label htmlFor="gen-password">Password</Label>
              <Input
                id="gen-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                className="mt-2"
                placeholder="Enter your password"
              />
              {error && (
                <p className="text-sm text-destructive mt-2">{error}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? "Generating..." : "Generate"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="py-4 flex flex-col gap-4">
              <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5">
                <IconAlertTriangle className="size-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Your previous backup codes are no longer valid.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {generatedCodes.map((code) => (
                  <div
                    key={code}
                    className="p-2 bg-accent rounded text-center select-all"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleDownloadBackupCodes(generatedCodes)}
              >
                <IconDownload className="size-4 mr-1" />
                Download
              </Button>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
