/**
 * Modern Dashboard Component
 * Provides a holistic view of the Aether platform with real-time metrics
 */

import { useState } from 'react';
import { RefreshCw, Activity, Clock, Settings } from 'lucide-react';

// UI Components
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

// Dashboard Components
import { QuickStatCard } from '../components/dashboard/QuickStatCard';
import { ServiceHealthCard } from '../components/dashboard/ServiceHealthCard';
import { ServiceHealthMini } from '../components/dashboard/ServiceHealthCard';
import {
    SkeletonCard,
    StatCardSkeleton,
    ActivityFeedSkeleton,
    ServiceHealthSkeleton
} from '../components/dashboard/SkeletonCard';

// Hooks
import { useDashboardData } from '../hooks/useDashboardData';

// Icons
import {
    FileText,
    CheckCircle2,
    Zap,
    Server,
    AlertCircle,
    TrendingUp,
    Hourglass
} from 'lucide-react';

export default function Dashboard() {
    const { data, loading, error, lastUpdated, refresh, isStale } = useDashboardData(30000);
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    };

    // Get greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            {/* Header Section */}
            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
                <div className="container mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-black dark:text-white mb-1">
                                {getGreeting()}, welcome back! 👋
                            </h1>
                            <p className="text-muted-foreground">
                                Here's what's happening with your Aether platform today
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {lastUpdated && (
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Updated {new Date(lastUpdated).toLocaleTimeString()}
                                </div>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={refreshing}
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-6">
                {error && (
                    <div className="mb-6 p-4 border border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm">Error loading dashboard: {error}</p>
                    </div>
                )}

                {/* Quick Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    {loading ? (
                        <>
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                        </>
                    ) : (
                        <>
                            <QuickStatCard
                                title="Jobs Today"
                                value={data?.stats?.jobs_today || 0}
                                icon={FileText}
                                trend={data?.stats?.trends?.jobs_today_change?.includes('+') ? 'up' : 'down'}
                                trendValue={data?.stats?.trends?.jobs_today_change}
                                description="Executed in last 24h"
                                color="blue"
                            />
                            <QuickStatCard
                                title="Success Rate"
                                value={`${data?.stats?.success_rate || 0}%`}
                                icon={CheckCircle2}
                                trend="up"
                                trendValue={data?.stats?.trends?.success_rate_change}
                                description="Job success percentage"
                                color="green"
                            />
                            <QuickStatCard
                                title="Active Connections"
                                value={data?.stats?.active_connections || 0}
                                icon={Zap}
                                description="WebSocket clients"
                                color="purple"
                            />
                            <QuickStatCard
                                title="Avg Duration"
                                value={`${data?.stats?.avg_job_duration || 0}s`}
                                icon={Hourglass}
                                trend={data?.stats?.trends?.avg_duration_change?.includes('-') ? 'up' : 'down'}
                                trendValue={data?.stats?.trends?.avg_duration_change}
                                description="Per job"
                                color="orange"
                            />
                        </>
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Service Health - Takes 2 columns */}
                    <div className="lg:col-span-2">
                        {loading ? (
                            <ServiceHealthSkeleton />
                        ) : (
                            <ServiceHealthCard services={data?.health || []} />
                        )}
                    </div>

                    {/* Mini Stats / Summary */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">
                                    Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {loading ? (
                                    <div className="space-y-2">
                                        {Array.from({ length: 4 }).map((_, i) => (
                                            <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Total Jobs</span>
                                            <span className="font-semibold">{data?.stats?.total_jobs || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">This Week</span>
                                            <span className="font-semibold">{data?.stats?.jobs_this_week || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">This Month</span>
                                            <span className="font-semibold">{data?.stats?.jobs_this_month || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Pending Jobs</span>
                                            <span className="font-semibold">{data?.stats?.pending_jobs || 0}</span>
                                        </div>
                                        <div className="pt-2 border-t">
                                            <div className="flex items-center justify-center">
                                                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" />
                                                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                                    +12% from last week
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Recent Jobs Table */}
                <div className="mb-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Recent Jobs</CardTitle>
                                <Badge variant="outline">Last 10</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="flex space-x-4 p-4 bg-muted/10 rounded-lg animate-pulse">
                                            <div className="h-4 bg-muted rounded w-1/4" />
                                            <div className="h-4 bg-muted rounded w-1/4" />
                                            <div className="h-4 bg-muted rounded w-1/4" />
                                            <div className="h-4 bg-muted rounded w-1/6" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {data?.recentJobs?.map((job) => (
                                        <div
                                            key={job.job_id}
                                            className="flex items-center justify-between p-4 bg-muted/10 rounded-lg hover:bg-muted/20 transition-colors"
                                        >
                                            <div className="flex-1 grid grid-cols-4 gap-4">
                                                <div className="font-mono text-sm">{job.job_id}</div>
                                                <div className="text-sm">{job.job_type}</div>
                                                <div className="text-sm">{job.device}</div>
                                                <div className="flex items-center gap-2">
                                                    {job.status === 'completed' && (
                                                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                                                            Completed
                                                        </Badge>
                                                    )}
                                                    {job.status === 'running' && (
                                                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                                            Running
                                                        </Badge>
                                                    )}
                                                    {job.status === 'failed' && (
                                                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                                                            Failed
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="ml-4 text-sm text-muted-foreground">
                                                {job.duration ? `${job.duration}s` : '-'}
                                            </div>
                                        </div>
                                    ))}
                                    {(!data?.recentJobs || data.recentJobs.length === 0) && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                            <p>No recent jobs</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Platform Info Cards - Bottom Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">WebSocket Hub</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                                    <span>Running on port 3100</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Real-time communication powered by Rust
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">FastAPI Gateway</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                                    <span>Running on port 8000</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    REST API and automation endpoints
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Message Broker</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                                    <span>Redis Pub/Sub active</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Job queuing and real-time messaging
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
