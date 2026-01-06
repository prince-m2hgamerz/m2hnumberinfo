import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Mail, 
  MessageSquare, 
  Reply, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  User,
  Calendar,
  Loader2,
  RefreshCw,
  Eye
} from "lucide-react";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const ContactSubmissions = () => {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error("Error loading contact submissions:", error);
      toast.error("Failed to load contact submissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const handleUpdateStatus = async (id: string, status: string, notes?: string) => {
    setSaving(true);
    try {
      const updateData: { status: string; admin_notes?: string } = { status };
      if (notes !== undefined) {
        updateData.admin_notes = notes;
      }

      const { error } = await supabase
        .from('contact_submissions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setSubmissions(submissions.map(s => 
        s.id === id ? { ...s, status, admin_notes: notes || s.admin_notes } : s
      ));

      toast.success(`Status updated to ${status}`);
      setSelectedSubmission(null);
      setAdminNotes("");
    } catch (error) {
      console.error("Error updating submission:", error);
      toast.error("Failed to update submission");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
            <AlertCircle className="w-3 h-3" />New
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-warning/10 text-warning text-xs">
            <Clock className="w-3 h-3" />In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs">
            <CheckCircle className="w-3 h-3" />Resolved
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
            {status}
          </span>
        );
    }
  };

  const newCount = submissions.filter(s => s.status === 'new').length;

  if (loading) {
    return (
      <Card variant="glass">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Contact Submissions
                {newCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    {newCount} new
                  </span>
                )}
              </CardTitle>
              <CardDescription>Manage contact form submissions from users</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadSubmissions}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No contact submissions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    submission.status === 'new' 
                      ? 'bg-primary/5 border-primary/20' 
                      : 'bg-secondary/30 border-border'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-medium text-foreground truncate">{submission.subject}</h4>
                        {getStatusBadge(submission.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {submission.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {submission.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(submission.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setAdminNotes(submission.admin_notes || "");
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{submission.message}</p>
                  {submission.admin_notes && (
                    <div className="mt-2 p-2 rounded bg-secondary/50 border border-border">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Admin notes:</span> {submission.admin_notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card variant="glass" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{selectedSubmission.subject}</CardTitle>
                {getStatusBadge(selectedSubmission.status)}
              </div>
              <CardDescription>
                From {selectedSubmission.name} ({selectedSubmission.email}) • {new Date(selectedSubmission.created_at).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Message</label>
                <div className="p-3 rounded-lg bg-secondary/30 border border-border text-sm text-foreground whitespace-pre-wrap">
                  {selectedSubmission.message}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Admin Notes</label>
                <Textarea
                  placeholder="Add notes about this submission..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedSubmission.status !== 'in_progress' && (
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedSubmission.id, 'in_progress', adminNotes)}
                    disabled={saving}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Mark In Progress
                  </Button>
                )}
                {selectedSubmission.status !== 'resolved' && (
                  <Button
                    variant="success"
                    onClick={() => handleUpdateStatus(selectedSubmission.id, 'resolved', adminNotes)}
                    disabled={saving}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Resolved
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedSubmission(null);
                    setAdminNotes("");
                  }}
                >
                  Close
                </Button>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  To reply to this user, send an email to: <a href={`mailto:${selectedSubmission.email}`} className="text-primary hover:underline">{selectedSubmission.email}</a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
