import type { NoteAttachment } from '../types/notes'

export const NOTE_ATTACHMENT_SCHEME = 'mydesk-attachment:'

export function attachmentIdFromUrl(url: string | null | undefined): string | null {
  if (!url?.startsWith(NOTE_ATTACHMENT_SCHEME)) return null
  return url.slice(NOTE_ATTACHMENT_SCHEME.length) || null
}

export class NoteAttachmentsService {
  static async attachFiles(noteId: string): Promise<NoteAttachment[]> {
    const res = await window.api.notes.attachFiles(noteId)
    return res.success && res.data ? res.data : []
  }

  static async attachFromPaths(noteId: string, paths: string[]): Promise<NoteAttachment[]> {
    const res = await window.api.notes.attachFromPaths(noteId, paths)
    return res.success && res.data ? res.data : []
  }

  static async attachBytes(
    noteId: string,
    name: string,
    bytes: Uint8Array
  ): Promise<NoteAttachment | null> {
    const res = await window.api.notes.attachBytes(noteId, name, bytes)
    return res.success && res.data ? res.data : null
  }

  static async list(noteId: string): Promise<NoteAttachment[]> {
    const res = await window.api.notes.listAttachments(noteId)
    return res.success && res.data ? res.data : []
  }

  static async getAttachmentDataUrl(id: string): Promise<{ mime: string; dataUrl: string } | null> {
    const res = await window.api.notes.getAttachmentDataUrl(id)
    return res.success && res.data ? res.data : null
  }

  static async saveAs(id: string): Promise<string | null> {
    const res = await window.api.notes.saveAttachmentAs(id)
    return res.success && res.data ? res.data : null
  }

  static async open(id: string): Promise<boolean> {
    const res = await window.api.notes.openAttachment(id)
    return res.success
  }

  static async reveal(id: string): Promise<boolean> {
    const res = await window.api.notes.revealAttachment(id)
    return res.success
  }

  static async remove(id: string): Promise<boolean> {
    const res = await window.api.notes.removeAttachment(id)
    return res.success
  }
}

