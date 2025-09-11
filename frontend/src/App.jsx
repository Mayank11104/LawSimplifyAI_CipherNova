import React, { useState, useEffect } from 'react';
import Navbar from './components/ui/Navbar';
import Homepage from './pages/Homepage';
import AuthPage from './components/ui/Authpage';

function App() {
  const [theme, setTheme] = useState('light');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  // Save theme to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleAuthSuccess = (user) => {
    console.log('Authentication successful:', user);
    // Handle successful authentication here
    closeAuthModal();
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#222831]' : 'bg-[#FDFAF6]/95'
      }`}
    >
      <Navbar theme={theme} toggleTheme={toggleTheme} openAuthModal={openAuthModal} />
      <Homepage theme={theme} onGetStartedClick={openAuthModal} />
      <AuthPage
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        onAuthSuccess={handleAuthSuccess}
        theme={theme}
      />
    </div>
  );
}

export default App;
