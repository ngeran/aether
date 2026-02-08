/**
 * useDashboardData Hook
 * Fetches and manages all dashboard data with caching and auto-refresh
 */

import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8000';

export function useDashboardData(refreshInterval = 30000) { // Default 30 second refresh
    const [data, setData] = useState({
        stats: null,
        health: null,
        recentJobs: null,
        activity: null
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchDashboardData = useCallback(async () => {
        try {
            setError(null);

            // Fetch all dashboard data in parallel
            const [statsRes, healthRes, jobsRes] = await Promise.all([
                fetch(`${API_URL}/api/dashboard/stats`),
                fetch(`${API_URL}/api/dashboard/health`),
                fetch(`${API_URL}/api/dashboard/recent-jobs?limit=10`)
            ]);

            // Parse responses
            const stats = statsRes.ok ? await statsRes.json() : null;
            const health = healthRes.ok ? await healthRes.json() : null;
            const jobs = jobsRes.ok ? await jobsRes.json() : null;

            setData({
                stats,
                health,
                recentJobs: jobs,
                activity: jobs // Use jobs as activity for now
            });

            setLastUpdated(new Date());
            setLoading(false);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError(err.message);
            setLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Auto-refresh
    useEffect(() => {
        if (!refreshInterval) return;

        const interval = setInterval(fetchDashboardData, refreshInterval);
        return () => clearInterval(interval);
    }, [fetchDashboardData, refreshInterval]);

    const refresh = useCallback(() => {
        setLoading(true);
        return fetchDashboardData();
    }, [fetchDashboardData]);

    return {
        data,
        loading,
        error,
        lastUpdated,
        refresh,
        isStale: !lastUpdated || (Date.now() - new Date(lastUpdated).getTime()) > refreshInterval
    };
}
