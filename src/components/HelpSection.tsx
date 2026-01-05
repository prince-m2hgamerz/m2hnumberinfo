import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { HelpCircle, Send, MessageSquare, Clock, CheckCircle, Loader2 } from "lucide-react";

interface HelpRequest {
  id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

interface HelpSectionProps {
  userId: string;
  username: string;
}

export const HelpSection = ({ userId, username }: HelpSectionProps) => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
  }, [userId]);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('help_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error loading help requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both fields.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase
        .from('help_requests')
        .insert({
          user_id: userId,
          username,
          subject: subject.trim(),
          message: message.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setRequests([data, ...requests]);
      setSubject("");
      setMessage("");

      toast({
        title: "Request Submitted",
        description: "We'll respond soon!",
      });
    } catch (error) {
      console.error("Error submitting help request:", error);
      toast({
        title: "Error",
        description: "Failed to submit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning/10 text-warning text-xs">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'replied':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/10 text-success text-xs">
            <CheckCircle className="w-3 h-3" />
            Replied
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs">
            Closed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <HelpCircle className="w-4 h-4" />
          Need Help?
        </CardTitle>
        <CardDescription className="text-sm">Contact support for assistance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Submit Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={100}
          />
          <Textarea
            placeholder="Describe your issue..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={1000}
          />
          <Button type="submit" disabled={sending} size="sm">
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <Send className="w-4 h-4 mr-1.5" />
            )}
            Submit
          </Button>
        </form>

        {/* Previous Requests */}
        {requests.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" />
              Recent Requests
            </p>
            <div className="space-y-2">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-md bg-secondary/30 border border-border space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground text-sm truncate">{req.subject}</p>
                    {getStatusBadge(req.status)}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{req.message}</p>
                  {req.admin_reply && (
                    <div className="mt-2 p-2 rounded-md bg-secondary border border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Reply:</p>
                      <p className="text-sm text-foreground">{req.admin_reply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};