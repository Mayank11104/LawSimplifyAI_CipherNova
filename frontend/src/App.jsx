import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navbar from './components/ui/Navbar';
import Homepage from './pages/Homepage';
import AuthPage from './components/ui/Authpage';
import Clausemain from './pages/Clausemain';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Create a new component to contain the logic that needs to be within the Router
function AppContent() {
  const [theme, setTheme] = useState('light');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Now, useLocation() is inside the Router's context.
  const location = useLocation();
  const authError = location.state?.authError;

  // --- Theme handling ---
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

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

  // --- Auth handling ---
  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const handleAuthSuccess = (user) => {
    if (user?.token) {
      localStorage.setItem("token", user.token);
    }
    if (user?.profile) {
      localStorage.setItem("user", JSON.stringify(user.profile));
      setCurrentUser(user.profile);
    }
    setIsAuthenticated(true); // Set authentication status on success
    closeAuthModal();
  };

  useEffect(() => {
    console.log("👤 currentUser updated:", currentUser);
  }, [currentUser]);

  // Restore user on refresh
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#222831]' : 'bg-[#FDFAF6]/95'
      }`}
    >
      

      <Routes>


        <Route
          path="/"
          element={
            <>
            <Navbar 
              theme={theme} 
              toggleTheme={toggleTheme} 
              openAuthModal={openAuthModal} 
              isAuthenticated={isAuthenticated} 
            />
          
          <Homepage theme={theme} onGetStartedClick={openAuthModal} authError={authError} />
          
          </>
          }
        />

        <Route
          path="/clausemain"
          element={
            <ProtectedRoute >
              <Clausemain theme={theme} toggleTheme={toggleTheme} currentuser={currentUser} />
            </ProtectedRoute>
          }
        />
      </Routes>

      <AuthPage
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        onAuthSuccess={handleAuthSuccess}
        theme={theme}
      />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;