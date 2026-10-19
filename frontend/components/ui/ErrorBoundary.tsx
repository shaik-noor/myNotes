import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary caught error]:', error, errorInfo)
    this.setState({ errorInfo })
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#191b1d] text-white p-6 select-text">
          <div className="max-w-md w-full bg-[#23272a] border border-[#363a3e] rounded-xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 font-bold text-lg">
                !
              </div>
              <div>
                <h1 className="text-base font-semibold text-white">
                  Application encountered an error
                </h1>
                <p className="text-xs text-neutral-400">myNotes could not complete rendering</p>
              </div>
            </div>

            <div className="bg-[#181a1c] border border-[#2e3236] rounded-lg p-3 text-xs font-mono text-red-300 max-h-48 overflow-y-auto mb-4 break-words">
              {this.state.error?.message || 'Unknown error occurred'}
            </div>

            {this.state.errorInfo && (
              <details className="mb-4 text-xs text-neutral-400">
                <summary className="cursor-pointer hover:text-neutral-300 select-none mb-1">
                  Component stack trace
                </summary>
                <pre className="bg-[#181a1c] p-2.5 rounded text-2xs overflow-x-auto text-neutral-400 max-h-36">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2 px-3 bg-neutral-100 hover:bg-white text-neutral-900 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm"
              >
                Reload Window
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.clear()
                  window.location.reload()
                }}
                className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium cursor-pointer transition-colors border border-neutral-700"
              >
                Reset Cache
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
