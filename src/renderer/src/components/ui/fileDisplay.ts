import {
  File,
  FileArchive,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  Film,
  type LucideIcon,
  Music
} from 'lucide-react'

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`
}

export function fileGlyph(ext?: string): LucideIcon {
  const e = (ext || '').toLowerCase().replace(/^\./, '')
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(e)) return FileImage
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(e)) return Film
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(e)) return Music
  if (
    [
      'js',
      'jsx',
      'ts',
      'tsx',
      'py',
      'java',
      'c',
      'cpp',
      'rs',
      'go',
      'html',
      'css',
      'json',
      'sql'
    ].includes(e)
  ) {
    return FileCode
  }
  if (['csv', 'xlsx', 'xls'].includes(e)) return FileSpreadsheet
  if (['zip', 'tar', 'gz', '7z', 'rar'].includes(e)) return FileArchive
  if (['txt', 'md', 'markdown', 'log'].includes(e)) return FileText
  return File
}
