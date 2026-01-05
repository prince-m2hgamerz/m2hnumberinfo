import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RoleManagement } from "@/components/admin/RoleManagement";
import { AuditLogs } from "@/components/admin/AuditLogs";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { BulkOperations } from "@/components/admin/BulkOperations";
import { 
  Shield, 
  Lock, 
  Users, 
  CreditCard as CreditIcon, 
  Search as SearchIcon,
  Plus,
  Ban,
  CheckCircle,
  BarChart3,
  Loader2,
  RefreshCw,
  Package,
  Pencil,
  Trash2,
  Star,
  Receipt,
  MessageSquare,
  Reply,
  Crown,
  Settings,
  Eye,
  EyeOff
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserData {
  id: string;
  username: string;
  credits: number;
  banned: boolean;
  created_at: string;
  updated_at: string;
}

interface StatsData {
  total_checks: number;
  total_payments: number;
  total_revenue: number;
}

interface CreditPack {
  id: string;
  credits: number;
  price: number;
  is_popular: boolean;
  is_active: boolean;
  is_featured: boolean;
}

interface Order {
  id: string;
  order_id: string;
  user_id: string;
  credits: number;
  amount: number;
  status: string;
  created_at: string;
  username?: string;
}

interface HelpRequest {
  id: string;
  user_id: string;
  username: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [creditsToAdd, setCreditsToAdd] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [editingPack, setEditingPack] = useState<CreditPack | null>(null);
  const [packCredits, setPackCredits] = useState("");
  const [packPrice, setPackPrice] = useState("");
  const [packPopular, setPackPopular] = useState(false);
  const [packFeatured, setPackFeatured] = useState(false);
  const [showPackForm, setShowPackForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [cashfreeMode, setCashfreeMode] = useState<'sandbox' | 'production'>('sandbox');
  const [cashfreeAppId, setCashfreeAppId] = useState("");
  const [cashfreeSecretKey, setCashfreeSecretKey] = useState("");
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  const ADMIN_PASSWORD = "m2hgamerz";

  const maskSecret = (value: string) => {
    if (!value) return "";
    const last4 = value.slice(-4);
    return `••••••••••••••${last4}`;
  };

  const loadData = async () => {
    setRefreshing(true);
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      const { data: statsData, error: statsError } = await supabase
        .from('stats')
        .select('*')
        .single();

      if (statsError && statsError.code !== 'PGRST116') throw statsError;
      setStats(statsData);

      const { data: packsData, error: packsError } = await supabase
        .from('credit_packs')
        .select('*')
        .order('credits', { ascending: true });

      if (packsError) throw packsError;
      setCreditPacks(packsData || []);

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (ordersError) throw ordersError;
      
      const enrichedOrders = (ordersData || []).map(order => {
        const user = usersData?.find(u => u.id === order.user_id);
        return { ...order, username: user?.username || 'Unknown' };
      });
      setOrders(enrichedOrders);

      const { data: helpData, error: helpError } = await supabase
        .from('help_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (helpError) throw helpError;
      setHelpRequests(helpData || []);

      const { data: settingsResponse } = await supabase.functions.invoke('get-payment-settings', {
        body: { adminPassword: ADMIN_PASSWORD },
      });

      if (settingsResponse?.settings) {
        const settings = settingsResponse.settings;
        if (settings['cashfree_mode']) {
          setCashfreeMode(settings['cashfree_mode'] as 'sandbox' | 'production');
        }
        if (settings['cashfree_app_id']) {
          setCashfreeAppId(settings['cashfree_app_id']);
        }
        if (settings['cashfree_secret_key']) {
          setCashfreeSecretKey(settings['cashfree_secret_key']);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        setIsAuthenticated(true);
        toast({
          title: "Admin Access Granted",
          description: "Welcome to the admin panel.",
        });
      } else {
        toast({
          title: "Access Denied",
          description: "Invalid admin password.",
          variant: "destructive",
        });
      }
      setLoading(false);
    }, 500);
  };

  const logAuditAction = async (
    actionType: string, 
    targetUserId: string, 
    targetUsername: string, 
    details: object
  ) => {
    try {
      await supabase.from('audit_logs').insert({
        admin_user_id: authUser?.id || '00000000-0000-0000-0000-000000000000',
        admin_username: 'admin',
        action_type: actionType,
        target_user_id: targetUserId,
        target_username: targetUsername,
        details: JSON.parse(JSON.stringify(details)),
      });
    } catch (error) {
      console.error("Error logging audit action:", error);
    }
  };

  const handleAddCredits = async (userId: string) => {
    const credits = parseInt(creditsToAdd);
    if (isNaN(credits) || credits <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid number of credits.",
        variant: "destructive",
      });
      return;
    }

    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const { error } = await supabase
        .from('users')
        .update({ credits: user.credits + credits })
        .eq('id', userId);

      if (error) throw error;

      await logAuditAction('credits_added', userId, user.username, { credits_added: credits });

      setUsers(users.map(u => 
        u.id === userId ? { ...u, credits: u.credits + credits } : u
      ));

      toast({
        title: "Credits Added",
        description: `Added ${credits} credits to ${user.username}.`,
      });

      setCreditsToAdd("");
      setSelectedUser(null);
    } catch (error) {
      console.error("Error adding credits:", error);
      toast({
        title: "Error",
        description: "Failed to add credits",
        variant: "destructive",
      });
    }
  };

  const handleToggleBan = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const { error } = await supabase
        .from('users')
        .update({ banned: !user.banned })
        .eq('id', userId);

      if (error) throw error;

      await logAuditAction(user.banned ? 'user_unbanned' : 'user_banned', userId, user.username, {});

      setUsers(users.map(u => 
        u.id === userId ? { ...u, banned: !u.banned } : u
      ));

      toast({
        title: user.banned ? "User Unbanned" : "User Banned",
        description: `${user.username} has been ${user.banned ? "unbanned" : "banned"}.`,
      });
    } catch (error) {
      console.error("Error toggling ban:", error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const handleSavePack = async () => {
    const credits = parseInt(packCredits);
    const price = parseFloat(packPrice);
    
    if (isNaN(credits) || credits <= 0 || isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid credits and price values.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingPack) {
        const { error } = await supabase
          .from('credit_packs')
          .update({ credits, price, is_popular: packPopular, is_featured: packFeatured })
          .eq('id', editingPack.id);

        if (error) throw error;

        setCreditPacks(creditPacks.map(p => 
          p.id === editingPack.id 
            ? { ...p, credits, price, is_popular: packPopular, is_featured: packFeatured }
            : p
        ));

        toast({ title: "Pack Updated", description: "Credit pack updated successfully." });
      } else {
        const { data, error } = await supabase
          .from('credit_packs')
          .insert({ credits, price, is_popular: packPopular, is_featured: packFeatured })
          .select()
          .single();

        if (error) throw error;

        setCreditPacks([...creditPacks, data].sort((a, b) => a.credits - b.credits));
        toast({ title: "Pack Created", description: "New credit pack created successfully." });
      }

      resetPackForm();
    } catch (error) {
      console.error("Error saving pack:", error);
      toast({ title: "Error", description: "Failed to save credit pack", variant: "destructive" });
    }
  };

  const handleDeletePack = async (packId: string) => {
    try {
      const { error } = await supabase.from('credit_packs').delete().eq('id', packId);
      if (error) throw error;
      setCreditPacks(creditPacks.filter(p => p.id !== packId));
      toast({ title: "Pack Deleted", description: "Credit pack deleted successfully." });
    } catch (error) {
      console.error("Error deleting pack:", error);
      toast({ title: "Error", description: "Failed to delete credit pack", variant: "destructive" });
    }
  };

  const handleTogglePackActive = async (pack: CreditPack) => {
    try {
      const { error } = await supabase
        .from('credit_packs')
        .update({ is_active: !pack.is_active })
        .eq('id', pack.id);

      if (error) throw error;

      setCreditPacks(creditPacks.map(p => 
        p.id === pack.id ? { ...p, is_active: !p.is_active } : p
      ));

      toast({
        title: pack.is_active ? "Pack Disabled" : "Pack Enabled",
        description: `Credit pack is now ${pack.is_active ? "hidden from" : "visible to"} users.`,
      });
    } catch (error) {
      console.error("Error toggling pack status:", error);
      toast({ title: "Error", description: "Failed to update pack status", variant: "destructive" });
    }
  };

  const resetPackForm = () => {
    setEditingPack(null);
    setPackCredits("");
    setPackPrice("");
    setPackPopular(false);
    setPackFeatured(false);
    setShowPackForm(false);
  };

  const startEditPack = (pack: CreditPack) => {
    setEditingPack(pack);
    setPackCredits(pack.credits.toString());
    setPackPrice(pack.price.toString());
    setPackPopular(pack.is_popular);
    setPackFeatured(pack.is_featured);
    setShowPackForm(true);
  };

  const handleReplyToHelp = async (requestId: string) => {
    if (!replyText.trim()) {
      toast({ title: "Empty Reply", description: "Please enter a reply message.", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from('help_requests')
        .update({ admin_reply: replyText.trim(), status: 'replied' })
        .eq('id', requestId);

      if (error) throw error;

      setHelpRequests(helpRequests.map(r => 
        r.id === requestId ? { ...r, admin_reply: replyText.trim(), status: 'replied' } : r
      ));

      toast({ title: "Reply Sent", description: "Your reply has been sent to the user." });
      setReplyingTo(null);
      setReplyText("");
    } catch (error) {
      console.error("Error replying to help request:", error);
      toast({ title: "Error", description: "Failed to send reply", variant: "destructive" });
    }
  };

  const handleCloseHelpRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('help_requests')
        .update({ status: 'closed' })
        .eq('id', requestId);

      if (error) throw error;

      setHelpRequests(helpRequests.map(r => 
        r.id === requestId ? { ...r, status: 'closed' } : r
      ));

      toast({ title: "Request Closed", description: "Help request has been closed." });
    } catch (error) {
      console.error("Error closing help request:", error);
    }
  };

  const handleSavePaymentSettings = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase.functions.invoke('update-payment-settings', {
        body: {
          cashfreeMode,
          cashfreeAppId,
          cashfreeSecretKey,
          adminPassword: ADMIN_PASSWORD,
        },
      });

      if (error) throw error;

      toast({ title: "Settings Saved", description: `Cashfree is now in ${cashfreeMode} mode.` });
    } catch (error) {
      console.error("Error saving payment settings:", error);
      toast({ title: "Error", description: "Failed to save payment settings", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background relative">
        <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="hero-glow" />
        
        <Navbar />

        <main className="pt-32 pb-20 px-4">
          <div className="container max-w-md mx-auto">
            <Card variant="glass" className="animate-slide-up">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-destructive" />
                </div>
                <CardTitle className="text-2xl">Admin Access</CardTitle>
                <CardDescription>Enter the admin password to continue</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="Enter admin password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        autoFocus
                      />
                    </div>
                  </div>

                  <Button type="submit" variant="default" size="lg" className="w-full" disabled={loading}>
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Access Admin Panel
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      
      <Navbar />

      <main className="pt-24 pb-20 px-3 sm:px-4">
        <div className="container max-w-6xl mx-auto space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <Button variant="outline" size="sm" onClick={loadData} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 stagger-children">
            <StatCard icon={<Users className="w-5 h-5" />} label="Total Users" value={users.length} />
            <StatCard icon={<SearchIcon className="w-5 h-5" />} label="Total Lookups" value={stats?.total_checks || 0} />
            <StatCard icon={<CreditIcon className="w-5 h-5" />} label="Payments" value={stats?.total_payments || 0} />
            <StatCard icon={<BarChart3 className="w-5 h-5" />} label="Revenue" value={`₹${stats?.total_revenue || 0}`} />
          </div>

          <Tabs defaultValue="users" className="space-y-4 sm:space-y-6">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex min-w-max gap-1 p-1 h-auto">
                <TabsTrigger value="users" className="text-xs sm:text-sm px-2 sm:px-3">Users</TabsTrigger>
                <TabsTrigger value="packs" className="text-xs sm:text-sm px-2 sm:px-3">Packs</TabsTrigger>
                <TabsTrigger value="orders" className="text-xs sm:text-sm px-2 sm:px-3">Orders</TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs sm:text-sm px-2 sm:px-3">Analytics</TabsTrigger>
                <TabsTrigger value="security" className="text-xs sm:text-sm px-2 sm:px-3">Security</TabsTrigger>
                <TabsTrigger value="settings" className="text-xs sm:text-sm px-2 sm:px-3">Settings</TabsTrigger>
              </TabsList>
            </div>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    User Management
                  </CardTitle>
                  <CardDescription>View and manage all registered users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative max-w-md">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Mobile card view */}
                  <div className="block sm:hidden space-y-3">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="p-3 rounded-lg bg-secondary/30 border border-border space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">{user.username}</span>
                          {user.banned ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs">
                              <Ban className="w-3 h-3" />Banned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-xs">
                              <CheckCircle className="w-3 h-3" />Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Credits: <span className="font-mono text-primary">{user.credits}</span></span>
                          <span className="text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedUser === user.id ? (
                            <div className="flex items-center gap-2 w-full">
                              <Input
                                type="number"
                                placeholder="Credits"
                                value={creditsToAdd}
                                onChange={(e) => setCreditsToAdd(e.target.value)}
                                className="flex-1 h-8"
                              />
                              <Button size="sm" variant="success" onClick={() => handleAddCredits(user.id)}>Add</Button>
                              <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)}>×</Button>
                            </div>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedUser(user.id)}>
                                <Plus className="w-3 h-3 mr-1" />Credits
                              </Button>
                              <Button size="sm" variant={user.banned ? "success" : "destructive"} className="flex-1" onClick={() => handleToggleBan(user.id)}>
                                {user.banned ? <><CheckCircle className="w-3 h-3 mr-1" />Unban</> : <><Ban className="w-3 h-3 mr-1" />Ban</>}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredUsers.length === 0 && (
                      <p className="py-8 text-center text-muted-foreground">No users found</p>
                    )}
                  </div>

                  {/* Desktop table view */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Username</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Credits</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Joined</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-medium text-foreground">{user.username}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-primary">{user.credits}</span>
                            </td>
                            <td className="py-3 px-4">
                              {user.banned ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs">
                                  <Ban className="w-3 h-3" />Banned
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs">
                                  <CheckCircle className="w-3 h-3" />Active
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end gap-2">
                                {selectedUser === user.id ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      placeholder="Credits"
                                      value={creditsToAdd}
                                      onChange={(e) => setCreditsToAdd(e.target.value)}
                                      className="w-24 h-8"
                                    />
                                    <Button size="sm" variant="success" onClick={() => handleAddCredits(user.id)}>Add</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)}>Cancel</Button>
                                  </div>
                                ) : (
                                  <>
                                    <Button size="sm" variant="outline" onClick={() => setSelectedUser(user.id)}>
                                      <Plus className="w-3 h-3 mr-1" />Credits
                                    </Button>
                                    <Button size="sm" variant={user.banned ? "success" : "destructive"} onClick={() => handleToggleBan(user.id)}>
                                      {user.banned ? <><CheckCircle className="w-3 h-3 mr-1" />Unban</> : <><Ban className="w-3 h-3 mr-1" />Ban</>}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                          <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No users found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <BulkOperations onAuditLog={logAuditAction} onRefresh={loadData} />
            </TabsContent>

            {/* Credit Packs Tab */}
            <TabsContent value="packs" className="space-y-6">
              <Card variant="glass">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        Credit Packs
                      </CardTitle>
                      <CardDescription>Manage credit pack pricing and availability</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { resetPackForm(); setShowPackForm(true); }}>
                      <Plus className="w-4 h-4 mr-1" />Add Pack
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {showPackForm && (
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-4">
                      <h4 className="font-medium text-foreground">{editingPack ? "Edit Credit Pack" : "New Credit Pack"}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm text-muted-foreground">Credits</label>
                          <Input type="number" placeholder="e.g. 50" value={packCredits} onChange={(e) => setPackCredits(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-muted-foreground">Price (₹)</label>
                          <Input type="number" placeholder="e.g. 30" value={packPrice} onChange={(e) => setPackPrice(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-muted-foreground">Badges</label>
                          <div className="flex gap-2">
                            <Button type="button" variant={packPopular ? "default" : "outline"} size="sm" onClick={() => setPackPopular(!packPopular)}>
                              <Star className={`w-4 h-4 mr-1 ${packPopular ? "fill-current" : ""}`} />Popular
                            </Button>
                            <Button type="button" variant={packFeatured ? "default" : "outline"} size="sm" onClick={() => setPackFeatured(!packFeatured)}>
                              <Crown className={`w-4 h-4 mr-1 ${packFeatured ? "fill-current" : ""}`} />Featured
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="default" onClick={handleSavePack}>{editingPack ? "Update Pack" : "Create Pack"}</Button>
                        <Button variant="ghost" onClick={resetPackForm}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Credits</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Price</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Per Credit</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creditPacks.map((pack) => (
                          <tr key={pack.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-primary font-bold">{pack.credits}</span>
                                {pack.is_popular && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                                    <Star className="w-3 h-3 fill-current" />Popular
                                  </span>
                                )}
                                {pack.is_featured && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs">
                                    <Crown className="w-3 h-3 fill-current" />Featured
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4"><span className="font-medium text-foreground">₹{pack.price}</span></td>
                            <td className="py-3 px-4 text-muted-foreground">₹{(Number(pack.price) / pack.credits).toFixed(2)}</td>
                            <td className="py-3 px-4">
                              {pack.is_active ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs">
                                  <CheckCircle className="w-3 h-3" />Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">Hidden</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => startEditPack(pack)}><Pencil className="w-3 h-3" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => handleTogglePackActive(pack)}>{pack.is_active ? "Hide" : "Show"}</Button>
                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeletePack(pack.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {creditPacks.length === 0 && (
                          <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No credit packs configured</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-6">
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-primary" />
                    Order History
                  </CardTitle>
                  <CardDescription>View all payment transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Order ID</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Credits</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                            <td className="py-3 px-4"><span className="font-mono text-xs text-muted-foreground">{order.order_id.slice(0, 20)}...</span></td>
                            <td className="py-3 px-4"><span className="font-medium text-foreground">{order.username}</span></td>
                            <td className="py-3 px-4"><span className="font-mono text-primary">{order.credits}</span></td>
                            <td className="py-3 px-4"><span className="font-medium text-foreground">₹{order.amount}</span></td>
                            <td className="py-3 px-4">
                              {order.status === 'completed' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs">
                                  <CheckCircle className="w-3 h-3" />Completed
                                </span>
                              ) : order.status === 'failed' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs">Failed</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-warning/10 text-warning text-xs">Pending</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                        {orders.length === 0 && (
                          <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No orders found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Help Requests */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Help Requests
                  </CardTitle>
                  <CardDescription>Manage user support requests</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {helpRequests.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No help requests</p>
                  ) : (
                    <div className="space-y-4">
                      {helpRequests.map((request) => (
                        <div key={request.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h5 className="font-medium text-foreground">{request.subject}</h5>
                              <p className="text-xs text-muted-foreground">From: {request.username} • {new Date(request.created_at).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {request.status === 'open' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-warning/10 text-warning text-xs">Open</span>
                              )}
                              {request.status === 'replied' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs">Replied</span>
                              )}
                              {request.status === 'closed' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">Closed</span>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-sm text-foreground">{request.message}</p>
                          
                          {request.admin_reply && (
                            <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
                              <p className="text-xs font-medium text-primary mb-1">Your Reply:</p>
                              <p className="text-sm text-foreground">{request.admin_reply}</p>
                            </div>
                          )}

                          {replyingTo === request.id ? (
                            <div className="space-y-2">
                              <Textarea placeholder="Type your reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={3} />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleReplyToHelp(request.id)}><Reply className="w-3 h-3 mr-1" />Send Reply</Button>
                                <Button size="sm" variant="ghost" onClick={() => { setReplyingTo(null); setReplyText(""); }}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              {request.status !== 'closed' && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => { setReplyingTo(request.id); setReplyText(request.admin_reply || ""); }}>
                                    <Reply className="w-3 h-3 mr-1" />{request.admin_reply ? "Edit Reply" : "Reply"}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleCloseHelpRequest(request.id)}>Close</Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <AnalyticsDashboard />
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <RoleManagement onAuditLog={logAuditAction} />
              <AuditLogs />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Payment Settings
                  </CardTitle>
                  <CardDescription>Configure Cashfree payment gateway</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border">
                    <div>
                      <p className="font-medium text-foreground">Payment Mode</p>
                      <p className="text-sm text-muted-foreground">
                        {cashfreeMode === 'sandbox' ? 'Test mode - No real transactions' : 'Live mode - Real transactions will be processed'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${cashfreeMode === 'sandbox' ? 'text-warning font-medium' : 'text-muted-foreground'}`}>Sandbox</span>
                      <Switch checked={cashfreeMode === 'production'} onCheckedChange={(checked) => setCashfreeMode(checked ? 'production' : 'sandbox')} />
                      <span className={`text-sm ${cashfreeMode === 'production' ? 'text-success font-medium' : 'text-muted-foreground'}`}>Production</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">App ID</label>
                      <Input type="text" placeholder="Enter Cashfree App ID" value={cashfreeAppId} onChange={(e) => setCashfreeAppId(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Secret Key</label>
                      <div className="relative">
                        <Input
                          type={showSecretKey ? "text" : "password"}
                          placeholder="Enter Cashfree Secret Key"
                          value={cashfreeSecretKey}
                          onChange={(e) => setCashfreeSecretKey(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                        >
                          {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>

                      <div className="rounded-lg bg-secondary/30 border border-border p-3 text-xs text-muted-foreground space-y-1">
                        <p>Saved App ID: <span className="font-mono text-foreground">{cashfreeAppId || "—"}</span></p>
                        <p>Saved Secret Key: <span className="font-mono text-foreground">{cashfreeSecretKey ? (showSecretKey ? cashfreeSecretKey : maskSecret(cashfreeSecretKey)) : "—"}</span></p>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSavePaymentSettings} disabled={savingSettings}>
                    {savingSettings ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Settings className="w-4 h-4 mr-2" />}
                    Save Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
  <Card variant="glass" className="glow-hover">
    <CardContent className="p-3 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{label}</p>
          <p className="text-lg sm:text-2xl font-bold font-mono text-foreground truncate">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default Admin;