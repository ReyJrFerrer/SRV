// import React, { useState, useEffect, useRef } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { ArrowLeftIcon, PaperAirplaneIcon } from "@heroicons/react/24/solid";
// import { useAdmin } from "../hooks/useAdmin";
// import { useAuth } from "../context/AuthContext";
// import chatCanisterService, {
//   FrontendMessage,
//   FrontendConversation,
// } from "../../../frontend/src/services/chatCanisterService";
// import { updateChatActor } from "../../../frontend/src/services/chatCanisterService";

// // Global flag to prevent duplicate conversation creation
// let globalConversationCreationInProgress = false;
// const conversationCreationAttempts = new Map<string, boolean>();
// const cleanupOldAttempts = () => {
//   if (conversationCreationAttempts.size > 100) {
//     const entries = Array.from(conversationCreationAttempts.entries());
//     conversationCreationAttempts.clear();
//     entries.slice(-50).forEach(([key, value]) => {
//       conversationCreationAttempts.set(key, value);
//     });
//   }
// };

// export const AdminChatPage: React.FC = () => {
//   const { userId } = useParams<{ userId: string }>();
//   const navigate = useNavigate();
//   const { users: backendUsers } = useAdmin();
//   const { identity } = useAuth();
//   const messagesEndRef = useRef<HTMLDivElement>(null);

//   const [messages, setMessages] = useState<FrontendMessage[]>([]);
//   const [messageText, setMessageText] = useState("");
//   const [sendingMessage, setSendingMessage] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [userName, setUserName] = useState<string>("User");
//   const [userImage, setUserImage] = useState<string | undefined>(undefined);
//   const [conversation, setConversation] = useState<FrontendConversation | null>(
//     null,
//   );
//   const [isLoadingConversation, setIsLoadingConversation] = useState(false);
//   const conversationCreationInProgress = useRef(false);

//   // Load conversation and messages
//   const loadConversation = async () => {
//     console.log("loadConversation called", {
//       userId,
//       hasIdentity: !!identity,
//       isLoadingConversation,
//       conversationCreationInProgress: conversationCreationInProgress.current,
//       hasConversation: !!conversation,
//     });

//     if (
//       !userId ||
//       !identity ||
//       isLoadingConversation ||
//       conversationCreationInProgress.current ||
//       globalConversationCreationInProgress
//     ) {
//       console.log("loadConversation blocked");
//       return;
//     }

//     const currentAdminId = identity.getPrincipal().toString();
//     if (
//       conversation &&
//       (conversation.clientId === userId || conversation.providerId === userId)
//     ) {
//       console.log(
//         "loadConversation blocked - already have conversation for this user",
//       );
//       return;
//     }

//     const conversationKey = `admin_chat_${currentAdminId}_${userId}`;
//     const existingConversationId = localStorage.getItem(conversationKey);

//     if (existingConversationId) {
//       console.log(
//         "loadConversation blocked - conversation already exists in localStorage",
//       );
//       return;
//     }
//     if (conversationCreationAttempts.has(conversationKey)) {
//       console.log(
//         "loadConversation blocked - conversation creation already attempted for this user",
//       );
//       return;
//     }

//     try {
//       setIsLoadingConversation(true);
//       setLoading(true);
//       setError(null);

//       // Update chat actor with admin identity
//       updateChatActor(identity);

//       // Get all existing conversations
//       const existingConversations =
//         await chatCanisterService.getMyConversations();

//       // Look for existing conversation with this user
//       const adminId = identity.getPrincipal().toString();
//       const existingConversation = existingConversations.find((conv) => {
//         const convClientId = conv.conversation.clientId;
//         const convProviderId = conv.conversation.providerId;

//         // Check if this conversation involves the admin and the target user
//         return (
//           (convClientId === userId && convProviderId === adminId) ||
//           (convClientId === adminId && convProviderId === userId)
//         );
//       });

//       if (existingConversation) {
//         // Use existing conversation
//         setConversation(existingConversation.conversation);

