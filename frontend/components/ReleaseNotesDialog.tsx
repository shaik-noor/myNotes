import {
  Cloud,
  ExternalLink,
  FileText,
  Sparkles,
  Zap
} from 'lucide-react'
import type React from 'react'
import { RELEASE_HISTORY, APP_VERSION } from '../data/releaseNotes'
import appIcon from '../assets/icon.png'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './ui/dialog'

interface ReleaseNotesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  performance: Zap,
  cloud: Cloud,
  ui: Sparkles,
  features: FileText
}

export const ReleaseNotesDialog: React.FC<ReleaseNotesDialogProps> = ({
  open,
  onOpenChange
}) => {
  const latestRelease = RELEASE_HISTORY[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] sm:w-[620px] max-w-[94vw] sm:max-w-[620px] rounded-2xl border border-border/50 bg-background/95 backdrop-blur-2xl shadow-2xl p-6 text-foreground overflow-hidden">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <img
              src={appIcon}
              alt="myNotes"
              className="size-11 rounded-xl shadow-md border border-border/50 object-cover"
            />
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold">What's New in myNotes</DialogTitle>
                <span className="rounded-full bg-notes/15 px-2 py-0.5 text-2xs font-bold text-notes border border-notes/30">
                  v{APP_VERSION}
                </span>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {latestRelease?.title || 'Release highlights & new features'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 mt-2 max-h-[62vh] overflow-y-auto pr-1">
          {latestRelease?.highlights.map((item, idx) => {
            const Icon = CATEGORY_ICONS[item.category] || Sparkles
            return (
              <div
                key={idx}
                className="flex items-start gap-3.5 rounded-xl border border-border/50 bg-card/60 p-3.5 shadow-2xs hover:bg-card/90 transition-colors"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-notes/10 text-notes mt-0.5">
                  <Icon className="size-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-foreground">{item.title}</h4>
                    <span className="rounded bg-muted/60 px-1.5 py-0.5 text-3xs font-medium text-muted-foreground">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-2">
          <span className="text-2xs text-muted-foreground">
            Released {latestRelease?.date}
          </span>
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 rounded-lg bg-notes text-notes-foreground hover:bg-notes/90 font-semibold px-4 cursor-pointer text-xs"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
