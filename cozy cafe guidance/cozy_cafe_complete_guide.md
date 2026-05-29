# Cozy Café Website — Complete Implementation Guide

> This guide covers: Live Map, Live Contact Form (email), Live Reservations, Render Deployment, and Security hardening. Read each section fully before making changes — understanding *why* is more valuable than copy-pasting.

---

## 1. LIVE MAP (Google Maps Embed)

The easiest and most reliable approach for a café site is an **embedded Google Map iframe**. No API key needed for basic embeds, no JS required.

### Step 1 — Get your embed code
1. Go to **maps.google.com** and search for your café address.
2. Click **Share → Embed a map**.
3. Copy the `<iframe>` code Google gives you.

### Step 2 — Add it to `index.html`

Find your contact section (around line 620) and add this inside the `contact-grid` div, replacing or adding alongside the existing info:

```html
<!-- LIVE MAP — replace the src with your Google Maps embed URL -->
<div class="map-wrap" style="border-radius: 12px; overflow: hidden; height: 280px; margin-top: 1rem;">
  <iframe
    src="https://www.google.com/maps/embed?pb=YOUR_EMBED_URL_HERE"
    width="100%"
    height="100%"
    style="border:0;"
    allowfullscreen=""
    loading="lazy"
    referrerpolicy="no-referrer-when-downgrade"
    title="Cozy Café location"
  ></iframe>
</div>
```

> **Why this approach?** The iframe embed is free, always up-to-date (Google maintains it), works without JavaScript, and is fully responsive. The alternative — the Maps JavaScript API — costs money beyond a monthly free tier and adds complexity you don't need for a simple location display.

---

## 2. LIVE CONTACT FORM (Send Message → Real Email)

Right now your `script.js` contact form just fakes a response with `setTimeout`. Your `app.py` `/contact` route already validates data — it just needs to actually **send an email**.

### The Plan
- Use **Gmail + App Password** (free, no extra service needed).
- Python's built-in `smtplib` sends the email.
- No new packages beyond what you already have.

### Step 1 — Create a Gmail App Password
You cannot use your real Gmail password in code. Instead:
1. Go to your Google Account → **Security**.
2. Enable **2-Step Verification** if not already on.
3. Search for "App Passwords" → Create one → Select "Mail" → "Other" → name it "Cozy Cafe".
4. Google gives you a **16-character password** (e.g. `abcd efgh ijkl mnop`). Copy it.

### Step 2 — Add to your `.env` file

Create a `.env` file in your project root (this file is NEVER committed to Git):

```
GMAIL_USER=yourcafe@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
CONTACT_RECIPIENT=yourcafe@gmail.com
SECRET_KEY=some-long-random-string-here
```

### Step 3 — Install python-dotenv

```bash
pip install python-dotenv flask-limiter
```

Add to `requirements.txt`:
```
Flask==3.0.0
Werkzeug==3.0.1
python-dotenv==1.0.1
Flask-Limiter==3.5.0
```

### Step 4 — Update `app.py`

Replace your entire `app.py` with this production-ready version:

