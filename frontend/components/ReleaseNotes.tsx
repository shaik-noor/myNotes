import { RELEASE_HISTORY } from '../data/releaseNotes'

export function ReleaseNotesContent() {
  return (
    <div className="space-y-7">
      {RELEASE_HISTORY.map((release) => (
        <section key={release.version}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Version {release.version}</h3>
            <span className="text-xs text-muted-foreground">{release.date}</span>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">{release.title}</p>
          <ul className="space-y-4">
            {release.highlights.map((item) => (
              <li key={item.title} className="border-l-2 border-border pl-4">
                <h4 className="text-sm font-medium">{item.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
