# Source screenshots for Google OAuth review video

Put the original screenshots here as PNG or JPG files.

Recommended filenames, in order:

1. `01-home.png`
2. `02-apps.png`
3. `03-analytics-before-connect.png`
4. `04-google-account-chooser.png`
5. `05-google-consent.png`
6. `06-analytics-connected.png`
7. `07-analytics-report-loaded.png`
8. `08-chat-context-received.png`

Then run:

```powershell
node scripts/build-google-oauth-video-from-screenshots.mjs
```

The script keeps the screenshots as the visual source and only adds an explanatory caption band.
