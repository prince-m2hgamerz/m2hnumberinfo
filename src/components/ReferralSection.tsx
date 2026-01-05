import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Copy, Users, Loader2, Check } from "lucide-react";

interface ReferralSectionProps {
  userId: string;
  username: string;
}

interface Referral {
  id: string;
  referral_code: string;
  referred_user_id: string | null;
  bonus_credits_awarded: boolean;
  created_at: string;
  used_at: string | null;
}

export const ReferralSection = ({ userId, username }: ReferralSectionProps) => {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);
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

      // Get referrals made by this user
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_user_id', userId)
        .order('created_at', { ascending: false });

      if (referralsError) throw referralsError;
      setReferrals(referralsData || []);
    } catch (error) {
      console.error("Error loading referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = async () => {
    setGenerating(true);
    try {
      // Generate a unique code
      const code = `${username.toUpperCase().slice(0, 4)}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const { error } = await supabase
        .from('users')
        .update({ referral_code: code })
        .eq('id', userId);

      if (error) throw error;

      // Create referral entry
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
    if (!applyCode.trim()) {
      toast({
        title: "Invalid Code",
        description: "Please enter a referral code.",
        variant: "destructive",
      });
      return;
    }

    // Sanitize input
    const sanitizedCode = applyCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (sanitizedCode.length < 6 || sanitizedCode.length > 20) {
      toast({
        title: "Invalid Code",
        description: "Referral code must be 6-20 characters.",
        variant: "destructive",
      });
      return;
    }

    setApplying(true);
    try {
      // Check if code exists and is not the user's own code
      const { data: referral, error: refError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referral_code', sanitizedCode)
        .is('referred_user_id', null)
        .maybeSingle();

      if (refError) throw refError;

      if (!referral) {
        toast({
          title: "Invalid Code",
          description: "This code is invalid or has already been used.",
          variant: "destructive",
        });
        setApplying(false);
        return;
      }

      if (referral.referrer_user_id === userId) {
        toast({
          title: "Invalid Code",
          description: "You cannot use your own referral code.",
          variant: "destructive",
        });
        setApplying(false);
        return;
      }

      // Update referral with referred user
      const { error: updateError } = await supabase
        .from('referrals')
        .update({
          referred_user_id: userId,
          used_at: new Date().toISOString(),
        })
        .eq('id', referral.id);

      if (updateError) throw updateError;

      // Add bonus credits to both users (2 credits each)
      const BONUS_CREDITS = 2;

      // Add to referrer
      const { data: referrerData } = await supabase
        .from('users')
        .select('credits')
        .eq('id', referral.referrer_user_id)
        .single();

      if (referrerData) {
        await supabase
          .from('users')
          .update({ credits: referrerData.credits + BONUS_CREDITS })
          .eq('id', referral.referrer_user_id);
      }

      // Add to referred user
      const { data: referredData } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      if (referredData) {
        await supabase
          .from('users')
          .update({ credits: referredData.credits + BONUS_CREDITS })
          .eq('id', userId);
      }

      // Mark bonus as awarded
      await supabase
        .from('referrals')
        .update({ bonus_credits_awarded: true })
        .eq('id', referral.id);

      toast({
        title: "Referral Applied!",
        description: `You received ${BONUS_CREDITS} bonus credits!`,
      });

      setApplyCode("");
    } catch (error) {
      console.error("Error applying referral code:", error);
      toast({
        title: "Error",
        description: "Failed to apply referral code",
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
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Have a referral code?</h4>
          <div className="flex gap-2">
            <Input
              placeholder="Enter referral code"
              value={applyCode}
              onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
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
        </div>

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
