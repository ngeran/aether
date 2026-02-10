/**
 * =============================================================================
 * CONFIGURATION TAB COMPONENT - OLED Optimized v5.0.0
 * =============================================================================
 *
 * Device configuration, image selection, and upgrade options interface
 * with OLED-optimized dark theme for energy efficiency
 *
 * VERSION: 5.0.0 - OLED Pure Black Theme
 * @module components/tabs/ConfigurationTab
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CheckCircle,
  Shield,
  ArrowRight,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Image,
  Server,
  Lock,
  Package,
  Settings,
  Zap
} from 'lucide-react';
import CodeUpgradeForm from '@/forms/CodeUpgradeForm';
import SelectImageRelease from '@/forms/SelectImageRelease';
import PreCheckSelector from '@/shared/PreCheckSelector';

/**
 * Configuration Tab Component
 *
 * First step in the upgrade workflow where users:
 * - Select software image
 * - Configure device credentials
 * - Specify target device
 * - Configure upgrade options
 * - Select pre-check validations to run
 * - Initiate pre-check validation
 *
 * @param {Object} props - Component properties
 * @param {Object} props.upgradeParams - Current upgrade parameters
 * @param {Function} props.onParamChange - Callback when parameters change
 * @param {Function} props.onStartPreCheck - Callback to start pre-check
 * @param {boolean} props.isFormValid - Whether form is valid
 * @param {boolean} props.isRunning - Whether operation is running
 * @param {boolean} props.isConnected - WebSocket connection status
 * @param {Array<string>} props.selectedPreChecks - Selected pre-check IDs
 * @param {Function} props.onPreCheckSelectionChange - Callback when pre-check selection changes
 */
