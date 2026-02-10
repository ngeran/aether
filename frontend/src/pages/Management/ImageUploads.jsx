/**
 * =============================================================================
 * FILE LOCATION: frontend/src/pages/Management/ImageUploads.jsx
 * DESCRIPTION:   Production Image Upload Component with OLED-Optimized Dark Theme
 * VERSION:       4.0.0 - OLED Pure Black Theme
 * =============================================================================
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Loader2, HardDrive, Upload, CheckCircle2, XCircle,
  AlertCircle, Terminal, FileText, FileCheck,
  Server, CloudUpload, ArrowRight
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

// Shared Form Components
import DeviceAuthFields from '@/shared/DeviceAuthFields';
import DeviceTargetSelector from '@/shared/DeviceTargetSelector';
import FileSelection from '@/shared/FileSelection';
import LiveLogViewer from '@/components/realTimeProgress/LiveLogViewer';

// Hooks
import { useJobWebSocket } from '@/hooks/useJobWebSocket';
import useWorkflowMessages from '@/hooks/useWorkflowMessages';

// =============================================================================
// SECTION 1: CONFIGURATION
// =============================================================================

const API_BASE = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8000';
const VALIDATION_DEBOUNCE_DELAY = 2000;

const UPLOAD_STEPS = {
  FILE_SELECTION: 1,
  DEVICE_CONFIG: 2,
  STORAGE_VALIDATION: 3,
  UPLOAD: 4,
  COMPLETE: 5
};

// Step configuration with modern styling
const steps = [
  { id: UPLOAD_STEPS.FILE_SELECTION, label: 'Select File', icon: FileCheck },
  { id: UPLOAD_STEPS.DEVICE_CONFIG, label: 'Device Config', icon: Server },
  { id: UPLOAD_STEPS.STORAGE_VALIDATION, label: 'Storage Check', icon: HardDrive },
  { id: UPLOAD_STEPS.UPLOAD, label: 'Upload', icon: Upload },
  { id: UPLOAD_STEPS.COMPLETE, label: 'Complete', icon: CheckCircle2 }
];

// =============================================================================
// SECTION 2: COMPONENT DEFINITION
// =============================================================================

export default function ImageUploads({
  // Optional props for external control
  parameters: externalParameters,
  onParamChange: externalOnParamChange,
  selectedFile: externalSelectedFile,
  setSelectedFile: externalSetSelectedFile,
  isRunning = false,
  isUploading: externalIsUploading,
  uploadProgress: externalUploadProgress
}) {

  // ===========================================================================
  // SECTION 3: STATE MANAGEMENT
  // ===========================================================================

  const [internalSelectedFile, setInternalSelectedFile] = useState(null);
  const [internalParameters, setInternalParameters] = useState({
    hostname: '', username: '', password: ''
  });

  // Storage validation state
  const [checkJobId, setCheckJobId] = useState(null);
  const [storageCheck, setStorageCheck] = useState(null);
  const [isCheckingStorage, setIsCheckingStorage] = useState(false);
  const [storageCheckError, setStorageCheckError] = useState(null);

  // Upload state
  const [uploadJobId, setUploadJobId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);

  // Terminal logs state
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [showTechnicalLogs, setShowTechnicalLogs] = useState(false);
  const terminalEndRef = useRef(null);

  // UI state
  const [currentStep, setCurrentStep] = useState(UPLOAD_STEPS.FILE_SELECTION);

  // ===========================================================================
  // SECTION 4: PROPS RESOLUTION
  // ===========================================================================

  const selectedFile = externalSelectedFile !== undefined ? externalSelectedFile : internalSelectedFile;
  const parameters = externalParameters || internalParameters;
  const isUploadingResolved = externalIsUploading !== undefined ? externalIsUploading : isUploading;
  const uploadProgressResolved = externalUploadProgress !== undefined ? externalUploadProgress : uploadProgress;

  const setSelectedFile = externalSetSelectedFile || setInternalSelectedFile;
  const setParameters = externalOnParamChange
    ? (name, value) => externalOnParamChange(name, value)
    : (name, value) => setInternalParameters(prev => ({ ...prev, [name]: value }));

  // ===========================================================================
  // SECTION 5: WEBSOCKET & MESSAGING
  // ===========================================================================

  const { sendMessage, lastMessage, isConnected } = useJobWebSocket();

  // Create a memoized map of setters to pass to the hook
  const stateSetters = useMemo(() => ({
    // Mapped keys for 'image-upload' config in hook - MUST MATCH stateMap in useWorkflowMessages
    uploadJobId: setUploadJobId,
    uploadProgress: setUploadProgress,
    isUploading: setIsUploading,
    uploadComplete: setUploadComplete,
    uploadError: setUploadError,
    terminalLogs: setTerminalLogs,
    // Custom keys specific to this component's logic
    setStorageCheck,
    setStorageCheckError,
    setIsCheckingStorage
  }), []);

  /**
   * INTEGRATE THE REUSABLE HOOK
   */
  useWorkflowMessages({
    workflowType: 'image-upload',
    jobId: uploadJobId || checkJobId, // Listen for either job type
    lastMessage,
    stateSetters,
  });

  // ===========================================================================
  // SECTION 5A: AUTO-SCROLL LOGS
  // ===========================================================================

  // Auto-scroll logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLogs]);

  // ===========================================================================
  // SECTION 6: STEP MANAGEMENT
  // ===========================================================================

  useEffect(() => {
    if (uploadComplete) {
      setCurrentStep(UPLOAD_STEPS.COMPLETE);
    } else if (isUploadingResolved) {
      setCurrentStep(UPLOAD_STEPS.UPLOAD);
    } else if (storageCheck && storageCheck.has_sufficient_space) {
      setCurrentStep(UPLOAD_STEPS.STORAGE_VALIDATION);
    } else if (parameters.hostname && parameters.username && parameters.password) {
      setCurrentStep(UPLOAD_STEPS.DEVICE_CONFIG);
    } else if (selectedFile) {
      setCurrentStep(UPLOAD_STEPS.FILE_SELECTION);
    }
  }, [selectedFile, parameters, storageCheck, isUploadingResolved, uploadComplete]);

  // ===========================================================================
  // SECTION 7: ACTIONS (API CALLS)
  // ===========================================================================

  const startStorageCheck = async () => {
    if (!selectedFile || !parameters.hostname || !parameters.username || !parameters.password) return;

    setIsCheckingStorage(true);
    setStorageCheckError(null);
    setStorageCheck(null);
    setTerminalLogs([{
      id: 'validation_start',
      type: 'INFO',
      message: `🔍 Validating storage on ${parameters.hostname}...`,
      timestamp: new Date().toLocaleTimeString(),
      isTechnical: false
    }]);

    try {
      const payload = {
        hostname: parameters.hostname,
        username: parameters.username,
        password: parameters.password,
        tests: ["test_storage_check"],
        mode: "check",
        tag: "snap",
        file_size: selectedFile.size
      };

      const response = await fetch(`${API_BASE}/api/operations/validation/execute-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(await response.text());

      const data = await response.json();
      setCheckJobId(data.job_id);

      if (data.ws_channel && isConnected) {
        sendMessage({ type: 'SUBSCRIBE', channel: data.ws_channel });
      }

    } catch (error) {
      setStorageCheckError(error.message);
      setIsCheckingStorage(false);
      setTerminalLogs(prev => [...prev, {
        id: 'validation_error',
        type: 'ERROR',
        message: `Validation failed: ${error.message}`,
        timestamp: new Date().toLocaleTimeString(),
        isTechnical: false
      }]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !parameters.hostname || !parameters.username || !parameters.password) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    setUploadComplete(false);

    setTerminalLogs(prev => [...prev, {
      id: 'upload_start',
      type: 'INFO',
      message: `📤 Starting upload of ${selectedFile.name}...`,
      timestamp: new Date().toLocaleTimeString(),
      isTechnical: false
    }]);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('hostname', parameters.hostname);
      formData.append('username', parameters.username);
      formData.append('password', parameters.password);
      formData.append('protocol', 'scp');
      formData.append('scriptId', `image_upload_${Date.now()}`);
      formData.append('wsClientId', 'web_client');
      formData.append('remote_filename', selectedFile.name);

      const response = await fetch(`${API_BASE}/api/files/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error(await response.text());

      const data = await response.json();
      setUploadJobId(data.job_id);

      if (data.ws_channel && isConnected) {
        sendMessage({ type: 'SUBSCRIBE', channel: data.ws_channel });
      }

    } catch (error) {
      setUploadError(error.message);
      setIsUploading(false);
      setTerminalLogs(prev => [...prev, {
        id: 'upload_error',
        type: 'ERROR',
        message: `Upload failed: ${error.message}`,
        timestamp: new Date().toLocaleTimeString(),
        isTechnical: false
      }]);
    }
  };

  const handleReset = () => {
    setInternalSelectedFile(null);
    setInternalParameters({ hostname: '', username: '', password: '' });
    setStorageCheck(null);
    setStorageCheckError(null);
    setUploadError(null);
    setUploadProgress(0);
    setUploadComplete(false);
    setTerminalLogs([]);
    setCurrentStep(UPLOAD_STEPS.FILE_SELECTION);
  };

  // ===========================================================================
  // SECTION 8: AUTO-VALIDATION TRIGGER
  // ===========================================================================

  useEffect(() => {
    const isReady = selectedFile && parameters.hostname && parameters.username && parameters.password;

    if (isReady && !isCheckingStorage && !storageCheck) {
      const timer = setTimeout(startStorageCheck, VALIDATION_DEBOUNCE_DELAY);
      return () => clearTimeout(timer);
    } else if (!isReady) {
      setStorageCheck(null);
      setStorageCheckError(null);
    }
  }, [selectedFile, parameters.hostname, parameters.username, parameters.password]);

  // ===========================================================================
  // SECTION 9: HELPER FUNCTIONS
  // ===========================================================================

  const getStorageStatusIcon = () => {
    if (isCheckingStorage) return <Loader2 className="h-5 w-5 animate-spin text-cyan-600 dark:text-cyan-400" />;
    if (storageCheckError || (storageCheck && !storageCheck.has_sufficient_space)) return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
    if (storageCheck && storageCheck.has_sufficient_space) return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
    return <HardDrive className="h-5 w-5 text-gray-400" />;
  };

  const getStorageStatusText = () => {
    if (isCheckingStorage) return 'Validating storage...';
    if (storageCheckError) return 'Validation failed';
    if (storageCheck && !storageCheck.has_sufficient_space) return 'Insufficient space';
    if (storageCheck && storageCheck.has_sufficient_space) return 'Storage validated';
    return 'Pending validation';
  };

  const getStorageStatusColor = () => {
    if (isCheckingStorage) return 'border-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-950/20';
    if (storageCheckError || (storageCheck && !storageCheck.has_sufficient_space)) return 'border-red-500/30 bg-red-50/50 dark:bg-red-950/20';
    if (storageCheck && storageCheck.has_sufficient_space) return 'border-green-500/30 bg-green-50/50 dark:bg-green-950/20';
    return 'border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // ===========================================================================
  // SECTION 10: RENDER UI
  // ===========================================================================

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* HEADER */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black sticky top-0 z-10 backdrop-blur-sm bg-white/95 dark:bg-black/95">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-black dark:text-white mb-2 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                  <CloudUpload className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                Image Upload Workflow
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload firmware images and configuration files with pre-validation.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isConnected ? "success" : "destructive"} className="text-sm">
                {isConnected ? '🟢 WS Connected' : '🔴 WS Disconnected'}
              </Badge>
              {uploadComplete && (
                <Badge variant="success" className="text-sm">✅ Upload Complete</Badge>
              )}
            </div>
          </div>

          {/* Steps - Modern OLED Styling */}
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
                }`}>{step.label}</span>
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
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Step 1: File Selection */}
          <Card className={`glass-card rounded-2xl card-hover ${currentStep >= UPLOAD_STEPS.FILE_SELECTION ? 'border-cyan-500/30' : 'border-gray-200 dark:border-gray-800'}`}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                  <FileCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                1. Select File
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <FileSelection
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                isRunning={isRunning || isUploadingResolved}
              />
            </CardContent>
          </Card>

          {/* Step 2: Device Configuration */}
          <Card className={`glass-card rounded-2xl card-hover ${currentStep >= UPLOAD_STEPS.DEVICE_CONFIG ? 'border-cyan-500/30' : 'border-gray-200 dark:border-gray-800'}`}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                  <Server className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                2. Device Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <DeviceTargetSelector parameters={parameters} onParamChange={setParameters} />
              <Separator className="bg-gray-200 dark:bg-gray-800" />
              <DeviceAuthFields parameters={parameters} onParamChange={setParameters} />
            </CardContent>
          </Card>

          {/* Step 3: Logs */}
          <Card className="glass-card rounded-2xl border-gray-200 dark:border-gray-800">
            <CardHeader className="pb-4">
               <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-lg text-black dark:text-white">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                    <Terminal className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  Live Execution Log
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTechnicalLogs(!showTechnicalLogs)}
                  className="text-xs text-gray-600 dark:text-gray-400"
                >
                  {showTechnicalLogs ? 'Hide Debug' : 'Show Debug'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <LiveLogViewer
                logs={terminalLogs}
                isConnected={isConnected}
                height="h-[350px]"
                showTechnical={showTechnicalLogs}
                isDarkTheme={true}
              />
            </CardContent>
          </Card>

          {/* Step 4: Validation & Upload */}
          <Card className={`glass-card rounded-2xl card-hover ${currentStep >= UPLOAD_STEPS.STORAGE_VALIDATION ? 'border-cyan-500/30' : 'border-gray-200 dark:border-gray-800'}`}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                  <HardDrive className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                3. Validation & Upload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Status Box - Modern OLED */}
              <div className={`p-4 rounded-2xl border-2 backdrop-blur-sm ${getStorageStatusColor()} space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-2 text-black dark:text-white">
                    {getStorageStatusIcon()} {getStorageStatusText()}
                  </span>
                  {isCheckingStorage && <Loader2 className="h-4 w-4 animate-spin text-cyan-600 dark:text-cyan-400" />}
                </div>

                {storageCheck && storageCheck.has_sufficient_space && (
                   <div className="p-3 bg-green-100 dark:bg-green-950/30 rounded-xl text-sm text-green-800 dark:text-green-300 border border-green-300 dark:border-green-800/50">
                      <div className="font-semibold mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        ✅ Sufficient Space Found
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Required:</span>
                        <span className="font-mono text-right text-gray-900 dark:text-gray-100">
                          {(storageCheck.required_mb || 0).toFixed(2)} MB
                        </span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Available:</span>
                        <span className="font-mono text-right text-green-700 dark:text-green-400 font-bold">
                          {(storageCheck.available_mb || 0).toFixed(2)} MB
                        </span>
                      </div>
                   </div>
                )}

                {(storageCheckError || (storageCheck && !storageCheck.has_sufficient_space)) && (
                   <Button onClick={startStorageCheck} disabled={isCheckingStorage} variant="outline" size="sm" className="w-full mt-3">
                     Retry Validation
                   </Button>
                )}
              </div>

              {/* Upload Action - Gradient Button */}
              <div className="space-y-4">
                {!uploadComplete ? (
                  <>
                    <Button
                      onClick={handleUpload}
                      disabled={!selectedFile || !parameters.hostname || !parameters.username || !parameters.password || !storageCheck?.has_sufficient_space || isUploadingResolved}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 transition-all duration-300"
                      size="lg"
                    >
                      {isUploadingResolved ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Uploading... {uploadProgressResolved.toFixed(0)}%
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 mr-2" />
                          Start Upload
                        </>
                      )}
                    </Button>
                    {isUploadingResolved && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">Progress</span>
                          <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                            {uploadProgressResolved.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-300 shimmer"
                            style={{ width: `${uploadProgressResolved}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <Button onClick={handleReset} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25 transition-all duration-300">
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Another File
                  </Button>
                )}

                {uploadError && (
                  <Alert className="bg-red-50 dark:bg-red-950/20 border-red-500/30">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-800 dark:text-red-300">{uploadError}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