//         // Load messages for existing conversation
//         const messagePage = await chatCanisterService.getConversationMessages(
//           existingConversation.conversation.id,
//           50,
//           0,
//         );
//         setMessages(messagePage.messages);
//       } else {
//         const conversationKey = `admin_chat_${adminId}_${userId}`;
//         const existingConversationId = localStorage.getItem(conversationKey);

//         if (existingConversationId) {
//           // load the existing conversation
//           try {
//             const conversation = await chatCanisterService.getConversation(
//               existingConversationId,
//             );
//             if (conversation) {
//               setConversation(conversation);

//               const messagePage =
//                 await chatCanisterService.getConversationMessages(
//                   conversation.id,
//                   50,
//                   0,
//                 );
//               setMessages(messagePage.messages);
//               return;
//             }
//           } catch (err) {
//             localStorage.removeItem(conversationKey);
//           }
//         }

//         conversationCreationInProgress.current = true;
//         globalConversationCreationInProgress = true;
//         conversationCreationAttempts.set(conversationKey, true);
//         cleanupOldAttempts();

//         try {
//           const newConversation = await chatCanisterService.createConversation(
//             userId,
//             currentAdminId,
//           );
//           if (newConversation) {
//             localStorage.setItem(conversationKey, newConversation.id);

//             setConversation(newConversation);

//             // Load messages for new conversation
//             const messagePage =
//               await chatCanisterService.getConversationMessages(
//                 newConversation.id,
//                 50,
//                 0,
//               );
//             setMessages(messagePage.messages);
//           }
//         } catch (error) {
//           console.error("Error creating conversation:", error);
//           const existingConversations =
//             await chatCanisterService.getMyConversations();
//           const existingConversation = existingConversations.find((conv) => {
//             const convClientId = conv.conversation.clientId;
//             const convProviderId = conv.conversation.providerId;
//             return (
//               (convClientId === userId && convProviderId === currentAdminId) ||
//               (convClientId === currentAdminId && convProviderId === userId)
//             );
//           });

//           if (existingConversation) {
//             console.log("Found existing conversation after creation failure");
//             setConversation(existingConversation.conversation);
//             localStorage.setItem(
//               conversationKey,
//               existingConversation.conversation.id,
//             );

//             const messagePage =
//               await chatCanisterService.getConversationMessages(
//                 existingConversation.conversation.id,
//                 50,
//                 0,
//               );
//             setMessages(messagePage.messages);
//           }
//         } finally {
//           conversationCreationInProgress.current = false;
//           globalConversationCreationInProgress = false;
//         }
//       }
//     } catch (err) {
//       console.error("Error loading conversation:", err);
//       setError("Failed to load conversation. Please try again.");
//       conversationCreationInProgress.current = false;
//       globalConversationCreationInProgress = false;
//     } finally {
//       setLoading(false);
//       setIsLoadingConversation(false);
//     }
//   };

//   // Find user information
//   useEffect(() => {
//     if (userId && backendUsers.length > 0) {
//       const user = backendUsers.find((u) => u.id.toString() === userId);
//       if (user) {
//         setUserName(user.name);
//         if (
//           user.profilePicture &&
//           user.profilePicture.length > 0 &&
//           user.profilePicture[0]
//         ) {
//           setUserImage(user.profilePicture[0].imageUrl);
//         }
//       }
//     }
//   }, [userId, backendUsers]);

//   // Refresh conversation messages
//   const refreshMessages = async () => {
//     if (!conversation) return;

//     try {
//       const messagePage = await chatCanisterService.getConversationMessages(
//         conversation.id,
//         50,
//         0,
//       );
//       setMessages(messagePage.messages);
//     } catch (err) {
//       console.error("Error refreshing messages:", err);
//     }
//   };

//   // Load conversation when component mounts or userId changes
//   useEffect(() => {
//     console.log("🔄 useEffect triggered", {
//       userId,
//       hasIdentity: !!identity,
//       conversationCreationInProgress: conversationCreationInProgress.current,
//       globalConversationCreationInProgress,
//     });

