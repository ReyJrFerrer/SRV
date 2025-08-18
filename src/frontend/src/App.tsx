import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import authCanisterService from "./services/authCanisterService";
import MainPage from "./components/MainPage";
import AboutUs from "./components/About-Us";

type CurrentView = "main" | "about";

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, identity, login, isLoading } = useAuth();
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [currentView, setCurrentView] = useState<CurrentView>("main");

  useEffect(() => {
    const checkProfileAndRedirect = async () => {
      if (isAuthenticated && identity) {
        setIsCheckingProfile(true);

        try {
          const profile = await authCanisterService.getMyProfile();
          if (profile) {
            if (profile.activeRole === "Client") navigate("/client/home");
            else if (profile.activeRole === "ServiceProvider")
              navigate("/provider/home");
            else navigate("/create-profile");
          } else {
            navigate("/create-profile");
          }
        } catch (err) {
          console.error("Profile check error:", err);
        } finally {
          setIsCheckingProfile(false);
        }
      } else {
        // If not authenticated, we are done checking.
        setIsCheckingProfile(false);
      }
    };
    checkProfileAndRedirect();
  }, [isAuthenticated, identity, navigate]);

  // Show a loading indicator while checking the user's session.
  if (isCheckingProfile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="h-16 w-16 animate-spin rounded-full border-t-4 border-b-4 border-blue-600"></div>
        <p className="mt-4 text-lg text-gray-700">Loading...</p>
      </div>
    );
  }

  const handleNavigateToAbout = () => {
    setCurrentView("about");
  };

  const handleNavigateToMain = () => {
    setCurrentView("main");
  };

  return (
    <main className="bg-gray-50">
      {currentView === "main" && (
        <MainPage
          onLoginClick={login}
          isLoginLoading={isLoading}
          onNavigateToAbout={handleNavigateToAbout}
        />
      )}

      {currentView === "about" && (
        <AboutUs
          onLoginClick={login}
          isLoginLoading={isLoading}
          onNavigateToMain={handleNavigateToMain}
        />
      )}
    </main>
  );
};

/**
 * The main App component now serves as the central router for the entire application.
 * It defines all the available routes and the components they render.
 */
export default function App() {
  return <LandingPage />;
}
