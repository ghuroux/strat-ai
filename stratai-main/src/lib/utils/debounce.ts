/**
 * Debounce utility function
 *
 * Delays function execution until after specified wait time has elapsed
 * since the last call. Useful for reducing API calls on user input.
 *
 * @param fn - Function to debounce
 * @param ms - Milliseconds to wait before executing
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => void>(
	fn: T,
	ms: number
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout>;

	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), ms);
	};
}
