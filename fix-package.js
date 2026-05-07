const fs = require('fs');

const pkg = {
  "name": "mythos-launcher",
  "version": "1.0.0",
  "description": "Mythos Core Launcher",
  "main": "main.js",
  "author": "MythosCore",
  "license": "MIT",
  "scripts": {
    "start": "electron .",
    "dev": "electron . --dev",
    "build:win": "electron-builder --win",
    "build:linux": "electron-builder --linux",
    "build:mac": "electron-builder --mac",
    "build": "electron-builder"
  },
  "dependencies": {
    "minecraft-launcher-core": "^3.5.4",
    "msmc": "^4.0.0",
    "node-fetch": "^2.7.0",
    "extract-zip": "^2.0.1",
    "fs-extra": "^11.2.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "electron": "^25.9.8",
    "electron-builder": "^24.13.3"
  },
  "build": {
    "appId": "tc.gt.mythoscore.launcher",
    "productName": "Mythos Launcher",
    "icon": "assets/icon",
    "asar": false,
    "files": ["**/*", "!node_modules/.cache", "!dist"],
    "directories": { "output": "dist" },
    "win": {
      "target": [
        { "target": "zip", "arch": ["x64"] },
        { "target": "nsis", "arch": ["x64"] }
      ],
      "icon": "assets/icon.ico"
    },
    "linux": {
      "target": ["AppImage"],
      "icon": "assets/icon.png",
      "category": "Game"
    },
    "mac": {
      "target": ["dmg"],
      "icon": "assets/icon.icns"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('package.json fixed! Now run:');
console.log('  npm install');
console.log('  npm run build:win');