//     if (
//       userId &&
//       identity &&
//       !conversationCreationInProgress.current &&
//       !globalConversationCreationInProgress
//     ) {
//       console.log("✅ useEffect proceeding with loadConversation");
//       setConversation(null);
//       setMessages([]);
//       setError(null);
//       conversationCreationInProgress.current = false;
//       globalConversationCreationInProgress = false;
//       const adminId = identity.getPrincipal().toString();
//       const conversationKey = `admin_chat_${adminId}_${userId}`;
//       conversationCreationAttempts.delete(conversationKey);
//       const timeoutId = setTimeout(() => {
//         loadConversation();
//       }, 50);

//       return () => {
//         clearTimeout(timeoutId);
//       };
//     } else {
//       console.log("useEffect blocked");
//     }
//   }, [userId, identity]);

//   // Refresh messages when conversation changes
//   useEffect(() => {
//     if (conversation) {
//       refreshMessages();
//     }
//   }, [conversation]);

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       setIsLoadingConversation(false);
//       conversationCreationInProgress.current = false;
//     };
//   }, []);

//   // Auto-scroll to bottom when new messages arrive
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   // Format timestamp for display
//   const formatTimestamp = (date: Date): string => {
//     return date.toLocaleTimeString([], {
//       hour: "2-digit",
//       minute: "2-digit",
//     });
//   };

//   // Send message handler
//   const handleSendMessage = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!messageText.trim() || sendingMessage || !conversation || !userId)
//       return;

//     setSendingMessage(true);

//     try {
//       // Send message using chat canister service
//       const newMessage = await chatCanisterService.sendMessage(
//         conversation.id,
//         userId,
//         messageText.trim(),
//       );

//       if (newMessage) {
//         setMessageText("");
//         await refreshMessages();
//       }
//     } catch (err) {
//       console.error("Error sending message:", err);
//       setError("Failed to send message. Please try again.");
//     } finally {
//       setSendingMessage(false);
//     }
//   };

//   // Profile image component
//   const ProfileImage: React.FC<{
//     profilePictureUrl?: string;
//     userName: string;
//     size?: string;
//     className?: string;
//   }> = ({
//     profilePictureUrl,
//     userName,
//     size = "h-10 w-10",
//     className = "",
//   }) => {
//     if (!profilePictureUrl) {
//       return (
//         <div
//           className={`${size} ${className} flex items-center justify-center rounded-full bg-gray-300`}
//         >
//           <span className="text-sm font-medium text-gray-600">
//             {userName.charAt(0).toUpperCase()}
//           </span>
//         </div>
//       );
//     }

//     return (
//       <img
//         src={profilePictureUrl}
//         alt={userName}
//         className={`${size} ${className} rounded-full border-2 border-blue-100 object-cover shadow`}
//       />
//     );
//   };

//   return (
//     <div className="flex h-screen flex-col bg-gradient-to-b from-blue-50 to-gray-100">
//       {/* Header: User Info */}
//       <header className="sticky top-0 z-10 flex items-center border-b border-gray-200 bg-white p-3 shadow-sm">
//         <button
//           onClick={() => navigate(-1)}
//           className="rounded-full p-2 hover:bg-blue-100"
//         >
//           <ArrowLeftIcon className="h-6 w-6 text-blue-700" />
//         </button>
//         <div className="ml-3 flex items-center">
//           <div className="relative h-11 w-11">
//             <ProfileImage
//               profilePictureUrl={userImage}
//               userName={userName}
//               size="h-11 w-11"
//             />
//           </div>
//           <div className="ml-3">
//             <h1 className="text-lg font-bold text-gray-900">{userName}</h1>
//             <p className="text-sm text-gray-500">Support Chat</p>
//           </div>
//         </div>
//       </header>

