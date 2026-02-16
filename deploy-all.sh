#!/bin/bash
# deploy-all.sh — деплоит и backend и frontend на Vercel
# Использование: bash deploy-all.sh "commit message"

set -e

MSG="${1:-update}"

echo "=== Committing changes ==="
git add -A
git commit -m "$MSG" || echo "Nothing to commit"

echo ""
echo "=== Pushing to GitHub (triggers backend auto-deploy) ==="
git push origin main

echo ""
echo "=== Deploying frontend to Vercel ==="
cd frontend
npx vercel --prod --yes
cd ..

echo ""
echo "=== Done! ==="
echo "Backend:  https://backend-pi-sable-56.vercel.app"
echo "Frontend: https://frontend-two-brown-70.vercel.app"
echo ""
echo "Verify:"
echo "  curl https://backend-pi-sable-56.vercel.app/ping"
echo "  curl -I https://frontend-two-brown-70.vercel.app"
