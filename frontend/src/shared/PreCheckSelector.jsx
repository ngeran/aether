/**
 * =============================================================================
 * PRE-CHECK SELECTOR COMPONENT - OLED Optimized v3.0.0
 * =============================================================================
 *
 * Reusable checkbox group for selecting pre-upgrade validation checks.
 * OLED-optimized with pure black backgrounds and cyan accents.
 *
 * LOCATION: /src/shared/PreCheckSelector.jsx
 * VERSION: 3.0.0 - OLED Pure Black Theme
 * =============================================================================
 */
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Loader2,
  AlertTriangle,
  Info,
  Lock,
  Clock,
  CheckCircle2,
  XCircle,
  Layers,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function PreCheckSelector({
  selectedChecks = [],
  onChange,
  disabled = false,
  className = '',
}) {
  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  const [groupedChecks, setGroupedChecks] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});

  // ===========================================================================
  // FETCH CONFIGURATION
  // ===========================================================================
  useEffect(() => {
    fetchPreCheckConfig();
  }, []);

  const fetchPreCheckConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/pre-checks/config', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to load pre-check configuration: ${response.status}`);
      }

      const data = await response.json();
      setConfig(data);

      // Group checks by category
      const grouped = groupChecksByCategory(data.checks, data.categories);
      setGroupedChecks(grouped);

      // Initialize all categories as collapsed
      const initialExpanded = {};
      Object.keys(grouped).forEach(categoryId => {
        initialExpanded[categoryId] = false;
      });
      setExpandedCategories(initialExpanded);

      // Initialize selection with required checks and defaults
      const initialSelection = data.checks
        .filter(check => check.required || check.enabled_by_default)
        .map(check => check.id);

      if (onChange && selectedChecks.length === 0) {
        onChange(initialSelection);
      }
    } catch (err) {
      console.error('[PRE_CHECK_SELECTOR] Failed to fetch config:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const groupChecksByCategory = (checks, categories) => {
    const grouped = {};
    const sortedCategories = Object.entries(categories || {})
      .sort(([, a], [, b]) => a.order - b.order);

    sortedCategories.forEach(([categoryId, categoryInfo]) => {
      grouped[categoryId] = {
        ...categoryInfo,
        checks: checks.filter(check => check.category === categoryId),
      };
    });

    return grouped;
  };

  // ===========================================================================
  // CATEGORY COLLAPSE HANDLERS
  // ===========================================================================
  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const expandAll = () => {
    const allExpanded = {};
    Object.keys(groupedChecks).forEach(categoryId => {
      allExpanded[categoryId] = true;
    });
    setExpandedCategories(allExpanded);
  };

  const collapseAll = () => {
    const allCollapsed = {};
    Object.keys(groupedChecks).forEach(categoryId => {
      allCollapsed[categoryId] = false;
    });
    setExpandedCategories(allCollapsed);
  };

  // ===========================================================================
  // SELECTION HANDLERS
  // ===========================================================================
  const handleCheckToggle = (checkId, isRequired) => {
    if (disabled || isRequired) return;

    const newSelection = selectedChecks.includes(checkId)
      ? selectedChecks.filter(id => id !== checkId)
      : [...selectedChecks, checkId];

    onChange(newSelection);
  };

  const handleSelectAll = () => {
    if (disabled) return;
    const allCheckIds = config.checks
      .filter(check => check.available)
      .map(check => check.id);
    onChange(allCheckIds);
  };

  const handleSelectRequired = () => {
    if (disabled) return;
    const requiredCheckIds = config.checks
      .filter(check => check.required)
      .map(check => check.id);
    onChange(requiredCheckIds);
  };

  // ===========================================================================
  // HELPER FUNCTIONS
  // ===========================================================================
  const getSeverityBadge = (severity) => {
    const styles = {
      critical: { icon: XCircle, className: 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-500/30' },
      warning: { icon: AlertTriangle, className: 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-500/30' },
      pass: { icon: CheckCircle2, className: 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-500/30' },
    };
    const style = styles[severity] || styles.pass;
    const Icon = style.icon;
    return (
      <Badge variant="outline" className={`text-xs font-medium ${style.className}`}>
        <Icon className="h-3 w-3 mr-1" />
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const getTotalDuration = () => {
    if (!config) return 0;
    return config.checks
      .filter(check => selectedChecks.includes(check.id))
      .reduce((total, check) => total + check.estimated_duration_seconds, 0);
  };

  const getCategoryStats = (category) => {
    const totalInCategory = category.checks.length;
    const selectedInCategory = category.checks.filter(c =>
      selectedChecks.includes(c.id)
    ).length;
    return { total: totalInCategory, selected: selectedInCategory };
  };

  // =============================================================================
  // RENDER STATES
  // =============================================================================

  // Loading State
  if (loading) {
    return (
      <Card className="glass-card rounded-2xl border-2 border-cyan-500/30 dark:border-cyan-900/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg text-black dark:text-white">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-600 dark:text-cyan-400" />
            Loading Validation Checks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32 bg-gray-200 dark:bg-gray-800" />
              <Skeleton className="h-16 w-full bg-gray-100 dark:bg-gray-900" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Error State
  if (error) {
    return (
      <Card className="glass-card rounded-2xl border-2 border-red-500/30 dark:border-red-900/50">
        <CardContent className="pt-6">
          <Alert variant="destructive" className="border-2 border-red-500/30 bg-red-50/50 dark:bg-red-950/20">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="font-medium text-red-900 dark:text-red-100">
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Main Render
  const totalDuration = getTotalDuration();
  const selectedCount = selectedChecks.length;
  const totalCount = config?.checks.filter(c => c.available).length || 0;
  const requiredCount = config?.checks.filter(c => c.required).length || 0;

  return (
    <Card className="glass-card rounded-2xl border-2 border-cyan-500/30 dark:border-cyan-900/50 shadow-lg card-hover">
      <CardHeader className="pb-4 bg-gradient-to-br from-cyan-50/50 to-blue-50/50 dark:from-gray-900 dark:to-black border-b-2 border-cyan-200 dark:border-cyan-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight mb-2 text-black dark:text-white">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-600/10">
                <Layers className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              Validation Checks
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
              Select pre-upgrade validations to ensure system readiness
            </CardDescription>
          </div>

          {/* Stats Panel - OLED Optimized */}
          <div className="flex gap-3">
            <div className="text-center px-4 py-2 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border-2 border-cyan-500/50 dark:border-cyan-900 rounded-xl">
              <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">{selectedCount}</div>
              <div className="text-xs text-cyan-900 dark:text-cyan-100 uppercase tracking-wide">Selected</div>
            </div>
            {totalDuration > 0 && (
              <div className="text-center px-4 py-2 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-2 border-purple-500/50 dark:border-purple-900 rounded-xl">
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">~{totalDuration}s</div>
                <div className="text-xs text-purple-900 dark:text-purple-100 uppercase tracking-wide">Duration</div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions - OLED Optimized */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Quick:</span>
          <button
            onClick={handleSelectAll}
            disabled={disabled}
            className="text-xs font-semibold px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg border-0 shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale"
          >
            All ({totalCount})
          </button>
          <button
            onClick={handleSelectRequired}
            disabled={disabled}
            className="text-xs font-semibold px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg border-0 shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale"
          >
            Required ({requiredCount})
          </button>
          <div className="flex-1" />
          <button
            onClick={expandAll}
            className="text-xs font-semibold px-3 py-1.5 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg hover:border-cyan-500/50 dark:hover:border-cyan-500/50 transition-all text-gray-700 dark:text-gray-300"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="text-xs font-semibold px-3 py-1.5 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg hover:border-cyan-500/50 dark:hover:border-cyan-500/50 transition-all text-gray-700 dark:text-gray-300"
          >
            Collapse All
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <TooltipProvider>
          <div className="space-y-3">
            {/* ============================================================
                COLLAPSIBLE CATEGORY GROUPS
                ============================================================ */}
            {Object.entries(groupedChecks).map(([categoryId, category]) => {
              if (category.checks.length === 0) return null;

              const { total, selected } = getCategoryStats(category);
              const isExpanded = expandedCategories[categoryId];

              return (
                <div key={categoryId} className="border-2 border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:border-cyan-500/30 dark:hover:border-cyan-500/30 transition-all">
                  {/* Category Header - Clickable */}
                  <button
                    onClick={() => toggleCategory(categoryId)}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-black hover:from-cyan-50/50 dark:hover:from-cyan-950/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      )}
                      <h4 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-gray-100">
                        {category.display_name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs font-bold border-2 ${selected === total
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-500 shadow-md'
                            : selected > 0
                              ? 'bg-gradient-to-r from-cyan-500/50 to-blue-600/50 text-cyan-700 dark:text-cyan-300 border-cyan-500/50'
                              : 'bg-white dark:bg-black text-gray-700 dark:text-gray-300 border-gray-400 dark:border-gray-600'
                          }`}
                      >
                        {selected} / {total}
                      </Badge>
                      {!isExpanded && selected > 0 && (
                        <CheckCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                      )}
                    </div>
                  </button>

                  {/* Category Checks - Expandable Content */}
                  {isExpanded && (
                    <div className="p-4 bg-white dark:bg-black border-t-2 border-gray-200 dark:border-gray-800">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {category.checks.map(check => {
                          const isSelected = selectedChecks.includes(check.id);
                          const isDisabled = disabled || check.required || !check.available;

                          return (
                            <div
                              key={check.id}
                              className={`relative p-3 rounded-xl border-2 transition-all ${isSelected
                                  ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-cyan-500 shadow-lg'
                                  : 'bg-white dark:bg-black border-gray-300 dark:border-gray-700 hover:border-cyan-500/50 dark:hover:border-cyan-500/50'
                                } ${isDisabled ? 'opacity-50' : 'cursor-pointer'} ${!isDisabled ? 'hover:shadow-md' : ''}`}
                              onClick={() => !isDisabled && handleCheckToggle(check.id, check.required)}
                            >
                              {/* Checkbox */}
                              <div className="flex items-start gap-3">
                                <div className="flex items-center h-5 mt-0.5">
                                  <Checkbox
                                    id={check.id}
                                    checked={isSelected}
                                    onCheckedChange={() => handleCheckToggle(check.id, check.required)}
                                    disabled={isDisabled}
                                    className={isSelected ? 'border-white' : ''}
                                  />
                                </div>

                                {/* Check Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <label
                                      htmlFor={check.id}
                                      className={`text-sm font-bold ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                                        }`}
                                    >
                                      {check.name}
                                    </label>
                                    {check.required && (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Lock className={`h-3 w-3 ${isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`} />
                                        </TooltipTrigger>
                                        <TooltipContent>Required - cannot be disabled</TooltipContent>
                                      </Tooltip>
                                    )}
                                    {!check.available && (
                                      <Badge variant="outline" className="text-xs border-gray-400 dark:border-gray-600">
                                        Soon
                                      </Badge>
                                    )}
                                  </div>

                                  <p className={`text-xs mb-2 ${isSelected ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}>
                                    {check.description}
                                  </p>

                                  <div className="flex items-center gap-2 flex-wrap">
                                    {!isSelected && getSeverityBadge(check.severity)}
                                    <span className={`text-xs flex items-center gap-1 font-medium ${isSelected ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'
                                      }`}>
                                      <Clock className="h-3 w-3" />
                                      {check.estimated_duration_seconds}s
                                    </span>
                                    {check.tooltip && (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Info className={`h-3 w-3 ${isSelected ? 'text-white' : 'text-cyan-600 dark:text-cyan-400'}`} />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs max-w-xs">{check.tooltip}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* ============================================================
                SUMMARY INFO
                ============================================================ */}
            {selectedCount > 0 && (
              <Alert className="border-2 border-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-950/20 rounded-xl">
                <Info className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <AlertDescription className="text-sm font-medium text-cyan-900 dark:text-cyan-100">
                  <strong className="font-bold">{selectedCount} check{selectedCount !== 1 ? 's' : ''}</strong> will run in approximately <strong className="font-bold">{totalDuration} seconds</strong>
                </AlertDescription>
              </Alert>
            )}

            {selectedCount === 0 && (
              <Alert className="border-2 border-orange-500/30 bg-orange-50/50 dark:bg-orange-950/20 rounded-xl">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertDescription className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  No checks selected. Please select at least one validation check to continue.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
