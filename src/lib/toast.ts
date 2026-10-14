export interface ToastDetail {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Affiche un message bref (avec action facultative, p. ex. « Annuler ») via le Toaster global. */
export function showToast(detail: ToastDetail) {
  globalThis.dispatchEvent(new CustomEvent<ToastDetail>("app-toast", { detail }));
}
