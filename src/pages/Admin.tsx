import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  Crown
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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
  // Credit pack form state
  const [editingPack, setEditingPack] = useState<CreditPack | null>(null);
  const [packCredits, setPackCredits] = useState("");
  const [packPrice, setPackPrice] = useState("");
  const [packPopular, setPackPopular] = useState(false);
  const [packFeatured, setPackFeatured] = useState(false);
  const [showPackForm, setShowPackForm] = useState(false);
  // Help reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const ADMIN_PASSWORD = "m2hgamerz"; // Admin password

  const loadData = async () => {
    setRefreshing(true);
    try {
      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Load stats
      const { data: statsData, error: statsError } = await supabase
        .from('stats')
        .select('*')
        .single();

      if (statsError && statsError.code !== 'PGRST116') throw statsError;
      setStats(statsData);

      // Load credit packs (including inactive ones for admin)
      const { data: packsData, error: packsError } = await supabase
        .from('credit_packs')
        .select('*')
        .order('credits', { ascending: true });

      if (packsError) throw packsError;
      setCreditPacks(packsData || []);

      // Load orders with user info
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (ordersError) throw ordersError;
      
      // Enrich orders with usernames
      const enrichedOrders = (ordersData || []).map(order => {
        const user = usersData?.find(u => u.id === order.user_id);
        return { ...order, username: user?.username || 'Unknown' };
      });
      setOrders(enrichedOrders);

      // Load help requests
      const { data: helpData, error: helpError } = await supabase
        .from('help_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (helpError) throw helpError;
      setHelpRequests(helpData || []);

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

      setUsers(users.map(u => 
        u.id === userId 
          ? { ...u, credits: u.credits + credits }
          : u
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

      setUsers(users.map(u => 
        u.id === userId 
          ? { ...u, banned: !u.banned }
          : u
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

  // Credit Pack Management
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
        // Update existing pack
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

        toast({
          title: "Pack Updated",
          description: `Credit pack updated successfully.`,
        });
      } else {
        // Create new pack
        const { data, error } = await supabase
          .from('credit_packs')
          .insert({ credits, price, is_popular: packPopular, is_featured: packFeatured })
          .select()
          .single();

        if (error) throw error;

        setCreditPacks([...creditPacks, data].sort((a, b) => a.credits - b.credits));

        toast({
          title: "Pack Created",
          description: `New credit pack created successfully.`,
        });
      }

      resetPackForm();
    } catch (error) {
      console.error("Error saving pack:", error);
      toast({
        title: "Error",
        description: "Failed to save credit pack",
        variant: "destructive",
      });
    }
  };

  const handleDeletePack = async (packId: string) => {
    try {
      const { error } = await supabase
        .from('credit_packs')
        .delete()
        .eq('id', packId);

      if (error) throw error;

      setCreditPacks(creditPacks.filter(p => p.id !== packId));

      toast({
        title: "Pack Deleted",
        description: "Credit pack deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting pack:", error);
      toast({
        title: "Error",
        description: "Failed to delete credit pack",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to update pack status",
        variant: "destructive",
      });
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
      toast({
        title: "Empty Reply",
        description: "Please enter a reply message.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('help_requests')
        .update({ admin_reply: replyText.trim(), status: 'replied' })
        .eq('id', requestId);

      if (error) throw error;

      setHelpRequests(helpRequests.map(r => 
        r.id === requestId 
          ? { ...r, admin_reply: replyText.trim(), status: 'replied' }
          : r
      ));

      toast({
        title: "Reply Sent",
        description: "Your reply has been sent to the user.",
      });

      setReplyingTo(null);
      setReplyText("");
    } catch (error) {
      console.error("Error replying to help request:", error);
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      });
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

      toast({
        title: "Request Closed",
        description: "Help request has been closed.",
      });
    } catch (error) {
      console.error("Error closing help request:", error);
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
                <CardDescription>
                  Enter the admin password to continue
                </CardDescription>
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

                  <Button 
                    type="submit" 
                    variant="default" 
                    size="lg" 
                    className="w-full"
                    disabled={loading}
                  >
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

      <main className="pt-24 pb-20 px-4">
        <div className="container max-w-6xl mx-auto space-y-8">
          {/* Header with refresh */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <Button variant="outline" size="sm" onClick={loadData} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
            <StatCard 
              icon={<Users className="w-5 h-5" />} 
              label="Total Users" 
              value={users.length} 
            />
            <StatCard 
              icon={<SearchIcon className="w-5 h-5" />} 
              label="Total Lookups" 
              value={stats?.total_checks || 0} 
            />
            <StatCard 
              icon={<CreditIcon className="w-5 h-5" />} 
              label="Payments" 
              value={stats?.total_payments || 0} 
            />
            <StatCard 
              icon={<BarChart3 className="w-5 h-5" />} 
              label="Revenue" 
              value={`₹${stats?.total_revenue || 0}`} 
            />
          </div>

          {/* User Management */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                User Management
              </CardTitle>
              <CardDescription>View and manage all registered users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
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
                              <Ban className="w-3 h-3" />
                              Banned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs">
                              <CheckCircle className="w-3 h-3" />
                              Active
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
                                <Button 
                                  size="sm" 
                                  variant="success"
                                  onClick={() => handleAddCredits(user.id)}
                                >
                                  Add
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => setSelectedUser(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setSelectedUser(user.id)}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Credits
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant={user.banned ? "success" : "destructive"}
                                  onClick={() => handleToggleBan(user.id)}
                                >
                                  {user.banned ? (
                                    <>
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Unban
                                    </>
                                  ) : (
                                    <>
                                      <Ban className="w-3 h-3 mr-1" />
                                      Ban
                                    </>
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Credit Pack Management */}
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    resetPackForm();
                    setShowPackForm(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Pack
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pack Form */}
              {showPackForm && (
                <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-4">
                  <h4 className="font-medium text-foreground">
                    {editingPack ? "Edit Credit Pack" : "New Credit Pack"}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Credits</label>
                      <Input
                        type="number"
                        placeholder="e.g. 50"
                        value={packCredits}
                        onChange={(e) => setPackCredits(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Price (₹)</label>
                      <Input
                        type="number"
                        placeholder="e.g. 30"
                        value={packPrice}
                        onChange={(e) => setPackPrice(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Badges</label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={packPopular ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPackPopular(!packPopular)}
                        >
                          <Star className={`w-4 h-4 mr-1 ${packPopular ? "fill-current" : ""}`} />
                          Popular
                        </Button>
                        <Button
                          type="button"
                          variant={packFeatured ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPackFeatured(!packFeatured)}
                        >
                          <Crown className={`w-4 h-4 mr-1 ${packFeatured ? "fill-current" : ""}`} />
                          Featured
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="default" onClick={handleSavePack}>
                      {editingPack ? "Update Pack" : "Create Pack"}
                    </Button>
                    <Button variant="ghost" onClick={resetPackForm}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Packs Table */}
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
                                <Star className="w-3 h-3 fill-current" />
                                Popular
                              </span>
                            )}
                            {pack.is_featured && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs">
                                <Crown className="w-3 h-3 fill-current" />
                                Featured
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-foreground">₹{pack.price}</span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          ₹{(Number(pack.price) / pack.credits).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          {pack.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs">
                              <CheckCircle className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                              Hidden
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => startEditPack(pack)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleTogglePackActive(pack)}
                            >
                              {pack.is_active ? "Hide" : "Show"}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeletePack(pack.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {creditPacks.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          No credit packs configured
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Order History */}
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
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs text-muted-foreground">{order.order_id.slice(0, 20)}...</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-foreground">{order.username}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-primary">{order.credits}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-foreground">₹{order.amount}</span>
                        </td>
                        <td className="py-3 px-4">
                          {order.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs">
                              <CheckCircle className="w-3 h-3" />
                              Completed
                            </span>
                          ) : order.status === 'failed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs">
                              Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-warning/10 text-warning text-xs">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          No orders found
                        </td>
                      </tr>
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
                    <div
                      key={request.id}
                      className="p-4 rounded-lg bg-secondary/30 border border-border/50 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="font-medium text-foreground">{request.subject}</h5>
                          <p className="text-xs text-muted-foreground">
                            From: {request.username} • {new Date(request.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {request.status === 'open' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-warning/10 text-warning text-xs">
                              Open
                            </span>
                          )}
                          {request.status === 'replied' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs">
                              Replied
                            </span>
                          )}
                          {request.status === 'closed' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                              Closed
                            </span>
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
                          <Textarea
                            placeholder="Type your reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleReplyToHelp(request.id)}>
                              <Reply className="w-3 h-3 mr-1" />
                              Send Reply
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => {
                              setReplyingTo(null);
                              setReplyText("");
                            }}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {request.status !== 'closed' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setReplyingTo(request.id);
                                  setReplyText(request.admin_reply || "");
                                }}
                              >
                                <Reply className="w-3 h-3 mr-1" />
                                {request.admin_reply ? "Edit Reply" : "Reply"}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleCloseHelpRequest(request.id)}
                              >
                                Close
                              </Button>
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
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
  <Card variant="glass" className="glow-hover">
    <CardContent className="p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold font-mono text-foreground">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default Admin;
