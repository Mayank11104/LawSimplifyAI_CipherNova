import React, { useState } from 'react';
import { Moon, Sun, Menu, X } from 'lucide-react';
// Import your AuthPage component
import AuthPage from './Authpage';
import aiLogo from "../../assets/homepage/logoo.jpg";

const Navbar = ({ theme, toggleTheme, isAuthenticated }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Add state for controlling the Auth modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const navItems = [
    { name: 'Home', href: '#home' },
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'About Us', href: '#about' },
  ];

  const handleNavClick = (href) => {
    try {
      // Close mobile menu on navigation
      setIsMobileMenuOpen(false);

      if (href === '#home') {
        // Scroll to very top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const element = document.querySelector(href);
        if (element) {
          const yOffset = 0; // adjust this if you want to account for navbar height
          const y = element.getBoundingClientRect().top + window.pageYOffset - yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleThemeToggle = () => {
    try {
      toggleTheme();
    } catch (error) {
      console.error('Theme toggle error:', error);
    }
  };

  const toggleMobileMenu = () => {
    try {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } catch (error) {
      console.error('Mobile menu toggle error:', error);
    }
  };

  // Functions to control Auth Modal
  const openAuthModal = () => {
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <>
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          theme === 'dark'
            ? 'backdrop-blur-md border-b-2 border-white/10 shadow-lg shadow-black/5'
            : 'backdrop-blur-md border-b-2 border-gray-400/20 shadow-lg shadow-gray-500/10'
        }`}
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo Section */}
            <div className="flex-shrink-0 flex items-center">
  {/* LawSimplify text */}
  <span
    className={`ml-3 text-2xl font-semibold ${
      theme === 'dark' ? 'text-white' : 'text-[#323949]'
    }`}
  >
    LawSimplify
  </span>

  {/* AI logo in rounded rectangle with circular corners */}
  <div className="ml-2 px-3 py-1 rounded-lg flex items-center justify-center bg-black">
  <img
    src={aiLogo}
    alt="AI"
    className="w-10 h-10 object-contain"
  />
</div>

</div>


            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="flex items-center space-x-8">
                {navItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleNavClick(item.href)}
                    className={`
                      px-3 py-2 text-sm font-medium transition-all duration-300 hover:scale-105 rounded-md
                      relative overflow-hidden group
                      before:absolute before:inset-0 before:p-[2px] before:rounded-md before:-z-10
                      before:content-['']
                      after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 
                      after:bg-gradient-to-r after:transition-all after:duration-300 after:ease-out
                      hover:after:w-full
                      ${
                        theme === 'dark'
                          ? `text-gray-300 hover:text-white bg-[#222831] hover:bg-gray-800
                           after:from-blue-400 after:to-cyan-400`
                          : `text-[#323949] hover:text-[#323949] bg-[#FDFAF6]/95 hover:bg-gray-100
                           after:from-blue-600 after:to-blue-800`
                      }
                    `}
                  >
                    <span className="relative z-10">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Section - Theme Toggle & Login */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={handleThemeToggle}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  theme === 'dark'
                    ? 'text-gray-300 hover:text-yellow-400 hover:bg-gray-800'
                    : 'text-gray-600 hover:text-orange-500 hover:bg-gray-100'
                }`}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Login Button - Now opens Auth Modal */}
              {!isAuthenticated && (
                <button
                  onClick={openAuthModal}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 ${theme === 'dark'
                      ? 'bg-white text-[#323949] hover:bg-gray-100'
                      : 'bg-[#323949] text-white hover:bg-gray-800'
                    }`}
                >
                  Login
                </button>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={toggleMobileMenu}
                className={`md:hidden p-2 rounded-lg ${
                  theme === 'dark'
                    ? 'text-gray-300 hover:bg-gray-800'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div
              className={`md:hidden border-t ${
                theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
              }`}
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleNavClick(item.href)}
                    className={`
                      block w-full text-left px-3 py-2 text-base font-medium rounded-md 
                      transition-all duration-300 relative overflow-hidden group
                      after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 
                      after:bg-gradient-to-r after:transition-all after:duration-300 after:ease-out
                      hover:after:w-full
                      ${
                        theme === 'dark'
                          ? `text-gray-300 hover:text-white hover:bg-gray-800
                           after:from-blue-400 after:to-cyan-400`
                          : `text-gray-700 hover:text-gray-900 hover:bg-gray-100
                           after:from-blue-600 after:to-blue-800`
                      }
                    `}
                  >
                    <span className="relative z-10">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Auth Modal - Import and use your AuthPage component */}
      <AuthPage isOpen={isAuthModalOpen} onClose={closeAuthModal} theme={theme} />
    </>
  );
};

export default Navbar;
