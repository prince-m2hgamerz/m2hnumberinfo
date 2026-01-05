import { Card, CardContent } from "@/components/ui/card";
import { Coins } from "lucide-react";

interface CreditDisplayProps {
  credits: number;
  username: string;
}

export const CreditDisplay = ({ credits, username }: CreditDisplayProps) => {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center">
              <Coins className="w-6 h-6 text-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Welcome back, <span className="text-foreground">{username}</span></p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-foreground">{credits}</span>
                <span className="text-muted-foreground">credits</span>
              </div>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-xs text-muted-foreground">1 credit = 1 lookup</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};