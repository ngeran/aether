/**
 * Service Health Card Component
 * Displays real-time service status with animated indicators
 */

import { CheckCircle2, XCircle, AlertCircle, Clock, Activity } from 'lucide-react';

export function ServiceHealthCard({ services = [], loading = false }) {
    if (loading) {
        return (
            <div className="bg-card border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Service Health</h3>
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                </div>
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted/10 rounded-lg animate-pulse">
                            <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-muted rounded-full" />
                                <div className="space-y-1">
                                    <div className="h-4 bg-muted rounded w-24" />
                                    <div className="h-3 bg-muted rounded w-16" />
                                </div>
                            </div>
                            <div className="h-6 w-20 bg-muted rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'healthy':
            case 'running':
                return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />;
            case 'unhealthy':
            case 'stopped':
            case 'error':
                return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
            case 'degraded':
            case 'warning':
                return <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
            case 'pending':
            case 'starting':
                return <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />;
            default:
                return <Activity className="w-4 h-4 text-gray-400" />;
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            healthy: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
            running: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
            unhealthy: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
            stopped: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
            error: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
            degraded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
            warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
            pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
            starting: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        };

        const statusLabels = {
            healthy: 'Healthy',
            running: 'Running',
            unhealthy: 'Unhealthy',
            stopped: 'Stopped',
            error: 'Error',
            degraded: 'Degraded',
            warning: 'Warning',
            pending: 'Pending',
            starting: 'Starting',
        };

        const className = badges[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300';
        const label = statusLabels[status] || status;

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
                {label}
            </span>
        );
    };

    const overallStatus = services.length > 0 && services.every(s => s.status === 'healthy' || s.status === 'running')
        ? 'healthy'
        : services.some(s => s.status === 'unhealthy' || s.status === 'error')
        ? 'unhealthy'
        : 'degraded';

    return (
        <div className="bg-card border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Service Health
                </h3>
                <div className="flex items-center gap-2">
                    {getStatusIcon(overallStatus)}
                    <span className="text-sm text-muted-foreground">
                        {services.filter(s => s.status === 'healthy' || s.status === 'running').length} / {services.length}
                    </span>
                </div>
            </div>

            <div className="space-y-2">
                {services.map((service, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/10 rounded-lg hover:bg-muted/20 transition-colors"
                    >
                        <div className="flex items-center space-x-3 flex-1">
                            <div className="relative">
                                {getStatusIcon(service.status)}
                                {(service.status === 'healthy' || service.status === 'running') && (
                                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-ping" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{service.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {service.responseTime && (
                                <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Response</p>
                                    <p className="text-sm font-mono">{service.responseTime}</p>
                                </div>
                            )}
                            {service.uptime && (
                                <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Uptime</p>
                                    <p className="text-sm font-mono">{service.uptime}</p>
                                </div>
                            )}
                            {getStatusBadge(service.status)}
                        </div>
                    </div>
                ))}
            </div>

            {services.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No service data available</p>
                </div>
            )}
        </div>
    );
}

export function ServiceHealthMini({ service }) {
    const getStatusColor = (status) => {
        switch (status) {
            case 'healthy':
            case 'running':
                return 'bg-green-500';
            case 'unhealthy':
            case 'stopped':
            case 'error':
                return 'bg-red-500';
            case 'degraded':
            case 'warning':
                return 'bg-yellow-500';
            case 'pending':
            case 'starting':
                return 'bg-blue-500 animate-pulse';
            default:
                return 'bg-gray-400';
        }
    };

    return (
        <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${getStatusColor(service?.status)}`} />
            <span className="text-sm text-muted-foreground">{service?.name || 'Unknown'}</span>
        </div>
    );
}
