/**
 * =========================================================================================
 * FILE:                  Validation.jsx
 * LOCATION:              frontend/src/pages/Automation/Validation.jsx
 * PURPOSE:               JSNAPy validation workflow with OLED-Optimized Dark Theme
 * VERSION:               2.0.0 - OLED Pure Black Theme
 *
 * UI PATTERN: Modern OLED-optimized styling matching Reporting section
 * STEPS: 1. Test Selection → 2. Device Configuration → 3. Execute → 4. Results
 * =========================================================================================
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CheckCircle2, ArrowRight, Loader2, Bug, FileText,
    AlertCircle, PlayCircle, Terminal, ListChecks, Eye
} from 'lucide-react';

// UI Components
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';

// Shared Components
import DeviceAuthFields from '../../shared/DeviceAuthFields';
import DeviceTargetSelector from '../../shared/DeviceTargetSelector';
import TableDisplay from '../../shared/TableDisplay';
import LiveLogViewer from '../../components/realTimeProgress/LiveLogViewer';
import ValidationReport from './ValidationReport';

// Custom Hooks & Utils
import { useTestDiscovery } from '../../hooks/useTestDiscovery';
import { useJobWebSocket } from '../../hooks/useJobWebSocket';
import { processLogMessage } from '../../lib/logProcessor';

// API Configuration
const API_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8000';

// Step configuration
const steps = [
    { id: 1, name: 'Select Tests', icon: ListChecks },
    { id: 2, name: 'Configure Device', icon: Bug },
    { id: 3, name: 'Execute', icon: PlayCircle },
    { id: 4, name: 'Results', icon: Eye }
];

export default function Validation() {
    console.log('🚀 [Validation] Component mounted');

    // Test Discovery
    const {
        categorizedTests,
        testsLoading,
        testsError,
        refreshTests
    } = useTestDiscovery('validation');

    // Step navigation
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form state
    const [selectedTests, setSelectedTests] = useState([]);
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
    const [validationResults, setValidationResults] = useState(null);

    // Execution state
    const [isValidating, setIsValidating] = useState(false);
    const [validationProgress, setValidationProgress] = useState(0);
    const [validationComplete, setValidationComplete] = useState(false);
    const [validationLogs, setValidationLogs] = useState([]);
    const [activeValidationStep, setActiveValidationStep] = useState('');

    // WebSocket Connection using centralized service
    const { lastMessage, isConnected, sendMessage } = useJobWebSocket();

    // Subscribe to job-specific channel when jobId changes
    useEffect(() => {
        if (!jobId || !sendMessage) return;

        const ws_channel = `job:${jobId}`;
        console.log('🔗 [Validation] Subscribing to WebSocket channel:', ws_channel);

        const subscriptionMessage = {
            type: 'SUBSCRIBE',
            channel: ws_channel
        };

        sendMessage(subscriptionMessage);

    }, [jobId, sendMessage]);

    // Process WebSocket messages
    useEffect(() => {
        if (!lastMessage || !jobId) return;

        console.log('🔍 [Validation] Processing WebSocket message:', lastMessage);

        try {
            let messageData = lastMessage;
            if (typeof lastMessage === 'string') {
                messageData = JSON.parse(lastMessage);
            }

            const isJobMessage = messageData.job_id === jobId ||
                                 (messageData.channel && messageData.channel.includes(jobId));

            if (!isJobMessage) return;

            console.log('🔍 [Validation] Processing job message:', messageData);

            let normalizedLog;
            try {
                normalizedLog = processLogMessage(messageData);
            } catch (processorError) {
                console.error('❌ [Validation] Log processor error:', processorError);
                normalizedLog = {
                    id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                    timestamp: new Date().toLocaleTimeString(),
                    type: 'INFO',
                    message: 'Processing validation message...',
                    isTechnical: false,
                    originalEvent: messageData
                };
            }
            setValidationLogs(prev => [...prev, normalizedLog]);

            const originalEvent = normalizedLog.originalEvent;

            if (normalizedLog.type === 'STEP_PROGRESS') {
                const stepName = normalizedLog.message.replace(/^Step \d+: /, '');
                setActiveValidationStep(stepName);
            }

            if (originalEvent?.data?.progress !== undefined) {
                const progress = parseFloat(originalEvent.data.progress);
                if (!isNaN(progress) && progress >= 0 && progress <= 100) {
                    setValidationProgress(progress);
                }
            }

            if (normalizedLog.type === 'SUCCESS' && originalEvent?.event_type === 'PRE_CHECK_COMPLETE') {
                console.log('✅ [Validation] Pre-check completed successfully');
                setActiveValidationStep('Storage validation passed');

                if (originalEvent.data) {
                    setValidationResults(originalEvent.data);
                }
            }

            if (originalEvent?.status === 'finished' || originalEvent?.type === 'job_status') {
                console.log('🎉 [Validation] Validation completed successfully');
                setValidationComplete(true);
                setIsValidating(false);
                setValidationProgress(100);
                setCurrentStep(4);
            }

            if (normalizedLog.type === 'ERROR') {
                console.log('❌ [Validation] Validation failed');
                setError(normalizedLog.message || 'Validation failed');
                setIsValidating(false);
                setValidationComplete(true);
            }

        } catch (error) {
            console.error('❌ [Validation] Error processing message:', error);
        }
    }, [lastMessage, jobId]);

    // Parameter change handler
    const handleParamChange = (name, value) => {
        setParameters(prev => ({ ...prev, [name]: value }));
    };

    // Test selection handlers
    const toggleCategory = (category) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };

    const toggleTestSelection = (testPath) => {
        setSelectedTests(prev => {
            if (prev.includes(testPath)) {
                return prev.filter(t => t !== testPath);
            } else {
                return [...prev, testPath];
            }
        });
    };

    const selectAllTestsInCategory = (category) => {
        const categoryTests = categorizedTests[category] || [];
        const categoryPaths = categoryTests.map(test => test.path);

        setSelectedTests(prev => {
            const newSelection = prev.filter(t => !categoryPaths.includes(t));
            return [...newSelection, ...categoryPaths];
        });
    };

    // Filter tests
    const filteredTests = useMemo(() => {
        let filtered = { ...categorizedTests };

        if (selectedCategory !== 'all') {
            filtered = { [selectedCategory]: categorizedTests[selectedCategory] || [] };
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = Object.entries(filtered).reduce((acc, [category, tests]) => {
                const matchingTests = tests.filter(test =>
                    test.name?.toLowerCase().includes(query) ||
                    test.description?.toLowerCase().includes(query) ||
                    test.path?.toLowerCase().includes(query)
                );

                if (matchingTests.length > 0) {
                    acc[category] = matchingTests;
                }
                return acc;
            }, {});
        }

        return filtered;
    }, [categorizedTests, selectedCategory, searchQuery]);

    const allCategories = useMemo(() => {
        return Object.keys(categorizedTests);
    }, [categorizedTests]);

    const totalTests = useMemo(() => {
        return Object.values(categorizedTests).flat().length;
    }, [categorizedTests]);

    // Execute validation
    const executeValidation = async () => {
        if (!parameters.hostname || selectedTests.length === 0) {
            setError('Please enter hostname and select at least one test');
            return;
        }

        try {
            setIsValidating(true);
            setError(null);
            setValidationResults(null);
            setValidationLogs([]);
            setValidationProgress(0);

            console.log('🚀 [Validation] Starting validation execution');

            const response = await fetch(`${API_URL}/api/operations/validation/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    hostname: parameters.hostname,
                    username: parameters.username,
                    password: parameters.password,
                    tests: selectedTests,
                    mode: 'check',
                    tag: 'validation'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ [Validation] Job started:', data);

            setJobId(data.job_id);

        } catch (error) {
            console.error('❌ [Validation] Error starting validation:', error);
            setError(error.message);
            setIsValidating(false);
        }
    };

    // Reset validation
    const resetValidation = () => {
        setJobId(null);
        setValidationProgress(0);
        setIsValidating(false);
        setValidationComplete(false);
        setError(null);
        setValidationLogs([]);
        setActiveValidationStep('');
        setValidationResults(null);
        setCurrentStep(1);
    };

    // Loading state
    if (loading && Object.keys(categorizedTests).length === 0) {
        return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            {/* HEADER - OLED Optimized */}
            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black sticky top-0 z-10 backdrop-blur-sm bg-white/95 dark:bg-black/95">
                <div className="container mx-auto px-6 py-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-black dark:text-white mb-2 flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                                    <ListChecks className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                                </div>
                                JSNAPy Validation
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Run network validation tests using JSNAPy automation
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={refreshTests}
                                disabled={testsLoading}
                                className="card-hover"
                            >
                                {testsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListChecks className="w-4 h-4" />}
                                Refresh Tests
                            </Button>
                            {jobId && (
                                <Button variant="outline" onClick={resetValidation} className="card-hover">
                                    Reset
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Steps - Modern OLED */}
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
                                <span className={`text-sm font-medium hidden sm:block transition-colors ml-3 ${
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
                {(testsError || error) && (
                    <div className="mb-6 p-4 border-2 border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 fade-in">
                        <AlertCircle className="w-6 h-6 flex-shrink-0" />
                        <p className="text-sm font-medium">{testsError || error}</p>
                    </div>
                )}

                {/* STEP 1: TEST SELECTION */}
                {currentStep === 1 && (
                    <div className="space-y-6 fade-in">
                        {/* Navigation Button */}
                        <div className="flex justify-end">
                            <Button
                                onClick={() => setCurrentStep(2)}
                                disabled={selectedTests.length === 0}
                                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 transition-all duration-300"
                                size="lg"
                            >
                                Configure Device
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Test Categories */}
                            <Card className="w-full lg:w-2/5 glass-card rounded-2xl card-hover">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3 text-black dark:text-white">
                                        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                                            <FileText className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                                        </div>
                                        Test Categories
                                    </CardTitle>
                                    <CardDescription>
                                        Choose validation tests ({selectedTests.length} of {totalTests} selected)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Search */}
                                    <div className="relative">
                                        <Input
                                            placeholder="Search tests..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="h-11 rounded-xl border-gray-200 dark:border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/20 bg-white/50 dark:bg-black/50"
                                        />
                                    </div>

                                    {/* Category Filter */}
                                    <div className="flex flex-wrap gap-2">
                                        <Badge
                                            variant={selectedCategory === 'all' ? 'default' : 'outline'}
                                            className={`px-4 py-2 cursor-pointer transition-all duration-200 ${
                                                selectedCategory === 'all'
                                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg'
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }`}
                                            onClick={() => setSelectedCategory('all')}
                                        >
                                            All ({totalTests})
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
                                                {category} ({(categorizedTests[category] || []).length})
                                            </Badge>
                                        ))}
                                    </div>

                                    {/* Test List - Modern Scroll */}
                                    <ScrollArea className="h-96 border rounded-xl p-3 border-gray-200 dark:border-gray-800">
                                        {testsLoading ? (
                                            <div className="flex items-center justify-center h-32">
                                                <Loader2 className="w-6 h-6 animate-spin text-cyan-600 dark:text-cyan-400" />
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {Object.entries(filteredTests).map(([category, tests]) => (
                                                    <div
                                                        key={category}
                                                        className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-black/50 overflow-hidden transition-all duration-200 hover:border-cyan-500/50 hover:shadow-lg"
                                                    >
                                                        {/* Category Header */}
                                                        <div
                                                            className="flex items-center justify-between p-4 cursor-pointer bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-black hover:from-cyan-50/50 dark:hover:from-cyan-950/50 transition-all"
                                                            onClick={() => toggleCategory(category)}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm">{expandedCategories.has(category) ? '▼' : '▶'}</span>
                                                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                                    {category}
                                                                </span>
                                                                <Badge variant="secondary" className="ml-2">
                                                                    {tests.length}
                                                                </Badge>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/20"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    selectAllTestsInCategory(category);
                                                                }}
                                                            >
                                                                Select All
                                                            </Button>
                                                        </div>

                                                        {/* Expandable Test List */}
                                                        {expandedCategories.has(category) && (
                                                            <div className="border-t border-gray-200 dark:border-gray-800 p-2 space-y-1 fade-in">
                                                                {tests.map(test => (
                                                                    <div
                                                                        key={test.path}
                                                                        className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                                                                            selectedTests.includes(test.path)
                                                                                ? 'bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/30'
                                                                                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                                                        }`}
                                                                        onClick={() => toggleTestSelection(test.path)}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedTests.includes(test.path)}
                                                                            onChange={() => {}}
                                                                            className="rounded"
                                                                        />
                                                                        <div className="flex-1">
                                                                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                                                                {test.name}
                                                                            </div>
                                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                                {test.description}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            {/* Selected Tests Preview */}
                            <Card className="w-full lg:w-3/5 glass-card rounded-2xl card-hover">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3 text-black dark:text-white">
                                        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                                            <Eye className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                                        </div>
                                        Selected Tests Preview
                                    </CardTitle>
                                    <CardDescription>
                                        Tests that will be executed ({selectedTests.length} selected)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {selectedTests.length > 0 ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-2">
                                                {selectedTests.map(testPath => {
                                                    const test = Object.values(categorizedTests).flat().find(t => t.path === testPath);
                                                    return (
                                                        <div
                                                            key={testPath}
                                                            className="group relative p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black hover:border-cyan-500/50 hover:shadow-lg transition-all duration-200 cursor-pointer"
                                                            onClick={() => toggleTestSelection(testPath)}
                                                        >
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                                                                    <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                                                                        {test?.name || testPath}
                                                                    </p>
                                                                    <Badge className="text-xs mt-1" variant="secondary">
                                                                        {test?.description || 'Validation Test'}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 font-mono">
                                                                {testPath}
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
                                                <FileText className="w-12 h-12 text-gray-400" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                                No tests selected
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                                                Select tests from the categories panel to get started
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* STEP 2: DEVICE CONFIGURATION */}
                {currentStep === 2 && (
                    <div className="w-full fade-in">
                        <Card className="glass-card rounded-2xl p-8 card-hover">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                                    <Bug className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-black dark:text-white">
                                        Device Configuration
                                    </h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Configure target device and credentials for validation
                                    </p>
                                </div>
                            </div>

                            <CardContent className="space-y-6 p-0">
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
                                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-900 dark:to-gray-950 p-6 rounded-2xl border border-cyan-200 dark:border-cyan-900/50">
                                    <div className="flex items-center gap-3 font-semibold text-sm text-cyan-900 dark:text-cyan-100 mb-4">
                                        <Terminal className="w-5 h-5" />
                                        Execution Plan
                                    </div>
                                    <ul className="text-sm space-y-2 text-gray-700 dark:text-gray-300 list-disc pl-5">
                                        <li>Connect to <strong>{parameters.hostname || 'target device'}</strong></li>
                                        <li>Execute <strong>{selectedTests.length}</strong> validation tests</li>
                                        <li>Collect and analyze results</li>
                                        <li>Generate validation report</li>
                                    </ul>
                                </div>

                                <div className="flex justify-between pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentStep(1)}
                                        className="hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                        <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                        Back to Test Selection
                                    </Button>
                                    <Button
                                        onClick={() => setCurrentStep(3)}
                                        disabled={!parameters.hostname || selectedTests.length === 0}
                                        className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 transition-all duration-300"
                                    >
                                        Proceed to Execute
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* STEP 3: EXECUTE */}
                {currentStep === 3 && (
                    <div className="space-y-6 fade-in">
                        <Card className="glass-card rounded-2xl p-8 card-hover">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                                    <PlayCircle className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-black dark:text-white">
                                        Execute Validation
                                    </h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {!isValidating && !validationComplete
                                            ? "Ready to execute validation tests"
                                            : "Validation execution in progress"}
                                    </p>
                                </div>
                            </div>

                            <CardContent className="space-y-6 p-0">
                                {!isValidating && !validationComplete && (
                                    <div className="space-y-6">
                                        {/* Execution Summary Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-950/60 p-6 rounded-2xl border border-blue-200 dark:border-blue-800 card-hover">
                                                <div className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                                                    Tests to Run
                                                </div>
                                                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                                                    {selectedTests.length}
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
                                                    Test Type
                                                </div>
                                                <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                                    JSNAPy
                                                </div>
                                            </div>
                                        </div>

                                        {/* Execution Button */}
                                        <div className="text-center py-6">
                                            <Button
                                                onClick={executeValidation}
                                                size="xl"
                                                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 px-12 py-6 text-lg"
                                            >
                                                <PlayCircle className="w-6 h-6 mr-3" />
                                                Execute Validation ({selectedTests.length} tests)
                                            </Button>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                                                This will connect to the device and run all selected JSNAPy tests
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {(isValidating || validationComplete) && (
                                    <div className="space-y-4">
                                        {/* Progress Bar */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm font-medium">
                                                <span className="text-gray-700 dark:text-gray-300">Progress</span>
                                                <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                                                    {validationProgress.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-cyan-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out shimmer"
                                                    style={{ width: `${validationProgress}%` }}
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
                                        {activeValidationStep && (
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                <span className="font-medium">Current step:</span> {activeValidationStep}
                                            </div>
                                        )}

                                        {/* Live Logs */}
                                        <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                                            <LiveLogViewer
                                                logs={validationLogs}
                                                title="Validation Logs"
                                            />
                                        </div>

                                        {validationComplete && (
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
                        </Card>
                    </div>
                )}

                {/* STEP 4: RESULTS */}
                {currentStep === 4 && validationResults && (
                    <div className="space-y-6 fade-in">
                        <Card className="glass-card rounded-2xl p-8 card-hover">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-600/10">
                                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-black dark:text-white">
                                        Validation Report
                                    </h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Comprehensive validation test results and analysis
                                    </p>
                                </div>
                            </div>
                            <CardContent className="p-0">
                                <ValidationReport
                                    results={validationResults}
                                    selectedTests={selectedTests}
                                    deviceHostname={parameters.hostname}
                                    logs={validationLogs}
                                    onNewValidation={resetValidation}
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
