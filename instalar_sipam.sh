#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  Instalador SIPAM — INCMNSZ
#  Configura iTerm2 con perfil SIPAM, teclas F1-F10 y acceso
#  directo en el Dock. Compatible con Apple Silicon e Intel.
# ─────────────────────────────────────────────────────────────

# 1. Homebrew
if ! command -v brew &>/dev/null; then
  echo "⬇️  Instalando Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Apple Silicon
  [ -f /opt/homebrew/bin/brew ] && eval "$(/opt/homebrew/bin/brew shellenv)"
  # Intel
  [ -f /usr/local/bin/brew ]    && eval "$(/usr/local/bin/brew shellenv)"
else
  echo "✅ Homebrew ya instalado — omitiendo"
  eval "$(/opt/homebrew/bin/brew shellenv)" 2>/dev/null || eval "$(/usr/local/bin/brew shellenv)" 2>/dev/null
fi

# 2. Telnet
if ! command -v telnet &>/dev/null; then
  echo "⬇️  Instalando telnet..."
  brew install telnet
else
  echo "✅ Telnet ya instalado — omitiendo"
fi

# 3. Perfil iTerm2 con teclas F1-F10 mapeadas
echo "⚙️  Configurando perfil SIPAM en iTerm2..."
PROFILE_DIR="$HOME/Library/Application Support/iTerm2/DynamicProfiles"
mkdir -p "$PROFILE_DIR"
cat > "$PROFILE_DIR/SIPAM.json" << 'EOF'
{
  "Profiles": [{
    "Name": "SIPAM",
    "Guid": "sipam-incmnsz-001",
    "Custom Command": "Yes",
    "Command": "telnet 192.168.205.5",
    "Terminal Type": "vt220",
    "Keyboard Map": {
      "0xf704-0x0": { "Action": 12, "Text": "\033p" },
      "0xf705-0x0": { "Action": 12, "Text": "\033q" },
      "0xf706-0x0": { "Action": 12, "Text": "\033r" },
      "0xf707-0x0": { "Action": 12, "Text": "\033s" },
      "0xf708-0x0": { "Action": 12, "Text": "\033t" },
      "0xf709-0x0": { "Action": 12, "Text": "\033u" },
      "0xf70a-0x0": { "Action": 12, "Text": "\033v" },
      "0xf70b-0x0": { "Action": 12, "Text": "\033w" },
      "0xf70c-0x0": { "Action": 12, "Text": "\033[20~" },
      "0xf70d-0x0": { "Action": 12, "Text": "\033[21~" }
    },
    "Use Custom Window Title": true,
    "Window Title": "SIPAM — INCMNSZ"
  }]
}
EOF
echo "✅ Perfil SIPAM creado en iTerm2"

# 4. Aplicación SIPAM.app
echo "⚙️  Creando SIPAM.app..."
osacompile -o ~/Applications/SIPAM.app - << 'APPLESCRIPT'
tell application "iTerm2"
    activate
    create window with profile "SIPAM"
end tell
APPLESCRIPT
echo "✅ SIPAM.app creado en ~/Applications"

# 5. Añadir al Dock
echo "⚙️  Añadiendo SIPAM al Dock..."
defaults write com.apple.dock persistent-apps -array-add \
  "<dict><key>tile-data</key><dict><key>file-data</key><dict><key>_CFURLString</key><string>$HOME/Applications/SIPAM.app</string><key>_CFURLStringType</key><integer>0</integer></dict></dict></dict>"
killall Dock

echo ""
echo "🏁 Instalación completa."
echo "   Reinicia iTerm2 una vez para cargar el perfil SIPAM,"
echo "   luego úsalo desde el Dock."
