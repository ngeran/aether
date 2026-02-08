/**
 * Quick Stats Card Component
 * Displays key metrics with animated counters and trend indicators
 */

import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function QuickStatCard({
    title,
    value,
    icon: Icon,
    trend,
    trendValue,
    description,
    loading = false,
    className = "",
    color = "blue"
}) {
    const [displayValue, setDisplayValue] = useState(0);
    const [hasAnimated, setHasAnimated] = useState(false);
    const prevValueRef = useRef(0);

    // Color schemes
    const colorSchemes = {
        blue: {
            bg: "bg-blue-50 dark:bg-blue-900/20",
            border: "border-blue-200 dark:border-blue-800",
            text: "text-blue-600 dark:text-blue-400",
            iconBg: "bg-blue-100 dark:bg-blue-900/40"
        },
        green: {
            bg: "bg-green-50 dark:bg-green-900/20",
            border: "border-green-200 dark:border-green-800",
            text: "text-green-600 dark:text-green-400",
            iconBg: "bg-green-100 dark:bg-green-900/40"
        },
        purple: {
            bg: "bg-purple-50 dark:bg-purple-900/20",
            border: "border-purple-200 dark:border-purple-800",
            text: "text-purple-600 dark:text-purple-400",
            iconBg: "bg-purple-100 dark:bg-purple-900/40"
        },
        orange: {
            bg: "bg-orange-50 dark:bg-orange-900/20",
            border: "border-orange-200 dark:border-orange-800",
            text: "text-orange-600 dark:text-orange-400",
            iconBg: "bg-orange-100 dark:bg-orange-900/40"
        },
        red: {
            bg: "bg-red-50 dark:bg-red-900/20",
            border: "border-red-200 dark:border-red-800",
            text: "text-red-600 dark:text-red-400",
            iconBg: "bg-red-100 dark:bg-red-900/40"
        }
    };

    const scheme = colorSchemes[color] || colorSchemes.blue;

    // Animated counter
    useEffect(() => {
        if (loading || !value) return;

        const targetValue = typeof value === 'number' ? value : parseInt(value.replace(/,/g, '')) || 0;
        const duration = 1000; // 1 second animation
        const steps = 30;
        const increment = targetValue / steps;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const nextValue = Math.min(Math.round(increment * currentStep), targetValue);
            setDisplayValue(nextValue);

            if (currentStep >= steps) {
                clearInterval(timer);
                setDisplayValue(targetValue);
            }
        }, duration / steps);

        setHasAnimated(true);

        return () => clearInterval(timer);
    }, [value, loading]);

    if (loading) {
        return (
            <div className={`bg-card border rounded-xl p-6 ${className}`}>
                <div className="flex items-center justify-between mb-4 animate-pulse">
                    <div className="h-10 w-10 bg-muted rounded-lg" />
                    <div className="h-4 w-16 bg-muted rounded" />
                </div>
                <div className="space-y-2">
                    <div className="h-3 bg-muted rounded w-1/3" />
                    <div className="h-8 bg-muted rounded w-2/3" />
                </div>
            </div>
        );
    }

    // Render trend indicator
    const renderTrend = () => {
        if (!trend) return null;

        const trendColors = {
            up: "text-green-600 dark:text-green-400",
            down: "text-red-600 dark:text-red-400",
            neutral: "text-gray-600 dark:text-gray-400"
        };

        const trendIcons = {
            up: <TrendingUp className="w-3 h-3" />,
            down: <TrendingDown className="w-3 h-3" />,
            neutral: <Minus className="w-3 h-3" />
        };

        return (
            <div className={`flex items-center gap-1 text-xs font-medium ${trendColors[trend]}`}>
                {trendIcons[trend]}
                <span>{trendValue}</span>
            </div>
        );
    };

    return (
        <div className={`bg-card border rounded-xl p-6 hover:shadow-lg transition-shadow ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${scheme.iconBg}`}>
                    {Icon && <Icon className={`w-5 h-5 ${scheme.text}`} />}
                </div>
                {renderTrend()}
            </div>

            <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className={`text-3xl font-bold ${scheme.text}`}>
                    {typeof value === 'number'
                        ? (hasAnimated ? displayValue.toLocaleString() : value.toLocaleString())
                        : value
                    }
                </p>
            </div>

            {description && (
                <p className="text-xs text-muted-foreground mt-2">{description}</p>
            )}
        </div>
    );
}
