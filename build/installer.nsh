; Auto-included by electron-builder (buildResources/installer.nsh).
;
; Silent auto-updates (`--updated /S`) use electron-builder's "keepShortcuts"
; mechanism: existing Desktop / Start Menu shortcuts are left alone, but a MISSING
; one is never recreated on an update (addDesktopLink/addStartMenuLink skip it when
; isUpdated). Users who lost their shortcuts around the 0.4.45 forced update were
; left with myNotes installed (still in Add/Remove Programs) but nothing to launch it
; from. customInstall runs after those macros — recreate any missing shortcut here
; so every install AND update self-heals.
!macro customInstall
  ${ifNot} ${FileExists} "$newStartMenuLink"
    CreateShortCut "$newStartMenuLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"
  ${endIf}
  ${ifNot} ${FileExists} "$newDesktopLink"
    CreateShortCut "$newDesktopLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
  ${endIf}
  System::Call 'shell32::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
!macroend
