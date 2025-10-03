// // src/pages/provider/payment-commission.tsx

// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   ExclamationTriangleIcon,
//   XMarkIcon,
//   ArrowLeftIcon,
//   TrashIcon,
// } from "@heroicons/react/24/solid";
// import { useRemittance } from "../../hooks/useRemittance";

// const MAX_AMOUNT = 1000000;

// const PaymentProviderCommission: React.FC = () => {
//   const [amountPaid, setAmountPaid] = useState("");
//   const [receipt, setReceipt] = useState<File | null>(null);
//   const [showSuccess, setShowSuccess] = useState(false);
//   const [showImageToast, setShowImageToast] = useState(false);
//   const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
//   const [inspectImage, setInspectImage] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [validationError, setValidationError] = useState<string | null>(null);

//   const navigate = useNavigate();
//   const {
//     dashboard,
//     dashboardLoading,
//     dashboardError,
//     error,
//     getOutstandingBalance,
//     uploadAndSubmitPayment,
//     loadDashboard,
//     clearErrors,
//   } = useRemittance();

//   // Load dashboard data on component mount
//   useEffect(() => {
//     loadDashboard();
//   }, [loadDashboard]);

//   // Get outstanding balance and orders awaiting payment
//   const outstandingBalance = getOutstandingBalance(); // Convert from centavos to PHP
//   const ordersAwaitingPayment = dashboard?.ordersAwaitingPayment || [];

//   // Get the first order awaiting payment (or null if none)
//   const currentOrder =
//     ordersAwaitingPayment.length > 0 ? ordersAwaitingPayment[0] : null;

//   // Pre-populate amount with expected commission if available
//   useEffect(() => {
//     if (currentOrder && !amountPaid) {
//       setAmountPaid(currentOrder.commissionAmount.toFixed(2));
//     }
//   }, [currentOrder, amountPaid]);

//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     if (event.target.files && event.target.files[0]) {
//       const file = event.target.files[0];

//       // Validate file size (max 1MB to match backend)
//       const maxSize = 1 * 1024 * 1024; // 1MB
//       if (file.size > maxSize) {
//         setValidationError("File size must not exceed 1MB");
//         return;
//       }

//       // Validate file type (match backend validation)
//       const allowedTypes = [
//         "image/jpeg",
//         "image/jpg",
//         "image/png",
//         "image/gif",
//         "image/webp",
//       ];
//       if (!allowedTypes.includes(file.type)) {
//         setValidationError("Only JPEG, PNG, GIF, and WebP images are allowed");
//         return;
//       }

//       setValidationError(null);
//       setReceipt(file);
//       setShowImageToast(true);
//       setReceiptPreview(URL.createObjectURL(file));
//       setTimeout(() => setShowImageToast(false), 2500);
//     }
//   };

//   const handleDeleteImage = () => {
//     setReceipt(null);
//     setReceiptPreview(null);
//     setInspectImage(false);
//     setValidationError(null);
//   };

//   const handleSubmit = async (event: React.FormEvent) => {
//     event.preventDefault();

//     // Clear any previous errors
//     setValidationError(null);
//     clearErrors();

//     // Check if there's an order awaiting payment
//     if (!currentOrder) {
//       setValidationError(
//         "No orders found awaiting payment. Please contact support if you believe this is an error.",
//       );
//       return;
//     }

//     // Validate inputs
//     if (!amountPaid || !receipt) {
//       setValidationError("Please enter the amount and upload a receipt.");
//       return;
//     }

//     const amount = parseFloat(amountPaid);
//     if (amount <= 0) {
//       setValidationError("Amount must be greater than 0");
//       return;
//     }

//     if (amount > MAX_AMOUNT) {
//       setValidationError(
//         `Amount cannot exceed ₱${MAX_AMOUNT.toLocaleString()}`,
//       );
//       return;
//     }

//     // Validate against expected commission amount (must be exact)
//     const expectedAmount = currentOrder.commissionAmount;
//     if (Math.abs(amount - expectedAmount) > 0.01) {
//       // Allow 1 centavo tolerance for floating point precision
//       setValidationError(
//         `Payment amount must exactly match the commission amount of ₱${expectedAmount.toFixed(2)}`,
//       );
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       // Upload and submit payment proof for the current order
//       await uploadAndSubmitPayment(currentOrder.id, amount, [receipt]);

//       // Show success message
//       setShowSuccess(true);

//       // Clear form
//       setAmountPaid("");
//       setReceipt(null);
//       setReceiptPreview(null);

