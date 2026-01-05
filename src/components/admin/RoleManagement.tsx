import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Shield, 
  Search, 
  UserPlus, 
  Loader2, 
  Crown, 
  UserCheck,
  Trash2 
} from "lucide-react";

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
  created_at: string;
  username?: string;
}

interface UserWithRoles {
  id: string;
  username: string;
  roles: UserRole[];
}

interface RoleManagementProps {
  onAuditLog: (action: string, targetUserId: string, targetUsername: string, details: object) => void;
}

export const RoleManagement = ({ onAuditLog }: RoleManagementProps) => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [addingRole, setAddingRole] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator'>('moderator');
  const { toast } = useToast();

  useEffect(() => {
    loadUsersWithRoles();
  }, []);

  const loadUsersWithRoles = async () => {
    try {
      // Load all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username')
        .order('username');

      if (usersError) throw usersError;

      // Load all roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine users with their roles
      const usersWithRoles = (usersData || []).map(user => ({
        ...user,
        roles: (rolesData || []).filter(r => r.user_id === user.id),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error loading users with roles:", error);
      toast({
        title: "Error",
        description: "Failed to load user roles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addRole = async (userId: string, username: string, role: 'admin' | 'moderator') => {
    setAddingRole(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Role Exists",
            description: `${username} already has the ${role} role.`,
            variant: "destructive",
          });
          setAddingRole(null);
          return;
        }
        throw error;
      }

      onAuditLog('role_added', userId, username, { role });

      toast({
        title: "Role Added",
        description: `${username} is now a ${role}.`,
      });

      loadUsersWithRoles();
    } catch (error) {
      console.error("Error adding role:", error);
      toast({
        title: "Error",
        description: "Failed to add role",
        variant: "destructive",
      });
    } finally {
      setAddingRole(null);
    }
  };

  const removeRole = async (roleId: string, userId: string, username: string, role: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      onAuditLog('role_removed', userId, username, { role });

      toast({
        title: "Role Removed",
        description: `Removed ${role} role from ${username}.`,
      });

      loadUsersWithRoles();
    } catch (error) {
      console.error("Error removing role:", error);
      toast({
        title: "Error",
        description: "Failed to remove role",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const usersWithAdminRoles = users.filter(u => u.roles.some(r => r.role === 'admin' || r.role === 'moderator'));

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
          <Shield className="w-5 h-5 text-primary" />
          Role Management
        </CardTitle>
        <CardDescription>Assign admin and moderator roles to users</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Admins/Moderators */}
        {usersWithAdminRoles.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Current Staff</h4>
            <div className="grid gap-2">
              {usersWithAdminRoles.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/30 border border-border">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">{user.username}</span>
                    <div className="flex gap-2">
                      {user.roles.map((role) => (
                        <span 
                          key={role.id}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                            role.role === 'admin' 
                              ? 'bg-destructive/10 text-destructive' 
                              : 'bg-warning/10 text-warning'
                          }`}
                        >
                          {role.role === 'admin' ? <Crown className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          {role.role}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {user.roles.map((role) => (
                      <Button
                        key={role.id}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-7"
                        onClick={() => removeRole(role.id, user.id, user.username, role.role)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Roles to Users */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Add Role to User</h4>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {searchTerm && (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredUsers.slice(0, 10).map((user) => {
                const hasAdmin = user.roles.some(r => r.role === 'admin');
                const hasModerator = user.roles.some(r => r.role === 'moderator');
                
                return (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-3 rounded-md bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors"
                  >
                    <span className="font-medium text-foreground">{user.username}</span>
                    <div className="flex gap-2">
                      {!hasAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addRole(user.id, user.username, 'admin')}
                          disabled={addingRole === user.id}
                        >
                          {addingRole === user.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Crown className="w-3 h-3 mr-1" />
                              Admin
                            </>
                          )}
                        </Button>
                      )}
                      {!hasModerator && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addRole(user.id, user.username, 'moderator')}
                          disabled={addingRole === user.id}
                        >
                          {addingRole === user.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="w-3 h-3 mr-1" />
                              Moderator
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No users found</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
