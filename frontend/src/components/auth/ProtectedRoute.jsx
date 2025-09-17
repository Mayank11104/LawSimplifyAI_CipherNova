import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/me`, {
          withCredentials: true,
        });

        if (res.status === 200 && res.data) {
          setIsAuth(true);
          setCurrentUser(res.data);

          // sync to localStorage so app refresh works
          localStorage.setItem("user", JSON.stringify(res.data));
        } else {
          setIsAuth(false);
        }
      } catch (err) {
        console.error("Authentication check failed:", err.message);
        setIsAuth(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (!isAuth) {
    return (
      <Navigate
        to="/"
        replace
        state={{ authError: "Authentication failed. Please login again." }}
      />
    );
  }

  // ✅ Clone child and inject currentUser as prop
  return currentUser
    ? { ...children, props: { ...children.props, currentUser } }
    : children;
}
