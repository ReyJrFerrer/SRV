// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";
// import { authCanisterService } from "../services/authCanisterService";
// import TermsAndConditionsModal from "../components/common/TermsAndConditionsModal";
// import OtpModal from "../components/auth/OtpModal";
// import { phoneVerificationService } from "../services/phoneVerification";
// import {
//   UserIcon,
//   WrenchScrewdriverIcon,
//   UserPlusIcon,
//   PhoneIcon,
//   ExclamationTriangleIcon,
//   FingerPrintIcon,
// } from "@heroicons/react/24/outline";

// export default function CreateProfilePage() {
//   const [showTerms, setShowTerms] = useState(false);
//   const [showOtpModal, setShowOtpModal] = useState(false);
//   const navigate = useNavigate();
//   const { isAuthenticated, identity, login } = useAuth();
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState(false);
//   const [selectedRole, setSelectedRole] = useState<
//     "Client" | "ServiceProvider" | null
//   >(null);
//   const [formData, setFormData] = useState({
//     name: "",
//     phone: "",
//   });
//   const [reauthRequired, setReauthRequired] = useState(false);
//   const [isPhoneVerificationInitialized, setIsPhoneVerificationInitialized] =
//     useState(false);
//   const [isPhoneVerified, setIsPhoneVerified] = useState(false);

//   // Set document title using React 19 approach
//   useEffect(() => {
//     document.title = "Create Profile | SRV";
//   }, []);

