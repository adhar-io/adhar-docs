
# Installation

Step-by-step installation instructions for ADHAR.

## System Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **Memory**: 4GB RAM
- **Storage**: 20GB available space
- **OS**: Linux, macOS, or Windows with WSL2

### Recommended Requirements
- **CPU**: 4+ cores
- **Memory**: 8GB+ RAM
- **Storage**: 50GB+ available space
- **Network**: High-speed internet connection

## Installation Methods

### Option 1: Quick Install (Recommended)

```bash
curl -fsSL https://get.adhar.dev | sh
```

### Option 2: Manual Installation

#### Download the Binary

```bash
# Linux/macOS
wget https://releases.adhar.dev/v2.1.0/adhar-linux-amd64.tar.gz
tar -xzf adhar-linux-amd64.tar.gz
sudo mv adhar /usr/local/bin/

# Windows (PowerShell)
Invoke-WebRequest -Uri "https://releases.adhar.dev/v2.1.0/adhar-windows-amd64.zip" -OutFile "adhar.zip"
Expand-Archive -Path "adhar.zip" -DestinationPath "C:\Program Files\ADHAR"
```

#### Add to PATH

Make sure ADHAR is in your system PATH:

```bash
# Linux/macOS
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Windows
# Add C:\Program Files\ADHAR to your system PATH
```

### Option 3: Package Managers

#### Homebrew (macOS/Linux)

```bash
brew tap adhar/tap
brew install adhar
```

#### Chocolatey (Windows)

```bash
choco install adhar
```

#### Snap (Linux)

```bash
sudo snap install adhar --classic
```

## Verification

Verify your installation:

```bash
adhar version
adhar doctor
```

## Next Steps

- [Quick Start Guide](./quick-start)
- [Configuration](./configuration)
- [First Project](./first-project)
