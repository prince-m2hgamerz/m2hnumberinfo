import { Loader2, CreditCard } from "lucide-react";

interface PaymentLoadingOverlayProps {
  isOpen: boolean;
  credits: number;
  amount: number;
}

export const PaymentLoadingOverlay = ({ isOpen, credits, amount }: PaymentLoadingOverlayProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-xl p-8 shadow-2xl max-w-sm w-full mx-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CreditCard className="w-8 h-8 text-primary animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Opening Payment Gateway</h3>
          <p className="text-sm text-muted-foreground">
            Preparing your order for <span className="font-medium text-foreground">{credits} credits</span> (₹{amount})
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Please wait...</span>
        </div>

        <p className="text-xs text-muted-foreground">
          A new window will open for payment. Don't close this page.
        </p>
      </div>
    </div>
  );
};
