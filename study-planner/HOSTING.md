# Deploying StudyFlow to Hostinger

The app is fully static — HTML, CSS and JavaScript only. No Node, no PHP, no
database, no build step. Any shared Hostinger plan can serve it.

## What to upload

Upload the **contents** of the `study-planner/` folder (not the folder itself):

```
index.html
.htaccess
css/styles.css
js/*.js          (9 files)
```

`README.md` and `HOSTING.md` are documentation — they do no harm on the server,
but you can leave them out.

## Option A — hPanel File Manager (easiest)

1. hPanel → **Websites** → your domain → **File Manager**.
2. Open **`public_html`**. If a default `index.html` or `default.php` is there,
   delete it first.
3. Click **Upload** and pick `studyflow-hostinger.zip`.
4. Right-click the uploaded zip → **Extract** → extract into `public_html`.
5. Delete the zip.
6. Visit your domain. Done.

**Check the layout:** `index.html` must sit directly in `public_html`, with
`css/` and `js/` as sibling folders next to it — not nested inside another
folder. If you end up with `public_html/study-planner/index.html`, either move
the files up one level or visit `yourdomain.com/study-planner/` instead. Both
work; the file paths in the HTML are relative.

## Option B — FTP (FileZilla)

1. hPanel → **Files** → **FTP Accounts** for the host, username and password.
2. Connect in FileZilla (port 21, FTP over TLS).
3. Drag `index.html`, `.htaccess`, `css/` and `js/` into `public_html`.
   In FileZilla, enable **Server → Force showing hidden files** so `.htaccess`
   transfers.

## Option C — Git deployment (auto-deploy on push)

1. hPanel → **Advanced** → **Git**.
2. Repository: `https://github.com/dolatali5121-droid/my-new-project`
   Branch: `claude/loving-brahmagupta-87axnx`
   Install path: `public_html`
3. Because the app lives in a `study-planner/` subfolder, the site will be at
   `yourdomain.com/study-planner/`. To serve it from the root instead, either
   move the files to the repository root, or add a redirect in
   `public_html/.htaccess`.
4. Use **Deploy** after each push, or copy the webhook URL into GitHub under
   Settings → Webhooks for automatic deploys.

## After it is live

- **Enable SSL:** hPanel → **Security** → **SSL** → install the free
  certificate. Once it shows active, uncomment the HTTPS block at the bottom of
  `.htaccess`.
- **Updated a file but see the old version?** CSS and JS are cached for 7 days.
  Hard-refresh with `Ctrl+F5` (`Cmd+Shift+R` on Mac), or rename the file in the
  `<script>`/`<link>` tag to bust the cache.
- **Blank page?** Open the browser console (F12). A 404 on `css/styles.css` or
  `js/app.js` means the folders did not upload alongside `index.html`.

## About the data

Tasks, subjects, sessions and settings are stored in each visitor's own browser
(`localStorage`), not on the server. Every visitor gets their own private
planner, nothing is shared between devices, and your hosting never stores user
data. Settings → Export backup produces a JSON file for moving data between
browsers.
