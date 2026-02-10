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
    CheckCircle2, ArrowRight, Loader2, FileText,
    AlertCircle, PlayCircle, Terminal, ListChecks, Eye,
    BarChart3, Cpu, Network, Layers, Timer, Tag, ChevronDown, ChevronRight,
    CheckSquare, Square
} from 'lucide-react';

// UI Components
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';

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
    Globe: Network,
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

            const isJobMessage = messageData.job_id === jobId ||
                                 (messageData.channel && messageData.channel.includes(jobId));

            if (!isJobMessage) return;

            console.log('🔍 [DeviceReports] Processing job message:', messageData);

            let normalizedLog;
            try {
                normalizedLog = processLogMessage(messageData);
            } catch (processorError) {
                console.error('❌ [DeviceReports] Log processor error:', processorError);
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

            if (normalizedLog.type === 'STEP_PROGRESS') {
                const stepName = normalizedLog.message.replace(/^Step \d+: /, '');
                setActiveExecutionStep(stepName);
            }

            if (originalEvent?.data?.progress !== undefined) {
                const progress = parseFloat(originalEvent.data.progress);
                if (!isNaN(progress) && progress >= 0 && progress <= 100) {
                    setExecutionProgress(progress);
                }
            }

            if (normalizedLog.type === 'SUCCESS' && originalEvent?.event_type === 'REPORT_COMPLETE') {
                console.log('✅ [DeviceReports] Report generation completed successfully');
                if (originalEvent.data) {
                    setReportResults(originalEvent.data);
                }
            }

            if (originalEvent?.status === 'finished' || originalEvent?.type === 'job_status') {
                console.log('🎉 [DeviceReports] Report generation completed');
                setExecutionComplete(true);
                setIsExecuting(false);
                setExecutionProgress(100);
                setCurrentStep(4);
            }

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

    // Filter reports by category
    const filteredReports = useMemo(() => {
        if (selectedCategory === 'all') {
            return categorizedReports;
        }
        return { [selectedCategory]: categorizedReports[selectedCategory] || [] };
    }, [categorizedReports, selectedCategory]);

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
            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black sticky top-0 z-10 backdrop-blur-sm bg-white/95 dark:bg-black/95">
                <div className="container mx-auto px-6 py-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-black dark:text-white mb-2">Device Reports</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Generate comprehensive device reports (OS, Interfaces, Protocols, MPLS)
                            </p>
                        </div>
                        <div className="flex gap-3">
                            {jobId && (
                                <Button variant="outline" onClick={resetReports} className="card-hover">
                                    Reset
                                </Button>
                            )}
                        </div>
                    </div>
                    {/* Steps */}
                    <div className="flex items-center justify-center space-x-2 sm:space-x-4">
                        {steps.map((step, idx) => (
                            <div key={step.id} className="flex items-center">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-2xl border-2 transition-all duration-300 ${
                                    currentStep === step.id || currentStep > step.id
                                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                                    : 'border-gray-300 dark:border-gray-700 text-gray-400'
                                }`}>
                                    {currentStep > step.id ? (
                                        <CheckCircle2 className="w-6 h-6" />
                                    ) : (
                                        <step.icon className="w-6 h-6" />
                                    )}
                                </div>
                                <span className={`text-sm font-medium hidden sm:block transition-colors ${
                                    currentStep === step.id ? 'text-black dark:text-white' : 'text-gray-400'
                                }`}>{step.name}</span>
                                {idx < steps.length - 1 && (
                                    <div className={`w-16 h-0.5 hidden sm:block transition-all duration-300 ${
                                        currentStep > step.id ? 'bg-gradient-to-r from-cyan-500 to-blue-600' : 'bg-gray-300 dark:bg-gray-700'
                                    }`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8">
                {/* Error Display */}
                {error && (
                    <div className="mb-6 p-4 border-2 border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 fade-in">
                        <AlertCircle className="w-6 h-6 flex-shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                {/* STEP 1: REPORT SELECTION */}
                {currentStep === 1 && (
                    <div className="space-y-6 fade-in">
                        {/* Navigation Button */}
                        <div className="flex justify-end">
                            <Button
                                onClick={() => setCurrentStep(2)}
                                disabled={selectedReportTypes.length === 0}
                                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 transition-all duration-300"
                                size="lg"
                            >
                                Configure Device
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Report Categories Panel */}
                            <div className="w-full lg:w-2/5 glass-card rounded-2xl p-6 card-hover">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold flex items-center gap-3 text-black dark:text-white">
                                        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                                            <BarChart3 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                                        </div>
                                        Report Categories
                                    </h2>
                                    <Badge variant="outline" className="text-sm">
                                        {selectedReportTypes.length} / {totalReports}
                                    </Badge>
                                </div>

                                {/* Category Filter Pills */}
                                <div className="flex flex-wrap gap-2 mb-6">
                                    <Badge
                                        variant={selectedCategory === 'all' ? 'default' : 'outline'}
                                        className={`px-4 py-2 cursor-pointer transition-all duration-200 ${
                                            selectedCategory === 'all'
                                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                        onClick={() => setSelectedCategory('all')}
                                    >
                                        All ({totalReports})
                                    </Badge>
                                    {allCategories.map(category => (
                                        <Badge
                                            key={category}
                                            variant={selectedCategory === category ? 'default' : 'outline'}
                                            className={`px-4 py-2 cursor-pointer transition-all duration-200 ${
                                                selectedCategory === category
                                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg'
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }`}
                                            onClick={() => setSelectedCategory(category)}
                                        >
                                            {category} ({(categorizedReports[category] || []).length})
                                        </Badge>
                                    ))}
                                </div>

                                {/* Report List - Modern Scroll */}
                                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                    {Object.entries(filteredReports).map(([category, reports]) => (
                                        <div
                                            key={category}
                                            className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-black/50 overflow-hidden transition-all duration-200 hover:border-cyan-500/50 hover:shadow-lg"
                                        >
                                            {/* Category Header */}
                                            <div
                                                className="flex items-center justify-between p-4 cursor-pointer bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-black hover:from-cyan-50/50 dark:hover:from-cyan-950/50 transition-all"
                                                onClick={() => toggleCategory(category)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {expandedCategories.has(category) ? (
                                                        <ChevronDown className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                                                    ) : (
                                                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" />
                                                    )}
                                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                        {category}
                                                    </span>
                                                    <Badge variant="secondary" className="ml-2">
                                                        {reports.length}
                                                    </Badge>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/20"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        selectAllReportsInCategory(category);
                                                    }}
                                                >
                                                    Select All
                                                </Button>
                                            </div>

                                            {/* Expandable Report List */}
                                            {expandedCategories.has(category) && (
                                                <div className="border-t border-gray-200 dark:border-gray-800 p-2 space-y-1 fade-in">
                                                    {reports.map(report => {
                                                        const isSelected = selectedReportTypes.includes(report.id);
                                                        return (
                                                            <div
                                                                key={report.id}
                                                                className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                                                                    isSelected
                                                                        ? 'bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/30'
                                                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                                                }`}
                                                                onClick={() => toggleReportSelection(report.id)}
                                                            >
                                                                <div className="relative">
                                                                    {isSelected ? (
                                                                        <CheckSquare className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                                                                    ) : (
                                                                        <Square className="w-5 h-5 text-gray-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" />
                                                                    )}
                                                                </div>
                                                                {getReportIcon(report.icon)}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                                                        {report.name}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                        {report.description}
                                                                    </p>
                                                                </div>
                                                                {isSelected && (
                                                                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Selected Reports Preview Panel */}
                            <div className="w-full lg:w-3/5 glass-card rounded-2xl p-6 card-hover">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold flex items-center gap-3 text-black dark:text-white">
                                        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                                            <ListChecks className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                                        </div>
                                        Selected Reports
                                    </h2>
                                    <Badge variant="outline" className="text-sm">
                                        {selectedReportTypes.length} selected
                                    </Badge>
                                </div>

                                {selectedReportTypes.length > 0 ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-2">
                                            {selectedReportTypes.map(reportId => {
                                                const report = Object.values(categorizedReports).flat().find(r => r.id === reportId);
                                                const isSelected = selectedReportTypes.includes(reportId);
                                                return (
                                                    <div
                                                        key={reportId}
                                                        className="group relative p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black hover:border-cyan-500/50 hover:shadow-lg transition-all duration-200 cursor-pointer"
                                                        onClick={() => toggleReportSelection(reportId)}
                                                    >
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                                                                {getReportIcon(report?.icon)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                                                                    {report?.name || reportId}
                                                                </p>
                                                                <Badge className="text-xs mt-1" variant="secondary">
                                                                    {report?.category || 'General'}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                                            {report?.description}
                                                        </p>
                                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 pulse-glow" />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-16 text-center fade-in">
                                        <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                                            <BarChart3 className="w-12 h-12 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                            No reports selected
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                                            Select reports from the categories on the left to get started
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: DEVICE CONFIGURATION */}
                {currentStep === 2 && (
                    <div className="w-full fade-in">
                        <div className="glass-card rounded-2xl p-8 card-hover">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                                    <Terminal className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-black dark:text-white">
                                        Device Configuration
                                    </h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Configure target device and credentials for report generation
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        Target Device
                                    </label>
                                    <DeviceTargetSelector
                                        parameters={parameters}
                                        onParamChange={handleParamChange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        Authentication
                                    </label>
                                    <DeviceAuthFields
                                        parameters={parameters}
                                        onParamChange={handleParamChange}
                                    />
                                </div>
                            </div>

                            {/* Execution Plan */}
                            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-900 dark:to-gray-950 p-6 rounded-2xl border border-cyan-200 dark:border-cyan-900/50">
                                <div className="flex items-center gap-3 font-semibold text-sm text-cyan-900 dark:text-cyan-100 mb-4">
                                    <Terminal className="w-5 h-5" />
                                    Execution Plan
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-black flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold flex-shrink-0">
                                            1
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            Connect to <strong>{parameters.hostname || 'target device'}</strong>
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-black flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold flex-shrink-0">
                                            2
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            Generate <strong>{selectedReportTypes.length}</strong> report types
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-black flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold flex-shrink-0">
                                            3
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            Collect and parse command outputs
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-black flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold flex-shrink-0">
                                            4
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            Generate comprehensive device report
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={() => setCurrentStep(1)}
                                    className="hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                    Back to Report Selection
                                </Button>
                                <Button
                                    onClick={() => setCurrentStep(3)}
                                    disabled={!parameters.hostname || selectedReportTypes.length === 0}
                                    size="lg"
                                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 transition-all duration-300"
                                >
                                    Proceed to Execute
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: EXECUTE */}
                {currentStep === 3 && (
                    <div className="space-y-6 fade-in">
                        <div className="glass-card rounded-2xl p-8 card-hover">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                                    <PlayCircle className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-black dark:text-white">
                                        Execute Report Generation
                                    </h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {!isExecuting && !executionComplete
                                            ? "Ready to generate device reports"
                                            : "Report generation in progress"}
                                    </p>
                                </div>
                            </div>

                            <CardContent className="space-y-8 p-0">
                                {!isExecuting && !executionComplete && (
                                    <div className="space-y-8">
                                        {/* Execution Summary Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-950/60 p-6 rounded-2xl border border-blue-200 dark:border-blue-800 card-hover">
                                                <div className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                                                    Reports to Generate
                                                </div>
                                                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                                                    {selectedReportTypes.length}
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-950/60 p-6 rounded-2xl border border-green-200 dark:border-green-800 card-hover">
                                                <div className="text-sm text-green-900 dark:text-green-100 font-medium mb-2">
                                                    Target Device
                                                </div>
                                                <div className="text-xl font-bold text-green-600 dark:text-green-400 truncate">
                                                    {parameters.hostname}
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-950/60 p-6 rounded-2xl border border-purple-200 dark:border-purple-800 card-hover">
                                                <div className="text-sm text-purple-900 dark:text-purple-100 font-medium mb-2">
                                                    Report Type
                                                </div>
                                                <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                                    Device Reports
                                                </div>
                                            </div>
                                        </div>

                                        {/* Selected Report Types */}
                                        <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                                            <h5 className="font-semibold mb-4 flex items-center gap-3 text-lg">
                                                <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                                                    <ListChecks className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                                                </div>
                                                Selected Report Types
                                                <Badge variant="secondary" className="ml-2">
                                                    {selectedReportTypes.length} types
                                                </Badge>
                                            </h5>
                                            <div className="flex flex-wrap gap-3 max-h-48 overflow-y-auto pr-2">
                                                {selectedReportTypes.map((reportId, index) => {
                                                    const report = Object.values(categorizedReports).flat().find(r => r.id === reportId);
                                                    return (
                                                        <div
                                                            key={index}
                                                            className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-black rounded-xl border border-gray-200 dark:border-gray-800 hover:border-cyan-500/50 hover:shadow-lg transition-all duration-200"
                                                        >
                                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                                {index + 1}
                                                            </span>
                                                            <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                                                                {getReportIcon(report?.icon)}
                                                            </div>
                                                            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                                                {report?.name || reportId}
                                                            </span>
                                                            <Badge className="ml-2" variant="secondary">
                                                                {report?.category || 'General'}
                                                            </Badge>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Device Configuration */}
                                        <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                                            <h5 className="font-semibold mb-4 flex items-center gap-3 text-lg">
                                                <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                                                    <Terminal className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                                                </div>
                                                Device Configuration
                                            </h5>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                                                        Hostname
                                                    </label>
                                                    <div className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
                                                        {parameters.hostname || 'Not set'}
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                                                        Username
                                                    </label>
                                                    <div className="font-mono text-sm text-gray-900 dark:text-gray-100">
                                                        {parameters.username}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Execute Button */}
                                        <div className="text-center py-6">
                                            <Button
                                                onClick={executeReports}
                                                size="xl"
                                                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 px-12 py-6 text-lg"
                                            >
                                                <PlayCircle className="w-6 h-6 mr-3" />
                                                Generate Reports ({selectedReportTypes.length} types)
                                            </Button>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                                                This will connect to the device and generate all selected reports
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {(isExecuting || executionComplete) && (
                                    <div className="space-y-6">
                                        {/* Progress Bar */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm font-medium">
                                                <span className="text-gray-700 dark:text-gray-300">Progress</span>
                                                <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                                                    {executionProgress.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-cyan-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out shimmer"
                                                    style={{ width: `${executionProgress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Job ID and Status */}
                                        {jobId && (
                                            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-2">
                                                <div className="font-mono text-sm text-gray-700 dark:text-gray-300 break-all">
                                                    <span className="text-gray-500 dark:text-gray-500">Job ID: </span>
                                                    {jobId}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                        isConnected
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                                            : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                                    }`}>
                                                        {isConnected ? '● Connected' : '○ Disconnected'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Current Step */}
                                        {activeExecutionStep && (
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                <span className="font-medium">Current step:</span> {activeExecutionStep}
                                            </div>
                                        )}

                                        {/* Live Logs */}
                                        <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                                            <LiveLogViewer
                                                logs={executionLogs}
                                                title="Report Generation Logs"
                                            />
                                        </div>

                                        {executionComplete && (
                                            <div className="flex justify-center">
                                                <Button
                                                    onClick={() => setCurrentStep(4)}
                                                    size="lg"
                                                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg transition-all duration-300"
                                                >
                                                    <Eye className="w-5 h-5 mr-2" />
                                                    View Results
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </div>
                    </div>
                )}

                {/* STEP 4: RESULTS */}
                {currentStep === 4 && reportResults && (
                    <div className="space-y-6 fade-in">
                        <div className="glass-card rounded-2xl p-8 card-hover">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-600/10">
                                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-black dark:text-white">
                                        Device Report Results
                                    </h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Comprehensive device reports and analysis
                                    </p>
                                </div>
                            </div>
                            <CardContent className="p-0">
                                <ReportResults
                                    results={reportResults}
                                    selectedReportTypes={selectedReportTypes}
                                    deviceHostname={parameters.hostname}
                                    logs={executionLogs}
                                    onNewReports={resetReports}
                                    onBackToSelection={() => setCurrentStep(1)}
                                />
                            </CardContent>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
