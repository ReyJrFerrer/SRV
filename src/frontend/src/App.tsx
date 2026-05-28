import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import authCanisterService from "./services/authCanisterService";
import MainPage from "./components/MainPage";
import AboutUs from "./components/About-Us";
import Contact from "./components/Contact";
import SuspensionModal from "./components/SuspensionModal";
import { initializeFirebase } from "./services/firebaseApp";

// Initialize Firebase as early as possible
try {
  initializeFirebase();
} catch (error) {}

type CurrentView = "main" | "about" | "contact";

const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, firebaseUser, login, isLoading, profileStatus } =
    useAuth();
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [currentView, setCurrentView] = useState<CurrentView>("main");
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);

  useEffect(() => {
    const checkProfileAndRedirect = async () => {
      if (isAuthenticated && firebaseUser) {
        setIsCheckingProfile(true);

        const justLoggedIn =
          sessionStorage.getItem("just_logged_in") === "1" || false;

        try {
          if (profileStatus?.needsProfile && justLoggedIn) {
            sessionStorage.removeItem("just_logged_in");
            navigate("/create-profile");
            setIsCheckingProfile(false);
            return;
          }

          const profile = await authCanisterService.getMyProfile();

          if (profile && profile.locked) {
            const hasShownSuspension = sessionStorage.getItem(
              "hasShownSuspensionModal",
            );
            location.pathname === "/";

            if (hasShownSuspension === "true") {
              setIsCheckingProfile(false);
              return;
            }

            setShowSuspensionModal(true);
            sessionStorage.setItem("hasShownSuspensionModal", "true");
            setIsCheckingProfile(false);
            return;
          }

          sessionStorage.removeItem("hasShownSuspensionModal");

          if (profile && profile.name && profile.phone) {
            sessionStorage.removeItem("just_logged_in");
            if (profile.activeRole === "Client") {
              navigate("/client/home");
            } else if (profile.activeRole === "ServiceProvider") {
              navigate("/provider/home");
            } else {
              navigate("/");
            }
          } else if (justLoggedIn) {
            sessionStorage.removeItem("just_logged_in");
            navigate("/create-profile");
          } else {
            navigate("/");
          }
        } catch (err) {
          if (location.pathname !== "/") {
            navigate("/");
          }
        } finally {
          setIsCheckingProfile(false);
        }
      } else if (isAuthenticated && !firebaseUser) {
        setIsCheckingProfile(true);
      } else {
        setIsCheckingProfile(false);
      }
    };
    checkProfileAndRedirect();
  }, [
    isAuthenticated,
    firebaseUser,
    profileStatus,
    navigate,
    location.pathname,
  ]);

  // Show a loading indicator while checking the user's session.
  if (isCheckingProfile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="h-16 w-16 animate-spin rounded-full border-b-4 border-t-4 border-blue-600"></div>
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
  const handleNavigateToContact = () => {
    setCurrentView("contact");
  };

  return (
    <main className="bg-gray-50">
      {currentView === "main" && (
        <MainPage
          onLoginClick={login}
          isLoginLoading={isLoading}
          onNavigateToAbout={handleNavigateToAbout}
          onNavigateToContact={handleNavigateToContact}
        />
      )}

      {currentView === "about" && (
        <AboutUs
          onLoginClick={login}
          isLoginLoading={isLoading}
          onNavigateToMain={handleNavigateToMain}
          onNavigateToContact={handleNavigateToContact}
        />
      )}

      {currentView === "contact" && (
        <Contact
          onLoginClick={login}
          isLoginLoading={isLoading}
          onNavigateToMain={handleNavigateToMain}
          onNavigateToAbout={handleNavigateToAbout}
        />
      )}

      {/* Suspension Modal */}
      <SuspensionModal
        isOpen={showSuspensionModal}
        onClose={() => {
          setShowSuspensionModal(false);
          // Mark that we've handled the suspension modal, so it won't show again
          sessionStorage.setItem("hasShownSuspensionModal", "true");
        }}
      />
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