export default function ConfigurationTab({
  upgradeParams,
  onParamChange,
  onStartPreCheck,
  isFormValid,
  isRunning,
  isConnected,
  selectedPreChecks,
  onPreCheckSelectionChange,
}) {

  // ===========================================================================
  // VALIDATION & STATE COMPUTATION
  // ===========================================================================

  const hasPreChecksSelected = selectedPreChecks && selectedPreChecks.length > 0;
  const canStartPreCheck = isFormValid && hasPreChecksSelected && !isRunning && isConnected;

  const upgradeOptionsConfigured =
    upgradeParams.no_validate !== undefined &&
    upgradeParams.no_copy !== undefined &&
    upgradeParams.auto_reboot !== undefined;

  const hasRiskyOptions =
    upgradeParams.no_validate === true ||
    upgradeParams.auto_reboot === false;

  // ===========================================================================
  // STATUS CONFIGURATION
  // ===========================================================================

  const configStatus = [
    {
      icon: Image,
      label: 'Image',
      value: upgradeParams.image_filename,
      isValid: !!upgradeParams.image_filename,
    },
    {
      icon: Package,
      label: 'Version',
      value: upgradeParams.target_version,
      isValid: !!upgradeParams.target_version,
    },
    {
      icon: Server,
      label: 'Device',
      value: upgradeParams.hostname || (upgradeParams.inventory_file ? 'Inventory' : null),
      isValid: !!(upgradeParams.hostname || upgradeParams.inventory_file),
    },
    {
      icon: Lock,
      label: 'Auth',
      value: upgradeParams.username ? '••••••' : null,
      isValid: !!(upgradeParams.username && upgradeParams.password),
    },
    {
      icon: Settings,
      label: 'Options',
      value: upgradeOptionsConfigured ? 'Configured' : 'Default',
      isValid: upgradeOptionsConfigured,
      hasWarning: hasRiskyOptions,
    },
    {
      icon: Shield,
      label: 'Checks',
      value: hasPreChecksSelected ? `${selectedPreChecks.length}` : null,
      isValid: hasPreChecksSelected,
    },
  ];

  const validCount = configStatus.filter(s => s.isValid).length;
  const totalCount = configStatus.length;
  const isFullyConfigured = canStartPreCheck;

  return (
    <div className="space-y-3 max-w-7xl mx-auto px-2 sm:px-4">

      {/* =====================================================================
          HEADER - OLED Optimized Configuration Overview
          ===================================================================== */}
      <div className="bg-gradient-to-br from-cyan-500/10 via-blue-600/10 to-purple-600/10 dark:from-cyan-950/30 dark:via-blue-950/30 dark:to-purple-950/30 rounded-2xl p-4 sm:p-5 shadow-lg border border-cyan-200 dark:border-cyan-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-black dark:text-white tracking-tight">Configuration</h1>
            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-0.5">
              Configure upgrade parameters
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-bold text-cyan-600 dark:text-cyan-400">{validCount}/{totalCount}</div>
            <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Complete</div>
          </div>
        </div>

        {/* Compact Status Indicators Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {configStatus.map((status, idx) => {
            const Icon = status.icon;
            return (
              <div
                key={idx}
                className={`relative overflow-hidden rounded-xl p-2.5 sm:p-3 transition-all ${status.isValid
                  ? 'bg-white/80 dark:bg-black/50 border border-cyan-300 dark:border-cyan-700 shadow-md'
                  : 'bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-gray-700'
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${status.isValid ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-500'}`} />
                  {status.isValid && !status.hasWarning && (
                    <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-600 dark:text-green-400" />
                  )}
                  {status.hasWarning && (
                    <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-orange-600 dark:text-orange-400" />
                  )}
                </div>
                <div className={`text-[10px] sm:text-xs font-semibold ${status.isValid ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                  {status.label}
                </div>
                {status.value && (
                  <div className="text-[9px] sm:text-[10px] text-gray-600 dark:text-gray-400 truncate mt-0.5">
                    {status.value}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          MAIN CONFIGURATION GRID - FOUR SQUARE GRID LAYOUT
          ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* SECTION 1: SOFTWARE IMAGE SELECTION */}
        <Card className="glass-card rounded-2xl card-hover border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2 px-3 sm:px-4 pt-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-black border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                <Image className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm sm:text-base font-bold text-black dark:text-white">Software Image</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs mt-0.5 hidden sm:block">
                  Select upgrade image and version
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <SelectImageRelease
              parameters={upgradeParams}
              onParamChange={onParamChange}
            />
          </CardContent>
        </Card>

        {/* SECTION 2: TARGET DEVICE & AUTHENTICATION */}
        <Card className="glass-card rounded-2xl card-hover border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2 px-3 sm:px-4 pt-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-black border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                <Server className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm sm:text-base font-bold text-black dark:text-white">Target & Auth</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs mt-0.5 hidden sm:block">
                  Device and credentials
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <CodeUpgradeForm
              parameters={upgradeParams}
              onParamChange={onParamChange}
            />
          </CardContent>
        </Card>

        {/* SECTION 3: UPGRADE OPTIONS */}
        <Card className="glass-card rounded-2xl card-hover border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2 px-3 sm:px-4 pt-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-black border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                <Settings className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm sm:text-base font-bold text-black dark:text-white">Upgrade Options</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs mt-0.5 hidden sm:block">
                  Configure upgrade behavior
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 space-y-2.5">

            {/* Option 1: Validate Image */}
            <div className="flex items-start space-x-2 p-2.5 sm:p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black hover:border-cyan-500/50 dark:hover:border-cyan-500/50 transition-all">
              <Checkbox
                id="validateImage"
                checked={!upgradeParams.no_validate}
                onCheckedChange={(checked) =>
                  onParamChange('no_validate', !checked)
                }
                disabled={isRunning}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <label
                  htmlFor="validateImage"
                  className="text-xs sm:text-sm font-semibold cursor-pointer block mb-1 text-black dark:text-white"
                >
                  Validate Image Before Installation
                </label>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  <span className="inline-flex items-center gap-0.5 text-green-700 dark:text-green-400 font-semibold">
                    <CheckCircle className="h-2.5 w-2.5" /> Recommended
                  </span>
                  {' '}— Validates integrity (~2 min). Unchecking increases risk.
                </p>
              </div>
            </div>

            {/* Option 2: Skip File Copy */}
            <div className="flex items-start space-x-2 p-2.5 sm:p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black hover:border-cyan-500/50 dark:hover:border-cyan-500/50 transition-all">
              <Checkbox
                id="skipCopy"
                checked={upgradeParams.no_copy}
                onCheckedChange={(checked) =>
                  onParamChange('no_copy', checked)
                }
                disabled={isRunning}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <label
                  htmlFor="skipCopy"
                  className="text-xs sm:text-sm font-semibold cursor-pointer block mb-1 text-black dark:text-white"
                >
                  Skip File Copy (Already on Device)
                </label>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Enable if image is in{' '}
                  <code className="bg-gray-100 dark:bg-gray-900 px-1 py-0.5 rounded text-[10px] font-mono border border-gray-300 dark:border-gray-700">
                    /var/tmp/
                  </code>. Saves transfer time.
                </p>
              </div>
            </div>

            {/* Option 3: Auto Reboot */}
            <div className="flex items-start space-x-2 p-2.5 sm:p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black hover:border-cyan-500/50 dark:hover:border-cyan-500/50 transition-all">
              <Checkbox
                id="autoReboot"
                checked={upgradeParams.auto_reboot}
                onCheckedChange={(checked) =>
                  onParamChange('auto_reboot', checked)
                }
                disabled={isRunning}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <label
                  htmlFor="autoReboot"
                  className="text-xs sm:text-sm font-semibold cursor-pointer block mb-1 text-black dark:text-white"
                >
                  Auto Reboot After Installation
                </label>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  <span className="inline-flex items-center gap-0.5 text-green-700 dark:text-green-400 font-semibold">
                    <CheckCircle className="h-2.5 w-2.5" /> Recommended
                  </span>
                  {' '}— Auto reboots (~5-10 min). Unchecking needs manual reboot.
                </p>
              </div>
            </div>

            {/* Warning Alerts - Compact */}
            {upgradeParams.no_validate && (
              <Alert className="border-2 border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20 p-2.5 rounded-xl">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                <AlertTitle className="text-orange-900 dark:text-orange-100 font-bold text-xs">
                  Validation Disabled
                </AlertTitle>
                <AlertDescription className="text-orange-800 dark:text-orange-200 text-[10px] sm:text-xs">
                  Skipping validation increases failure risk. Only disable if image is verified.
                </AlertDescription>
              </Alert>
            )}

            {!upgradeParams.auto_reboot && (
              <Alert className="border-2 border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20 p-2.5 rounded-xl">
                <AlertCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-900 dark:text-blue-100 font-bold text-xs">
                  Manual Reboot Required
                </AlertTitle>
                <AlertDescription className="text-blue-800 dark:text-blue-200 text-[10px] sm:text-xs">
                  Manual reboot needed to complete upgrade. Version verification will be skipped.
                </AlertDescription>
              </Alert>
            )}

          </CardContent>
        </Card>

        {/* SECTION 4: VALIDATION CHECKS */}
        <Card className="glass-card rounded-2xl card-hover border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2 px-3 sm:px-4 pt-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-black border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                <Shield className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm sm:text-base font-bold text-black dark:text-white">Pre-Check Validations</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs mt-0.5 hidden sm:block">
                  Select validation checks
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <PreCheckSelector
              selectedChecks={selectedPreChecks}
              onChange={onPreCheckSelectionChange}
              disabled={isRunning}
            />
          </CardContent>
        </Card>
      </div>

      {/* =====================================================================
          SECTION 5: READY TO VALIDATE - OLED Action Panel
          ===================================================================== */}
      <Card className="glass-card rounded-2xl border-2 border-cyan-500/30 dark:border-cyan-500/20 shadow-lg shadow-cyan-500/10">
        <CardContent className="p-3 sm:p-4">

          {/* Connection Warning - Compact */}
          {!isConnected && (
            <Alert className="mb-3 border-2 border-red-500/30 bg-red-50/50 dark:bg-red-950/20 p-2.5 rounded-xl">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              <AlertTitle className="font-bold text-red-900 dark:text-red-100 text-xs">Connection Issue</AlertTitle>
              <AlertDescription className="text-[10px] sm:text-xs text-red-800 dark:text-red-200">
                WebSocket disconnected. Check your connection.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">

            {/* Status Section - Compact */}
            <div className="flex-1 w-full min-w-0">
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`p-2 rounded-xl transition-all ${isFullyConfigured
                  ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg'
                  : 'bg-gray-200 dark:bg-gray-800'
                  }`}>
                  <Zap className={`h-5 w-5 sm:h-6 sm:w-6 ${isFullyConfigured ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                    }`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-bold tracking-tight truncate text-black dark:text-white">
                    {isFullyConfigured ? 'Ready to Validate' : 'Configuration Incomplete'}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                    {isFullyConfigured
                      ? 'Start pre-check validation'
                      : 'Complete required fields'}
                  </p>
                </div>
              </div>

              {/* Validation Messages - Compact */}
              {!isFormValid && (
                <div className="bg-gray-100 dark:bg-gray-900 rounded-xl p-2.5 border border-gray-300 dark:border-gray-700">
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-1.5 flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3" />
                    Missing:
                  </p>
                  <div className="space-y-1 text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">
                    {!upgradeParams.image_filename && (
                      <p className="flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-gray-400 dark:bg-gray-600 rounded-full"></span>
                        Software image
                      </p>
                    )}
                    {!upgradeParams.hostname && !upgradeParams.inventory_file && (
                      <p className="flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-gray-400 dark:bg-gray-600 rounded-full"></span>
                        Device target
                      </p>
                    )}
                    {(!upgradeParams.username || !upgradeParams.password) && (
                      <p className="flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-gray-400 dark:bg-gray-600 rounded-full"></span>
                        Credentials
                      </p>
                    )}
                  </div>
                </div>
              )}

              {isFormValid && !hasPreChecksSelected && (
                <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-xl p-2.5 border border-amber-300 dark:border-amber-800">
                  <p className="text-[10px] sm:text-xs text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" />
                    Select at least one validation check
                  </p>
                </div>
              )}
            </div>

            {/* Action Button - Compact */}
            <div className="w-full sm:w-auto">
              <Button
                onClick={onStartPreCheck}
                disabled={!canStartPreCheck}
                className={`w-full sm:w-auto px-6 sm:px-8 h-10 sm:h-12 text-sm sm:text-base font-bold transition-all ${canStartPreCheck
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/40'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" />
                    Running
                  </>
                ) : (
                  <>
                    Start Pre-Check
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
