/**
 * =============================================================================
 * FILE LOCATION: frontend/src/pages/Automation/Templates.jsx
 * DESCRIPTION:   Main UI for Template Deployment with OLED-Optimized Dark Theme
 * VERSION:       2.0.0 - OLED Pure Black Theme
 * =============================================================================
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FileCode, Download, Copy, Check, Loader2, Search, ArrowRight, 
  Upload, CheckCircle2, AlertCircle, Terminal, Play, Eye, 
  FileDiff, Bug 
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Shared & Custom Components
import DeviceAuthFields from '@/shared/DeviceAuthFields';
import DeviceTargetSelector from '@/shared/DeviceTargetSelector';
import LiveLogViewer from '@/components/realTimeProgress/LiveLogViewer';
import ConfigDiff from '@/components/blocks/ConfigDiff';

// Logic Utilities
import { processLogMessage } from '@/lib/logProcessor';

// API Configuration
const API_BASE = 'http://localhost:8000/api';
const WS_BASE = 'ws://localhost:3100/ws';

export default function Templates() {
  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================

  // Data State
  const [categories, setCategories] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateDetails, setTemplateDetails] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [generatedConfig, setGeneratedConfig] = useState('');

  // UI State
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Device Configuration
  const [parameters, setParameters] = useState({
    hostname: '',
    inventory_file: '',
    username: '',
    password: ''
  });

  // Deployment & WebSocket State
  const [deploying, setDeploying] = useState(false);
  const [wsConnection, setWsConnection] = useState(null);
  const [deploymentResult, setDeploymentResult] = useState(null);
  
  // Logging & Diff State
  const [logHistory, setLogHistory] = useState([]);
  const [activeStep, setActiveStep] = useState(null);
  const [diffData, setDiffData] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false); // Controls the "Debug" view

  // Stepper Definitions
  const steps = [
    { id: 1, name: 'Select Template', icon: FileCode },
    { id: 2, name: 'Configure', icon: Terminal },
    { id: 3, name: 'Review', icon: Eye },
    { id: 4, name: 'Deploy', icon: Play }
  ];

  // ===========================================================================
  // LOGIC: CONTEXT DETECTION
  // ===========================================================================
  
  const configContext = useMemo(() => {
    if (!generatedConfig) return "Configuration";
    const lower = generatedConfig.toLowerCase();
    
    if (lower.includes('protocols ospf')) return "OSPF Routing";
    if (lower.includes('protocols bgp')) return "BGP Routing";
    if (lower.includes('ethernet-switching')) return "VLAN/Switching";
    if (lower.includes('interfaces')) return "Interface";
    if (lower.includes('system')) return "System";
    if (lower.includes('security policies')) return "Security Policy";
    if (lower.includes('firewall')) return "Firewall Filter";
    
    return "Device"; 
  }, [generatedConfig]);

  // ===========================================================================
  // DATA FETCHING & PARSING
  // ===========================================================================

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/templates`);
      const data = await response.json();
      setCategories(data.categories || []);
      setError(null);
    } catch (err) {
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplateDetails = useCallback(async (path) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/templates/${path}`);
      const data = await response.json();
      setTemplateDetails(data);

      const variables = extractVariables(data.content);
      const initialValues = {};
      variables.forEach(v => initialValues[v] = '');
      setFormValues(initialValues);

      // Reset downstream state
      setGeneratedConfig('');
      setDeploymentResult(null);
      setLogHistory([]);
      setDiffData(null);
      setActiveStep(null);
      setShowTechnical(false);
      setError(null);
    } catch (err) {
      setError('Failed to load template details');
    } finally {
      setLoading(false);
    }
  }, []);

  const extractVariables = (content) => {
    const deploymentVars = ['username', 'password', 'hostname', 'inventory_file'];
    const regex = /\{\{\s*(\w+)\s*\}\}/g;
    const variables = new Set();
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (!deploymentVars.includes(match[1])) variables.add(match[1]);
    }
    return Array.from(variables);
  };

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    fetchTemplateDetails(template.path);
    setCurrentStep(2);
  };

  const handleInputChange = (variable, value) => {
    setFormValues(prev => ({ ...prev, [variable]: value }));
  };

  const handleParamChange = (name, value) => {
    setParameters(prev => ({ ...prev, [name]: value }));
  };

  const generateConfig = () => {
    if (!templateDetails) return;
    let config = templateDetails.content;
    const allValues = { ...formValues, ...parameters };

    // Jinja2 Processing
    config = config.replace(/\{%\s*if\s+(\w+)\s*%\}(.*?)(?:\{%\s*else\s*%\}(.*?))?\{%\s*endif\s*%\}/gs,
      (match, variable, ifContent, elseContent) => {
        return (formValues[variable] || parameters[variable]) ? (ifContent || '') : (elseContent || '');
      }
    );

    Object.entries(allValues).forEach(([key, value]) => {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      config = config.replace(new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'g'), value || '');
    });

    config = config.replace(/\{#.*?#\}/gs, '').replace(/\{%.*?%\}/g, '');
    config = config.split('\n').filter(line => line.trim()).join('\n');
    
    setGeneratedConfig(config);
    setCurrentStep(3);
  };

  // ===========================================================================
  // DEPLOYMENT & WEBSOCKET LOGIC (Fix for Diff Data)
  // ===========================================================================

  const deployTemplate = async () => {
    if (!generatedConfig || (!parameters.hostname && !parameters.inventory_file)) {
      setError('Cannot deploy. Generate configuration and ensure a target device is selected.');
      return;
    }

    setDeploying(true);
    setDeploymentResult(null);
    setError(null);
    setLogHistory([]);
    setDiffData(null);
    setActiveStep("Initializing connection...");

    if (wsConnection) {
      wsConnection.close();
      setWsConnection(null);
    }

    const payload = {
      template_path: selectedTemplate.path,
      config: generatedConfig,
      hostname: parameters.hostname,
      inventory_file: parameters.inventory_file,
      username: parameters.username,
      password: parameters.password,
      template_vars: formValues
    };

    let ws;
    let intendedClose = false;

    try {
      const response = await fetch(`${API_BASE}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.status !== 202 && response.status !== 200) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Job failed with status ${response.status}.`);
      }

      const queuedJob = await response.json();
      const { ws_channel } = queuedJob;

      ws = new WebSocket(`${WS_BASE}`);
      setWsConnection(ws);

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'SUBSCRIBE', channel: ws_channel }));
        setLogHistory(prev => [...prev, processLogMessage({ 
          message: `Connected to channel: ${ws_channel}`, 
          event_type: 'SYSTEM_INFO' 
        })]);
      };

      ws.onmessage = (event) => {
        const normalizedLog = processLogMessage(event.data);
        setLogHistory(prev => [...prev, normalizedLog]);

        // ----------------------------------------------------------------
        // 🌟 CRITICAL FIX: Correctly extract DIFF data from details object
        // ----------------------------------------------------------------
        if (normalizedLog.originalEvent.event_type === 'STEP_COMPLETE') {
             const stepData = normalizedLog.originalEvent.data;
             
             // Check both 'diff' direct property AND 'details.diff'
             const potentialDiff = stepData.diff || stepData.details?.diff;
             
             if (potentialDiff) {
                 console.log("[UI] Diff received:", potentialDiff.substring(0, 50) + "...");
                 setDiffData(potentialDiff);
             }
        }

        // Update Status Bar Message
        if (normalizedLog.type === 'STEP_PROGRESS') {
          const cleanMsg = normalizedLog.message.replace(/^Step \d+: /, '');
          setActiveStep(cleanMsg);
        }

        // Check Completion
        const originalEvent = normalizedLog.originalEvent;
        if (originalEvent.event_type === 'OPERATION_COMPLETE') {
          const success = originalEvent.data?.status === 'SUCCESS';
          setDeploymentResult({
            success,
            message: normalizedLog.message,
            details: originalEvent.data
          });
          setDeploying(false);
          intendedClose = true;
          ws.close();
        }
        else if (originalEvent.success !== undefined) {
            setDeploymentResult({
                success: originalEvent.success,
                message: originalEvent.message || "Deployment Finished",
                details: originalEvent
            });
            setDeploying(false);
            intendedClose = true;
            ws.close();
        }
      };

      ws.onerror = (err) => {
        if (!intendedClose) setError("Real-time connection failed.");
        setDeploying(false);
      };

      ws.onclose = () => {
        if (!intendedClose) {
          setLogHistory(prev => [...prev, processLogMessage({ 
            message: "Connection closed unexpectedly.", 
            event_type: 'ERROR' 
          })]);
        }
      };

    } catch (err) {
      setError(err.message);
      setDeploying(false);
    }
  };

  // ===========================================================================
  // UTILITIES & EFFECTS
  // ===========================================================================

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadConfig = () => {
    const blob = new Blob([generatedConfig], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate.name.replace('.j2', '')}_config.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredCategories = useMemo(() => {
    let filtered = categories;
    if (selectedCategory) filtered = filtered.filter(cat => cat.name === selectedCategory);
    if (searchQuery) {
      filtered = filtered.map(category => ({
        ...category,
        templates: category.templates.filter(t => 
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          category.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(cat => cat.templates.length > 0);
    }
    return filtered;
  }, [categories, searchQuery, selectedCategory]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => { return () => { if (wsConnection) wsConnection.close(); }; }, [wsConnection]);

  if (loading && categories.length === 0) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* HEADER - OLED Optimized */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black sticky top-0 z-10 backdrop-blur-sm bg-white/95 dark:bg-black/95">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-black dark:text-white mb-2 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                  <FileCode className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                Template Deployment
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure and deploy network templates
              </p>
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
                  {currentStep > step.id ? <CheckCircle2 className="w-6 h-6" /> : <step.icon className="w-6 h-6" />}
                </div>
                <span className={`text-sm font-medium hidden sm:block transition-colors ml-3 ${
                  currentStep === step.id ? 'text-black dark:text-white' : 'text-gray-400'
                }`}>{step.name}</span>
                {idx < steps.length - 1 && <div className={`w-16 h-0.5 hidden sm:block transition-all duration-300 ${
                  currentStep > step.id ? 'bg-gradient-to-r from-cyan-500 to-blue-600' : 'bg-gray-300 dark:bg-gray-700'
                }`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 p-4 border border-red-500 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> <p className="text-sm">{error}</p>
          </div>
        )}

        {/* STEP 1: SELECTION */}
        {currentStep === 1 && (
          <div className="flex gap-6 h-[calc(100vh-20rem)]">
            <div className="w-64 flex-shrink-0 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSelectedCategory(null); }}
                  className="pl-9 h-11 rounded-xl border-gray-200 dark:border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/20 bg-white/50 dark:bg-black/50"
                />
              </div>
              <Card className="h-[calc(100%-3rem)] glass-card rounded-2xl">
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100vh-28rem)]">
                    <div className="p-2 space-y-1">
                      <Button
                        variant="ghost"
                        className={`w-full justify-start rounded-xl ${!selectedCategory ? 'bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20' : ''}`}
                        onClick={() => setSelectedCategory(null)}
                      >
                        All Templates
                      </Button>
                      {categories.map((cat) => (
                        <Button
                          key={cat.name}
                          variant="ghost"
                          className={`w-full justify-start justify-between rounded-xl ${selectedCategory === cat.name ? 'bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20' : ''}`}
                          onClick={() => setSelectedCategory(cat.name)}
                        >
                          <span>{cat.name}</span>
                          <Badge variant="outline" className="ml-2 text-xs">{cat.templates.length}</Badge>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div className="flex-1">
               <Card className="h-full flex flex-col border-0 shadow-none bg-transparent">
                 <ScrollArea className="h-full">
                   <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
                     {filteredCategories.map(cat => cat.templates.map(template => (
                       <button
                         key={template.path}
                         onClick={() => handleTemplateSelect(template)}
                         className="group relative p-5 text-left border-2 border-gray-200 dark:border-gray-800 rounded-xl hover:border-cyan-500/50 transition-all bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black hover:shadow-lg hover:shadow-cyan-500/10"
                       >
                         <div className="absolute top-4 right-4 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-gradient-to-br group-hover:from-cyan-500 group-hover:to-blue-600 group-hover:text-white dark:group-hover:text-white transition-all">
                           <FileCode className="w-4 h-4" />
                         </div>
                         <div className="mt-4">
                           <h4 className="font-semibold truncate pr-8 text-black dark:text-white">{template.name.replace('.j2', '')}</h4>
                           <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1 truncate">{cat.name}</p>
                           <div className="flex items-center gap-1 text-xs font-medium mt-4 text-gray-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                             Configure <ArrowRight className="w-3 h-3" />
                           </div>
                         </div>
                       </button>
                     )))}
                   </div>
                 </ScrollArea>
               </Card>
            </div>
          </div>
        )}

        {/* STEP 2: CONFIGURATION */}
        {currentStep === 2 && selectedTemplate && (
          <div className="space-y-4">
            <Card className="glass-card rounded-2xl card-hover">
              <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-black dark:text-white">{selectedTemplate.name.replace('.j2', '')}</CardTitle>
                        <CardDescription>Configure variables and target device</CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => setCurrentStep(1)} size="sm" className="card-hover">Change Template</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.keys(formValues).length > 0 ? (
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-black dark:text-white">
                            <Terminal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Template Variables
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-black rounded-xl border border-gray-200 dark:border-gray-800">
                            {Object.keys(formValues).map((varName) => (
                                <div key={varName} className="space-y-1.5">
                                    <Label htmlFor={varName} className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wide">
                                        {varName.replace(/_/g, ' ')}
                                    </Label>
                                    <Input
                                        id={varName}
                                        value={formValues[varName] || ''}
                                        onChange={(e) => handleInputChange(varName, e.target.value)}
                                        placeholder={`Value for {{ ${varName} }}`}
                                        className="border-gray-200 dark:border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/20 bg-white/50 dark:bg-black/50"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 text-blue-700 dark:text-blue-300 rounded-xl text-sm flex items-center gap-2 border border-blue-200 dark:border-blue-800">
                        <CheckCircle2 className="w-4 h-4"/> No variables detected in this template.
                    </div>
                )}
                <Separator className="bg-gray-200 dark:bg-gray-800" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DeviceTargetSelector parameters={parameters} onParamChange={handleParamChange} />
                    <DeviceAuthFields parameters={parameters} onParamChange={handleParamChange} />
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={generateConfig} disabled={!selectedTemplate} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 transition-all duration-300">
                    Generate Configuration <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 3: REVIEW */}
        {currentStep === 3 && generatedConfig && (
          <div className="space-y-4">
            <Card className="glass-card rounded-2xl card-hover">
              <CardHeader>
                <div className="flex justify-between">
                  <CardTitle className="text-black dark:text-white">Review Configuration</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)} className="card-hover">Back to Edit</Button>
                    <Button variant="outline" size="sm" onClick={copyToClipboard} className="card-hover">
                        {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />} Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadConfig} className="card-hover"><Download className="w-4 h-4 mr-1"/> Download</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-black">
                  <pre className="p-4 text-xs font-mono text-black dark:text-white">{generatedConfig}</pre>
                </ScrollArea>
                <div className="flex justify-end gap-2 pt-4">
                  <Button onClick={() => setCurrentStep(4)} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 transition-all duration-300">Proceed to Deployment <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 4: DEPLOY */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <Card className="glass-card rounded-2xl card-hover">
              <CardHeader>
                <CardTitle className="text-black dark:text-white">Deploy Configuration</CardTitle>
                <CardDescription>
                   {!deploying && !deploymentResult
                     ? "Review the execution plan and confirm to proceed."
                     : "Configuration deployment in progress."}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* 1. Execution Plan - OLED Optimized */}
                {!deploying && !deploymentResult && (
                  <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-900 dark:to-gray-950 p-6 rounded-2xl border border-cyan-200 dark:border-cyan-900/50 space-y-3">
                     <div className="flex items-center gap-3 font-semibold text-sm text-cyan-900 dark:text-cyan-100">
                        <Terminal className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> Execution Plan
                     </div>
                     <ul className="text-sm space-y-2 text-gray-700 dark:text-gray-300 list-disc pl-5">
                        <li>Check connectivity to <strong>{parameters.hostname || parameters.inventory_file}</strong></li>
                        <li>Lock configuration database</li>
                        <li>Load <strong>{configContext}</strong> configuration ({generatedConfig.split('\n').length} lines)</li>
                        <li><strong>Calculate and display diff</strong></li>
                        <li>Validate syntax (Commit Check)</li>
                        <li>Commit changes to active configuration</li>
                     </ul>
                     <div className="flex justify-center pt-4">
                        <Button onClick={deployTemplate} size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-xl shadow-cyan-500/25 transition-all duration-300">
                          <Upload className="w-5 h-5 mr-2" /> Confirm & Deploy
                        </Button>
                     </div>
                  </div>
                )}

                {/* 2. STATUS BAR - OLED Optimized */}
                {(deploying || deploymentResult) && (
                   <div className={`flex flex-col md:flex-row items-center justify-between p-4 rounded-2xl border gap-4 backdrop-blur-sm ${
                        deploymentResult?.success ? 'bg-green-50/50 dark:bg-green-950/20 border-green-500/30 text-green-700 dark:text-green-300' :
                        deploymentResult?.success === false ? 'bg-red-50/50 dark:bg-red-950/20 border-red-500/30 text-red-700 dark:text-red-300' :
                        'bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-500/30 text-cyan-700 dark:text-cyan-300'
                   }`}>
                      <div className="flex items-center gap-3 w-full md:w-auto">
                          {deploying ? <Loader2 className="animate-spin w-5 h-5" /> :
                           deploymentResult?.success ? <CheckCircle2 className="w-5 h-5" /> :
                           <AlertCircle className="w-5 h-5" />}
                          <span className="font-medium truncate">
                            {deploying ? (activeStep || "Initializing...") : deploymentResult?.message}
                          </span>
                      </div>

                      {/* ACTION TOOLBAR: DIFF & DEBUG */}
                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                          {/* VIEW CHANGES BUTTON */}
                          {diffData && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowDiff(true)}
                              className="bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-800 border-cyan-500/30 text-cyan-900 dark:text-cyan-100"
                            >
                              <FileDiff className="w-4 h-4 mr-2" />
                              Changes
                            </Button>
                          )}

                          {/* DEBUG BUTTON */}
                          <Button
                            variant={showTechnical ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => setShowTechnical(!showTechnical)}
                            className={`border-cyan-500/30 ${showTechnical
                              ? "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-900 dark:text-cyan-100"
                              : "bg-white dark:bg-black text-cyan-700 dark:text-cyan-300"}`}
                            title="Toggle Raw/Technical Logs"
                          >
                             <Bug className={`w-4 h-4 ${showTechnical ? "text-cyan-600 dark:text-cyan-400" : "text-current"}`} />
                             <span className="ml-2 hidden md:inline">Debug</span>
                          </Button>
                      </div>
                   </div>
                )}

                {/* 3. LIVE LOGS */}
                {(deploying || deploymentResult) && (
                  <LiveLogViewer 
                    logs={logHistory} 
                    isConnected={!!wsConnection} 
                    height="h-96"
                    title="Deployment Logs"
                    showTechnical={showTechnical}
                  />
                )}

                {/* 4. RESET */}
                {deploymentResult && (
                  <div className="pt-2">
                    <Button variant="ghost" onClick={() => setCurrentStep(1)} className="w-full text-gray-500">
                      Start New Deployment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* DIFF MODAL */}
            <ConfigDiff 
              diff={diffData} 
              isOpen={showDiff} 
              onClose={() => setShowDiff(false)} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
