; Custom NSIS installer script for Revenant
!macro customInstall
  ; Create custom directories in install location  
  CreateDirectory "$INSTDIR\custom\sounds"
  CreateDirectory "$INSTDIR\custom\icons"
!macroend
