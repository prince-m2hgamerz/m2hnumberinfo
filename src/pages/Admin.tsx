import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
  Loader2
} from "lucide-react";

// Demo data for admin panel
const demoUsers = [
  { username: "john_doe", credits: 25, banned: false, lastCheck: "2024-01-15" },
  { username: "jane_smith", credits: 100, banned: false, lastCheck: "2024-01-14" },
  { username: "bob_wilson", credits: 0, banned: true, lastCheck: "2024-01-10" },
  { username: "alice_johnson", credits: 50, banned: false, lastCheck: "2024-01-15" },
];

const demoStats = {
  totalUsers: 4,
  totalChecks: 1234,
  totalPayments: 56,
  totalRevenue: 4500,
};

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState(demoUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [creditsToAdd, setCreditsToAdd] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const ADMIN_PASSWORD = "admin123"; // In production, this would be server-side

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

  const handleAddCredits = (username: string) => {
    const credits = parseInt(creditsToAdd);
    if (isNaN(credits) || credits <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid number of credits.",
        variant: "destructive",
      });
      return;
    }

    setUsers(users.map(user => 
      user.username === username 
        ? { ...user, credits: user.credits + credits }
        : user
    ));

    toast({
      title: "Credits Added",
      description: `Added ${credits} credits to ${username}.`,
    });

    setCreditsToAdd("");
    setSelectedUser(null);
  };

  const handleToggleBan = (username: string) => {
    setUsers(users.map(user => 
      user.username === username 
        ? { ...user, banned: !user.banned }
        : user
    ));

    const user = users.find(u => u.username === username);
    toast({
      title: user?.banned ? "User Unbanned" : "User Banned",
      description: `${username} has been ${user?.banned ? "unbanned" : "banned"}.`,
    });
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
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
            <StatCard 
              icon={<Users className="w-5 h-5" />} 
              label="Total Users" 
              value={demoStats.totalUsers} 
            />
            <StatCard 
              icon={<SearchIcon className="w-5 h-5" />} 
              label="Total Lookups" 
              value={demoStats.totalChecks} 
            />
            <StatCard 
              icon={<CreditIcon className="w-5 h-5" />} 
              label="Payments" 
              value={demoStats.totalPayments} 
            />
            <StatCard 
              icon={<BarChart3 className="w-5 h-5" />} 
              label="Revenue" 
              value={`₹${demoStats.totalRevenue}`} 
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
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Last Activity</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.username} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
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
                          {user.lastCheck}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            {selectedUser === user.username ? (
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
                                  onClick={() => handleAddCredits(user.username)}
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
                                  onClick={() => setSelectedUser(user.username)}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Credits
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant={user.banned ? "success" : "destructive"}
                                  onClick={() => handleToggleBan(user.username)}
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
                  </tbody>
                </table>
              </div>
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
