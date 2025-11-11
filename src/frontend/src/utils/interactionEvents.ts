// Small helpers to dispatch global interaction events so badges can react
export function dispatchBookingInteracted(bookingId?: string) {
  try {
    const detail = bookingId ? { bookingId } : {};
    window.dispatchEvent(new CustomEvent("booking-interacted", { detail }));
  } catch (e) {
  }
}

export function dispatchChatsRead() {
  try {
    window.dispatchEvent(new CustomEvent("chats-read"));
  } catch {}
}
