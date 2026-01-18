import { useEffect, useState } from "react";
import { isAuthenticated } from "../../utils/api.js";
import LoginForm from "./LoginForm.jsx";

export default function ProtectedRoute({ children }) {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());

  useEffect(() => {
    const checkAuth = () => {
      setAuthenticated(isAuthenticated());
    };

    checkAuth();

    const handleStorageChange = () => {
      checkAuth();
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", checkAuth);
    const interval = setInterval(checkAuth, 100);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", checkAuth);
      clearInterval(interval);
    };
  }, []);

  const handleLoginSuccess = () => {
    setAuthenticated(true);
  };

  if (!authenticated) {
    return (
      <main className="px-4 pt-20 pb-8 sm:px-6 lg:px-0">
        <div className="mx-auto max-w-7xl min-h-[calc(100vh-8rem)] flex items-center justify-center">
          <LoginForm onLoginSuccess={handleLoginSuccess} />
        </div>
      </main>
    );
  }

  return children;
}
