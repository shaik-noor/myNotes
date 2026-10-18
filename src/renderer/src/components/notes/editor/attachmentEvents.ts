/**
 * Fired (on `window`) after a note's attachment set changes — a file is attached
 * via the slash menu / paste / drop, or removed from the Attachments panel. The
 * panel listens and refetches its list. Carries the affected note id so a panel
 * for a different note can ignore it.
 */
export const NOTE_ATTACHMENTS_CHANGED_EVENT = 'notes:attachments-changed'

/** Dispatch a {@link NOTE_ATTACHMENTS_CHANGED_EVENT} for one note. */
export function emitNoteAttachmentsChanged(noteId: string): void {
  window.dispatchEvent(new CustomEvent(NOTE_ATTACHMENTS_CHANGED_EVENT, { detail: { noteId } }))
}
