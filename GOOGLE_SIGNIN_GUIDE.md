# Adding Google Sign-In later (Optional)

This guide shows how to add real Google authentication when you want multi-device sync or cloud accounts.

## 1. Create a Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Create a new project (e.g. "SA Invoice Pro")
3. Go to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Application type: **Web application**
6. Authorized JavaScript origins:
   - http://localhost:8080
   - https://your-netlify-or-cloudflare-url
7. Copy the **Client ID**

## 2. Enable Google Identity Services

Add this to `index.html` (before your app scripts):

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

## 3. Simple integration example

In `js/auth.js` you can add:

```js
async function googleSignIn() {
  // Requires the Client ID from step 1
  const client = google.accounts.oauth2.initTokenClient({
    client_id: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
    scope: 'email profile',
    callback: async (tokenResponse) => {
      // Fetch user info
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
      });
      const profile = await res.json();
      // Create or login local user with profile.email / profile.name
      // Then call App.onLoginSuccess()
    }
  });
  client.requestAccessToken();
}
```

## 4. Important notes

- Google Sign-In **requires internet**.
- For pure offline use, keep the current local password system.
- You can offer both: “Login with Password” and “Continue with Google”.
- Never put your Client Secret in frontend code. Only the Client ID is safe for browser use.

## 5. Free tier

Google Identity Services is free for normal usage volumes.

---

Once you have the Client ID, tell me and I can wire the full Google button into the login screen for you.