//       // Refresh dashboard data
//       loadDashboard();
//     } catch (error) {
//       //console.error("Payment submission failed:", error);
//       setValidationError(
//         error instanceof Error
//           ? error.message
//           : "Failed to submit payment proof. Please try again.",
//       );
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // Limit the amount input to MAX_AMOUNT (₱1,000,000)
//   const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     if (!value || parseFloat(value) <= MAX_AMOUNT) {
//       setAmountPaid(value);
//     }
//   };

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-50 via-blue-50 to-yellow-100 px-2 py-10">
//       {/* Loading Overlay */}
//       {(dashboardLoading || isSubmitting) && (
//         <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
//           <div className="rounded-lg bg-white p-4 shadow-lg">
//             <div className="flex items-center space-x-2">
//               <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
//               <span className="text-sm font-medium text-gray-700">
//                 {isSubmitting ? "Submitting payment..." : "Loading..."}
//               </span>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Error Toast */}
//       {(error || dashboardError || validationError) && (
//         <div className="fixed top-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 shadow-lg">
//           <span className="text-sm font-medium text-red-800">
//             {validationError || error || dashboardError}
//           </span>
//           <button
//             onClick={() => {
//               setValidationError(null);
//               clearErrors();
//             }}
//             className="ml-2 text-red-600 hover:text-red-800"
//             aria-label="Close error"
//           >
//             <XMarkIcon className="h-4 w-4" />
//           </button>
//         </div>
//       )}
//       {/* Inspectable Image Modal */}
//       {inspectImage && receiptPreview && (
//         <div
//           className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
//           onClick={() => setInspectImage(false)}
//         >
//           <div className="relative" onClick={(e) => e.stopPropagation()}>
//             <img
//               src={receiptPreview}
//               alt="Receipt Full Preview"
//               className="max-h-[90vh] max-w-[90vw] rounded-xl border-4 border-white bg-white shadow-2xl"
//             />
//             <button
//               className="absolute top-2 right-2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
//               onClick={() => setInspectImage(false)}
//               aria-label="Close"
//             >
//               <XMarkIcon className="h-6 w-6" />
//             </button>
//             <button
//               className="absolute top-2 left-2 rounded-full bg-red-600/80 p-2 text-white hover:bg-red-700"
//               onClick={handleDeleteImage}
//               aria-label="Delete"
//             >
//               <TrashIcon className="h-6 w-6" />
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Success Popup */}
//       {showSuccess && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
//           <div className="relative flex w-full max-w-xs flex-col items-center rounded-2xl bg-white p-6 shadow-2xl">
//             <button
//               className="absolute top-2 right-2 rounded-full bg-gray-100 p-1 text-gray-500 hover:bg-gray-200"
//               onClick={() => setShowSuccess(false)}
//               aria-label="Close"
//             >
//               <XMarkIcon className="h-5 w-5" />
//             </button>
//             <img
//               src="/images/srv characters (SVG)/girl.svg"
//               alt="Success"
//               className="mb-2 h-28 w-28"
//             />
//             <div className="mb-1 text-lg font-bold text-gray-800">
//               Payment Proof Submitted!
//             </div>
//             <div className="mb-2 text-center text-sm text-gray-600">
//               Your payment proof has been submitted successfully.
//               <br />
//               You will receive confirmation once verified by our admin team.
//             </div>
//             <div className="mb-3 text-center text-xs text-blue-600">
//               Verification typically takes 1-2 business days
//             </div>
//             <button
//               className="mt-2 rounded-full bg-blue-600 px-4 py-2 font-semibold text-white shadow hover:bg-blue-700"
//               onClick={() => {
//                 setShowSuccess(false);
//                 // Optionally navigate back or refresh data
//                 loadDashboard();
//               }}
//             >
//               OK
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Toast for image upload */}
//       {showImageToast && (
//         <div className="fixed top-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 shadow-lg">
//           <span className="text-sm font-medium text-green-800">
//             Receipt image uploaded!
//           </span>
//         </div>
//       )}

//       <div className="w-full max-w-lg rounded-3xl border border-blue-100 bg-white p-6 shadow-2xl">
//         {/* Back Button */}
//         <button
//           type="button"
//           onClick={() => navigate(-1)}
//           className="mb-4 flex items-center gap-2 text-blue-700 hover:text-blue-900 focus:outline-none"
//         >
//           <ArrowLeftIcon className="h-5 w-5" />
//           <span className="font-medium">Back</span>
//         </button>
//         <h1 className="mb-2 flex flex-col items-center gap-2 text-2xl font-extrabold text-blue-800">
//           <img
//             src="/images/srv characters (SVG)/girl.svg"
//             alt="Pay Provider Commission"
//             className="h-16 w-16"
//           />
//           <span className="text-center">Pay Provider Commission</span>
//         </h1>
//         <p className="mb-6 text-center text-sm text-gray-500">
//           {outstandingBalance > 0
//             ? "Please settle your outstanding commission balance to continue enjoying SRV services."
//             : dashboardLoading
//               ? "Loading your balance information..."
//               : "You currently have no outstanding commission balance."}
//         </p>

