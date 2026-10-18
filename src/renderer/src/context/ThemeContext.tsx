import type React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import type { AppSettings, EditorFont, Palette, ThemeMode } from '../types/notes'

interface ThemeContextValue {
  theme: ThemeMode
  palette: Palette
  fontClass: EditorFont
  fullWidthDefault: boolean
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setPalette: (palette: Palette) => void
  setFontClass: (font: EditorFont) => void
  setFullWidthDefault: (fw: boolean) => void
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  palette: 'blue',
  fontClass: 'font-sans-editor',
  fullWidthDefault: false,
  autoSaveDelay: 800
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  palette: 'blue',
  fontClass: 'font-sans-editor',
  fullWidthDefault: false,
  setTheme: () => {},
  toggleTheme: () => {},
  setPalette: () => {},
  setFontClass: () => {},
  setFullWidthDefault: () => {}
})

export const useTheme = (): ThemeContextValue => useContext(ThemeContext)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)

  // Hydrate settings
  useEffect(() => {
    window.api?.app?.getSettings().then((res) => {
      if (res.success && res.data) {
        setSettings(res.data)
      }
    })
  }, [])

  // Apply theme & palette to DOM
  useEffect(() => {
    const root = document.documentElement
    const body = document.body

    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    body.setAttribute('data-palette', settings.palette)
  }, [settings.theme, settings.palette])

  const setTheme = (theme: ThemeMode): void => {
    setSettings((s) => ({ ...s, theme }))
    window.api?.app?.saveSettings({ theme })
  }

  const toggleTheme = (): void => {
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setTheme(isDark ? 'light' : 'dark')
  }

  const setPalette = (palette: Palette): void => {
    setSettings((s) => ({ ...s, palette }))
    window.api?.app?.saveSettings({ palette })
  }

  const setFontClass = (fontClass: EditorFont): void => {
    setSettings((s) => ({ ...s, fontClass }))
    window.api?.app?.saveSettings({ fontClass })
  }

  const setFullWidthDefault = (fullWidthDefault: boolean): void => {
    setSettings((s) => ({ ...s, fullWidthDefault }))
    window.api?.app?.saveSettings({ fullWidthDefault })
  }

  return (
    <ThemeContext.Provider
      value={{
        theme: settings.theme,
        palette: settings.palette,
        fontClass: settings.fontClass,
        fullWidthDefault: settings.fullWidthDefault,
        setTheme,
        toggleTheme,
        setPalette,
        setFontClass,
        setFullWidthDefault
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
