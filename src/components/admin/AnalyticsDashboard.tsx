import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart3, 
  Loader2, 
  TrendingUp,
  Users,
  CreditCard,
  Search
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface DailyStats {
  date: string;
  users: number;
  searches: number;
  revenue: number;
  orders: number;
}

export const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [totals, setTotals] = useState({
    totalUsers: 0,
    totalSearches: 0,
    totalRevenue: 0,
    totalOrders: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Get users by date
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('created_at')
        .order('created_at', { ascending: true });

      if (usersError) throw usersError;

      // Get search history by date
      const { data: searchData, error: searchError } = await supabase
        .from('search_history')
        .select('created_at')
        .order('created_at', { ascending: true });

      if (searchError) throw searchError;

      // Get orders by date
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('created_at, amount, status')
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      // Group data by date
      const dateMap = new Map<string, DailyStats>();
      
      // Process users
      (usersData || []).forEach(item => {
        const date = new Date(item.created_at).toISOString().split('T')[0];
        const existing = dateMap.get(date) || { date, users: 0, searches: 0, revenue: 0, orders: 0 };
        existing.users += 1;
        dateMap.set(date, existing);
      });

      // Process searches
      (searchData || []).forEach(item => {
        const date = new Date(item.created_at).toISOString().split('T')[0];
        const existing = dateMap.get(date) || { date, users: 0, searches: 0, revenue: 0, orders: 0 };
        existing.searches += 1;
        dateMap.set(date, existing);
      });

      // Process orders
      (ordersData || []).forEach(item => {
        const date = new Date(item.created_at).toISOString().split('T')[0];
        const existing = dateMap.get(date) || { date, users: 0, searches: 0, revenue: 0, orders: 0 };
        existing.revenue += Number(item.amount);
        existing.orders += 1;
        dateMap.set(date, existing);
      });

      // Sort by date and get last 30 days
      const sortedStats = Array.from(dateMap.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);

      setDailyStats(sortedStats);

      // Calculate totals
      setTotals({
        totalUsers: usersData?.length || 0,
        totalSearches: searchData?.length || 0,
        totalRevenue: (ordersData || []).reduce((sum, o) => sum + Number(o.amount), 0),
        totalOrders: ordersData?.length || 0,
      });

    } catch (error) {
      console.error("Error loading analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card variant="glass">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Analytics Dashboard
        </CardTitle>
        <CardDescription>Performance metrics and trends</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs">Total Users</span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{totals.totalUsers}</p>
          </div>
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Search className="w-4 h-4" />
              <span className="text-xs">Total Searches</span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{totals.totalSearches}</p>
          </div>
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs">Total Orders</span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{totals.totalOrders}</p>
          </div>
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">₹{totals.totalRevenue}</p>
          </div>
        </div>

        {/* Revenue Chart */}
        {dailyStats.length > 0 && (
          <>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Revenue Trend (Last 30 days)</h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--success))" 
                      strokeWidth={2}
                      dot={false}
                      name="Revenue (₹)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Activity Chart */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Daily Activity</h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend />
                    <Bar dataKey="users" fill="hsl(var(--primary))" name="New Users" />
                    <Bar dataKey="searches" fill="hsl(var(--warning))" name="Searches" />
                    <Bar dataKey="orders" fill="hsl(var(--success))" name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {dailyStats.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No data available yet</p>
        )}
      </CardContent>
    </Card>
  );
};
