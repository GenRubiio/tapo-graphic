/** DOM-based transient toast notifications. */

function ensureContainer(): HTMLElement {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message: string, variant: 'error' | 'info', ttlMs: number): void {
  const container = ensureContainer();
  const toast = document.createElement('div');
  toast.setAttribute('role', 'alert');
  toast.className = `toast toast--${variant}`;
  toast.textContent = message;
  container.appendChild(toast);
  // Force a frame so the slide-in transition applies.
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  window.setTimeout(() => {
    toast.classList.remove('toast--visible');
    window.setTimeout(() => toast.remove(), 300);
  }, ttlMs);
}

export function showError(message: string): void {
  showToast(message, 'error', 5000);
}

export function showInfo(message: string): void {
  showToast(message, 'info', 3000);
}