```python
"""
app.py — Cozy Café Flask backend (production-ready)
"""

from flask import Flask, send_from_directory, jsonify, request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
import os, re, smtplib, html
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

# Load .env variables FIRST, before anything else reads os.environ
load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='/static')
app.secret_key = os.environ.get('SECRET_KEY', 'dev-fallback-change-in-prod')

# ── Rate Limiting (prevents form spam/abuse) ──
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# ── Helper: sanitize input ──
def clean(text):
    """Strip HTML tags and excess whitespace from user input."""
    return html.escape(str(text).strip())


# ── Helper: send email via Gmail SMTP ──
def send_email(name, email, subject, message):
    gmail_user = os.environ.get('GMAIL_USER')
    gmail_pass = os.environ.get('GMAIL_APP_PASSWORD')
    recipient  = os.environ.get('CONTACT_RECIPIENT', gmail_user)

    if not gmail_user or not gmail_pass:
        # Not configured — log and return True so dev still works
        print("⚠️  Email not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env")
        return True

    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"[Cozy Café Contact] {subject or 'New message'}"
    msg['From']    = gmail_user
    msg['To']      = recipient
    msg['Reply-To'] = email

    body_html = f"""
    <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
      <div style="background:#1A0E07;padding:20px;border-radius:8px 8px 0 0;">
        <h2 style="color:#C8973A;margin:0;">☕ New Contact Form Message</h2>
      </div>
      <div style="background:#FAF3E0;padding:24px;border-radius:0 0 8px 8px;">
        <p><strong>From:</strong> {clean(name)} &lt;{clean(email)}&gt;</p>
        <p><strong>Subject:</strong> {clean(subject) if subject else 'Not provided'}</p>
        <hr style="border:1px solid #E8D8B8;">
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-wrap;">{clean(message)}</p>
        <hr style="border:1px solid #E8D8B8;">
        <small style="color:#8B5A2B;">Received: {datetime.now().strftime('%d %b %Y, %I:%M %p')}</small>
      </div>
    </body></html>
    """

    msg.attach(MIMEText(body_html, 'html'))

    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        server.login(gmail_user, gmail_pass)
        server.sendmail(gmail_user, recipient, msg.as_string())

    return True


@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)


@app.route('/contact', methods=['POST'])
@limiter.limit("5 per minute")   # Max 5 submissions per minute per IP
def contact():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({'success': False, 'error': 'Invalid request.'}), 400

    # Validate required fields
    required = ['name', 'email', 'message']
    missing  = [f for f in required if not data.get(f, '').strip()]
    if missing:
        return jsonify({'success': False, 'error': f'Missing: {", ".join(missing)}'}), 422

    # Validate email format
    if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', data['email'].strip()):
        return jsonify({'success': False, 'error': 'Invalid email address.'}), 422

    # Length limits (prevents huge payloads)
    if len(data.get('message', '')) > 2000:
        return jsonify({'success': False, 'error': 'Message too long (max 2000 chars).'}), 422

    try:
        send_email(
            name    = data.get('name', '').strip(),
            email   = data.get('email', '').strip(),
            subject = data.get('subject', '').strip(),
            message = data.get('message', '').strip()
        )
    except Exception as e:
        print(f"Email send error: {e}")
        return jsonify({'success': False, 'error': 'Could not send message. Please try again.'}), 500

    return jsonify({'success': True, 'message': "Thank you! We'll be in touch shortly."}), 200


@app.route('/reserve', methods=['POST'])
@limiter.limit("3 per minute")
def reserve():
    """Handle table reservation form submissions."""
    data = request.get_json(silent=True)

    if not data:
        return jsonify({'success': False, 'error': 'Invalid request.'}), 400

    required = ['name', 'phone', 'date', 'time', 'guests']
    missing  = [f for f in required if not data.get(f, '').strip()]
    if missing:
        return jsonify({'success': False, 'error': f'Missing: {", ".join(missing)}'}), 422

    # Phone validation (basic)
    phone = re.sub(r'[\s\-\(\)]', '', data['phone'])
    if not re.match(r'^\+?[0-9]{8,15}$', phone):
        return jsonify({'success': False, 'error': 'Invalid phone number.'}), 422

    # ── Log reservation (extend this to save to a database) ──
    print(f"\n📅 New Reservation:")
    print(f"   Name:  {data.get('name')}")
    print(f"   Phone: {data.get('phone')}")
    print(f"   Date:  {data.get('date')} at {data.get('time')}")
    print(f"   Party: {data.get('guests')}, Pref: {data.get('seat', 'none')}")
    print(f"   Note:  {data.get('note', '-')}\n")

    # ── Send confirmation email ──
    try:
        gmail_user = os.environ.get('GMAIL_USER')
        gmail_pass = os.environ.get('GMAIL_APP_PASSWORD')
        if gmail_user and gmail_pass:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"[Cozy Café] Reservation — {data.get('name')} on {data.get('date')}"
            msg['From']    = gmail_user
            msg['To']      = os.environ.get('CONTACT_RECIPIENT', gmail_user)
            body = f"""
            <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
              <div style="background:#1A0E07;padding:20px;border-radius:8px 8px 0 0;">
                <h2 style="color:#C8973A;margin:0;">📅 New Table Reservation</h2>
              </div>
              <div style="background:#FAF3E0;padding:24px;border-radius:0 0 8px 8px;">
                <p><strong>Name:</strong> {clean(data.get('name',''))}</p>
                <p><strong>Phone:</strong> {clean(data.get('phone',''))}</p>
                <p><strong>Date & Time:</strong> {clean(data.get('date',''))} at {clean(data.get('time',''))}</p>
                <p><strong>Guests:</strong> {clean(data.get('guests',''))}</p>
                <p><strong>Seating Preference:</strong> {clean(data.get('seat','No preference'))}</p>
                <p><strong>Special Note:</strong> {clean(data.get('note','-'))}</p>
                <hr>
                <small style="color:#8B5A2B;">Received: {datetime.now().strftime('%d %b %Y, %I:%M %p')}</small>
              </div>
            </body></html>
            """
            msg.attach(MIMEText(body, 'html'))
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(gmail_user, gmail_pass)
                server.sendmail(gmail_user, msg['To'], msg.as_string())
    except Exception as e:
        print(f"Reservation email error: {e}")

    return jsonify({
        'success': True,
        'message': f"🎉 Reservation confirmed for {data.get('date')} at {data.get('time')}! We'll call you to confirm."
    }), 200


@app.errorhandler(404)
def not_found(e):
    if request.path.startswith('/api/') or request.is_json:
        return jsonify({'error': 'Not found.'}), 404
    return send_from_directory(app.static_folder, 'index.html')


@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({'success': False, 'error': 'Too many requests. Please wait a moment.'}), 429


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    print(f'\n☕ Cozy Café starting on http://localhost:{port}')
    app.run(host='0.0.0.0', port=port, debug=debug)
```