//       {/* Main: Messages Area */}
//       <main className="flex-1 space-y-4 overflow-y-auto p-4 pb-20">
//         {loading ? (
//           <div className="flex h-full items-center justify-center">
//             <div className="text-center">
//               <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
//               <p className="text-lg text-gray-500">Loading conversation...</p>
//             </div>
//           </div>
//         ) : error ? (
//           <div className="flex h-full items-center justify-center">
//             <div className="text-center">
//               <p className="mb-4 text-lg text-red-500">{error}</p>
//               <button
//                 onClick={() => {
//                   setError(null);
//                   loadConversation();
//                 }}
//                 className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
//               >
//                 Retry
//               </button>
//             </div>
//           </div>
//         ) : messages.length === 0 ? (
//           <div className="flex h-full items-center justify-center">
//             <p className="text-lg text-gray-500 italic">
//               No messages yet. Start the conversation!
//             </p>
//           </div>
//         ) : (
//           messages.map((message) => {
//             const fromAdmin = message.senderId !== userId;
//             return (
//               <div
//                 key={message.id}
//                 className={`flex items-end gap-2 ${fromAdmin ? "justify-end" : "justify-start"}`}
//               >
//                 {/* Message sender avatar (if not admin) */}
//                 {!fromAdmin && (
//                   <div className="relative h-9 w-9 flex-shrink-0">
//                     <ProfileImage
//                       profilePictureUrl={userImage}
//                       userName={userName}
//                       size="h-9 w-9"
//                     />
//                   </div>
//                 )}
//                 {/* Message bubble */}
//                 <div
//                   className={`max-w-xs rounded-2xl px-5 py-3 shadow-sm md:max-w-md lg:max-w-lg ${
//                     fromAdmin
//                       ? "rounded-br-none bg-blue-600 text-white"
//                       : "rounded-bl-none border border-gray-200 bg-white text-gray-800"
//                   }`}
//                   style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
//                 >
//                   <p className="overflow-wrap-anywhere text-base leading-snug break-words">
//                     {message.content}
//                   </p>
//                   <p
//                     className={`mt-1 text-right text-xs ${
//                       fromAdmin ? "text-blue-100" : "text-gray-400"
//                     }`}
//                   >
//                     {formatTimestamp(new Date (message.createdAt))}
//                   </p>
//                 </div>
//                 {/* Admin avatar (if from admin) */}
//                 {fromAdmin && (
//                   <div className="relative h-9 w-9 flex-shrink-0">
//                     <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600">
//                       <span className="text-sm font-medium text-white">A</span>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             );
//           })
//         )}
//         <div ref={messagesEndRef} />
//       </main>

//       {/* Message Input Area */}
//       <footer className="fixed bottom-0 left-0 z-20 w-full border-t border-gray-200 bg-white p-3 shadow-md">
//         <form
//           onSubmit={handleSendMessage}
//           className="mx-auto flex max-w-3xl items-center gap-3"
//         >
//           <input
//             type="text"
//             value={messageText}
//             onChange={(e) => setMessageText(e.target.value)}
//             placeholder={loading ? "Loading..." : "Type a message..."}
//             maxLength={500}
//             disabled={sendingMessage || loading || !conversation}
//             className="w-full flex-1 rounded-full border border-transparent bg-gray-100 px-4 py-2 text-base focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
//           />
//           <button
//             type="submit"
//             disabled={
//               sendingMessage || !messageText.trim() || loading || !conversation
//             }
//             className="rounded-full bg-blue-600 p-3 text-white shadow transition-colors hover:bg-blue-700 disabled:bg-gray-300"
//           >
//             {sendingMessage ? (
//               <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
//             ) : (
//               <PaperAirplaneIcon className="h-5 w-5" />
//             )}
//           </button>
//         </form>
//         {messageText.length > 400 && (
//           <p className="mt-1 text-center text-xs text-gray-500">
//             {500 - messageText.length} characters remaining
//           </p>
//         )}
//       </footer>
//     </div>
//   );
// };
