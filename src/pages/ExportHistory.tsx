import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Cloud, Server, RefreshCw, ExternalLink, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ExportRecord {
  id: string;
  platform: string;
  collection: string;
  status: string;
  external_id: string | null;
  external_url: string | null;
  config_summary: any;
  error_message: string | null;
  exported_at: string;
  synced_at: string | null;
}

export default function ExportHistory() {
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  useEffect(() => {
    fetchExports();
  }, [platformFilter]);

  const fetchExports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('export_history')
        .select('*')
        .order('exported_at', { ascending: false })
        .limit(100);

      if (platformFilter !== 'all') {
        query = query.eq('platform', platformFilter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setExports((data as ExportRecord[]) || []);
    } catch (error: any) {
      console.error('Failed to fetch exports:', error);
      toast.error('Failed to load export history');
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'mongodb':
        return <Database className="h-4 w-4 text-green-500" />;
      case 'aws':
        return <Cloud className="h-4 w-4 text-orange-500" />;
      case 'azure':
        return <Cloud className="h-4 w-4 text-blue-500" />;
      case 'mysql':
        return <Server className="h-4 w-4 text-blue-400" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Synced
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="secondary">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pending Sync
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case 'mongodb': return 'MongoDB';
      case 'aws': return 'AWS S3';
      case 'azure': return 'Azure Blob';
      case 'mysql': return 'MySQL';
      default: return platform;
    }
  };

  const exportStats = {
    total: exports.length,
    synced: exports.filter(e => e.status === 'completed').length,
    pending: exports.filter(e => e.status === 'pending' || e.status === 'processing').length,
    failed: exports.filter(e => e.status === 'failed').length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Export History</h1>
          <p className="text-muted-foreground">Track all data exports to external databases</p>
        </div>
        <Button onClick={fetchExports} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Exports</CardDescription>
            <CardTitle className="text-2xl">{exportStats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Synced</CardDescription>
            <CardTitle className="text-2xl text-green-500">{exportStats.synced}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl text-yellow-500">{exportStats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-2xl text-red-500">{exportStats.failed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter & Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Export Records</CardTitle>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="mongodb">MongoDB</SelectItem>
                <SelectItem value="aws">AWS S3</SelectItem>
                <SelectItem value="azure">Azure Blob</SelectItem>
                <SelectItem value="mysql">MySQL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : exports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No exports found. Use the Export button on any page to sync data to external databases.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>Collection</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>External ID</TableHead>
                  <TableHead>Exported At</TableHead>
                  <TableHead>Synced At</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exports.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(exp.platform)}
                        {getPlatformLabel(exp.platform)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {exp.collection}
                      </code>
                    </TableCell>
                    <TableCell>{getStatusBadge(exp.status)}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground font-mono">
                        {exp.external_id ? exp.external_id.slice(0, 20) + '...' : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {format(new Date(exp.exported_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      {exp.synced_at 
                        ? format(new Date(exp.synced_at), 'MMM d, yyyy HH:mm')
                        : <span className="text-muted-foreground">-</span>
                      }
                    </TableCell>
                    <TableCell>
                      {exp.external_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (exp.external_url?.startsWith('http')) {
                              window.open(exp.external_url, '_blank');
                            } else {
                              navigator.clipboard.writeText(exp.external_url || '');
                              toast.success('URL copied to clipboard');
                            }
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
