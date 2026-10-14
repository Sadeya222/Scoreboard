# Hockey Scoreboard

## Connect a Firebase project

The app uses Cloud Firestore to keep the scoreboard synchronized across devices. Without Firebase configuration it falls back to local mode, which syncs only between tabs on the same device.

1. Open the [Firebase console](https://console.firebase.google.com/) and create a project, or select the project you want to use.
2. From **Project Overview**, choose **Add app** and select the Web (`</>`) app. Register the app with a nickname; Firebase Hosting is optional. In the SDK setup step, select **Config** and copy the values for `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, and `appId`. If Google Analytics is enabled for the project, also copy `measurementId`. You can find them later under **Project settings → General → Your apps → SDK setup and configuration → Config**. Follow the [Firebase Web setup guide](https://firebase.google.com/docs/web/setup) if the console labels differ.
3. In **Build → Firestore Database**, choose **Create database**, select the Standard edition if prompted, choose a database location, and start in production mode.
4. In Firestore **Rules**, open this repo's [`firestore.rules`](firestore.rules), paste its contents into the console Rules editor, and select **Publish**. The rules allow public reads and validate writes, but do not authenticate users; see the security warning below.
5. In the project root, copy `.env.example` to `.env`. The example is prefilled with this project's Firebase config; replace the values if you registered a different Firebase project. Copy the values exactly, including the storage bucket suffix; it can vary by project.

	```dotenv
	VITE_FIREBASE_API_KEY=...
	VITE_FIREBASE_AUTH_DOMAIN=copy-authDomain-here
	VITE_FIREBASE_PROJECT_ID=copy-projectId-here
	VITE_FIREBASE_STORAGE_BUCKET=copy-storageBucket-here
	VITE_FIREBASE_MESSAGING_SENDER_ID=...
	VITE_FIREBASE_APP_ID=...
	VITE_FIREBASE_MEASUREMENT_ID=... # optional; enables Analytics when supported
	```

	Keep the variable names unchanged. Do not commit `.env`. This app uses Firebase's modular JavaScript SDK, initializes Firestore, and initializes Analytics only when a measurement ID is configured and the browser supports it. You do not need to paste Firebase's `<script>` snippet or add another Firebase initialization file. The web config is shipped to browsers and is not a server credential; Firestore rules must provide access control.
6. Install dependencies and start the app locally:

	```sh
	npm install
	npm run dev
	```

	Open the URL printed by Vite. For a deployable static build, run `npm run build` and publish the generated `dist/` files. Set the same `VITE_FIREBASE_*` variables in your hosting provider's build environment before building. Restart the dev server or rebuild after changing environment variables.

## Deploy to Vercel

1. Push the project to a GitHub repository, then import that repository in the [Vercel dashboard](https://vercel.com/new).
2. Keep the detected **Vite** framework settings. Use `npm run build` as the build command and `dist` as the output directory.
3. In the Vercel project, open **Settings → Environment Variables**. Add `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, and `VITE_FIREBASE_MEASUREMENT_ID` using the values from your local `.env`. Add them to the environments where you will deploy. The measurement ID is optional if Analytics is not enabled.
4. Deploy or redeploy the project after adding the variables. Open the deployment URL and confirm the scoreboard reports **Live** and the admin page reports **Firebase**.

The Vercel rewrite in [`vercel.json`](vercel.json) serves the app for direct visits to `/admin`. Keep `.env` local; it is excluded from Git. Vercel's default deployment URL does not add authentication to the admin page, so the security warning below still applies.

## Open the admin controls

Open `/admin` on the same host as the scoreboard, for example `https://your-site.example/admin`. The scoreboard is at `/`. If your static host does not route `/admin` to the app's `index.html`, use `https://your-site.example/#/admin` instead.

There is currently **no admin login or authentication**. Anyone who can reach the site can open the controls. The current Firestore rules also allow anyone on the internet to submit a valid scoreboard update; schema validation is not user authorization. Do not treat the admin URL as private or deploy this as a protected control panel. Before using it where unauthorized changes matter, add Firebase Authentication and change Firestore rules to require an authorized user. Do not try to secure this by hiding the URL or the Firebase web configuration.

When the Admin page shows **Firebase**, it is using Firestore. **Local** means Firebase is not configured and changes will not sync to other devices.