//   // Initialize phone verification service
//   useEffect(() => {
//     const initPhoneVerification = async () => {
//       const success = await phoneVerificationService.initialize();
//       setIsPhoneVerificationInitialized(success);
//     };
//     initPhoneVerification();
//   }, []);

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       if (!isAuthenticated) {
//         //console.warn("Not authenticated, redirecting to login...");
//         navigate("/client");
//       } else {
//         setReauthRequired(false);
//         setError(null);
//       }
//     }, 1500);

//     return () => clearTimeout(timer);
//   }, [isAuthenticated, navigate]);

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   // Handler for our custom re-authentication button
//   const handleReAuth = async () => {
//     try {
//       setIsLoading(true);
//       setError("");
//       await login();
//       // On success, clear the error and hide the re-auth prompt
//       setReauthRequired(false);
//       setError(null);
//     } catch (err) {
//       setError(
//         err instanceof Error
//           ? err.message
//           : "Failed to connect. Please try again.",
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleProfileSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError("");
//     setReauthRequired(false);

//     if (!selectedRole) {
//       setError("Please select a role.");
//       return;
//     }

//     // Name validation: at least two words, each at least 2 letters, only letters
//     const nameTrimmed = formData.name.trim();
//     const nameWords = nameTrimmed.split(/\s+/);
//     if (
//       nameWords.length < 2 ||
//       !nameWords.every((word) => word.length >= 2 && /^[A-Za-z]+$/.test(word))
//     ) {
//       setError("Please enter your full name");
//       return;
//     }

//     if (!formData.phone.trim()) {
//       setError("All fields are required.");
//       return;
//     }

//     const phoneRegex = /^09\d{9}$/;
//     if (!phoneRegex.test(formData.phone.trim())) {
//       setError("Please enter a valid 11-digit phone number starting with 09.");
//       return;
//     }

//     // Check if phone verification service is initialized
//     if (!isPhoneVerificationInitialized) {
//       setError(
//         "Phone verification service is not available. Please try again.",
//       );
//       return;
//     }

//     // Start phone verification process
//     setIsLoading(true);
//     try {
//       const result = await phoneVerificationService.startVerification(
//         formData.phone.trim(),
//         "recaptcha-container-profile",
//       );

//       if (result.step === "otp-input") {
//         setShowOtpModal(true);
//       } else if (result.step === "error") {
//         const errorMessage = result.error || "Failed to send verification code";
//         setError(errorMessage);

//         // Show reload suggestion for Firebase service errors
//         if (errorMessage.includes("reload the page")) {
//           // The error message already contains the reload instruction
//         }
//       }
//     } catch (error: any) {
//       const errorMessage = error.message || "Failed to send verification code";
//       setError(errorMessage);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Handler for when phone verification is complete
//   const handlePhoneVerified = () => {
//     setShowOtpModal(false);
//     setIsPhoneVerified(true);
//     // Show terms modal after phone verification
//     setShowTerms(true);
//   };

//   // Handler for OTP modal close
//   const handleOtpModalClose = () => {
//     setShowOtpModal(false);
//     phoneVerificationService.cancel();
//   };

//   // Actual profile creation after agreeing to terms
//   const handleCreateProfile = async () => {
//     setShowTerms(false);

//     // Ensure phone verification was completed
//     if (!isPhoneVerified) {
//       setError("Phone verification is required before creating profile.");
//       return;
//     }

//     setIsLoading(true);
//     setSuccess(false);
//     setError("");
//     setReauthRequired(false);

//     if (!isAuthenticated || !identity) {
//       setError("Authentication session not found.");
//       setReauthRequired(true);
//       setIsLoading(false);
//       return;
//     }

//     try {
//       const result = await authCanisterService.createProfile(
//         formData.name.trim(),
//         formData.phone.trim(),
//         selectedRole as "Client" | "ServiceProvider",
//       );

//       if (!result) {
//         throw new Error("Failed to create profile");
//       }

//       setSuccess(true);
//       setTimeout(() => {
//         navigate(selectedRole === "Client" ? "/client/home" : "/provider/home");
//       }, 2000);
//     } catch (err) {
//       const errorMessage =
//         err instanceof Error ? err.message : "An unknown error occurred.";
//       if (
//         errorMessage.includes("Invalid delegation expiry") ||
//         errorMessage.includes("Authentication required")
//       ) {
//         setError(
//           "Your secure session has expired for security. Please re-authenticate to continue.",
//         );
//         setReauthRequired(true);
//       } else {
//         setError(errorMessage);
//       }
//       //console.error("Profile creation error:", err);
//     } finally {
//       setIsLoading(false);
//     }
//   };
//   //TODO: Fix the isReady
//   if (!isAuthenticated) {
//     return (
//       <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
//         <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
//         <p className="text-slate-700">Waiting for authentication...</p>
//       </div>
//     );
//   }

//   return (
//     <>
//       {/* Hidden reCAPTCHA container */}
//       <div id="recaptcha-container-profile" className="hidden"></div>

//       <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-yellow-50 to-blue-100 p-4">
//         <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white/70 shadow-2xl ring-1 ring-blue-100 backdrop-blur-md md:flex">
//           <div className="hidden flex-col items-center justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500/90 p-12 text-center text-white md:flex md:w-1/2">
//             <img
//               src="/logo.svg"
//               alt="SRV Logo"
//               width={180}
//               height={Math.round(180 * (760 / 1000))}
//             />
//             <h1 className="mt-6 text-4xl font-extrabold text-yellow-300 drop-shadow-lg">
//               Welcome to SRV!
//             </h1>
//             <p className="mt-3 max-w-xs text-lg text-blue-100">
//               Just a few more details to get you started on your journey.
//             </p>
//           </div>

//           <div className="w-full p-8 md:w-1/2 lg:p-14">
//             {success ? (
//               <div className="animate-fade-in flex h-full flex-col items-center justify-center text-center">
//                 <div className="mb-4 rounded-full bg-green-100 p-5 shadow-lg">
//                   <UserPlusIcon className="h-14 w-14 text-green-600" />
//                 </div>
//                 <h2 className="text-3xl font-extrabold text-green-700 drop-shadow">
//                   Profile Created!
//                 </h2>
//                 <p className="mt-3 text-lg text-slate-600">
//                   Redirecting you to your dashboard...
//                 </p>
//               </div>
//             ) : (
//               <form
//                 onSubmit={handleProfileSubmit}
//                 className="animate-fade-in space-y-8"
//               >
//                 <div className="mb-6 text-center md:hidden">
//                   <h1 className="text-3xl font-bold text-blue-600">
//                     Create Profile
//                   </h1>
//                   <p className="mt-2 text-sm text-slate-500">
//                     Let's get you started.
//                   </p>
//                 </div>

//                 {error && (
//                   <div className="rounded-lg border-l-4 border-red-400 bg-red-50 p-4 shadow">
//                     <div className="flex items-center">
//                       <div className="flex-shrink-0">
//                         <ExclamationTriangleIcon
//                           className="h-5 w-5 text-red-500"
//                           aria-hidden="true"
//                         />
//                       </div>
//                       <div className="ml-3">
//                         <p className="text-left text-sm text-red-700">
//                           {error}
//                         </p>
//                       </div>
//                     </div>
//                   </div>
//                 )}

//                 {reauthRequired ? (
//                   <div className="space-y-4 pt-4 text-center">
//                     <p className="font-medium text-slate-700">
//                       Please re-authenticate to continue.
//                     </p>
//                     <button
//                       type="button"
//                       onClick={handleReAuth}
//                       disabled={isLoading}
//                       className={`mx-auto mt-2 flex w-full max-w-xs transform items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-blue-600 hover:shadow-xl ${isLoading ? "cursor-not-allowed opacity-70" : ""}`}
//                     >
//                       {isLoading ? (
//                         <>
//                           <div className="mr-3 h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
//                           <span>Connecting...</span>
//                         </>
//                       ) : (
//                         <>
//                           <FingerPrintIcon className="mr-2 h-6 w-6" />
//                           Login Again with Internet Identity
//                         </>
//                       )}
//                     </button>
//                   </div>
//                 ) : (
//                   <>
//                     {/* Role Selection */}
//                     <div>
//                       <h3 className="mb-3 text-xl font-semibold text-slate-800">
//                         First, choose your role:
//                       </h3>
//                       <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
//                         <button
//                           type="button"
//                           onClick={() => setSelectedRole("Client")}
//                           className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 bg-white/80 p-6 shadow-sm transition-all duration-200 hover:bg-blue-50/80 ${selectedRole === "Client" ? "scale-105 border-blue-600 bg-blue-50/90 shadow-lg" : "border-gray-200 hover:border-blue-400"}`}
//                         >
//                           <UserIcon
//                             className={`mb-2 h-10 w-10 ${selectedRole === "Client" ? "text-blue-600" : "text-gray-400"}`}
//                           />
//                           <span
//                             className={`text-lg font-semibold ${selectedRole === "Client" ? "text-blue-700" : "text-slate-700"}`}
//                           >
//                             Client
//                           </span>
//                           <span className="text-xs text-gray-500">
//                             I need services
//                           </span>
//                         </button>
//                         <button
//                           type="button"
//                           onClick={() => setSelectedRole("ServiceProvider")}
//                           className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 bg-white/80 p-6 shadow-sm transition-all duration-200 hover:bg-yellow-50/80 ${selectedRole === "ServiceProvider" ? "scale-105 border-yellow-400 bg-yellow-50/90 shadow-lg" : "border-gray-200 hover:border-yellow-300"}`}
//                         >
//                           <WrenchScrewdriverIcon
//                             className={`mb-2 h-10 w-10 ${selectedRole === "ServiceProvider" ? "text-yellow-600" : "text-gray-400"}`}
//                           />
//                           <span
//                             className={`text-lg font-semibold ${selectedRole === "ServiceProvider" ? "text-yellow-700" : "text-slate-700"}`}
//                           >
//                             Service Provider
//                           </span>
//                           <span className="text-xs text-gray-500">
//                             I offer services
//                           </span>
//                         </button>
//                       </div>
//                     </div>

//                     {/* Form Inputs */}
//                     {selectedRole && (
//                       <div className="space-y-5 border-t pt-7">
//                         <div className="relative">
//                           <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
//                             <UserIcon className="h-6 w-6 text-blue-400" />
//                           </div>
//                           <input
//                             type="text"
//                             name="name"
//                             placeholder="Full Name"
//                             value={formData.name}
//                             onChange={handleInputChange}
//                             required
//                             className="w-full rounded-xl border border-blue-200 bg-white/80 py-3 pl-12 pr-3 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
//                           />
//                         </div>

//                         <div className="relative">
//                           <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
//                             <PhoneIcon className="h-6 w-6 text-yellow-400" />
//                           </div>
//                           <input
//                             type="tel"
//                             name="phone"
//                             placeholder="Phone Number (e.g., 0917...)"
//                             value={formData.phone}
//                             onChange={handleInputChange}
//                             required
//                             className="w-full rounded-xl border border-yellow-200 bg-white/80 py-3 pl-12 pr-3 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
//                           />
//                         </div>
//                       </div>
//                     )}

//                     {/* Submit Button */}
//                     {selectedRole && (
//                       <button
//                         type="submit"
//                         disabled={isLoading}
//                         className="flex w-full transform items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-yellow-400 px-6 py-3 font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-yellow-500 hover:shadow-xl disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:scale-100"
//                       >
//                         {isLoading && !reauthRequired ? (
//                           <>
//                             <div className="mr-3 h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
//                             <span>Sending Verification...</span>
//                           </>
//                         ) : (
//                           <>
//                             <UserPlusIcon className="mr-2 h-6 w-6" />
//                             Verify Phone & Create Profile
//                           </>
//                         )}
//                       </button>
//                     )}
//                   </>
//                 )}
//               </form>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* OTP Verification Modal */}
//       <OtpModal
//         open={showOtpModal}
//         onClose={handleOtpModalClose}
//         onVerified={handlePhoneVerified}
//         phoneNumber={formData.phone}
//       />

//       {/* Terms and Conditions Modal */}
//       <TermsAndConditionsModal
//         open={showTerms}
//         onClose={() => setShowTerms(false)}
//         onAgree={handleCreateProfile}
//       />
//     </>
//   );
// }

// /**
//  *
//  * Old Code zone
//  */