### Step 5 — Update `script.js` to call the real endpoint

Find the `reserveForm` submit handler in your `script.js` and replace the `setTimeout` fake with a real `fetch`:

```javascript
// Replace the reserveForm submit listener (around line where reserveForm is)
reserveForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = this.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Confirming...</span>';

  const payload = {
    name:   document.getElementById('rName').value.trim(),
    phone:  document.getElementById('rPhone').value.trim(),
    date:   document.getElementById('rDate').value,
    time:   document.getElementById('rTime').value,
    guests: document.getElementById('rGuests').value,
    seat:   document.getElementById('rSeat').value,
    note:   document.getElementById('rNote').value.trim(),
  };

  try {
    const res  = await fetch('/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      btn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Reserved!</span>';
      btn.style.background = 'linear-gradient(135deg, #15803d, #166534)';
      const msg = document.getElementById('reserveSuccess');
      if (msg) { msg.textContent = data.message; msg.style.display = 'block'; }
    } else {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Confirm Reservation</span>';
      alert('Error: ' + data.error);
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Confirm Reservation</span>';
    alert('Network error. Please try again.');
  }
});
```

Similarly update the `contactForm` submit to call `/contact` with a real `fetch`:

```javascript
contactForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = this.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.innerHTML = '<span>Sending...</span> <i class="fas fa-spinner fa-spin"></i>';

  const payload = {
    name:    document.getElementById('cName').value.trim(),
    email:   document.getElementById('cEmail').value.trim(),
    subject: document.getElementById('cSubject')?.value.trim() || '',
    message: document.getElementById('cMessage').value.trim(),
  };

  try {
    const res  = await fetch('/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      btn.innerHTML = '<span>Sent!</span> <i class="fas fa-check"></i>';
      const msg = document.getElementById('contactSuccess');
      if (msg) { msg.textContent = data.message; msg.style.display = 'block'; }
      this.reset();
    } else {
      btn.disabled = false;
      btn.innerHTML = '<span>Send Message</span> <i class="fas fa-paper-plane"></i>';
      alert('Error: ' + data.error);
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<span>Send Message</span> <i class="fas fa-paper-plane"></i>';
    alert('Network error. Please try again.');
  }
});
```

> **Note:** Check your HTML for the exact `id` values of your contact form inputs (like `cName`, `cEmail`, etc.) and adjust above to match.

---

## 3. RESERVATION SYSTEM — How It Works

For a café at this stage, **email-based reservation** (what the code above does) is the right choice. Here's why and what each level looks like:

| Level | What happens | Good for |
|---|---|---|
| **Email only** (now) | Submission → email to you → you call to confirm | Starting out, personal touch |
| **Database** (next step) | Submissions saved to SQLite/PostgreSQL | Seeing all bookings in one place |
| **Admin dashboard** (later) | Web UI showing bookings by date | When volume grows |
| **Full booking platform** | Calendly, OpenTable, Reserva | High volume, paid |

