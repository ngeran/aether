/**
 * =============================================================================
 * LANDING PAGE COMPONENT - OLED Optimized v1.0.0
 * =============================================================================
 *
 * Beautiful landing page with theme toggle and navigation
 *
 * @module pages/Landing
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Landing() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'dark';
  });

  // Apply theme on mount and change
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleClick = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-black dark:via-gray-950 dark:to-black transition-colors duration-500">
      {/* Theme Toggle */}
      <div className="absolute top-8 right-8 z-10">
        <Button
          onClick={toggleTheme}
          variant="outline"
          size="icon"
          className="rounded-full w-12 h-12 border-2 border-gray-300 dark:border-gray-700 hover:border-cyan-500 dark:hover:border-cyan-500 bg-white dark:bg-black transition-all duration-300 hover:scale-110 shadow-lg"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-cyan-600" />
          )}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center space-y-8 animate-fade-in">
        {/* Logo/Icon */}
        <div className="relative group cursor-pointer" onClick={handleClick}>
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse" />

          {/* Main logo container */}
          <div className="relative px-12 py-8 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black rounded-3xl border-2 border-gray-200 dark:border-gray-800 shadow-2xl group-hover:shadow-cyan-500/20 transition-all duration-500 group-hover:scale-105 group-hover:border-cyan-500/50">
            {/* Agentic AI Network with Flowing Particles SVG Icon */}
            <svg
              className="w-32 h-32 md:w-40 md:h-40"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="networkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
                  <stop offset="50%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#2563eb', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="particleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
                </linearGradient>
                <filter id="nodeGlow">
                  <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Network Background (subtle) */}
              <g opacity="0.03">
                <path d="M20 50 L35 35 L50 20 L65 35 L80 50" stroke="url(#networkGradient)" strokeWidth="1" />
                <path d="M20 50 L35 65 L50 80 L65 65 L80 50" stroke="url(#networkGradient)" strokeWidth="1" />
              </g>

              {/* Network Connections */}
              <g stroke="url(#networkGradient)" strokeWidth="1.5" fill="none" opacity="0.4">
                {/* Top row connections */}
                <line x1="20" y1="25" x2="50" y2="20" />
                <line x1="50" y1="20" x2="80" y2="25" />

                {/* Middle row connections */}
                <line x1="15" y1="50" x2="35" y2="35" />
                <line x1="35" y1="35" x2="50" y2="50" />
                <line x1="50" y1="50" x2="65" y2="35" />
                <line x1="65" y1="35" x2="85" y2="50" />

                {/* Cross connections */}
                <line x1="35" y1="35" x2="35" y2="65" />
                <line x1="50" y1="20" x2="50" y2="50" />
                <line x1="50" y1="50" x2="50" y2="80" />
                <line x1="65" y1="35" x2="65" y2="65" />

                {/* Bottom row connections */}
                <line x1="15" y1="50" x2="35" y2="65" />
                <line x1="35" y1="65" x2="50" y2="80" />
                <line x1="50" y1="80" x2="65" y2="65" />
                <line x1="65" y1="65" x2="85" y2="50" />

                {/* Diagonal connections */}
                <line x1="35" y1="35" x2="65" y2="65" opacity="0.5" />
                <line x1="65" y1="35" x2="35" y2="65" opacity="0.5" />
              </g>

              {/* Network Nodes */}
              <g fill="url(#networkGradient)" filter="url(#nodeGlow)">
                {/* Top row */}
                <circle cx="20" cy="25" r="4">
                  <animate attributeName="r" values="4;4.5;4" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="50" cy="20" r="5">
                  <animate attributeName="r" values="5;5.5;5" dur="2s" begin="0.3s" repeatCount="indefinite" />
                </circle>
                <circle cx="80" cy="25" r="4">
                  <animate attributeName="r" values="4;4.5;4" dur="2s" begin="0.6s" repeatCount="indefinite" />
                </circle>

                {/* Middle row */}
                <circle cx="15" cy="50" r="4">
                  <animate attributeName="r" values="4;4.5;4" dur="2s" begin="0.9s" repeatCount="indefinite" />
                </circle>
                <circle cx="35" cy="35" r="5">
                  <animate attributeName="r" values="5;5.5;5" dur="2s" begin="1.2s" repeatCount="indefinite" />
                </circle>
                <circle cx="50" cy="50" r="6">
                  <animate attributeName="r" values="6;6.5;6" dur="2s" begin="0.2s" repeatCount="indefinite" />
                </circle>
                <circle cx="65" cy="35" r="5">
                  <animate attributeName="r" values="5;5.5;5" dur="2s" begin="0.7s" repeatCount="indefinite" />
                </circle>
                <circle cx="85" cy="50" r="4">
                  <animate attributeName="r" values="4;4.5;4" dur="2s" begin="1.0s" repeatCount="indefinite" />
                </circle>

                {/* Bottom row */}
                <circle cx="35" cy="65" r="5">
                  <animate attributeName="r" values="5;5.5;5" dur="2s" begin="1.3s" repeatCount="indefinite" />
                </circle>
                <circle cx="50" cy="80" r="5">
                  <animate attributeName="r" values="5;5.5;5" dur="2s" begin="0.4s" repeatCount="indefinite" />
                </circle>
                <circle cx="65" cy="65" r="5">
                  <animate attributeName="r" values="5;5.5;5" dur="2s" begin="0.8s" repeatCount="indefinite" />
                </circle>
              </g>

              {/* Flowing Particles */}
              <g>
                {/* Particle 1: Top-left to center */}
                <circle r="3" fill="url(#particleGradient)">
                  <animateMotion dur="3s" repeatCount="indefinite">
                    <mpath href="#particlePath1"/>
                  </animateMotion>
                </circle>

                {/* Particle 2: Left to center */}
                <circle r="3" fill="url(#particleGradient)">
                  <animateMotion dur="2.5s" repeatCount="indefinite" begin="0.5s">
                    <mpath href="#particlePath2"/>
                  </animateMotion>
                </circle>

                {/* Particle 3: Top-right to center */}
                <circle r="3" fill="url(#particleGradient)">
                  <animateMotion dur="3.2s" repeatCount="indefinite" begin="1s">
                    <mpath href="#particlePath3"/>
                  </animateMotion>
                </circle>

                {/* Particle 4: Center through network */}
                <circle r="3" fill="url(#particleGradient)">
                  <animateMotion dur="4s" repeatCount="indefinite" begin="1.5s">
                    <mpath href="#particlePath4"/>
                  </animateMotion>
                </circle>

                {/* Particle 5: Bottom-left to center */}
                <circle r="3" fill="url(#particleGradient)">
                  <animateMotion dur="2.8s" repeatCount="indefinite" begin="0.3s">
                    <mpath href="#particlePath5"/>
                  </animateMotion>
                </circle>

                {/* Particle 6: Diagonal flow */}
                <circle r="3" fill="url(#particleGradient)">
                  <animateMotion dur="3.5s" repeatCount="indefinite" begin="0.8s">
                    <mpath href="#particlePath6"/>
                  </animateMotion>
                </circle>
              </g>

              {/* Hidden paths for particles */}
              <defs>
                {/* Path 1: Top-left to center */}
                <path id="particlePath1" d="M20 25 L35 35 L50 50" fill="none" />

                {/* Path 2: Left to center */}
                <path id="particlePath2" d="M15 50 L35 50 L50 50" fill="none" />

                {/* Path 3: Top-right to center */}
                <path id="particlePath3" d="M80 25 L65 35 L50 50" fill="none" />

                {/* Path 4: Full network traversal */}
                <path id="particlePath4" d="M35 65 L50 50 L65 35 L80 25" fill="none" />

                {/* Path 5: Bottom-left to center */}
                <path id="particlePath5" d="M35 65 L50 50" fill="none" />

                {/* Path 6: Diagonal flow */}
                <path id="particlePath6" d="M35 35 L65 65 L85 50" fill="none" />
              </defs>

              {/* Node Pulse Rings */}
              <g stroke="url(#particleGradient)" strokeWidth="1" fill="none">
                <circle cx="50" cy="50" r="8" opacity="0">
                  <animate attributeName="r" values="8;15" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="50" cy="50" r="8" opacity="0">
                  <animate attributeName="r" values="8;15" dur="2s" begin="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0" dur="2s" begin="1s" repeatCount="indefinite" />
                </circle>

                <circle cx="35" cy="35" r="6" opacity="0">
                  <animate attributeName="r" values="6;12" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0" dur="2.5s" repeatCount="indefinite" />
                </circle>

                <circle cx="65" cy="65" r="6" opacity="0">
                  <animate attributeName="r" values="6;12" dur="2.5s" begin="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0" dur="2.5s" begin="1.2s" repeatCount="indefinite" />
                </circle>
              </g>

              {/* Sparkle Effects */}
              <g>
                <circle cx="42" cy="45" r="1.5" fill="white" opacity="0">
                  <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="cx" values="42;45;42" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="cy" values="45;48;45" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle cx="58" cy="55" r="1.5" fill="white" opacity="0">
                  <animate attributeName="opacity" values="0;1;0" dur="1.5s" begin="0.7s" repeatCount="indefinite" />
                  <animate attributeName="cx" values="58;60;58" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="cy" values="55;52;55" dur="2.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="50" cy="30" r="1.5" fill="white" opacity="0">
                  <animate attributeName="opacity" values="0;1;0" dur="1.5s" begin="0.4s" repeatCount="indefinite" />
                </circle>
                <circle cx="50" cy="70" r="1.5" fill="white" opacity="0">
                  <animate attributeName="opacity" values="0;1;0" dur="1.5s" begin="1.1s" repeatCount="indefinite" />
                </circle>
              </g>
            </svg>
          </div>

          {/* Hover indicator */}
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex items-center gap-2 text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <span className="text-sm font-medium">Click to enter</span>
            <Zap className="w-4 h-4 text-cyan-500 animate-pulse" />
          </div>
        </div>

        {/* Aether text */}
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Aether
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-center text-gray-600 dark:text-gray-400 text-lg max-w-md animate-fade-in">
          Network Automation Platform
        </p>

        {/* Additional info */}
        <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-500 animate-fade-in">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            Multi-Service Architecture
          </span>
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Real-time Updates
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-600">
          ©2026 | Aether • Network Automation Platform
        </p>
      </div>
    </div>
  );
}
