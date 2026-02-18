import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Users, Database, Settings, Activity, Lock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { fetchUsers, updateUserRole } from '../../api/users';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const SuperAdminHub = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const token = localStorage.getItem('token');

  const loadData = useCallback(async () => {
    if (!token) {
        setError('Session expired or not found. Please login again.');
        setLoading(false);
        return;
    }

    setLoading(true);
    try {
      const userData = await fetchUsers(token);
      setUsers(userData.data || []);
    } catch (err) {
      console.error('SuperAdmin Load Error:', err);
      setError('System Access Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRoleChange = async (id, newRole) => {
    try {
      await updateUserRole(id, newRole, token);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, role: newRole } : u));
      setSuccess('Access permissions updated for user ID: ' + id.slice(-6));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Permission update failed: ' + err.message);
    }
  };

  if (loading) return <LoadingSpinner fullPage text="Synchronizing Administrative Environment..." />;

  return (
    <div className="min-h-screen bg-muted/20 p-6 lg:p-10 space-y-8 animate-in fade-in duration-700">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Shield className="text-primary-foreground" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground">Command Center</h1>
              <p className="text-muted-foreground font-semibold flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-[10px] bg-background">SYSTEM LEVEL 4</Badge>
                Administrative Controls & System Oversight
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl border-2 font-bold px-6 border-primary/20 hover:bg-primary/5">
            <Activity className="mr-2" size={16} /> System Health
          </Button>
          <Button className="rounded-xl font-bold px-6 shadow-xl shadow-primary/20">
            <Settings className="mr-2" size={16} /> Global Config
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Users" 
          value={users.length} 
          icon={<Users size={20} />} 
          trend="+2 New this week"
          color="primary"
        />
        <StatCard 
          title="System Logs" 
          value="24.8k" 
          icon={<Activity size={20} />} 
          trend="0.02ms Latency"
          color="secondary"
        />
        <StatCard 
          title="Data Integrity" 
          value="100%" 
          icon={<Database size={20} />} 
          trend="Last sync: Just now"
          color="success"
        />
        <StatCard 
          title="Security Alerts" 
          value="0" 
          icon={<Shield size={20} />} 
          trend="Threat level: Low"
          color="destructive"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-2">
          <NavButton 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')}
            icon={<Users size={18} />}
            label="User Management"
            badge={users.length}
          />
          <NavButton 
            active={activeTab === 'security'} 
            onClick={() => setActiveTab('security')}
            icon={<Lock size={18} />}
            label="Access Policies"
          />
          <NavButton 
            active={activeTab === 'audit'} 
            onClick={() => setActiveTab('audit')}
            icon={<Activity size={18} />}
            label="Audit Logs"
          />
          <NavButton 
            active={activeTab === 'database'} 
            onClick={() => setActiveTab('database')}
            icon={<Database size={18} />}
            label="Database Ops"
          />
          
          <div className="pt-8 px-4">
             <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-destructive font-bold text-xs">
                   <AlertTriangle size={14} />
                   Critical Action Zone
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                   Changes made here affect global system state. Proceed with extreme caution.
                </p>
                <Button variant="destructive" size="sm" className="w-full text-[10px] font-black uppercase tracking-widest h-8 rounded-lg">
                   Security Wipe
                </Button>
             </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9">
          <Card className="border-2 border-border dark:border-border/60 shadow-elevation-2 rounded-[2rem] overflow-hidden bg-card/95 dark:bg-card/90 backdrop-blur-xl">
            <CardHeader className="p-8 pb-4">
              <div className="flex justify-between items-end">
                <div>
                   <CardTitle className="text-2xl font-black">Directory Access</CardTitle>
                   <CardDescription className="text-base font-medium">Control user permissions and administrative roles.</CardDescription>
                </div>
                <Badge variant="secondary" className="px-4 py-1 rounded-lg font-bold">
                  {users.length} Identities Managed
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
               {error && (
                 <div className="mx-8 mt-4 p-4 bg-error/10 border border-error/20 rounded-2xl text-error text-xs font-bold flex items-center gap-3">
                    <AlertTriangle size={14} /> {error}
                 </div>
               )}
               {success && (
                 <div className="mx-8 mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-600 text-xs font-bold flex items-center gap-3">
                    <Shield size={14} /> {success}
                 </div>
               )}

               <div className="p-8 px-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="pl-8 py-5 text-[11px] font-black uppercase tracking-widest">Operator</TableHead>
                        <TableHead className="py-5 text-[11px] font-black uppercase tracking-widest">Digital ID</TableHead>
                        <TableHead className="py-5 text-[11px] font-black uppercase tracking-widest">Privilege Level</TableHead>
                        <TableHead className="pr-8 py-5 text-[11px] font-black uppercase tracking-widest text-right">Access Override</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map(user => (
                        <TableRow key={user._id} className="group transition-all hover:bg-primary/[0.03] dark:hover:bg-primary/[0.08]">
                          <TableCell className="pl-8 py-6">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary border border-primary/20 shadow-sm text-sm">
                                 {user.name?.charAt(0).toUpperCase()}
                               </div>
                               <div>
                                  <div className="font-bold text-sm tracking-tight">{user.name}</div>
                                  <div className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-tighter">SINCE: {new Date(user.createdAt).toLocaleDateString()}</div>
                               </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-xs text-muted-foreground flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                               {user.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <RoleBadge role={user.role} />
                          </TableCell>
                          <TableCell className="pr-8 text-right">
                             <select 
                               className="bg-muted/50 dark:bg-muted/30 border-2 border-border dark:border-border/60 rounded-xl px-3 py-1.5 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer transition-all hover:border-primary/40 text-foreground"
                               value={user.role}
                               onChange={(e) => handleRoleChange(user._id, e.target.value)}
                             >
                                <option value="user">USER</option>
                                <option value="admin">ADMIN</option>
                                <option value="superadmin">SUPERADMIN</option>
                             </select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, trend, color }) => {
  const colors = {
    primary: "from-primary/10 to-transparent border-primary/20 text-primary",
    secondary: "from-blue-500/10 to-transparent border-blue-500/20 text-blue-600",
    success: "from-green-500/10 to-transparent border-green-500/20 text-green-600",
    destructive: "from-error/10 to-transparent border-error/20 text-error",
  };

  return (
    <Card className={`border shadow-none bg-gradient-to-br ${colors[color]} rounded-[1.5rem]`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 rounded-lg bg-background/50 backdrop-blur-sm border border-border">
            {icon}
          </div>
          <Badge variant="outline" className="text-[9px] font-black uppercase bg-background/30 backdrop-blur-sm">Live</Badge>
        </div>
        <div className="space-y-1">
          <h3 className="text-3xl font-black tracking-tighter">{value}</h3>
          <p className="text-xs font-bold text-muted-foreground uppercase opacity-70">{title}</p>
        </div>
        <div className="mt-4 pt-4 border-t border-black/5 flex items-center gap-1.5">
           <div className={`w-1 h-1 rounded-full bg-current`} />
           <span className="text-[10px] font-black opacity-80">{trend}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const NavButton = ({ active, icon, label, onClick, badge }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 font-bold text-sm
      ${active 
        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 translate-x-1" 
        : "text-muted-foreground hover:bg-card hover:text-primary hover:translate-x-1 border border-transparent"}
    `}
  >
    <div className="flex items-center gap-3">
      {icon}
      <span>{label}</span>
    </div>
    {badge !== undefined && (
      <Badge variant={active ? "outline" : "secondary"} className={`text-[10px] rounded-lg px-2 ${active ? "bg-white/20 border-white/40 text-white" : ""}`}>
        {badge}
      </Badge>
    )}
  </button>
);

const RoleBadge = ({ role }) => {
  const isSuper = role === 'superadmin';
  const isAdmin = role === 'admin';
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-[10px] uppercase tracking-wider
      ${isSuper ? 'bg-error/10 border-error/20 text-error' : 
        isAdmin ? 'bg-blue-500/10 border-blue-500/20 text-blue-600' : 
        'bg-primary/10 border-primary/20 text-primary'}
    `}>
       <div className={`w-1.5 h-1.5 rounded-full ${isSuper ? 'bg-error' : isAdmin ? 'bg-blue-600' : 'bg-primary'} animate-pulse`} />
       {role}
    </div>
  );
};

export default SuperAdminHub;
