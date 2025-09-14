import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/me`, {
          withCredentials: true,
        });

        if (res.status === 200) {
          setIsAuth(true);
        }
        console.log(res) 
        
        if(res.data){
            localStorage.setItem("user", JSON.stringify(res.data));
        }
        
      } catch (err) {
        // Log the error to help with debugging
        console.error('Authentication check failed:', err.message);
        setIsAuth(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    // Show a loading screen while the API call is in progress
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!isAuth) {
    // If not authenticated, redirect to the homepage
    return (
      <Navigate
        to="/"
        replace
        state={{ authError: "Authentication failed. Please login again." }}
      />
    );
  }

  // If authenticated, render the protected content
  return children;
}