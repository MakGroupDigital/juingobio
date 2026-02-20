# Firebase Deployment Guide

## Quick Setup (Recommended)

Run these commands in your terminal:

```bash
# 1. Install firebase-tools locally
npm install firebase-tools --save-dev

# 2. Login to Firebase
npx firebase login

# 3. Deploy Firestore rules
npx firebase deploy --only firestore:rules
```

## Alternative: Global Installation

If you prefer global installation:

```bash
# 1. Install globally
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Deploy
firebase deploy --only firestore:rules
```

## What Gets Deployed

The `firestore.rules` file contains very permissive rules for development:

```
allow read, write: if true;
```

This allows ALL reads and writes without authentication. 

⚠️ **WARNING**: This is ONLY for development. Before production:
1. Implement proper authentication checks
2. Add user-specific access controls
3. Validate data structure and types
4. Add rate limiting

## Verify Deployment

After deployment, check the Firebase Console:
1. Go to https://console.firebase.google.com
2. Select project: studio-2853082048-41992
3. Navigate to Firestore → Rules
4. Verify the rules are deployed

## Troubleshooting

If you get permission errors:
- Make sure you're logged in: `npx firebase login`
- Verify project ID: `npx firebase projects:list`
- Check firestore.rules file exists

## Next Steps

Once deployed, the app will:
1. Create user documents in Firestore on first login
2. Store phone number and user type
3. Save establishment type for B2B users
4. All data is accessible from the app
