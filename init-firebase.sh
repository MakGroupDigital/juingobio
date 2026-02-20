#!/bin/bash

echo "Firebase Setup Script for JuingoBIO"
echo "===================================="
echo ""

# Check if firebase-tools is installed
if ! command -v firebase &> /dev/null; then
    echo "Installing firebase-tools globally..."
    npm install -g firebase-tools
fi

echo ""
echo "Logging in to Firebase..."
firebase login

echo ""
echo "Initializing Firebase project..."
firebase init

echo ""
echo "Deploying Firestore rules..."
firebase deploy --only firestore:rules

echo ""
echo "Firebase setup complete!"
echo "Your Firestore rules are now deployed with permissive settings for development."
echo ""
echo "IMPORTANT: Before deploying to production, update firestore.rules with proper security rules."
