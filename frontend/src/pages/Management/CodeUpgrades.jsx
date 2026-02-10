
/**
 * =============================================================================
 * CODE UPGRADES COMPONENT - MAIN ORCHESTRATOR v5.2.0
 * =============================================================================
 *
 * Centralized orchestration for device upgrade workflow with OLED-Optimized Dark Theme
 *
 * ENHANCEMENTS v5.2.0 (2026-02-09):
 * - OLED-optimized pure black theme for energy efficiency
 * - Cyan/gradient accents matching Reporting section
 * - Glassmorphism cards with backdrop-blur effects
 * - Modern gradient buttons and progress bars
 *
 * WORKFLOW:
 * Configuration → Pre-Check (Execute) → Review → Upgrade → Results
 * Tabs remain accessible for reviewing respective phase outputs
 */

import React, { useMemo, useCallback } from 'react';
import { Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useJobWebSocket } from '@/hooks/useJobWebSocket';
import { useUpgradeState } from './hooks/useUpgradeState';
import { usePreCheck } from './hooks/usePreCheck';
import { useCodeUpgrade } from './hooks/useCodeUpgrade';
import { useWebSocketMessages } from './hooks/useWebSocketMessages';

import ConfigurationTab from './tabs/ConfigurationTab';
import ExecutionTab from './tabs/ExecutionTab';
import ReviewTab from './tabs/ReviewTab';
import UpgradeTab from './tabs/UpgradeTab';
import ResultsTab from './tabs/ResultsTab';

import { extractVersionFromImageFilename } from '@/utils/versionParser';

/**
 * =============================================================================
 * MAIN COMPONENT
 * =============================================================================
 */
