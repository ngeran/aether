/**
 * =========================================================================================
 * FILE:                  ReportResults.jsx
 * LOCATION:              frontend/src/pages/Reporting/ReportResults.jsx
 * PURPOSE:               Display device report generation results
 * =========================================================================================
 */

import { useState } from 'react';
import {
    Download, FileText, CheckCircle2, XCircle, AlertCircle,
    ChevronDown, ChevronRight, RefreshCw, Search, Copy, Check
} from 'lucide-react';

// UI Components
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

export default function ReportResults({
    results,
    selectedReportTypes,
    deviceHostname,
    logs,
    onNewReports,
    onBackToSelection
}) {
    const [expandedReports, setExpandedReports] = useState(new Set());
    const [activeTab, setActiveTab] = useState('reports');
    const [copiedId, setCopiedId] = useState(null);

    // Toggle report expansion
    const toggleReport = (reportId) => {
        const newExpanded = new Set(expandedReports);
        if (newExpanded.has(reportId)) {
            newExpanded.delete(reportId);
        } else {
            newExpanded.add(reportId);
        }
        setExpandedReports(newExpanded);
    };

    // Copy to clipboard
    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Download single report as JSON
    const downloadReport = (reportId, reportData) => {
        const dataStr = JSON.stringify(reportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${deviceHostname}_${reportId}_report.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Download all reports as ZIP (simplified as individual JSON downloads for now)
    const downloadAllReports = () => {
        if (!results || !results.reports) return;

        Object.entries(results.reports).forEach(([reportId, reportData]) => {
            setTimeout(() => {
                downloadReport(reportId, reportData);
            }, 100 * Object.keys(results.reports).indexOf(reportId));
        });
    };

    // Get report status icon and color
    const getReportStatus = (report) => {
        if (report.status === 'success') {
            return {
                icon: CheckCircle2,
                color: 'text-green-600',
                bgColor: 'bg-green-50 dark:bg-green-900/20',
                borderColor: 'border-green-200 dark:border-green-800',
                badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
            };
        } else if (report.status === 'error') {
            return {
                icon: XCircle,
                color: 'text-red-600',
                bgColor: 'bg-red-50 dark:bg-red-900/20',
                borderColor: 'border-red-200 dark:border-red-800',
                badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
            };
        } else {
            return {
                icon: AlertCircle,
                color: 'text-yellow-600',
                bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
                borderColor: 'border-yellow-200 dark:border-yellow-800',
                badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
            };
        }
    };

    // Render report data based on type
    const renderReportData = (report) => {
        if (!report.data) {
            return React.createElement('div', { className: "text-gray-500 dark:text-gray-400" }, 'No data available');
        }

        // If data is a string, render as preformatted text
        if (typeof report.data === 'string') {
            return React.createElement('pre', {
                className: "bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap"
            }, report.data);
        }

        // If data is an object, render as formatted JSON
        if (typeof report.data === 'object') {
            return React.createElement('pre', {
                className: "bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto"
            }, JSON.stringify(report.data, null, 2));
        }

        return React.createElement('div', { className: "text-gray-500 dark:text-gray-400" },
            'Unsupported data format'
        );
    };

    const hasResults = results && results.reports && Object.keys(results.reports).length > 0;

    return React.createElement('div', { className: "space-y-6" },
        // Summary Section
        React.createElement(Card, null,
            React.createElement(CardHeader, null,
                React.createElement(CardTitle, { className: "flex items-center justify-between" },
                    React.createElement('div', { className: "flex items-center gap-2" },
                        React.createElement(FileText, { className: "w-6 h-6 text-primary" }),
                        'Report Generation Summary'
                    ),
                    React.createElement('div', { className: "flex gap-2" },
                        React.createElement(Button, {
                            variant: "outline",
                            size: "sm",
                            onClick: downloadAllReports,
                            disabled: !hasResults
                        },
                            React.createElement(Download, { className: "w-4 h-4 mr-2" }),
                            'Download All'
                        ),
                        React.createElement(Button, {
                            variant: "outline",
                            size: "sm",
                            onClick: onBackToSelection
                        },
                            React.createElement(RefreshCw, { className: "w-4 h-4 mr-2" }),
                            'New Reports'
                        )
                    )
                ),
                React.createElement(CardDescription, null,
                    hasResults
                        ? `Generated ${Object.keys(results.reports).length} reports for ${deviceHostname}`
                        : 'No reports were generated'
                )
            ),
            hasResults && React.createElement(CardContent, null,
                React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-4 gap-4" },
                    // Total Reports
                    React.createElement('div', { className: "bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800" },
                        React.createElement('div', { className: "text-sm text-blue-900 dark:text-blue-100 font-medium" }, 'Total Reports'),
                        React.createElement('div', { className: "text-2xl font-bold text-blue-600 dark:text-blue-400" },
                            Object.keys(results.reports).length
                        )
                    ),
                    // Successful
                    React.createElement('div', { className: "bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800" },
                        React.createElement('div', { className: "text-sm text-green-900 dark:text-green-100 font-medium" }, 'Successful'),
                        React.createElement('div', { className: "text-2xl font-bold text-green-600 dark:text-green-400" },
                            Object.values(results.reports).filter(r => r.status === 'success').length
                        )
                    ),
                    // Failed
                    React.createElement('div', { className: "bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800" },
                        React.createElement('div', { className: "text-sm text-red-900 dark:text-red-100 font-medium" }, 'Failed'),
                        React.createElement('div', { className: "text-2xl font-bold text-red-600 dark:text-red-400" },
                            Object.values(results.reports).filter(r => r.status === 'error').length
                        )
                    ),
                    // Duration
                    results.duration && React.createElement('div', { className: "bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800" },
                        React.createElement('div', { className: "text-sm text-purple-900 dark:text-purple-100 font-medium" }, 'Duration'),
                        React.createElement('div', { className: "text-2xl font-bold text-purple-600 dark:text-purple-400" },
                            `${results.duration}s`
                        )
                    )
                )
            )
        ),

        // Tabs for Reports and Logs
        React.createElement(Tabs, { value: activeTab, onValueChange: setActiveTab },
            React.createElement(TabsList, { className: "grid w-full grid-cols-2" },
                React.createElement(TabsTrigger, { value: "reports" },
                    React.createElement(FileText, { className: "w-4 h-4 mr-2" }),
                    'Reports'
                ),
                React.createElement(TabsTrigger, { value: "logs" },
                    React.createElement(Search, { className: "w-4 h-4 mr-2" }),
                    'Execution Logs'
                )
            ),

            // Reports Tab
            React.createElement(TabsContent, { value: "reports", className: "space-y-4" },
                hasResults ? React.createElement(ScrollArea, { className: "h-[600px]" },
                    React.createElement('div', { className: "space-y-4 pr-4" },
                        Object.entries(results.reports).map(([reportId, report]) => {
                            const status = getReportStatus(report);
                            const StatusIcon = status.icon;
                            const isExpanded = expandedReports.has(reportId);

                            return React.createElement(Card, {
                                key: reportId,
                                className: `${status.bgColor} ${status.borderColor}`
                            },
                                React.createElement(CardHeader, {
                                    className: "cursor-pointer",
                                    onClick: () => toggleReport(reportId)
                                },
                                    React.createElement('div', { className: "flex items-center justify-between" },
                                        React.createElement('div', { className: "flex items-center gap-3" },
                                            isExpanded
                                                ? React.createElement(ChevronDown, { className: "w-5 h-5" })
                                                : React.createElement(ChevronRight, { className: "w-5 h-5" }),
                                            React.createElement(StatusIcon, { className: `w-5 h-5 ${status.color}` }),
                                            React.createElement('div', null,
                                                React.createElement(CardTitle, { className: "text-lg" }, report.name || reportId),
                                                report.description && React.createElement(CardDescription, null, report.description)
                                            )
                                        ),
                                        React.createElement('div', { className: "flex items-center gap-2" },
                                            React.createElement(Badge, { className: status.badge }, report.status),
                                            React.createElement(Button, {
                                                variant: "ghost",
                                                size: "sm",
                                                onClick: (e) => {
                                                    e.stopPropagation();
                                                    downloadReport(reportId, report.data);
                                                }
                                            },
                                                React.createElement(Download, { className: "w-4 h-4" })
                                            )
                                        )
                                    )
                                ),
                                isExpanded && React.createElement(CardContent, { className: "space-y-4" },
                                    // Report metadata
                                    React.createElement('div', { className: "grid grid-cols-2 gap-4 text-sm" },
                                        report.timestamp && React.createElement('div', null,
                                            React.createElement('span', { className: "font-medium" }, 'Generated: '),
                                            new Date(report.timestamp).toLocaleString()
                                        ),
                                        report.command && React.createElement('div', null,
                                            React.createElement('span', { className: "font-medium" }, 'Command: '),
                                            React.createElement('code', { className: "bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs" },
                                                report.command
                                            )
                                        )
                                    ),

                                    // Error message if any
                                    report.error && React.createElement('div', {
                                        className: "p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                                    },
                                        React.createElement('div', { className: "flex items-center gap-2 text-red-800 dark:text-red-200 font-medium" },
                                            React.createElement(XCircle, { className: "w-4 h-4" }),
                                            'Error'
                                        ),
                                        React.createElement('p', { className: "text-sm text-red-700 dark:text-red-300 mt-1" }, report.error)
                                    ),

                                    // Report data
                                    React.createElement('div', null,
                                        React.createElement('div', { className: "flex items-center justify-between mb-2" },
                                            React.createElement('h5', { className: "font-medium" }, 'Report Data'),
                                            React.createElement(Button, {
                                                variant: "ghost",
                                                size: "sm",
                                                onClick: () => copyToClipboard(
                                                    typeof report.data === 'string' ? report.data : JSON.stringify(report.data, null, 2),
                                                    reportId
                                                )
                                            },
                                                copiedId === reportId
                                                    ? React.createElement(Check, { className: "w-4 h-4" })
                                                    : React.createElement(Copy, { className: "w-4 h-4" })
                                            )
                                        ),
                                        renderReportData(report)
                                    )
                                )
                            );
                        })
                    )
                ) : React.createElement(Card, null,
                    React.createElement(CardContent, { className: "py-12 text-center" },
                        React.createElement(AlertCircle, { className: "w-12 h-12 mx-auto mb-4 text-gray-400" }),
                        React.createElement('p', { className: "text-gray-600 dark:text-gray-400" }, 'No reports available')
                    )
                )
            ),

            // Logs Tab
            React.createElement(TabsContent, { value: "logs" },
                React.createElement(Card, null,
                    React.createElement(CardHeader, null,
                        React.createElement(CardTitle, null, 'Execution Logs'),
                        React.createElement(CardDescription, null,
                            `Total log entries: ${logs.length}`
                        )
                    ),
                    React.createElement(CardContent, null,
                        React.createElement(ScrollArea, { className: "h-[600px]" },
                            React.createElement('div', { className: "space-y-2 pr-4" },
                                logs.map((log, index) => {
                                    let logColor = 'text-gray-600 dark:text-gray-400';
                                    let logBg = 'bg-gray-50 dark:bg-gray-800';

                                    if (log.type === 'ERROR') {
                                        logColor = 'text-red-600 dark:text-red-400';
                                        logBg = 'bg-red-50 dark:bg-red-900/20';
                                    } else if (log.type === 'SUCCESS') {
                                        logColor = 'text-green-600 dark:text-green-400';
                                        logBg = 'bg-green-50 dark:bg-green-900/20';
                                    } else if (log.type === 'WARNING') {
                                        logColor = 'text-yellow-600 dark:text-yellow-400';
                                        logBg = 'bg-yellow-50 dark:bg-yellow-900/20';
                                    }

                                    return React.createElement('div', {
                                        key: log.id || index,
                                        className: `${logBg} p-3 rounded-lg border`
                                    },
                                        React.createElement('div', { className: "flex items-start justify-between gap-2" },
                                            React.createElement('div', { className: "flex-1" },
                                                React.createElement('div', { className: "flex items-center gap-2 mb-1" },
                                                    React.createElement('span', { className: "text-xs font-mono text-gray-500" },
                                                        log.timestamp
                                                    ),
                                                    React.createElement(Badge, {
                                                        variant: "outline",
                                                        className: "text-xs"
                                                    }, log.type)
                                                ),
                                                React.createElement('p', { className: `text-sm ${logColor}` }, log.message)
                                            )
                                        )
                                    );
                                })
                            )
                        )
                    )
                )
            )
        ),

        // Action Buttons
        React.createElement('div', { className: "flex justify-between pt-4" },
            React.createElement(Button, {
                variant: "outline",
                onClick: onNewReports
            },
                React.createElement(RefreshCw, { className: "w-4 h-4 mr-2" }),
                'Generate New Reports'
            ),
            React.createElement(Button, {
                onClick: onBackToSelection
            },
                'Back to Selection'
            )
        )
    );
}