//         <div className="mb-6 flex items-center gap-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
//           <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
//           <div>
//             <div className="text-lg font-bold text-yellow-700">
//               Outstanding Balance
//             </div>
//             <div className="text-3xl font-extrabold tracking-tight text-red-600">
//               {dashboardLoading ? (
//                 <div className="h-8 w-24 animate-pulse rounded bg-gray-300"></div>
//               ) : (
//                 `₱${outstandingBalance.toFixed(2)}`
//               )}
//             </div>
//             {outstandingBalance === 0 && !dashboardLoading && (
//               <div className="text-sm font-medium text-green-600">
//                 No outstanding balance
//               </div>
//             )}
//             {currentOrder && !dashboardLoading && (
//               <div className="mt-2 text-sm text-blue-600">
//                 Commission for Order: {currentOrder.id}
//                 <br />
//               </div>
//             )}
//           </div>
//         </div>

//         {!currentOrder && !dashboardLoading && (
//           <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-center">
//             <div className="mb-2 text-lg font-bold text-green-700">
//               No Payment Required
//             </div>
//             <div className="text-sm text-green-600">
//               You currently have no orders awaiting commission payment.
//             </div>
//           </div>
//         )}

//         {currentOrder ? (
//           <form onSubmit={handleSubmit} className="space-y-5">
//             <div>
//               <label className="mb-1 block text-sm font-medium text-gray-700">
//                 Commission Amount <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="number"
//                 step="0.01"
//                 value={amountPaid}
//                 onChange={handleAmountChange}
//                 className={`w-full rounded-lg border px-4 py-2 shadow-sm focus:ring-yellow-500 ${
//                   validationError && validationError.includes("amount")
//                     ? "border-red-300 focus:border-red-500"
//                     : "border-gray-300 focus:border-yellow-500"
//                 }`}
//                 placeholder={`₱${currentOrder.commissionAmount.toFixed(2)}`}
//                 min="0"
//                 max={MAX_AMOUNT}
//                 required
//                 disabled={isSubmitting}
//               />
//               <div className="mt-1 flex justify-between text-xs">
//                 <span className="text-gray-400">
//                   Maximum: ₱{MAX_AMOUNT.toLocaleString()}
//                 </span>
//               </div>
//             </div>
//             <div>
//               <label className="mb-1 block text-sm font-medium text-gray-700">
//                 Upload Receipt <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="file"
//                 accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
//                 onChange={handleFileChange}
//                 className={`block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-yellow-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-yellow-700 hover:file:bg-yellow-100 ${
//                   validationError && validationError.includes("file")
//                     ? "border-red-300"
//                     : ""
//                 }`}
//                 required
//                 disabled={isSubmitting}
//               />
//               <span className="mt-1 block text-xs text-gray-400">
//                 Accepted formats: JPEG, PNG, GIF, WebP • Max size: 1MB
//               </span>
//               {receipt && receiptPreview && (
//                 <div className="mt-4 flex flex-col items-center">
//                   <span className="mb-2 text-xs text-gray-600">
//                     Preview of uploaded receipt:
//                   </span>
//                   <div className="relative">
//                     <button
//                       type="button"
//                       className="absolute -top-2 -right-2 z-10 rounded-full bg-red-600 p-1 text-white shadow hover:bg-red-700"
//                       onClick={handleDeleteImage}
//                       aria-label="Delete uploaded receipt"
//                     >
//                       <TrashIcon className="h-5 w-5" />
//                     </button>
//                     <button
//                       type="button"
//                       className="focus:outline-none"
//                       onClick={() => setInspectImage(true)}
//                       aria-label="Inspect uploaded receipt"
//                     >
//                       <img
//                         src={receiptPreview}
//                         alt="Receipt Preview"
//                         className="max-h-48 cursor-zoom-in rounded-lg border border-gray-200 shadow transition hover:brightness-90"
//                       />
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>
//             <button
//               type="submit"
//               disabled={
//                 isSubmitting || dashboardLoading || !receipt || !amountPaid
//               }
//               className={`w-full rounded-full px-6 py-3 text-base font-bold text-white shadow-md transition-colors focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:outline-none ${
//                 isSubmitting || dashboardLoading || !receipt || !amountPaid
//                   ? "cursor-not-allowed bg-gray-400"
//                   : "bg-yellow-500 hover:bg-yellow-600"
//               }`}
//             >
//               {isSubmitting ? "Submitting..." : "Submit Proof of Payment"}
//             </button>
//           </form>
//         ) : (
//           <div className="text-center text-gray-500">
//             <p>Please wait for new orders requiring commission payment.</p>
//           </div>
//         )}

//         <div className="mt-8 text-center text-xs text-gray-400">
//           Payments are verified within 1-2 business days. For questions, contact{" "}
//           <a
//             href="mailto:support@srvpinoy.com"
//             className="text-blue-600 underline"
//           >
//             support@srvpinoy.com
//           </a>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PaymentProviderCommission;
