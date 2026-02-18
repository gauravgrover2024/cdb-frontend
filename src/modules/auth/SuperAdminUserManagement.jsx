import { useEffect, useState, useCallback } from 'react';
import { fetchUsers, updateUserRole } from '../../api/users';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '../../components/ui/Card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Shield, User, Mail, UserCheck, RefreshCw, ChevronRight } from 'lucide-react';

const SuperAdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');

  const loadUsers = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);
    
    setError('');
    try {
      const data = await fetchUsers(token);
      setUsers(data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRoleChange = async (id, newRole) => {
    setError('');
    setSuccess('');
    try {
      await updateUserRole(id, newRole, token);
      setUsers(users => users.map(user => user._id === id ? { ...user, role: newRole } : user));
      setSuccess(`Role updated to ${newRole} for user.`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update role');
    }
  };

  const getRoleBadge = (role) => {
    switch (role?.toLowerCase()) {
      case 'superadmin':
        return <Badge variant="destructive" className="gap-1"><Shield size={12}/> Super Admin</Badge>;
      case 'admin':
        return <Badge variant="default" className="gap-1 font-bold">Admin</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><User size={12}/> User</Badge>;
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage text="Accessing Secure User Records..." />;
  }

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Shield className="text-primary" size={28} />
            </div>
            Global Administration
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Manage system access, roles, and administrative privileges.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => loadUsers(true)}
          disabled={refreshing}
          className="rounded-xl border-2 font-bold flex gap-2 items-center"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Refresh Directory
        </Button>
      </div>

      {(error || success) && (
        <div className="space-y-4">
          {error && (
            <div className="p-4 bg-error/10 border border-error/20 rounded-2xl text-error text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
              <div className="w-2 h-2 rounded-full bg-error" />
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-600 text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              {success}
            </div>
          )}
        </div>
      )}

      <Card className="border-none shadow-elevation-1 rounded-3xl overflow-hidden bg-white/50 backdrop-blur-sm border border-white/20">
        <CardHeader className="bg-muted/30 pb-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">User Directory</CardTitle>
            <Badge variant="outline" className="bg-white/50">{users.length} Total Users</Badge>
          </div>
          <CardDescription className="text-muted-foreground/80">
            Total registered users with data access permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead className="py-5 font-bold uppercase text-[11px] tracking-widest pl-8">User Profile</TableHead>
                <TableHead className="py-5 font-bold uppercase text-[11px] tracking-widest">Contact Identity</TableHead>
                <TableHead className="py-5 font-bold uppercase text-[11px] tracking-widest">Access Level</TableHead>
                <TableHead className="py-5 font-bold uppercase text-[11px] tracking-widest text-right pr-8">Modify Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id} className="group hover:bg-primary/5 transition-colors">
                  <TableCell className="py-5 pl-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary border border-primary/20 shadow-sm">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                          {user.name}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-tighter">
                          UID: {user._id.slice(-8)}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                      <Mail size={14} className="text-primary/40" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-5">
                    {getRoleBadge(user.role)}
                  </TableCell>
                  <TableCell className="py-5 text-right pr-8">
                    <select
                      value={user.role || 'user'}
                      onChange={(e) => handleRoleChange(user._id, e.target.value)}
                      disabled={user.role === 'superadmin' && users.filter(u => u.role === 'superadmin').length <= 1}
                      className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-bold ring-offset-background transition-all focus-within:ring-2 focus-within:ring-primary focus-within:border-primary disabled:opacity-50 hover:border-primary/50 cursor-pointer outline-none"
                    >
                      <option value="user">Assign: User</option>
                      <option value="admin">Assign: Admin</option>
                      <option value="superadmin">Assign: Superadmin</option>
                    </select>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <UserCheck size={24} />
                      </div>
                      <p className="font-bold text-muted-foreground">No administrative records found.</p>
                      <Button variant="ghost" size="sm" onClick={() => loadUsers(true)}>Reload System</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-center py-6">
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-40">
           <Shield size={10} />
           Authorized Secure Environment
        </div>
      </div>
    </div>
  );
};

export default SuperAdminUserManagement;
