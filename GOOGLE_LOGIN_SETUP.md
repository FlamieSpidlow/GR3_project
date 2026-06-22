# Google login setup

Create an OAuth 2.0 Web Client in Google Cloud Console, then set the same client ID in both apps:

- `backend/.env`: `GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`
- `frontend/.env`: `VUE_APP_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`

For local development, add `http://localhost:8080` to the OAuth client's Authorized JavaScript origins.

For production, add the deployed site origin. On Render, set both `GOOGLE_CLIENT_ID` and `VUE_APP_GOOGLE_CLIENT_ID` before building the frontend.
