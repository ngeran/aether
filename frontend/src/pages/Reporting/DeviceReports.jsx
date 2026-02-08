/**
 * =========================================================================================
 * FILE:                  DeviceReports.jsx
 * LOCATION:              frontend/src/pages/Reporting/DeviceReports.jsx
 * PURPOSE:               Device reports workflow component with step-based UI
 *
 * UI PATTERN: Matches Validation.jsx step-based wizard design
 * STEPS: 1. Select Reports → 2. Configure Device → 3. Execute → 4. Results
 * =========================================================================================
 */

import { useState, useEffect, useMemo } from 'react';
import {
    CheckCircle2, Search, ArrowRight, Loader2, FileText,
    AlertCircle, PlayCircle, Terminal, ListChecks, Eye,
    BarChart3, Cpu, Network, Globe, Layers, Timer, Tag
} from 'lucide-react';

// UI Components
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';

// Shared Components
import DeviceAuthFields from '../../shared/DeviceAuthFields';
import DeviceTargetSelector from '../../shared/DeviceTargetSelector';
import LiveLogViewer from '../../components/realTimeProgress/LiveLogViewer';
import ReportResults from './ReportResults';

// Configuration
import { REPORT_TYPES, REPORT_CATEGORIES, getReportTypesByCategory } from './ReportTypesConfig';

// Custom Hooks & Utils
import { useJobWebSocket } from '../../hooks/useJobWebSocket';
import { processLogMessage } from '../../lib/logProcessor';

// API Configuration
const API_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8000';

// Icon mapping for report types
const ICON_MAP = {
    Cpu,
    Network,
    BarChart3,
    Layers,
    Globe,
    Timer,
    Tag
};

// Step configuration
const steps = [
    { id: 1, name: 'Select Reports', icon: ListChecks },
    { id: 2, name: 'Configure Device', icon: Terminal },
    { id: 3, name: 'Execute', icon: PlayCircle },
    { id: 4, name: 'Results', icon: Eye }
];