The code above already handles Level 1. For Level 2, you'd add:

```python
# pip install flask-sqlalchemy
from flask_sqlalchemy import SQLAlchemy

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///reservations.db')
db = SQLAlchemy(app)

class Reservation(db.Model):
    id       = db.Column(db.Integer, primary_key=True)
    name     = db.Column(db.String(100))
    phone    = db.Column(db.String(20))
    date     = db.Column(db.String(20))
    time     = db.Column(db.String(20))
    guests   = db.Column(db.String(20))
    seat     = db.Column(db.String(50))
    note     = db.Column(db.Text)
    created  = db.Column(db.DateTime, default=datetime.utcnow)

# Inside /reserve route, before return:
reservation = Reservation(**{field: data.get(field,'') for field in ['name','phone','date','time','guests','seat','note']})
db.session.add(reservation)
db.session.commit()
```

---

## 4. DEPLOYMENT ON RENDER (Flask)

Render is an excellent choice for Flask. Here's the complete process from scratch.

### Step 1 — Prepare your project structure

Your project folder should look like this before deploying:

```
cafe-parallax/
├── app.py
├── requirements.txt
├── .env              ← LOCAL ONLY, never push to Git
├── .gitignore        ← tells Git what to ignore
├── Procfile          ← tells Render how to start the app
└── static/
    ├── index.html
    ├── style.css
    ├── script.js
    └── images/
```

### Step 2 — Create `.gitignore`

Create a file called `.gitignore` in your project root with these contents:

```
# Python
__pycache__/
*.py[cod]
*.pyc
*.pyo
*.pyd

# Virtual environment — NEVER commit this
venv/
env/
.venv/
.env/

# Environment variables — NEVER commit this
.env
.env.local
.env.production

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Database files (if you add SQLite later)
*.db
*.sqlite3
```

> **Why `.gitignore`?** Git will track every file in your folder unless you tell it not to. Your `venv/` folder has thousands of files you don't want in your repo. Your `.env` file has passwords — if you push it to GitHub, anyone can see them. `.gitignore` solves both.

### Step 3 — Create `Procfile`

Create a file called `Procfile` (no extension) in your project root:

```
web: gunicorn app:app
```

This tells Render: "Start the web server by running gunicorn, pointing it at the `app` object inside `app.py`."

Add gunicorn to your `requirements.txt`:

```
Flask==3.0.0
Werkzeug==3.0.1
python-dotenv==1.0.1
Flask-Limiter==3.5.0
gunicorn==21.2.0
```

> **Why gunicorn instead of `python app.py`?** Flask's built-in server is for development only — it handles one request at a time and isn't safe for real traffic. Gunicorn is a production-grade WSGI server that can handle multiple simultaneous requests.

### Step 4 — Push to GitHub

If you haven't already set up Git:

```bash
# Inside your project folder
git init
git add .
git commit -m "Initial commit — Cozy Café website"

# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/cozy-cafe.git
git branch -M main
git push -u origin main
```

If you've already pushed before but your `venv/` is already in the repo, run:

```bash
git rm -r --cached venv/
git add .gitignore
git commit -m "Remove venv from tracking"
git push
```

### Step 5 — Deploy on Render

1. Go to **render.com** → Sign up with GitHub.
2. Click **New → Web Service**.
3. Connect your GitHub repo.
4. Fill in the settings:
   - **Name:** `cozy-cafe`
   - **Region:** Singapore (closest to India)
   - **Branch:** `main`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
5. Click **Advanced → Add Environment Variable** and add each variable from your `.env`:
   ```
   GMAIL_USER          → yourcafe@gmail.com
   GMAIL_APP_PASSWORD  → your16charpassword
   CONTACT_RECIPIENT   → yourcafe@gmail.com
   SECRET_KEY          → (generate a long random string)
   FLASK_DEBUG         → false
   ```
6. Click **Create Web Service**.

Render will build and deploy automatically. You'll get a URL like `https://cozy-cafe.onrender.com`.

> **Secret Key generation:** Open a terminal and run `python -c "import secrets; print(secrets.token_hex(32))"`. Copy the output as your SECRET_KEY.

