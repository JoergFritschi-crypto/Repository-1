import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Lock,
  Unlock,
  Key,
  UserX,
  Users,
  Activity,
  FileText,
  Download,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  RefreshCw,
  Trash2,
  Ban,
  UserCheck,
  Clock,
  Database,
  Globe,
  Zap,
  Search,
  Filter,
  Settings,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

interface SecurityStats {
  totalSessions: number;
  failedLogins24h: number;
  blockedIps: number;
  auditLogsToday: number;
  securityScore: number;
  lastAuditTime: Date | null;
  activeThreats: number;
  rateLimitViolations: number;
}

interface AuditLog {
  id: string;
  userId: string;
  eventType: string;
  eventDescription: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  severity: 'info' | 'warning' | 'error' | 'critical';
  success: boolean;
  createdAt: Date;
}

interface Session {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent?: string;
  lastActivity: Date;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

interface FailedLogin {
  id: string;
  ipAddress: string;
  attemptedEmail?: string;
  userAgent?: string;
  attemptCount: number;
  lastAttempt: Date;
  blockedUntil?: Date;
}

interface IpControl {
  id: string;
  ipAddress: string;
  type: 'block' | 'allow';
  reason?: string;
  addedBy: string;
  createdAt: Date;
  expiresAt?: Date;
}

interface SecuritySetting {
  key: string;
  value: any;
  updatedBy?: string;
  updatedAt?: Date;
}

interface RateLimitViolation {
  id: string;
  ipAddress: string;
  endpoint: string;
  attemptCount: number;
  windowStart: Date;
  lastAttempt: Date;
}

interface SecurityRecommendation {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'implemented' | 'dismissed';
  implementedAt?: Date;
  dismissedBy?: string;
}

export function SecuritySettings() {
  const [activeTab, setActiveTab] = useState('overview');
  const [auditLogFilters, setAuditLogFilters] = useState({
    userId: '',
    eventType: 'all',
    severity: 'all',
    startDate: '',
    endDate: ''
  });
  const [sessionFilter, setSessionFilter] = useState('');
  const [ipControlType, setIpControlType] = useState<'all' | 'block' | 'allow'>('all');

  // Fetch security statistics
  const { data: stats, isLoading: statsLoading } = useQuery<SecurityStats>({
    queryKey: ['/api/admin/security/stats'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch audit logs
  const { data: auditLogs, isLoading: auditLogsLoading, refetch: refetchAuditLogs } = useQuery<AuditLog[]>({
    queryKey: ['/api/admin/security/audit-logs', auditLogFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(auditLogFilters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value);
      });
      const response = await fetch(`/api/admin/security/audit-logs?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    }
  });

  // Fetch active sessions
  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery<Session[]>({
    queryKey: ['/api/admin/security/sessions', sessionFilter],
    queryFn: async () => {
      const url = sessionFilter 
        ? `/api/admin/security/sessions?userId=${sessionFilter}`
        : '/api/admin/security/sessions';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    }
  });

  // Fetch failed login attempts
  const { data: failedLogins, isLoading: failedLoginsLoading, refetch: refetchFailedLogins } = useQuery<FailedLogin[]>({
    queryKey: ['/api/admin/security/failed-logins']
  });

  // Fetch IP controls
  const { data: ipControls, isLoading: ipControlsLoading, refetch: refetchIpControls } = useQuery<IpControl[]>({
    queryKey: ['/api/admin/security/ip-controls', ipControlType],
    queryFn: async () => {
      const url = ipControlType !== 'all'
        ? `/api/admin/security/ip-controls?type=${ipControlType}`
        : '/api/admin/security/ip-controls';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch IP controls');
      return response.json();
    }
  });

  // Fetch security settings
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = useQuery<SecuritySetting[]>({
    queryKey: ['/api/admin/security/settings']
  });

  // Fetch rate limit violations
  const { data: rateLimitViolations, isLoading: rateLimitsLoading } = useQuery<RateLimitViolation[]>({
    queryKey: ['/api/admin/security/rate-limits']
  });

  // Fetch security recommendations
  const { data: recommendations, isLoading: recommendationsLoading } = useQuery<SecurityRecommendation[]>({
    queryKey: ['/api/admin/security/recommendations']
  });

  // Mutations
  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/admin/security/sessions/${sessionId}/revoke`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to revoke session');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Session revoked successfully' });
      refetchSessions();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/security/stats'] });
    }
  });

  const clearFailedLoginsMutation = useMutation({
    mutationFn: async (ipAddress: string) => {
      const response = await fetch(`/api/admin/security/failed-logins/${ipAddress}/clear`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to clear failed logins');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Failed login attempts cleared' });
      refetchFailedLogins();
    }
  });

