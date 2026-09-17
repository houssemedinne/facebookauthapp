# facebookauthapp

Minimal Facebook OAuth test app for Vercel.

## Flow

1. User clicks **Continue with Facebook**.
2. Facebook Login returns an authorization code.
3. The Vercel callback exchanges the code for a user access token.
4. The app calls `/me/accounts` and retrieves the user's Facebook Pages and Page access tokens.
5. The test page shows Page names/IDs and whether a Page token was returned. It never prints the actual tokens.

## Vercel environment variables

Set these for **Production** and **Preview** as needed:

- `FB_APP_ID` — Meta app ID
- `FB_APP_SECRET` — Meta app secret
- `FB_REDIRECT_URI` — exact callback URL, for example `https://YOUR-DOMAIN.vercel.app/api/auth/facebook/callback`
- `FB_GRAPH_VERSION` — Graph API version supported by your Meta app, for example `v26.0`

## Meta app settings

Add the exact value of `FB_REDIRECT_URI` to the Facebook Login **Valid OAuth Redirect URIs** list.

The test requests:

- `public_profile`
- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_posts`

For production use, review Meta's current App Review and permission requirements before requesting Page permissions from users.

## Important

This repository is intentionally separate from `fcbmanagerapp`. No OAuth code is added to the main application.
