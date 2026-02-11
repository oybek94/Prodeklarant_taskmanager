# Send Task Documents by Email (Mail.ru SMTP)

This feature sends task documents by email when a task is completed (status **YAKUNLANDI**). Emails are sent via **Mail.ru (e.mail.ru)** SMTP.

## Backend configuration

### 1. Environment variables

Copy the example variables into your `backend/.env` (do **not** commit real credentials):

```env
# Mail.ru SMTP (for Send Task Documents by Email)
MAILRU_USER=your-email@mail.ru
MAILRU_PASSWORD=your-app-password
# Optional: override "From" address (defaults to MAILRU_USER)
# MAIL_FROM=your-email@mail.ru
```

- **MAILRU_USER** – Your full Mail.ru email (e.g. `user@mail.ru`).
- **MAILRU_PASSWORD** – For accounts with 2FA, use an **application password** from Mail.ru settings, not your main password.

### 2. Mail.ru application password (if 2FA is enabled)

1. Log in to [e.mail.ru](https://e.mail.ru).
2. Go to **Settings** → **Security** (or similar).
3. Find **Application passwords** and create a new one for “Mail” or “Other”.
4. Use that generated password as `MAILRU_PASSWORD` in `.env`.

### 3. Restart backend

After changing `.env`, restart the backend server so the new variables are loaded.

## Usage

1. Open **Tasks** and select a task with status **YAKUNLANDI** (completed).
2. In the task modal, click **Send Documents by Email**.
3. In the form:
   - **Subject** (required)
   - **Message** (optional)
   - **Recipients** (required; comma- or space-separated emails)
   - **CC** / **BCC** (optional)
4. Click **Send**. All documents attached to the task are included as email attachments.

## API

- **Endpoint:** `POST /api/send-task-email`
- **Auth:** Bearer token (required).
- **Body:** `{ task_id, subject, body?, recipients[], cc?, bcc? }`
- **Behaviour:** Loads the task, checks it is completed and the user has access, merges client email with recipients, attaches all task documents, and sends via Mail.ru SMTP (smtp.mail.ru, port 465, SSL).

## Troubleshooting

- **"SMTP is not configured"** – Set `MAILRU_USER` and `MAILRU_PASSWORD` in `backend/.env` and restart the backend.
- **Authentication failed** – Use an application password if 2FA is on; ensure there are no extra spaces in `.env`.
- **Only completed tasks** – The button and API only allow sending when task status is **YAKUNLANDI**.
