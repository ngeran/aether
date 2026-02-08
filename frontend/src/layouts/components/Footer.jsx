// frontend/src/layouts/components/Footer.jsx

import React from 'react';
import { Link } from 'react-router-dom';

// ================================================
// [A] | Aether LOGO COMPONENT
// ================================================
const AetherLogo = () => (
  <Link
    to="/"
    aria-label="Aether Home"
    className="flex items-center gap-2 text-base font-bold text-foreground hover:text-primary transition-colors"
  >
    <span>[A]</span>
    <span className="text-muted-foreground">|</span>
    <span>Aether</span>
  </Link>
);


// ================================================
// FOOTER COMPONENT
// ================================================

const Footer = () => {

  const renderSeparator = () => (
    <div className="border-t border-border"></div>
  );

  const renderLogo = () => (
    <AetherLogo />
  );

  // Copyright text uses muted colors
  const renderCopyright = () => (
    <div className="text-sm text-muted-foreground">©2025 Aether</div>
  );

  // Designer link uses primary color for accent
  const renderDesignerAttribution = () => (
    <a
      href="https://ngeranio.com"
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-muted-foreground hover:text-primary transition-colors"
    >
      Design & Dev by <span className="font-semibold underline">nikos</span>
    </a>
  );

  // ================================================
  // MAIN RENDER
  // ================================================

  return (
    <footer className="w-full mt-auto bg-card text-foreground">
      {renderSeparator()}

      {/* Inner container for max width and padding, aligns with header/main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between h-full">

          {/* Content Row: Logo | Copyright | Attribution */}
          <div className="flex justify-between items-center w-full">
            {renderLogo()}
            {renderCopyright()}
            {renderDesignerAttribution()}
          </div>

        </div>
      </div>
    </footer>
  );
};

// ================================================
// COMPONENT METADATA
// ================================================

Footer.displayName = 'Footer';

export default Footer;