### Step 6 — Auto-deploy on push

Every time you `git push` to `main`, Render automatically redeploys. This means your workflow becomes:
```bash
# Make changes locally, test them
git add .
git commit -m "Add live map to contact section"
git push
# Render deploys automatically in ~2 minutes
```

> **Important:** Render's free tier spins down after 15 minutes of inactivity. The first request after a sleep takes ~30 seconds. Upgrade to the $7/month plan to keep it always-on once you launch.

---

## 5. SECURITY AUDIT — Your Project

Here's an honest assessment of your current project and what to add.

### ✅ Already Secure

- **Server-side validation** in `/contact` — you validate fields and email format server-side. Good. Client-side validation can always be bypassed.
- **No SQL used anywhere** — you have no database, so SQL injection is not currently a risk. When you add SQLite/PostgreSQL later, use SQLAlchemy's ORM (which auto-escapes) rather than raw SQL strings.
- **No user authentication** — nothing to steal.
- **Static file serving** via `send_from_directory` — Flask handles path traversal protection.

### ⚠️ Needs to be Fixed

**1. Debug mode in production** — Your current `app.py` has `debug=True` hardcoded. This is the most dangerous mistake: if any error occurs on your live site, Flask shows a full interactive debugger in the browser, exposing your source code and environment. The updated `app.py` above fixes this with:
```python
debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
```
On Render, `FLASK_DEBUG` is `false`, so debug is off in production.

**2. Rate limiting on forms** — Without rate limiting, someone can submit your contact form 10,000 times per minute, flooding your inbox and potentially hitting Gmail's sending limits. The updated `app.py` adds `Flask-Limiter` with `@limiter.limit("5 per minute")`.

**3. No input length limits** — Someone could submit a 10MB message string. The updated code adds `len(data.get('message', '')) > 2000` checks.

**4. HTML injection in emails** — If you put raw user input into email HTML, a user could inject HTML that confuses the email. The `clean()` function using `html.escape()` in the updated code handles this.

**5. CSRF protection** — For a site with no user accounts or sensitive state-changing actions, CSRF is low priority. If you add a user login system later, add Flask-WTF's CSRF tokens.

### 🔒 Production Checklist (before launch)

```
[ ] debug=False in production (env var approach)
[ ] Rate limiting on /contact and /reserve
[ ] .env excluded from Git (.gitignore)
[ ] SECRET_KEY is a long random string, not 'dev-fallback'
[ ] All environment variables set in Render dashboard (not in code)
[ ] gunicorn used instead of Flask dev server
[ ] HTTPS enabled (Render does this automatically — your .onrender.com URL is HTTPS)
```

### SQL Injection — Deeper Explanation

SQL injection works like this: if you ever wrote code like:
```python
# DANGEROUS — never do this
query = f"SELECT * FROM users WHERE name = '{user_input}'"
db.execute(query)
```
A user could enter `'; DROP TABLE users; --` as their name and destroy your database.

The safe way (when you add a database) is to always use SQLAlchemy's ORM:
```python
# SAFE — SQLAlchemy escapes inputs automatically
user = User.query.filter_by(name=user_input).first()
```
Or parameterized queries:
```python
# SAFE — database driver handles escaping
db.execute("SELECT * FROM users WHERE name = ?", (user_input,))
```

Since your current project has no database, SQL injection doesn't apply yet. When you add one, use the ORM pattern and you're protected automatically.

---

## Quick Reference — What to Do Next (in order)

1. **Add map** → Get Google Maps embed iframe → paste into `index.html` contact section
2. **Set up Gmail App Password** → Google Account → Security → App Passwords
3. **Create `.env`** with Gmail credentials
4. **Replace `app.py`** with the production version above
5. **Update `script.js`** form handlers to use real `fetch` calls
6. **Install new deps:** `pip install python-dotenv flask-limiter gunicorn`
7. **Update `requirements.txt`** with new deps
8. **Create `.gitignore`** and `Procfile`
9. **Test locally** — run `python app.py`, submit a contact form, check your Gmail
10. **Push to GitHub**
11. **Deploy on Render** — add env vars in Render dashboard
12. **Test live site** — submit both forms, check emails

---

*Guide prepared for Cozy Café — May 2026*
