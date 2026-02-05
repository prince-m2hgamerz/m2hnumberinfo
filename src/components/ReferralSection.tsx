import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Copy, Users, Loader2, Check, AlertCircle } from "lucide-react";

interface ReferralSectionProps {
  userId: string;
  username: string;
  onCreditsAdded?: (credits: number) => void;
}

interface Referral {
  id: string;
  referral_code: string;
  referred_user_id: string | null;
  referrer_user_id: string;
  bonus_credits_awarded: boolean;
  created_at: string;
  used_at: string | null;
}

export const ReferralSection = ({ userId, username, onCreditsAdded }: ReferralSectionProps) => {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [hasUsedReferral, setHasUsedReferral] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadReferralData();
  }, [userId]);

  const loadReferralData = async () => {
    try {
      // Get user's referral code
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('referral_code')
        .eq('id', userId)
        .single();

      if (userError) throw userError;
      setReferralCode(userData?.referral_code || null);

      // Get referrals made by this user (where they are the referrer)
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_user_id', userId)
        .order('created_at', { ascending: false });

      if (referralsError) throw referralsError;
      setReferrals(referralsData || []);

      // Check if user has already used a referral code (they are the referred user)
      const { data: usedReferral, error: usedError } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_user_id', userId)
        .maybeSingle();

      if (!usedError && usedReferral) {
        setHasUsedReferral(true);
      }
    } catch (error) {
      console.error("Error loading referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = async () => {
    setGenerating(true);
    try {
      // Sanitize username - only alphanumeric
      const safeUsername = username.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4) || 'USER';
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = `${safeUsername}${randomPart}`;

      // Check if code already exists
      const { data: existingCode } = await supabase
        .from('referrals')
        .select('id')
        .eq('referral_code', code)
        .maybeSingle();

      if (existingCode) {
        // Generate a new code if this one exists
        toast({
          title: "Please try again",
          description: "Code collision, generating a new one.",
          variant: "destructive",
        });
        setGenerating(false);
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ referral_code: code })
        .eq('id', userId);

      if (error) throw error;

      // Create referral entry (this is the "template" for this code)
      const { error: refError } = await supabase
        .from('referrals')
        .insert({
          referrer_user_id: userId,
          referral_code: code,
        });

      if (refError) throw refError;

      setReferralCode(code);
      toast({
        title: "Referral Code Generated",
        description: "Share this code with friends to earn bonus credits!",
      });

      loadReferralData();
    } catch (error) {
      console.error("Error generating referral code:", error);
      toast({
        title: "Error",
        description: "Failed to generate referral code",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy code",
        variant: "destructive",
      });
    }
  };

  const applyReferralCode = async () => {
    // Validate input
    const trimmedCode = applyCode.trim();
    if (!trimmedCode) {
      toast({
        title: "Invalid Code",
        description: "Please enter a referral code.",
        variant: "destructive",
      });
      return;
    }

    // Sanitize input - only alphanumeric
    const sanitizedCode = trimmedCode.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (sanitizedCode.length < 6 || sanitizedCode.length > 20) {
      toast({
        title: "Invalid Code",
        description: "Referral code must be 6-20 alphanumeric characters.",
        variant: "destructive",
      });
      return;
    }

    // Check if user has already used a referral
    if (hasUsedReferral) {
      toast({
        title: "Already Used",
        description: "You have already used a referral code.",
        variant: "destructive",
      });
      return;
    }

    setApplying(true);
    try {
      // Call edge function to apply referral (uses service role to bypass RLS)
      const { data, error } = await supabase.functions.invoke('apply-referral', {
        body: { userId, referralCode: sanitizedCode },
      });

      if (error) throw error;

      if (!data?.success) {
        toast({
          title: "Error",
          description: data?.error || "Failed to apply referral code.",
          variant: "destructive",
        });
        return;
      }

      onCreditsAdded?.(data.bonusCredits);

      toast({
        title: "Referral Applied!",
        description: `You received ${data.bonusCredits} bonus credits!`,
      });

      setApplyCode("");
      setHasUsedReferral(true);
      loadReferralData();
    } catch (error) {
      console.error("Error applying referral code:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to apply referral code. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  const usedReferrals = referrals.filter(r => r.referred_user_id !== null);

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="w-4 h-4" />
          Referral Program
        </CardTitle>
        <CardDescription>Share your code and earn bonus credits!</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Your Referral Code */}
        <div className="p-4 rounded-lg bg-secondary/30 border border-border">
          <h4 className="text-sm font-medium text-foreground mb-3">Your Referral Code</h4>
          {referralCode ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 rounded-md bg-background font-mono text-lg text-center tracking-wider">
                {referralCode}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                className="shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          ) : (
            <Button onClick={generateReferralCode} disabled={generating} className="w-full">
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Gift className="w-4 h-4 mr-2" />
              )}
              Generate Your Code
            </Button>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Share this code with friends. You both get 2 bonus credits!
          </p>
        </div>

        {/* Apply Referral Code */}
        {hasUsedReferral ? (
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Check className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">You've already used a referral code</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Have a referral code?</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Enter referral code"
                value={applyCode}
                onChange={(e) => setApplyCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                className="font-mono tracking-wider uppercase"
                maxLength={20}
              />
              <Button onClick={applyReferralCode} disabled={applying}>
                {applying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              You can only use one referral code per account.
            </p>
          </div>
        )}

        {/* Referral Stats */}
        {usedReferrals.length > 0 && (
          <div className="p-4 rounded-lg bg-success/10 border border-success/30">
            <div className="flex items-center gap-2 text-success">
              <Users className="w-4 h-4" />
              <span className="font-medium">
                {usedReferrals.length} friend{usedReferrals.length !== 1 ? 's' : ''} joined using your code!
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              You've earned {usedReferrals.length * 2} bonus credits from referrals.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