export default function DeviceReports() {
    console.log('🚀 [DeviceReports] Component mounted');

    // Step navigation
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form state
    const [selectedReportTypes, setSelectedReportTypes] = useState([]);
    const [parameters, setParameters] = useState({
        hostname: '',
        username: 'admin',
        password: ''
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCategories, setExpandedCategories] = useState(new Set());
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Job state
    const [jobId, setJobId] = useState(null);
    const [reportResults, setReportResults] = useState(null);

    // Execution state
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionProgress, setExecutionProgress] = useState(0);
    const [executionComplete, setExecutionComplete] = useState(false);
    const [executionLogs, setExecutionLogs] = useState([]);
    const [activeExecutionStep, setActiveExecutionStep] = useState('');

    // Get report types by category
    const categorizedReports = useMemo(() => getReportTypesByCategory(), []);

    // WebSocket Connection using centralized service
    const { lastMessage, isConnected, sendMessage } = useJobWebSocket();

    // Subscribe to job-specific channel when jobId changes
    useEffect(() => {
        if (!jobId || !sendMessage) return;

        const ws_channel = `job:${jobId}`;
        console.log('🔗 [DeviceReports] Subscribing to WebSocket channel:', ws_channel);

        // Send subscription message
        const subscriptionMessage = {
            type: 'SUBSCRIBE',
            channel: ws_channel
        };

        sendMessage(subscriptionMessage);

    }, [jobId, sendMessage]);

    // Process WebSocket messages
    useEffect(() => {
        if (!lastMessage || !jobId) return;

        console.log('🔍 [DeviceReports] Processing WebSocket message:', lastMessage);

        try {
            let messageData = lastMessage;
            if (typeof lastMessage === 'string') {
                messageData = JSON.parse(lastMessage);
            }

            // Filter messages for our job
            const isJobMessage = messageData.job_id === jobId ||
                                 (messageData.channel && messageData.channel.includes(jobId));

            if (!isJobMessage) return;

            console.log('🔍 [DeviceReports] Processing job message:', messageData);

            // Use the centralized log processor to handle nested JSON and normalization
            let normalizedLog;
            try {
                normalizedLog = processLogMessage(messageData);
            } catch (processorError) {
                console.error('❌ [DeviceReports] Log processor error:', processorError);
                // Create a fallback log entry
                normalizedLog = {
                    id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                    timestamp: new Date().toLocaleTimeString(),
                    type: 'INFO',
                    message: 'Processing report generation message...',
                    isTechnical: false,
                    originalEvent: messageData
                };
            }
            setExecutionLogs(prev => [...prev, normalizedLog]);

            const originalEvent = normalizedLog.originalEvent;

            // Handle different log types from the processor
            if (normalizedLog.type === 'STEP_PROGRESS') {
                const stepName = normalizedLog.message.replace(/^Step \d+: /, '');
                setActiveExecutionStep(stepName);
            }

            // Progress updates (if any)
            if (originalEvent?.data?.progress !== undefined) {
                const progress = parseFloat(originalEvent.data.progress);
                if (!isNaN(progress) && progress >= 0 && progress <= 100) {
                    setExecutionProgress(progress);
                }
            }

            // Report generation complete - store results
            if (normalizedLog.type === 'SUCCESS' && originalEvent?.event_type === 'REPORT_COMPLETE') {
                console.log('✅ [DeviceReports] Report generation completed successfully');

                // Store results for display in Step 4
                if (originalEvent.data) {
                    setReportResults(originalEvent.data);
                }
            }

            // Job completion - transition to results
            if (originalEvent?.status === 'finished' || originalEvent?.type === 'job_status') {
                console.log('🎉 [DeviceReports] Report generation completed');
                setExecutionComplete(true);
                setIsExecuting(false);
                setExecutionProgress(100);
                setCurrentStep(4);
            }

            // Error handling
            if (normalizedLog.type === 'ERROR') {
                console.log('❌ [DeviceReports] Report generation failed');
                setError(normalizedLog.message || 'Report generation failed');
                setIsExecuting(false);
                setExecutionComplete(true);
            }

        } catch (error) {
            console.error('❌ [DeviceReports] Error processing message:', error);
        }
    }, [lastMessage, jobId]);

    // Parameter change handler
    const handleParamChange = (name, value) => {
        setParameters(prev => ({ ...prev, [name]: value }));
    };

    // Report selection handlers
    const toggleCategory = (category) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };

    const toggleReportSelection = (reportId) => {
        setSelectedReportTypes(prev => {
            if (prev.includes(reportId)) {
                return prev.filter(id => id !== reportId);
            } else {
                return [...prev, reportId];
            }
        });
    };

    const selectAllReportsInCategory = (category) => {
        const categoryReports = categorizedReports[category] || [];
        const categoryIds = categoryReports.map(report => report.id);

        setSelectedReportTypes(prev => {
            const newSelection = prev.filter(id => !categoryIds.includes(id));
            return [...newSelection, ...categoryIds];
        });
    };

    // Filter reports
    const filteredReports = useMemo(() => {
        let filtered = { ...categorizedReports };

        if (selectedCategory !== 'all') {
            filtered = { [selectedCategory]: categorizedReports[selectedCategory] || [] };
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = Object.entries(filtered).reduce((acc, [category, reports]) => {
                const matchingReports = reports.filter(report =>
                    report.name?.toLowerCase().includes(query) ||
                    report.description?.toLowerCase().includes(query) ||
                    report.id?.toLowerCase().includes(query)
                );

                if (matchingReports.length > 0) {
                    acc[category] = matchingReports;
                }
                return acc;
            }, {});
        }

        return filtered;
    }, [categorizedReports, selectedCategory, searchQuery]);

    const allCategories = useMemo(() => {
        return Object.keys(categorizedReports);
    }, [categorizedReports]);

    const totalReports = useMemo(() => {
        return Object.values(categorizedReports).flat().length;
    }, [categorizedReports]);

    // Execute report generation
    const executeReports = async () => {
        if (!parameters.hostname || selectedReportTypes.length === 0) {
            setError('Please enter hostname and select at least one report type');
            return;
        }

        try {
            setIsExecuting(true);
            setError(null);
            setReportResults(null);
            setExecutionLogs([]);
            setExecutionProgress(0);

            console.log('🚀 [DeviceReports] Starting report generation execution');

            const response = await fetch(`${API_URL}/api/reports/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    hostname: parameters.hostname,
                    username: parameters.username,
                    password: parameters.password,
                    report_types: selectedReportTypes
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ [DeviceReports] Job started:', data);

            setJobId(data.job_id);

        } catch (error) {
            console.error('❌ [DeviceReports] Error starting report generation:', error);
            setError(error.message);
            setIsExecuting(false);
        }
    };

    // Reset reports
    const resetReports = () => {
        setJobId(null);
        setExecutionProgress(0);
        setIsExecuting(false);
        setExecutionComplete(false);
        setError(null);
        setExecutionLogs([]);
        setActiveExecutionStep('');
        setReportResults(null);
        setCurrentStep(1);
    };

    // Get report icon component
    const getReportIcon = (iconName) => {
        const IconComponent = ICON_MAP[iconName];
        if (IconComponent) {
            return <IconComponent className="w-4 h-4" />;
        }
        return <FileText className="w-4 h-4" />;
    };

    // Loading state
    if (loading && Object.keys(categorizedReports).length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            {/* HEADER */}
            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black sticky top-0 z-10">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-black dark:text-white">Device Reports</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Generate comprehensive device reports (OS, Interfaces, Protocols, MPLS)</p>
                        </div>
                        <div className="flex gap-2">
                            {jobId && (
                                <Button variant="outline" onClick={resetReports}>
                                    Reset
                                </Button>
                            )}
                        </div>
                    </div>
                    {/* Steps */}
                    <div className="flex items-center justify-center space-x-4">
                        {steps.map((step, idx) => (
                            <div key={step.id} className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                                    currentStep === step.id || currentStep > step.id
                                    ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black'
                                    : 'border-gray-300 text-gray-400'
                                }`}>
                                    {currentStep > step.id ? <CheckCircle2 className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                                </div>
                                <span className={`text-xs mt-2 ml-2 font-medium hidden md:block ${currentStep === step.id ? 'text-black dark:text-white' : 'text-gray-400'}`}>{step.name}</span>
                                {idx < steps.length - 1 && <div className="w-12 h-0.5 bg-gray-300 mx-2 hidden md:block" />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-6">
                {/* Error Display */}
                {error && (
                    <div className="mb-4 p-4 border border-red-500 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* STEP 1: REPORT SELECTION */}
                {currentStep === 1 && (
                    <div className="space-y-6">
                        {/* Navigation Button - Moved to top */}
                        <div className="flex justify-end">
                            <Button
                                onClick={() => setCurrentStep(2)}
                                disabled={selectedReportTypes.length === 0}
                                className="bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black"
                            >
                                Configure Device <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>

                        <div className="flex gap-6 h-[calc(100vh-24rem)]">
                        {/* Report Categories */}
                        <Card className="w-1/3">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5" />
                                    Report Categories
                                </CardTitle>
                                <CardDescription>
                                    Choose report types to generate ({selectedReportTypes.length} of {totalReports} selected)
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        placeholder="Search reports..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>

                                {/* Category Filter */}
                                <div className="flex flex-wrap gap-1">
                                    <Badge
                                        variant={selectedCategory === 'all' ? 'default' : 'outline'}
                                        className="cursor-pointer"
                                        onClick={() => setSelectedCategory('all')}
                                    >
                                        All ({totalReports})
                                    </Badge>
                                    {allCategories.map(category => (
                                        <Badge
                                            key={category}
                                            variant={selectedCategory === category ? 'default' : 'outline'}
                                            className="cursor-pointer"
                                            onClick={() => setSelectedCategory(category)}
                                        >
                                            {category} ({(categorizedReports[category] || []).length})
                                        </Badge>
                                    ))}
                                </div>

                                {/* Report List */}
                                <ScrollArea className="h-96 border rounded-md p-3">
                                    <div className="space-y-2">
                                        {Object.entries(filteredReports).map(([category, reports]) => (
                                            <div key={category} className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleCategory(category)}
                                                        className="p-1 h-auto font-medium"
                                                    >
                                                        {expandedCategories.has(category) ?
                                                            <span className="mr-1">▼</span> :
                                                            <span className="mr-1">▶</span>
                                                        }
                                                        {category} ({reports.length})
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => selectAllReportsInCategory(category)}
                                                    >
                                                        Select All
                                                    </Button>
                                                </div>
                                                {expandedCategories.has(category) && (
                                                    <div className="ml-4 space-y-1">
                                                        {reports.map(report => (
                                                            <div
                                                                key={report.id}
                                                                className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                                                onClick={() => toggleReportSelection(report.id)}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedReportTypes.includes(report.id)}
                                                                    onChange={() => {}}
                                                                    className="rounded"
                                                                />
                                                                <div className="flex-1">
                                                                    <div className="font-medium text-sm flex items-center gap-2">
                                                                        {getReportIcon(report.icon)}
                                                                        {report.name}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                        {report.description}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Selected Reports Preview */}
                        <Card className="w-2/3">
                            <CardHeader>
                                <CardTitle>Selected Reports Preview</CardTitle>
                                <CardDescription>
                                    Reports that will be generated for the target device ({selectedReportTypes.length} selected)
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {selectedReportTypes.length > 0 ? (
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium">{selectedReportTypes.length} reports selected:</div>
                                        <ScrollArea className="h-96 border rounded-md p-3">
                                            {selectedReportTypes.map(reportId => {
                                                const report = Object.values(categorizedReports).flat().find(r => r.id === reportId);
                                                return (
                                                    <div key={reportId} className="p-2 border-b last:border-b-0">
                                                        <div className="font-medium text-sm flex items-center gap-2">
                                                            {getReportIcon(report?.icon)}
                                                            {report?.name || reportId}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            {report?.description}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </ScrollArea>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                        <p>No reports selected</p>
                                        <p className="text-sm">Select reports from the categories on the left</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        </div>
                    </div>
                )}

                {/* STEP 2: DEVICE CONFIGURATION */}
                {currentStep === 2 && (
                    <div className="w-full">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Terminal className="w-5 h-5" />
                                    Device Configuration
                                </CardTitle>
                                <CardDescription>
                                    Configure target device and credentials for report generation
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <DeviceTargetSelector
                                        parameters={parameters}
                                        onParamChange={handleParamChange}
                                    />
                                    <DeviceAuthFields
                                        parameters={parameters}
                                        onParamChange={handleParamChange}
                                    />
                                </div>

                                {/* Execution Plan */}
                                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-3">
                                    <div className="flex items-center gap-2 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                                        <Terminal className="w-4 h-4" /> Execution Plan
                                    </div>
                                    <ul className="text-sm space-y-2 text-zinc-600 dark:text-zinc-400 list-disc pl-5">
                                        <li>Connect to <strong>{parameters.hostname || 'target device'}</strong></li>
                                        <li>Generate <strong>{selectedReportTypes.length}</strong> report types</li>
                                        <li>Collect and parse command outputs</li>
                                        <li>Generate comprehensive device report</li>
                                    </ul>
                                </div>

                                <div className="flex justify-between pt-4">
                                    <Button variant="outline" onClick={() => setCurrentStep(1)}>
                                        Back to Report Selection
                                    </Button>
                                    <Button
                                        onClick={() => setCurrentStep(3)}
                                        disabled={!parameters.hostname || selectedReportTypes.length === 0}
                                    >
                                        Proceed to Execute <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* STEP 3: EXECUTE */}
                {currentStep === 3 && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PlayCircle className="w-5 h-5" />
                                    Execute Report Generation
                                </CardTitle>
                                <CardDescription>
                                    {!isExecuting && !executionComplete
                                        ? "Ready to generate device reports"
                                        : "Report generation in progress"}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                {!isExecuting && !executionComplete && (
                                    <div className="space-y-6">
                                        {/* Execution Summary */}
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                                            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
                                                <FileText className="w-5 h-5" />
                                                Execution Summary
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                                                    <div className="text-sm text-gray-600 dark:text-gray-400">Reports to Generate</div>
                                                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                                        {selectedReportTypes.length}
                                                    </div>
                                                </div>
                                                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                                                    <div className="text-sm text-gray-600 dark:text-gray-400">Target Device</div>
                                                    <div className="text-xl font-bold text-green-600 dark:text-green-400 truncate">
                                                        {parameters.hostname}
                                                    </div>
                                                </div>
                                                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                                                    <div className="text-sm text-gray-600 dark:text-gray-400">Report Type</div>
                                                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                                        Device Reports
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Selected Report Types Details */}
                                        <div className="border rounded-lg p-4">
                                            <h5 className="font-medium mb-3 flex items-center gap-2">
                                                <ListChecks className="w-4 h-4" />
                                                Selected Report Types
                                            </h5>
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {selectedReportTypes.map((reportId, index) => {
                                                    const report = Object.values(categorizedReports).flat().find(r => r.id === reportId);
                                                    return (
                                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                    {index + 1}.
                                                                </span>
                                                                <div>
                                                                    <div className="font-medium flex items-center gap-2">
                                                                        {getReportIcon(report?.icon)}
                                                                        {report?.name || reportId}
                                                                    </div>
                                                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                                                        {report?.description}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <Badge variant="secondary" className="text-xs">
                                                                {report?.category || 'General'}
                                                            </Badge>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Device Configuration */}
                                        <div className="border rounded-lg p-4">
                                            <h5 className="font-medium mb-3 flex items-center gap-2">
                                                <Terminal className="w-4 h-4" />
                                                Device Configuration
                                            </h5>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hostname</label>
                                                    <div className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
                                                        {parameters.hostname}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                                                    <div className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
                                                        {parameters.username}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Execution Button */}
                                        <div className="text-center py-4">
                                            <Button
                                                onClick={executeReports}
                                                size="lg"
                                                className="bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black px-8"
                                            >
                                                <PlayCircle className="w-5 h-5 mr-2" />
                                                Generate Reports ({selectedReportTypes.length} types)
                                            </Button>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                                This will connect to the device and generate all selected reports
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {(isExecuting || executionComplete) && (
                                    <div className="space-y-4">
                                        {/* Progress */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>Progress</span>
                                                <span>{executionProgress.toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${executionProgress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Job ID and Status */}
                                        {jobId && (
                                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                                <div>
                                                    Job ID: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{jobId}</code>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    Status:
                                                    <span className={`px-2 py-1 rounded text-xs ${
                                                        isConnected
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                                                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                                                    }`}>
                                                        {isConnected ? 'Connected' : 'Disconnected'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Current Step */}
                                        {activeExecutionStep && (
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                Current step: <span className="font-medium">{activeExecutionStep}</span>
                                            </div>
                                        )}

                                        {/* Live Logs */}
                                        <div className="border rounded-md">
                                            <LiveLogViewer
                                                logs={executionLogs}
                                                title="Report Generation Logs"
                                            />
                                        </div>

                                        {executionComplete && (
                                            <div className="flex justify-center">
                                                <Button onClick={() => setCurrentStep(4)}>
                                                    View Results <Eye className="w-4 h-4 ml-2" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* STEP 4: RESULTS */}
                {currentStep === 4 && reportResults && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                                    Device Report Results
                                </CardTitle>
                                <CardDescription>
                                    Comprehensive device reports and analysis
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ReportResults
                                    results={reportResults}
                                    selectedReportTypes={selectedReportTypes}
                                    deviceHostname={parameters.hostname}
                                    logs={executionLogs}
                                    onNewReports={resetReports}
                                    onBackToSelection={() => setCurrentStep(1)}
                                />
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
