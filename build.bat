@echo off
echo [1/5] Bundling code with esbuild...
if not exist "dist" mkdir dist
npx esbuild index.js --bundle --platform=node --format=esm --outfile=dist/bundle.js

echo [2/5] Creating SEA blob...
node --experimental-sea-config sea-config.json

echo [3/5] Copying node executable...
node -e "require('fs').copyFileSync(process.execPath, 'myapp.exe')"

echo [4/5] Injecting blob into EXE...
npx postject myapp.exe NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_f1e6828d56456a6b18c61c2759886b39

echo [5/5] Cleaning up temporary files...
del sea-prep.blob
echo Done! Your single EXE is: myapp.exe
pause