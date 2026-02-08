// frontend/src/layouts/components/Header.jsx (Tailwind/shadcn)

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

// External Components (Now verified correct paths)
import MegaMenu from './MegaMenu.jsx';
import { ThemeToggle } from '@/components/theme-toggle.jsx';
import { useLayoutContext } from '../context/LayoutContext.jsx';

// ✅ NEW IMPORT: The WebSocketStatus component
import WebSocketStatus from './WebSocketStatus';

// =============================================================
// Logo Component - [A] | Aether
// =============================================================
const AetherLogo = () => (
  <div className="nav-logo">
    <Link
      to="/"
      aria-label="Aether Home"
      className="flex items-center gap-2 text-xl font-bold text-foreground hover:text-primary transition-colors"
    >
      <span>[A]</span>
      <span className="text-muted-foreground">|</span>
      <span>Aether</span>
    </Link>
  </div>
);


const Header = () => {
  const { activeMegaMenu, onMenuEnter, onMenuLeave } = useLayoutContext();

  return (
    // Fixed container across the top
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background shadow-md">

      {/* Main Content Area: Padding updated to match .25em 1em */}
      <div className="flex items-center justify-between py-2 px-4 max-w-7xl mx-auto w-full">

        {/* ==================== 1. LEFT: Logo ==================== */}
        <div className="flex-shrink-0">
          <AetherLogo />
        </div>

        {/* ==================== 2. CENTER: MegaMenu ==================== */}
        <div
          className="flex justify-center h-full"
          onMouseLeave={onMenuLeave}
        >
          <MegaMenu
            activeMenu={activeMegaMenu}
            onMenuEnter={onMenuEnter}
            onMenuLeave={onMenuLeave}
          />
        </div>

        {/* ==================== 3. RIGHT: Utility Icons ==================== */}
        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">

          {/* ✅ 1. WebSocket Status Button */}
          <WebSocketStatus />

          {/* 2. Theme Toggle */}
          <ThemeToggle />

          {/* 3. User Profile Button */}
          <Button variant="ghost" size="icon">
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
