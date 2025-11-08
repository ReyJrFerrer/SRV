import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import authCanisterService from "./services/authCanisterService";
import MainPage from "./components/MainPage";
import AboutUs from "./components/About-Us";
import Contact from "./components/Contact";
import SuspensionModal from "./components/SuspensionModal";
import { OneSignalBlockedModal } from "./components/OneSignalBlockedModal";
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
  const location = useLocation();
  const { isAuthenticated, identity, firebaseUser, login, isLoading } =
    useAuth();
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [currentView, setCurrentView] = useState<CurrentView>("main");
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [showOneSignalBlockedModal, setShowOneSignalBlockedModal] =
    useState(false);

  // Check for OneSignal blocking on mount
  useEffect(() => {
    const checkOneSignalBlocking = () => {
      // Check if OneSignal SDK failed to load
      const oneSignalScript = document.querySelector(
        'script[src*="OneSignalSDK"]',
      );
      if (oneSignalScript) {
        oneSignalScript.addEventListener("error", () => {
          console.error(
            "OneSignal SDK blocked by browser or extension",
          );
          setShowOneSignalBlockedModal(true);
        });
      }

      // Also check if window.OneSignal is undefined after a delay
      setTimeout(() => {
        if (typeof window.OneSignal === "undefined") {
          console.error(
            "OneSignal SDK not loaded - may be blocked",
          );
          setShowOneSignalBlockedModal(true);
        }
      }, 5000); // Give it 5 seconds to load
    };

    checkOneSignalBlocking();
  }, []);

  useEffect(() => {
    const checkProfileAndRedirect = async () => {
      // CRITICAL: Only check profile if BOTH IC and Firebase auth are ready
      if (isAuthenticated && identity && firebaseUser) {
        setIsCheckingProfile(true);

        try {
          const profile = await authCanisterService.getMyProfile();

          // Check if account is suspended
          if (profile && profile.locked) {
            // Check sessionStorage flag - if user has already seen modal, don't show again
            const hasShownSuspension = sessionStorage.getItem(
              "hasShownSuspensionModal",
            );
            const isOnLandingPage = location.pathname === "/";

            // If user has already seen the modal, never show it again (especially on landing page)
            if (hasShownSuspension === "true") {
              if (isOnLandingPage) {
                console.log(
                  "Account is suspended but user has already seen the modal and returned to landing page - not showing again",
                );
              } else {
                console.log(
                  "Account is suspended but user has already seen the modal - not showing again",
                );
              }
              setIsCheckingProfile(false);
              return;
            }

            // Only show modal if we haven't shown it yet
            console.log("Account is suspended, showing suspension modal");
            setShowSuspensionModal(true);
            sessionStorage.setItem("hasShownSuspensionModal", "true");
            setIsCheckingProfile(false);
            return;
          }

          // Reset the flag if account is not suspended
          sessionStorage.removeItem("hasShownSuspensionModal");

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
  }, [isAuthenticated, identity, firebaseUser, navigate, location.pathname]);

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

      {/* OneSignal Blocked Modal */}
      {showOneSignalBlockedModal && (
        <OneSignalBlockedModal
          onClose={() => setShowOneSignalBlockedModal(false)}
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
