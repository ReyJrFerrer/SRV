// Small helpers to dispatch global interaction events so badges can react
export function dispatchBookingInteracted(bookingId?: string) {
  try {
    const detail = bookingId ? { bookingId } : {};
    window.dispatchEvent(new CustomEvent("booking-interacted", { detail }));
  } catch (e) {}
}

export function dispatchChatsRead() {
  try {
    window.dispatchEvent(new CustomEvent("chats-read"));
  } catch {}
}

export function dispatchConversationsUpdated(detail?: any) {
  try {
    window.dispatchEvent(new CustomEvent("conversations-updated", { detail }));
  } catch {}
}

export function dispatchMessagesUpdated(conversationId?: string) {
  try {
    const detail = conversationId ? { conversationId } : {};
    window.dispatchEvent(new CustomEvent("messages-updated", { detail }));
  } catch {}
}
