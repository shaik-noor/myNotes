import { mockIPC, mockWindows } from '@tauri-apps/api/mocks'
import type { AppSettings, Note } from '../../types/notes'

// Development-only sample data for checking layouts without a native database.
const date = new Date(Date.now() - 86_400_000).toISOString()
const page = (id: string, title: string, content: string, extra: Partial<Note> = {}): Note => ({
  id,
  title,
  content,
  createdAt: date,
  updatedAt: date,
  ...extra
})
let notes = new URLSearchParams(location.search).has('empty')
  ? []
  : [
      page(
        'project',
        'Product launch',
        'Everything we need for a thoughtful launch. Keep the plan simple and the next step clear.',
        { pinned: true, tags: ['work'], sortKey: 'a0' }
      ),
      page(
        'meeting',
        'Weekly team notes',
        '# This week\n\nA short space for decisions, questions, and next steps.\n\n## Decisions\n\n- Keep the first release focused.\n- Share a draft on Friday.\n\n## Next steps\n\n- [ ] Review the writing experience\n- [ ] Test the smaller layouts with a longer task that wraps onto another line while the checkbox stays aligned with the first line of text\n  - [ ] Check nested tasks\n\n## Questions\n\nWhat can we make simpler?\n\n> A useful note makes the next step clear.\n\n### Release plan\n\n1. Review the draft\n2. Share the update\n\n| Task | Owner | Status |\n| --- | --- | --- |\n| Writing experience | Design | In review |\n| Smaller layouts | Engineering | Ready |\n\n```javascript\nconst nextStep = "Keep writing"\nconsole.log(nextStep)\n```',
        { parentId: 'project', tags: ['work'], sortKey: 'a0' }
      ),
      page(
        'ideas',
        'Ideas worth keeping',
        'Small improvements, useful questions, and things to come back to.',
        { pinned: true, tags: ['ideas'], sortKey: 'a1' }
      ),
      page('personal', 'Personal', 'A few things for life outside work.', {
        tags: ['personal'],
        sortKey: 'a2'
      }),
      page(
        'reading',
        'Reading list',
        'A place for interesting articles, books, and notes from what I read.',
        { parentId: 'personal', tags: ['reading'], sortKey: 'a0' }
      ),
      page(
        'weekend',
        'Plans for the weekend',
        'Take a walk, try a new recipe, and leave some time for nothing.',
        { parentId: 'personal', sortKey: 'a1' }
      )
    ]
let settings: AppSettings = {
  theme: new URLSearchParams(location.search).get('theme') === 'dark' ? 'dark' : 'light',
  palette: 'blue',
  fontClass: 'font-sans-editor',
  fullWidthDefault: false,
  autoSaveDelay: 800
}
mockWindows('main')
mockIPC(
  (command, payload) => {
    if (command === 'notes_load') return { success: true, data: notes }
    if (command === 'notes_save') {
      notes = (payload as { notesList: Note[] }).notesList
      return { success: true }
    }
    if (command === 'app_get_settings') return { success: true, data: settings }
    if (command === 'app_save_settings') {
      settings = { ...settings, ...(payload as { settings: Partial<AppSettings> }).settings }
      return { success: true, data: settings }
    }
    if (command === 'cloud_get_config')
      return {
        success: true,
        data: { isConnected: false, isReady: false, isSyncing: false, autoSync: false }
      }
    if (command === 'attachment_list' || command === 'notes_get_backlinks')
      return { success: true, data: [] }
    if (command.startsWith('plugin:dialog|')) return null
    return { success: false, error: 'This action needs the desktop app.' }
  },
  { shouldMockEvents: true }
)
