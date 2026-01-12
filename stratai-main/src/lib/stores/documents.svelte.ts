/**
 * Documents Store - Document management with PostgreSQL persistence
 * Uses Svelte 5 runes for reactivity with SvelteMap for proper tracking
 *
 * Handles:
 * - Document CRUD operations
 * - Task-document linking
 * - Space-based filtering
 */

import { SvelteMap } from 'svelte/reactivity';
import type {
	Document,
	DocumentContextRole,
	DocumentWithTaskInfo,
	CreateDocumentInput
} from '$lib/types/documents';

/**
 * Document link info for UI display
 */
export interface TaskDocumentLink {
	id: string;
	documentId: string;
	filename: string;
	mimeType: string;
	charCount: number;
	pageCount?: number;
	title?: string;
	contextRole: DocumentContextRole;
	contextNote?: string;
	linkedAt: Date;
}

class DocumentStore {
	// Document cache by ID (user's own documents)
	documents = new SvelteMap<string, Document>();

	// Shared documents cache: spaceId -> shared documents (not owned by user)
	sharedDocuments = new SvelteMap<string, Document[]>();

	// Task documents cache: taskId -> linked documents
	taskDocuments = new SvelteMap<string, TaskDocumentLink[]>();

	// Loading and error states
	isLoading = $state(false);
	error = $state<string | null>(null);

	// Version counter for fine-grained reactivity
	_version = $state(0);

	// Track which spaces/tasks have been loaded
	private loadedSpaces = new Set<string>();
	private loadedSharedSpaces = new Set<string>();
	private loadedTasks = new Set<string>();

