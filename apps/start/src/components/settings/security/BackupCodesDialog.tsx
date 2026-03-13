import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { IconDownload, IconAlertTriangle } from "@tabler/icons-react";
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard";

interface BackupCodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codes: string[];
  /** When true, shows a "save these now" warning — used immediately after 2FA setup */
  isSetup?: boolean;
  onDone?: () => void;
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

export function BackupCodesDialog({
  open,
  onOpenChange,
  codes,
  isSetup = false,
  onDone,
}: BackupCodesDialogProps) {
  const handleClose = () => {
    if (onDone) onDone();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isSetup ? "Save Your Backup Codes" : "Backup Codes"}
          </DialogTitle>
          <DialogDescription>
            {isSetup
              ? "Two-factor authentication is now enabled. Save these backup codes before continuing — you won't be able to see them again."
              : "Save these codes somewhere safe. Each code can only be used once."}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex flex-col gap-4">
          {isSetup && (
            <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5">
              <IconAlertTriangle className="size-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                If you lose access to your authenticator app and don't have
                these codes, you may be locked out of your account.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {codes.map((code) => (
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
          <SimpleClipboard textToCopy={codes.join("\n")} />
          <Button
            variant="outline"
            onClick={() => handleDownloadBackupCodes(codes)}
          >
            <IconDownload className="size-4 mr-1" />
            Download
          </Button>
          <Button onClick={handleClose}>
            {isSetup ? "I've saved my codes" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