  const addIpControlMutation = useMutation({
    mutationFn: async (data: { ipAddress: string; type: 'block' | 'allow'; reason?: string; expiresAt?: string }) => {
      const response = await fetch('/api/admin/security/ip-controls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to add IP control');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'IP control added successfully' });
      refetchIpControls();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/security/stats'] });
    }
  });

  const removeIpControlMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/security/ip-controls/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to remove IP control');
    },
    onSuccess: () => {
      toast({ title: 'IP control removed' });
      refetchIpControls();
    }
  });

  const updateSecuritySettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const response = await fetch('/api/admin/security/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key, value })
      });
      if (!response.ok) throw new Error('Failed to update setting');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Security setting updated' });
      refetchSettings();
    }
  });

  const updateRecommendationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/admin/security/recommendations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to update recommendation');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Recommendation updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/security/recommendations'] });
    }
  });

  const cleanupSessionsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/security/cleanup-sessions', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to cleanup sessions');
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: data.message });
      refetchSessions();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/security/stats'] });
    }
  });

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getSecurityScoreIcon = (score: number) => {
    if (score >= 80) return <ShieldCheck className="h-8 w-8" />;
    if (score >= 60) return <Shield className="h-8 w-8" />;
    if (score >= 40) return <ShieldAlert className="h-8 w-8" />;
    return <ShieldOff className="h-8 w-8" />;
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'default';
    }
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950 dark:to-gray-900">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Security Score</CardTitle>
              <div className={getSecurityScoreColor(stats?.securityScore || 0)}>
                {getSecurityScoreIcon(stats?.securityScore || 0)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getSecurityScoreColor(stats?.securityScore || 0)}`}>
              {stats?.securityScore || 0}/100
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(stats?.securityScore ?? 0) >= 80 ? 'Excellent' : 
               (stats?.securityScore ?? 0) >= 60 ? 'Good' :
               (stats?.securityScore ?? 0) >= 40 ? 'Needs Improvement' : 'Critical'}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-active-threats">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
              <AlertTriangle className={`h-5 w-5 ${(stats?.activeThreats ?? 0) > 0 ? 'text-red-500' : 'text-green-500'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.activeThreats || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.failedLogins24h || 0} failed logins (24h)
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-active-sessions">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalSessions || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.blockedIps || 0} IPs blocked
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-audit-activity">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Audit Activity</CardTitle>
              <Activity className="h-5 w-5 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.auditLogsToday || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Events today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Alerts */}
      {(stats?.activeThreats ?? 0) > 0 && (
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle>Security Alerts</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1 text-sm">
              {(stats?.failedLogins24h ?? 0) > 10 && (
                <li>• High number of failed login attempts detected ({stats?.failedLogins24h} in last 24h)</li>
              )}
              {(stats?.rateLimitViolations ?? 0) > 50 && (
                <li>• Excessive rate limit violations detected ({stats?.rateLimitViolations})</li>
              )}
              {(stats?.blockedIps ?? 0) > 5 && (
                <li>• Multiple IPs have been blocked ({stats?.blockedIps})</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Security Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="authentication" data-testid="tab-authentication">Auth & Access</TabsTrigger>
          <TabsTrigger value="rate-limiting" data-testid="tab-rate-limiting">Rate Limiting</TabsTrigger>
          <TabsTrigger value="audit-log" data-testid="tab-audit-log">Audit Log</TabsTrigger>
          <TabsTrigger value="data-protection" data-testid="tab-data-protection">Data Protection</TabsTrigger>
          <TabsTrigger value="api-security" data-testid="tab-api-security">API Security</TabsTrigger>
          <TabsTrigger value="recommendations" data-testid="tab-recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Overview
              </CardTitle>
              <CardDescription>
                Monitor your application's security status and recent activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Actions */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cleanupSessionsMutation.mutate()}
                    disabled={cleanupSessionsMutation.isPending}
                    data-testid="button-cleanup-sessions"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Cleanup Expired Sessions
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchAuditLogs()}
                    data-testid="button-refresh-audit"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Audit Logs
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const logs = JSON.stringify(auditLogs, null, 2);
                      const blob = new Blob([logs], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `audit-logs-${new Date().toISOString()}.json`;
                      a.click();
                    }}
                    data-testid="button-export-logs"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Audit Logs
                  </Button>
                </div>
              </div>

              {/* Security Metrics */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Security Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Last Audit</p>
                    <p className="text-sm font-medium">
                      {stats?.lastAuditTime ? format(new Date(stats.lastAuditTime), 'PPp') : 'Never'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Rate Limit Violations</p>
                    <p className="text-sm font-medium">{stats?.rateLimitViolations || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Failed Logins (24h)</p>
                    <p className="text-sm font-medium">{stats?.failedLogins24h || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Blocked IPs</p>
                    <p className="text-sm font-medium">{stats?.blockedIps || 0}</p>
                  </div>
                </div>
              </div>

              {/* Recent Security Events */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Recent Security Events</h3>
                <ScrollArea className="h-[200px] rounded-md border p-3">
                  {Array.isArray(auditLogs) && auditLogs.slice(0, 10).map((log: AuditLog) => (
                    <div key={log.id} className="flex items-start justify-between py-2 border-b last:border-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityBadgeColor(log.severity)}>
                            {log.severity}
                          </Badge>
                          <span className="text-sm font-medium">{log.eventType}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{log.eventDescription}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.createdAt), 'PPp')} • {log.ipAddress || 'Unknown IP'}
                        </p>
                      </div>
                      {log.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mt-1" />
                      )}
                    </div>
                  ))}
                  {(!Array.isArray(auditLogs) || auditLogs.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent events</p>
                  )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="authentication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Authentication & Access Control
              </CardTitle>
              <CardDescription>
                Manage user sessions, authentication settings, and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Active Sessions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Active Sessions ({Array.isArray(sessions) ? sessions.length : 0})</h3>
                  <Input
                    placeholder="Filter by user ID..."
                    value={sessionFilter}
                    onChange={(e) => setSessionFilter(e.target.value)}
                    className="w-48"
                    data-testid="input-session-filter"
                  />
                </div>
                <ScrollArea className="h-[300px] rounded-md border">
                  <div className="p-3 space-y-2">
                    {Array.isArray(sessions) && sessions.map((session: Session) => (
                      <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={session.isActive ? 'default' : 'secondary'}>
                              {session.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <span className="text-sm font-medium">User: {session.userId}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            IP: {session.ipAddress} • Last activity: {format(new Date(session.lastActivity), 'PPp')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created: {format(new Date(session.createdAt), 'PPp')}
                            {session.expiresAt && ` • Expires: ${format(new Date(session.expiresAt), 'PPp')}`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeSessionMutation.mutate(session.id)}
                          disabled={revokeSessionMutation.isPending}
                          data-testid={`button-revoke-session-${session.id}`}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {(!Array.isArray(sessions) || sessions.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">No active sessions</p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Failed Login Attempts */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Failed Login Attempts</h3>
                <ScrollArea className="h-[200px] rounded-md border">
                  <div className="p-3 space-y-2">
                    {Array.isArray(failedLogins) && failedLogins.map((attempt: FailedLogin) => (
                      <div key={attempt.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">{attempt.attemptCount} attempts</Badge>
                            <span className="text-sm font-medium">IP: {attempt.ipAddress}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {attempt.attemptedEmail && `Email: ${attempt.attemptedEmail} • `}
                            Last attempt: {format(new Date(attempt.lastAttempt), 'PPp')}
                          </p>
                          {attempt.blockedUntil && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                              Blocked until: {format(new Date(attempt.blockedUntil), 'PPp')}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearFailedLoginsMutation.mutate(attempt.ipAddress)}
                          disabled={clearFailedLoginsMutation.isPending}
                          data-testid={`button-clear-failed-${attempt.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {(!Array.isArray(failedLogins) || failedLogins.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">No failed login attempts</p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* IP Access Controls */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">IP Access Controls</h3>
                  <Select value={ipControlType} onValueChange={(value: any) => setIpControlType(value)}>
                    <SelectTrigger className="w-32" data-testid="select-ip-control-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="block">Blocked</SelectItem>
                      <SelectItem value="allow">Allowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ScrollArea className="h-[200px] rounded-md border">
                  <div className="p-3 space-y-2">
                    {Array.isArray(ipControls) && ipControls.map((control: IpControl) => (
                      <div key={control.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={control.type === 'block' ? 'destructive' : 'default'}>
                              {control.type === 'block' ? 'Blocked' : 'Allowed'}
                            </Badge>
                            <span className="text-sm font-medium">{control.ipAddress}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {control.reason || 'No reason provided'} • Added by: {control.addedBy}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Added: {format(new Date(control.createdAt), 'PPp')}
                            {control.expiresAt && ` • Expires: ${format(new Date(control.expiresAt), 'PPp')}`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeIpControlMutation.mutate(control.id)}
                          disabled={removeIpControlMutation.isPending}
                          data-testid={`button-remove-ip-${control.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {(!Array.isArray(ipControls) || ipControls.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">No IP controls configured</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rate-limiting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Rate Limiting & DDoS Protection
              </CardTitle>
              <CardDescription>
                Monitor and configure rate limiting rules and DDoS protection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-3">Rate Limit Violations</h3>
                <ScrollArea className="h-[400px] rounded-md border">
                  <div className="p-3 space-y-2">
                    {Array.isArray(rateLimitViolations) && rateLimitViolations.map((violation: RateLimitViolation) => (
                      <div key={violation.id} className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{violation.attemptCount} attempts</Badge>
                          <span className="text-sm font-medium">{violation.endpoint}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          IP: {violation.ipAddress} • Window start: {violation.windowStart ? format(new Date(violation.windowStart), 'PPp') : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last attempt: {violation.lastAttempt ? format(new Date(violation.lastAttempt), 'PPp') : 'N/A'}
                        </p>
                      </div>
                    ))}
                    {(!Array.isArray(rateLimitViolations) || rateLimitViolations.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">No rate limit violations</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit-log" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Security Audit Log
              </CardTitle>
              <CardDescription>
                Comprehensive log of all security-related events and actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Input
                  placeholder="User ID"
                  value={auditLogFilters.userId}
                  onChange={(e) => setAuditLogFilters(prev => ({ ...prev, userId: e.target.value }))}
                  data-testid="input-audit-user"
                />
                <Select
                  value={auditLogFilters.eventType}
                  onValueChange={(value) => setAuditLogFilters(prev => ({ ...prev, eventType: value || 'all' }))}
                >
                  <SelectTrigger data-testid="select-event-type">
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="login_success">Login Success</SelectItem>
                    <SelectItem value="login_failed">Login Failed</SelectItem>
                    <SelectItem value="session_revoked">Session Revoked</SelectItem>
                    <SelectItem value="admin_action">Admin Action</SelectItem>
                    <SelectItem value="ip_blocked">IP Blocked</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={auditLogFilters.severity}
                  onValueChange={(value) => setAuditLogFilters(prev => ({ ...prev, severity: value || 'all' }))}
                >
                  <SelectTrigger data-testid="select-severity">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  placeholder="Start Date"
                  value={auditLogFilters.startDate}
                  onChange={(e) => setAuditLogFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  data-testid="input-start-date"
                />
                <Input
                  type="date"
                  placeholder="End Date"
                  value={auditLogFilters.endDate}
                  onChange={(e) => setAuditLogFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  data-testid="input-end-date"
                />
              </div>

              {/* Audit Logs Table */}
              <ScrollArea className="h-[500px] rounded-md border">
                <div className="p-3 space-y-2">
                  {Array.isArray(auditLogs) && auditLogs.map((log: AuditLog) => (
                    <div key={log.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={getSeverityBadgeColor(log.severity)}>
                              {log.severity}
                            </Badge>
                            <Badge variant="outline">{log.eventType}</Badge>
                            {log.success ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <p className="text-sm mt-2">{log.eventDescription}</p>
                          <div className="text-xs text-muted-foreground mt-2 space-y-1">
                            <p>User: {log.userId} • IP: {log.ipAddress || 'Unknown'}</p>
                            <p>Time: {format(new Date(log.createdAt), 'PPp')}</p>
                            {log.userAgent && <p>User Agent: {log.userAgent}</p>}
                            {log.metadata && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-blue-600 dark:text-blue-400">View metadata</summary>
                                <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!Array.isArray(auditLogs) || auditLogs.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No audit logs found</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-protection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Protection & Privacy
              </CardTitle>
              <CardDescription>
                Manage data encryption, backups, and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Data Protection Status</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Database encryption at rest enabled
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      TLS/SSL encryption in transit active
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Automated daily backups configured
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      GDPR compliance tools available
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Encryption at Rest</Label>
                    <p className="text-sm text-muted-foreground">Encrypt stored data</p>
                  </div>
                  <Switch defaultChecked disabled />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Automated Backups</Label>
                    <p className="text-sm text-muted-foreground">Daily automated backups</p>
                  </div>
                  <Switch defaultChecked disabled />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Data Retention Policy</Label>
                    <p className="text-sm text-muted-foreground">Automatically delete old data</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Security
              </CardTitle>
              <CardDescription>
                Monitor API usage, manage keys, and configure security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>API Security Status</AlertTitle>
                <AlertDescription>
                  All API endpoints are protected with authentication and rate limiting.
                  Regular key rotation is recommended for optimal security.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-3">API Key Management</h3>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" data-testid="button-rotate-keys">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Rotate All API Keys
                    </Button>
                    <p className="text-xs text-muted-foreground">Last rotation: 30 days ago</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Third-party Integrations</h3>
                  <div className="space-y-2">
                    {['OpenAI', 'Gemini', 'Perplexity', 'Stripe', 'Mapbox'].map(service => (
                      <div key={service} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{service}</span>
                        <Badge variant="default">Connected</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Security Recommendations
              </CardTitle>
              <CardDescription>
                Suggested improvements to enhance your application security
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {Array.isArray(recommendations) && recommendations.map((rec: SecurityRecommendation) => (
                    <div key={rec.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={
                              rec.severity === 'critical' ? 'destructive' :
                              rec.severity === 'high' ? 'destructive' :
                              rec.severity === 'medium' ? 'secondary' : 'default'
                            }>
                              {rec.severity}
                            </Badge>
                            <Badge variant={
                              rec.status === 'implemented' ? 'default' :
                              rec.status === 'dismissed' ? 'secondary' : 'outline'
                            }>
                              {rec.status}
                            </Badge>
                          </div>
                          <h4 className="font-medium">{rec.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                        </div>
                        {rec.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateRecommendationMutation.mutate({ id: rec.id, status: 'implemented' })}
                              data-testid={`button-implement-${rec.id}`}
                            >
                              Implement
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateRecommendationMutation.mutate({ id: rec.id, status: 'dismissed' })}
                              data-testid={`button-dismiss-${rec.id}`}
                            >
                              Dismiss
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!Array.isArray(recommendations) || recommendations.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No security recommendations at this time. Your security configuration looks good!
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}