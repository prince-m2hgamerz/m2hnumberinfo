import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Coins, ArrowRight } from "lucide-react";

interface CreditDisplayProps {
  credits: number;
  username: string;
}

export const CreditDisplay = ({ credits, username }: CreditDisplayProps) => {
  return (
    <Card variant="glow" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      <CardHeader className="relative">
        <CardDescription className="flex items-center gap-2">
          <span className="text-muted-foreground">Welcome back,</span>
          <span className="text-foreground font-medium">{username}</span>
        </CardDescription>
        <CardTitle className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center pulse-glow">
            <Coins className="w-6 h-6 text-primary" />
          </div>
          <div>
            <span className="text-4xl font-bold font-mono gradient-text">{credits}</span>
            <span className="text-muted-foreground ml-2">Credits</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <ArrowRight className="w-4 h-4" />
          1 credit = 1 number lookup
        </p>
      </CardContent>
    </Card>
  );
};