	/**
	 * Load all documents for a space
	 */
	async loadDocuments(spaceId?: string): Promise<void> {
		const cacheKey = spaceId ?? 'all';
		if (this.loadedSpaces.has(cacheKey)) return;

		this.isLoading = true;
		this.error = null;

		try {
			const url = spaceId ? `/api/documents?spaceId=${spaceId}` : '/api/documents';
			const response = await fetch(url);

			if (!response.ok) {
				if (response.status === 401) return;
				throw new Error(`API error: ${response.status}`);
			}

			const data = await response.json();
			if (data.documents) {
				for (const doc of data.documents) {
					// Convert date strings to Date objects
					this.documents.set(doc.id, {
						...doc,
						createdAt: new Date(doc.createdAt),
						updatedAt: new Date(doc.updatedAt),
						deletedAt: doc.deletedAt ? new Date(doc.deletedAt) : undefined
					});
				}
				this.loadedSpaces.add(cacheKey);
				this._version++;
			}
		} catch (e) {
			console.error('Failed to load documents:', e);
			this.error = e instanceof Error ? e.message : 'Failed to load documents';
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Load documents shared with user's Areas in a Space
	 * These are documents owned by others but shared via visibility settings
	 */
	async loadSharedDocuments(spaceId: string): Promise<void> {
		if (this.loadedSharedSpaces.has(spaceId)) return;

		try {
			const response = await fetch(`/api/documents?spaceId=${spaceId}&shared=true`);

			if (!response.ok) {
				if (response.status === 401) return;
				throw new Error(`API error: ${response.status}`);
			}

			const data = await response.json();
			if (data.documents) {
				const docs: Document[] = data.documents.map((doc: Document & { createdAt: string; updatedAt: string; deletedAt?: string }) => ({
					...doc,
					createdAt: new Date(doc.createdAt),
					updatedAt: new Date(doc.updatedAt),
					deletedAt: doc.deletedAt ? new Date(doc.deletedAt) : undefined
				}));
				this.sharedDocuments.set(spaceId, docs);
				this.loadedSharedSpaces.add(spaceId);
				this._version++;
			}
		} catch (e) {
			console.error('Failed to load shared documents:', e);
			this.error = e instanceof Error ? e.message : 'Failed to load shared documents';
		}
	}

	/**
	 * Get shared documents for a space (from cache)
	 */
	getSharedDocuments(spaceId: string): Document[] {
		// Reference _version for Svelte reactivity
		void this._version;
		return this.sharedDocuments.get(spaceId) ?? [];
	}

	/**
	 * Upload a new document
	 */
	async uploadDocument(file: File, spaceId?: string): Promise<Document | null> {
		this.isLoading = true;
		this.error = null;

		try {
			const formData = new FormData();
			formData.append('file', file);
			if (spaceId) {
				formData.append('spaceId', spaceId);
			}

			const response = await fetch('/api/documents', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Upload failed: ${response.status}`);
			}

			const data = await response.json();
			if (data.document) {
				const doc: Document = {
					...data.document,
					createdAt: new Date(data.document.createdAt),
					updatedAt: new Date(data.document.updatedAt)
				};
				this.documents.set(doc.id, doc);
				this._version++;
				return doc;
			}

			return null;
		} catch (e) {
			console.error('Failed to upload document:', e);
			this.error = e instanceof Error ? e.message : 'Failed to upload document';
			return null;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Delete a document (soft delete)
	 */
	async deleteDocument(id: string): Promise<boolean> {
		try {
			const response = await fetch(`/api/documents/${id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error(`Delete failed: ${response.status}`);
			}

			this.documents.delete(id);

			// Remove from any task document caches
			for (const [taskId, docs] of this.taskDocuments) {
				const filtered = docs.filter((d) => d.documentId !== id);
				if (filtered.length !== docs.length) {
					this.taskDocuments.set(taskId, filtered);
				}
			}

			this._version++;
			return true;
		} catch (e) {
			console.error('Failed to delete document:', e);
			this.error = e instanceof Error ? e.message : 'Failed to delete document';
			return false;
		}
	}

	/**
	 * Load documents linked to a specific task
	 */
	async loadDocumentsForTask(taskId: string): Promise<void> {
		if (this.loadedTasks.has(taskId)) return;

		try {
			const response = await fetch(`/api/tasks/${taskId}/documents`);

			if (!response.ok) {
				if (response.status === 404) {
					// Task not found - just set empty array
					this.taskDocuments.set(taskId, []);
					return;
				}
				throw new Error(`API error: ${response.status}`);
			}

			const data = await response.json();
			if (data.documents) {
				const links: TaskDocumentLink[] = data.documents.map(
					(doc: DocumentWithTaskInfo & { linkedAt: string }) => ({
						id: doc.id,
						documentId: doc.id,
						filename: doc.filename,
						mimeType: doc.mimeType,
						charCount: doc.charCount,
						pageCount: doc.pageCount,
						title: doc.title,
						contextRole: doc.contextRole,
						contextNote: doc.contextNote,
						linkedAt: new Date(doc.linkedAt)
					})
				);
				this.taskDocuments.set(taskId, links);
				this.loadedTasks.add(taskId);
				this._version++;
			}
		} catch (e) {
			console.error('Failed to load task documents:', e);
			// Set empty array on error to prevent repeated attempts
			this.taskDocuments.set(taskId, []);
		}
	}

	/**
	 * Link a document to a task
	 */
	async linkToTask(
		documentId: string,
		taskId: string,
		role: DocumentContextRole = 'reference',
		note?: string
	): Promise<boolean> {
		try {
			const response = await fetch(`/api/tasks/${taskId}/documents`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					documentId,
					contextRole: role,
					contextNote: note
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Link failed: ${response.status}`);
			}

			// Refresh task documents
			this.loadedTasks.delete(taskId);
			await this.loadDocumentsForTask(taskId);

			return true;
		} catch (e) {
			console.error('Failed to link document to task:', e);
			this.error = e instanceof Error ? e.message : 'Failed to link document';
			return false;
		}
	}

	/**
	 * Unlink a document from a task
	 */
	async unlinkFromTask(documentId: string, taskId: string): Promise<boolean> {
		try {
			const response = await fetch(`/api/tasks/${taskId}/documents?documentId=${documentId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error(`Unlink failed: ${response.status}`);
			}

			// Update local cache
			const current = this.taskDocuments.get(taskId) ?? [];
			this.taskDocuments.set(
				taskId,
				current.filter((d) => d.documentId !== documentId)
			);
			this._version++;

			return true;
		} catch (e) {
			console.error('Failed to unlink document from task:', e);
			this.error = e instanceof Error ? e.message : 'Failed to unlink document';
			return false;
		}
	}

	/**
	 * Get documents linked to a task (from cache)
	 */
	getDocumentsForTask(taskId: string): TaskDocumentLink[] {
		// Reference _version for Svelte reactivity
		void this._version;
		return this.taskDocuments.get(taskId) ?? [];
	}

	/**
	 * Get a document by ID
	 */
	getDocumentById(id: string): Document | undefined {
		// Reference _version for Svelte reactivity
		void this._version;
		return this.documents.get(id);
	}

	/**
	 * Get all documents (optionally filtered by space)
	 */
	getDocuments(spaceId?: string): Document[] {
		// Reference _version for Svelte reactivity
		void this._version;
		const docs = Array.from(this.documents.values());
		if (spaceId) {
			return docs.filter((d) => d.spaceId === spaceId);
		}
		return docs;
	}

	/**
	 * Clear cache for a task (forces reload)
	 */
	clearTaskCache(taskId: string): void {
		this.loadedTasks.delete(taskId);
		this.taskDocuments.delete(taskId);
		this._version++;
	}

	/**
	 * Clear all caches
	 */
	clearAll(): void {
		this.documents.clear();
		this.sharedDocuments.clear();
		this.taskDocuments.clear();
		this.loadedSpaces.clear();
		this.loadedSharedSpaces.clear();
		this.loadedTasks.clear();
		this.error = null;
		this._version++;
	}

	/**
	 * Clear shared documents cache for a space (forces reload)
	 */
	clearSharedCache(spaceId: string): void {
		this.loadedSharedSpaces.delete(spaceId);
		this.sharedDocuments.delete(spaceId);
		this._version++;
	}

	// Derived values

	/**
	 * All documents sorted by creation date (newest first)
	 */
	documentList = $derived.by(() => {
		const _ = this._version;
		return Array.from(this.documents.values()).sort(
			(a, b) => b.createdAt.getTime() - a.createdAt.getTime()
		);
	});

	/**
	 * Total document count
	 */
	documentCount = $derived.by(() => {
		return this.documents.size;
	});

	/**
	 * Whether any documents exist
	 */
	hasDocuments = $derived.by(() => {
		return this.documents.size > 0;
	});
}

// Export singleton instance
export const documentStore = new DocumentStore();
