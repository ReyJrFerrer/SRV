import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
} catch (error) {
  console.error("Failed to initialize Firebase in App.tsx:", error);
}

type CurrentView = "main" | "about" | "contact";

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, identity, firebaseUser, login, isLoading } =
    useAuth();
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [currentView, setCurrentView] = useState<CurrentView>("main");
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);

  useEffect(() => {
    const checkProfileAndRedirect = async () => {
      // CRITICAL: Only check profile if BOTH IC and Firebase auth are ready
      if (isAuthenticated && identity && firebaseUser) {
        setIsCheckingProfile(true);

        try {
          const profile = await authCanisterService.getMyProfile();

          // Check if account is suspended
          if (profile && profile.locked) {
            console.log("Account is suspended, showing suspension modal");
            setShowSuspensionModal(true);
            setIsCheckingProfile(false);
            return;
          }

          // If profile exists, redirect based on role
          if (profile && profile.name && profile.phone) {
            if (profile.activeRole === "Client") {
              navigate("/client/home");
            } else if (profile.activeRole === "ServiceProvider") {
              navigate("/provider/home");
            } else {
              // Profile exists but no valid role - go to create profile
              navigate("/create-profile");
            }
          } else {
            // No profile or incomplete profile - go to create profile
            console.log(
              "No complete profile found, redirecting to create profile",
            );
            navigate("/create-profile");
          }
        } catch (err) {
          // Any error (including "Profile not found") - go to create profile
          console.log(
            "Error fetching profile, redirecting to create profile:",
            err,
          );
          navigate("/create-profile");
        } finally {
          setIsCheckingProfile(false);
        }
      } else if (isAuthenticated && identity && !firebaseUser) {
        // IC auth ready but Firebase not ready yet - keep loading
        console.log("Waiting for Firebase auth...");
        setIsCheckingProfile(true);
      } else {
        // Not authenticated - done checking
        setIsCheckingProfile(false);
      }
    };
    checkProfileAndRedirect();
  }, [isAuthenticated, identity, firebaseUser, navigate]);

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
        onClose={() => setShowSuspensionModal(false)}
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
