export interface Toast {
	id: string;
	type: 'success' | 'error' | 'info' | 'warning';
	message: string;
	duration?: number;
}

// Svelte 5 reactive state using $state rune
class ToastStore {
	toasts = $state<Toast[]>([]);

	add(toast: Omit<Toast, 'id'>): string {
		const id = crypto.randomUUID();
		const fullToast: Toast = { ...toast, id };

		this.toasts.push(fullToast);

		// Auto-remove after duration
		const duration = toast.duration ?? 5000;
		if (duration > 0) {
			setTimeout(() => {
				this.remove(id);
			}, duration);
		}

		return id;
	}

	remove(id: string): void {
		const index = this.toasts.findIndex((t) => t.id === id);
		if (index !== -1) {
			this.toasts.splice(index, 1);
		}
	}

	error(message: string, duration?: number): string {
		return this.add({ type: 'error', message, duration });
	}

	success(message: string, duration?: number): string {
		return this.add({ type: 'success', message, duration });
	}

	info(message: string, duration?: number): string {
		return this.add({ type: 'info', message, duration });
	}

	warning(message: string, duration?: number): string {
		return this.add({ type: 'warning', message, duration });
	}
}

export const toastStore = new ToastStore();