export default function CodeUpgrades() {

  // ==========================================================================
  // SECTION 1: WEBSOCKET CONNECTION
  // ==========================================================================
  const { sendMessage, lastMessage, isConnected } = useJobWebSocket();

  // ==========================================================================
  // SECTION 2: CENTRALIZED STATE MANAGEMENT
  // ==========================================================================
  const {
    // Upgrade parameters
    upgradeParams,
    setUpgradeParams,

    // UI state
    activeTab,
    setActiveTab,
    jobStatus,
    setJobStatus,
    currentPhase,
    setCurrentPhase,
    showTechnicalDetails,
    setShowTechnicalDetails,

    // Progress tracking
    progress,
    setProgress,
    jobOutput,
    setJobOutput,
    completedSteps,
    setCompletedSteps,
    totalSteps,
    setTotalSteps,

    // Job identifiers
    jobId,
    setJobId,
    wsChannel,
    setWsChannel,
    finalResults,
    setFinalResults,

    // Pre-check state
    preCheckJobId,
    setPreCheckJobId,
    preCheckResults,
    setPreCheckResults,
    preCheckSummary,
    setPreCheckSummary,
    isRunningPreCheck,
    setIsRunningPreCheck,
    canProceedWithUpgrade,
    setCanProceedWithUpgrade,

    // Pre-check selection
    selectedPreChecks,
    setSelectedPreChecks,

    // Statistics
    statistics,
    setStatistics,

    // Refs
    processedStepsRef,
    latestStepMessageRef,
    loggedMessagesRef,
    scrollAreaRef,

    // Utility functions
    resetState,
  } = useUpgradeState();

  // ==========================================================================
  // SECTION 3: STATE SETTER WRAPPER
  // ==========================================================================
  const setState = useCallback((updates) => {
    if (typeof updates === 'function') {
      console.warn('[STATE] Functional updates not yet implemented in setState wrapper');
      return;
    }

    Object.entries(updates).forEach(([key, value]) => {
      switch (key) {
        case 'upgradeParams': setUpgradeParams(value); break;
        case 'activeTab': setActiveTab(value); break;
        case 'jobStatus': setJobStatus(value); break;
        case 'currentPhase': setCurrentPhase(value); break;
        case 'showTechnicalDetails': setShowTechnicalDetails(value); break;
        case 'progress': setProgress(value); break;
        case 'jobOutput': setJobOutput(value); break;
        case 'completedSteps': setCompletedSteps(value); break;
        case 'totalSteps': setTotalSteps(value); break;
        case 'jobId': setJobId(value); break;
        case 'wsChannel': setWsChannel(value); break;
        case 'finalResults': setFinalResults(value); break;
        case 'preCheckJobId': setPreCheckJobId(value); break;
        case 'preCheckResults': setPreCheckResults(value); break;
        case 'preCheckSummary': setPreCheckSummary(value); break;
        case 'isRunningPreCheck': setIsRunningPreCheck(value); break;
        case 'canProceedWithUpgrade': setCanProceedWithUpgrade(value); break;
        case 'selectedPreChecks': setSelectedPreChecks(value); break;
        case 'statistics': setStatistics(value); break;
        case 'processedStepsRef':
          if (value instanceof Set) {
            processedStepsRef.current = value;
          }
          break;
        case 'loggedMessagesRef':
          if (value instanceof Set) {
            loggedMessagesRef.current = value;
          }
          break;
        default:
          console.warn(`[STATE] Unknown state key: ${key}`);
      }
    });
  }, [
    setUpgradeParams, setActiveTab, setJobStatus, setCurrentPhase,
    setShowTechnicalDetails, setProgress, setJobOutput, setCompletedSteps,
    setTotalSteps, setJobId, setWsChannel, setFinalResults,
    setPreCheckJobId, setPreCheckResults, setPreCheckSummary,
    setIsRunningPreCheck, setCanProceedWithUpgrade, setSelectedPreChecks,
    setStatistics, processedStepsRef, loggedMessagesRef
  ]);

  // ==========================================================================
  // SECTION 4: CUSTOM HOOKS
  // ==========================================================================
  const { startPreCheck } = usePreCheck({
    upgradeParams,
    selectedPreChecks,
    isConnected,
    sendMessage,
    wsChannel,
    setState,
  });

  const { startUpgradeExecution } = useCodeUpgrade({
    upgradeParams,
    preCheckJobId,
    preCheckSummary,
    isConnected,
    sendMessage,
    wsChannel,
    setState,
  });

  useWebSocketMessages({
    lastMessage,
    jobId,
    wsChannel,
    currentPhase,
    jobOutput,
    preCheckSummary,
    totalSteps,
    progress,
    sendMessage,
    setState,
    refs: {
      processedStepsRef,
      latestStepMessageRef,
      loggedMessagesRef,
      scrollAreaRef,
    },
  });

  // ==========================================================================
  // SECTION 5: EVENT HANDLERS
  // ==========================================================================

  const handleParamChange = useCallback((name, value) => {
    console.log(`[PARAM_CHANGE] ${name}: ${value}`);
    setUpgradeParams(prev => ({ ...prev, [name]: value }));

    // Auto-extract version when image is selected
    if (name === 'image_filename' && value) {
      const preciseVersion = extractVersionFromImageFilename(value);
      if (preciseVersion) {
        console.log(`[VERSION_EXTRACTION] ✅ Extracted "${preciseVersion}" from "${value}"`);
        setUpgradeParams(prev => ({ ...prev, target_version: preciseVersion }));
      }
    }
  }, [setUpgradeParams]);

  const handlePreCheckSelectionChange = useCallback((checkIds) => {
    console.log(`[PRE_CHECK_SELECTION] Selected checks:`, checkIds);
    setSelectedPreChecks(checkIds);
  }, [setSelectedPreChecks]);

  const resetWorkflow = useCallback(() => {
    console.log("[WORKFLOW] Initiating complete reset");

    if (wsChannel) {
      console.log(`[WEBSOCKET] Unsubscribing from channel: ${wsChannel}`);
      sendMessage({ type: 'UNSUBSCRIBE', channel: wsChannel });
    }

    resetState();
    console.log("[WORKFLOW] Reset complete");
  }, [wsChannel, sendMessage, resetState]);

  // ==========================================================================
  // SECTION 6: DERIVED STATE
  // ==========================================================================

  const isRunning = jobStatus === 'running';
  const isComplete = jobStatus === 'success';
  const hasError = jobStatus === 'failed';

  const isFormValid = useMemo(() => {
    return (
      upgradeParams.username.trim() &&
      upgradeParams.password.trim() &&
      (upgradeParams.hostname.trim() || upgradeParams.inventory_file.trim()) &&
      upgradeParams.image_filename.trim() &&
      upgradeParams.target_version.trim()
    );
  }, [upgradeParams]);

  // ==========================================================================
  // SECTION 7: TAB ACCESSIBILITY LOGIC - FIXED v5.1.0
  // ==========================================================================

  /**
   * Determine if tab should be disabled
   *
   * CRITICAL FIX v5.1.0:
   * - Upgrade tab now remains accessible even after completion
   * - User can review messages in Upgrade tab from Results tab
   * - Only disable tabs that haven't been reached yet
   */
  const isTabDisabled = (tabValue) => {
    switch (tabValue) {
      case 'config':
        return isRunning; // Disable during any operation
      case 'execute':
        return currentPhase === 'config'; // Disable if pre-check hasn't started
      case 'review':
        return !preCheckSummary && activeTab !== 'review'; // Disable if no pre-check results
      case 'upgrade':
        // FIXED v5.1.0: Never disable upgrade tab after it's been accessed
        // Allow user to return and review messages
        return currentPhase === 'config' || currentPhase === 'pre_check' || currentPhase === 'review';
      case 'results':
        return currentPhase !== 'results'; // Only enable on completion
      default:
        return false;
    }
  };

  // ==========================================================================
  // SECTION 8: RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* ====================================================================
          HEADER SECTION - OLED Optimized
          ==================================================================== */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black sticky top-0 z-10 backdrop-blur-sm bg-white/95 dark:bg-black/95">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-black dark:text-white mb-2 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                  <Zap className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                Code Upgrade Operation
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upgrade device operating system with pre-flight validation
              </p>
            </div>

            {/* Reset button - only show when job is active */}
            {jobStatus !== 'idle' && (
              <Button onClick={resetWorkflow} variant="outline" size="sm" className="card-hover">
                Start New Upgrade
              </Button>
            )}
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-xl border-2 flex items-center gap-2 transition-all duration-200 ${
              isConnected
                ? 'bg-green-50/50 dark:bg-green-950/20 border-green-500/30 text-green-700 dark:text-green-300'
                : 'bg-red-50/50 dark:bg-red-950/20 border-red-500/30 text-red-700 dark:text-red-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 pulse-glow' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {activeTab && (
              <div className="px-4 py-2 rounded-xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300">
                <span className="text-sm font-medium">
                  Phase: <span className="font-bold">{activeTab}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
      <Separator className="mb-8 bg-gray-200 dark:bg-gray-800" />

      {/* ====================================================================
          MAIN TABS CONTAINER
          ==================================================================== */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

        {/* ==================================================================
            TAB NAVIGATION - 5 TABS WITH IMPROVED ACCESSIBILITY
            ================================================================== */}
        <TabsList className="grid w-full grid-cols-5 lg:w-[800px] mx-auto mb-6 bg-gray-100 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl p-1">
          {/* Tab 1: Configuration */}
          <TabsTrigger value="config" disabled={isTabDisabled('config')}>
            Configure
          </TabsTrigger>

          {/* Tab 2: Pre-Check Execution */}
          <TabsTrigger value="execute" disabled={isTabDisabled('execute')}>
            Pre-Check
          </TabsTrigger>

          {/* Tab 3: Review */}
          <TabsTrigger
            value="review"
            disabled={isTabDisabled('review')}
            className={preCheckSummary ? "bg-green-50 border-green-200" : ""}
          >
            Review {preCheckSummary && "✅"}
          </TabsTrigger>

          {/* Tab 4: Upgrade - NOW REMAINS ACCESSIBLE */}
          <TabsTrigger
            value="upgrade"
            disabled={isTabDisabled('upgrade')}
            className={currentPhase === "upgrade" || activeTab === "upgrade" ? "bg-blue-50 border-blue-200" : ""}
          >
            Upgrade
          </TabsTrigger>

          {/* Tab 5: Results */}
          <TabsTrigger value="results" disabled={isTabDisabled('results')}>
            Results
          </TabsTrigger>
        </TabsList>

        {/* ==================================================================
            TAB CONTENT - CONFIGURATION
            ================================================================== */}
        <TabsContent value="config">
          <ConfigurationTab
            upgradeParams={upgradeParams}
            onParamChange={handleParamChange}
            onStartPreCheck={startPreCheck}
            isFormValid={isFormValid}
            isRunning={isRunning}
            isConnected={isConnected}
            selectedPreChecks={selectedPreChecks}
            onPreCheckSelectionChange={handlePreCheckSelectionChange}
          />
        </TabsContent>

        {/* ==================================================================
            TAB CONTENT - EXECUTION (PRE-CHECK)
            ================================================================== */}
        <TabsContent value="execute">
          <ExecutionTab
            currentPhase={currentPhase}
            isRunning={isRunning}
            isComplete={isComplete}
            hasError={hasError}
            progress={progress}
            completedSteps={completedSteps}
            totalSteps={totalSteps}
            latestStepMessage={latestStepMessageRef.current}
            jobOutput={jobOutput}
            showTechnicalDetails={showTechnicalDetails}
            onToggleTechnicalDetails={() => setShowTechnicalDetails(!showTechnicalDetails)}
            scrollAreaRef={scrollAreaRef}
          />
        </TabsContent>

        {/* ==================================================================
            TAB CONTENT - REVIEW
            ================================================================== */}
        <TabsContent value="review">
          <ReviewTab
            preCheckSummary={preCheckSummary}
            upgradeParams={upgradeParams}
            isConnected={isConnected}
            jobStatus={jobStatus}
            isRunningPreCheck={isRunningPreCheck}
            onProceedWithUpgrade={startUpgradeExecution}
            onCancel={resetWorkflow}
            onForceReview={() => { }}
          />
        </TabsContent>

        {/* ==================================================================
            TAB CONTENT - UPGRADE (REAL-TIME MONITORING)
            ================================================================== */}
        <TabsContent value="upgrade">
          <UpgradeTab
            jobStatus={jobStatus}
            isRunning={isRunning && currentPhase === "upgrade"}
            isComplete={isComplete}
            hasError={hasError}
            progress={progress}
            completedSteps={completedSteps}
            totalSteps={totalSteps}
            jobOutput={jobOutput}
            showTechnicalDetails={showTechnicalDetails}
            onToggleTechnicalDetails={() => setShowTechnicalDetails(!showTechnicalDetails)}
            scrollAreaRef={scrollAreaRef}
          />
        </TabsContent>

        {/* ==================================================================
            TAB CONTENT - RESULTS
            ================================================================== */}
        <TabsContent value="results">
          <ResultsTab
            jobStatus={jobStatus}
            finalResults={finalResults}
            preCheckSummary={preCheckSummary}
            upgradeParams={upgradeParams}
            jobId={jobId}
            preCheckJobId={preCheckJobId}
            progress={progress}
            completedSteps={completedSteps}
            totalSteps={totalSteps}
            currentPhase={currentPhase}
            isConnected={isConnected}
            statistics={statistics}
            showTechnicalDetails={showTechnicalDetails}
            onToggleTechnicalDetails={() => setShowTechnicalDetails(!showTechnicalDetails)}
            onNavigateToExecute={() => setActiveTab("execute")}
            onStartNewUpgrade={resetWorkflow}
            jobOutput={jobOutput}
          />
        </TabsContent>

      </Tabs>
    </div>
    </div>
  );
}
