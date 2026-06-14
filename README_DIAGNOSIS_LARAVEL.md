# 3D Diagnosis System - Laravel Migration

This Laravel application was created for the existing static diagnosis project.

## Runtime

- Laravel: 11.54.0
- PHP: 8.2.0 from Laragon
- Database: MySQL
- Database name: `diagnosis`
- Database user: `root`
- Database password: empty

## What Changed

- Login, registration, guest login, logout, and admin role handling now use Laravel controllers, sessions, hashed passwords, and the `users` table.
- The old static pages are now served as Blade views through Laravel routes.
- Static assets are served from `public`.
- Existing browser-state calls for keys such as `dds_*`, `mediscan_*`, `selected_body_part`, `diagnosis_history`, and `lastDiagnosis` are intercepted by `public/js/dds-state.js` and persisted through `/api/state` into the `browser_states` MySQL table.
- Legacy `.html` URLs are still registered as Laravel routes so old in-page navigation keeps working.

## Main URLs

- `/` or `/login`
- `/model`
- `/chat`
- `/admin`

Compatibility routes such as `/model-selector.html`, `/diagnosis-chat.html`, and the detail pages also work.

## Run

From this directory:

```powershell
D:\laragon\bin\php\php-8.2.0-Win32-vs16-x64\php.exe -S 127.0.0.1:8000 -t public
```

Then open:

```text
http://127.0.0.1:8000/
```

For Laragon virtual hosts, point the document root to:

```text
D:\laragon\www\diagnosis\_laravel\public
```
