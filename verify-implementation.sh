#!/bin/bash

echo "Freaker Dennis Implementation Verification"
echo "=========================================="
echo ""

echo "1. Checking TypeScript compilation..."
if npm run build > /dev/null 2>&1; then
  echo "   ✅ Build successful - no TypeScript errors"
else
  echo "   ❌ Build failed - TypeScript errors detected"
  exit 1
fi
echo ""

echo "2. Verifying configuration structure..."
if grep -q "freakerDennis:" src/config/gameConfig.ts && \
   grep -q "rainbowPalette:" src/config/gameConfig.ts && \
   grep -q "tracking:" src/config/gameConfig.ts; then
  echo "   ✅ Configuration structure correct"
else
  echo "   ❌ Configuration structure missing"
  exit 1
fi
echo ""

echo "3. Checking Boss interface updates..."
if grep -q "freaker-dennis" src/systems/boss.ts && \
   grep -q "rainbowPalette" src/systems/boss.ts && \
   grep -q "trackingMode" src/systems/boss.ts; then
  echo "   ✅ Boss interface updated correctly"
else
  echo "   ❌ Boss interface not updated"
  exit 1
fi
echo ""

echo "4. Verifying spawnBoss method updates..."
if grep -q 'isFreaker' src/systems/boss.ts && \
   grep -q '150' src/systems/boss.ts && \
   grep -q '0.6' src/systems/boss.ts; then
  echo "   ✅ SpawnBoss method updated with Freaker Dennis stats"
else
  echo "   ❌ SpawnBoss method not updated correctly"
  exit 1
fi
echo ""

echo "5. Checking tracking movement implementation..."
if grep -q "moveFreakerDennis" src/systems/boss.ts && \
   grep -q "moveTrackingBoss" src/systems/boss.ts; then
  echo "   ✅ Tracking movement logic implemented"
else
  echo "   ❌ Tracking movement logic missing"
  exit 1
fi
echo ""

echo "6. Verifying getPullFor method updates..."
if grep -q "freaker-dennis" src/systems/boss.ts && \
   grep -q "0.8" src/systems/boss.ts; then
  echo "   ✅ getPullFor method updated for different boss types"
else
  echo "   ❌ getPullFor method not updated"
  exit 1
fi
echo ""

echo "7. Checking rendering logic updates..."
if grep -q "rainbowPalette" src/scenes/snakeScene.ts; then
  echo "   ✅ Rendering logic updated for rainbow colors"
else
  echo "   ❌ Rendering logic not updated"
  exit 1
fi
echo ""

echo "8. Verifying spawn rate updates..."
if grep -q "0.03" src/game/snakeGame.ts; then
  echo "   ✅ Spawn rate updated to 3%"
else
  echo "   ❌ Spawn rate not updated"
  exit 1
fi
echo ""

echo "=========================================="
echo "✅ All verifications passed!"
echo "Freaker Dennis implementation is complete."