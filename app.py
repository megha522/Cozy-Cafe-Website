"""
===========================================================
  FILE: app.py
  PURPOSE: Python Flask backend for "Cozy Café" website.
           Serves static files (HTML, CSS, JS) and handles
           the /contact form POST endpoint.
  AUTHOR: Cozy Café Dev Team
  DATE CREATED: 2024-01-01
  HOW TO RUN:
    1. Install dependencies:
         pip install -r requirements.txt
    2. Start the server:
         python app.py
    3. Open browser at:
         http://localhost:5000
  FOLDER STRUCTURE EXPECTED:
    cafe-parallax/
    ├── static/
    │   ├── index.html
    │   ├── style.css
    │   ├── script.js
    │   └── images/     ← place real images here
    ├── app.py
    └── requirements.txt
===========================================================
"""

from flask import Flask, send_from_directory, jsonify, request
import os

# ── App Initialization ──
# static_folder: tells Flask where to find static assets (HTML/CSS/JS)
# static_url_path: maps the /static URL prefix to the static/ folder
app = Flask(__name__, static_folder='static', static_url_path='/static')


# ──────────────────────────────────────────────────────────
#  ROUTE: Root URL — Serves the main HTML file
#  GET /  →  Returns static/index.html
#  This is the entry point for the browser.
# ──────────────────────────────────────────────────────────
@app.route('/')
def index():
    """
    Serve the main index.html page.
    send_from_directory() safely resolves the path and sets
    the correct Content-Type: text/html header automatically.
    """
    return send_from_directory(app.static_folder, 'index.html')


# ──────────────────────────────────────────────────────────
#  ROUTE: Static File Passthrough
#  GET /static/<filename>  →  Returns any file in static/
#  Flask handles this automatically via static_folder,
#  but this explicit route is for clarity and custom headers.
# ──────────────────────────────────────────────────────────
@app.route('/static/<path:filename>')
def serve_static(filename):
    """
    Serve any file from the static/ directory.
    <path:filename> allows forward slashes, so subdirectories
    like /static/images/photo.jpg are also served correctly.

    Args:
        filename (str): Path relative to the static/ folder
    Returns:
        File response with appropriate Content-Type
    """
    return send_from_directory(app.static_folder, filename)


# ──────────────────────────────────────────────────────────
#  ROUTE: Contact Form Submission
#  POST /contact  →  Receives JSON form data, returns JSON response
#
#  In development: prints data to terminal and returns success.
#  In production:  wire up email sending (smtplib / Flask-Mail)
#                  or save to a database (Flask-SQLAlchemy).
# ──────────────────────────────────────────────────────────
@app.route('/contact', methods=['POST'])
def contact():
    """
    Handle contact form submissions from the frontend.
    Expects JSON body with: name, email, subject, message.
    Returns JSON response indicating success or validation error.

    Frontend sends:
        fetch('/contact', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name, email, subject, message })
        })
    """
    # Parse JSON body from the request
    # silent=True returns None instead of raising 400 on bad JSON
    data = request.get_json(silent=True)

    # ── Server-side Validation ──
    # Always validate on server even if client validated too.
    # Client-side validation can be bypassed by users.
    if not data:
        return jsonify({
            'success': False,
            'error': 'Invalid request — expected JSON body.'
        }), 400  # HTTP 400 Bad Request

    # Required fields check
    required = ['name', 'email', 'message']
    missing = [field for field in required if not data.get(field, '').strip()]

    if missing:
        return jsonify({
            'success': False,
            'error': f'Missing required fields: {", ".join(missing)}'
        }), 422  # HTTP 422 Unprocessable Entity

    # Basic email format check (server-side)
    import re
    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    if not re.match(email_regex, data['email'].strip()):
        return jsonify({
            'success': False,
            'error': 'Invalid email address format.'
        }), 422

    # ── Log Submission (Development) ──
    # In production: replace with database insert or email send
    print('\n--- New Contact Form Submission ---')
    print(f"  Name:    {data.get('name', '').strip()}")
    print(f"  Email:   {data.get('email', '').strip()}")
    print(f"  Subject: {data.get('subject', 'N/A').strip()}")
    print(f"  Message: {data.get('message', '').strip()[:100]}...")
    print('-----------------------------------\n')

    # ── Success Response ──
    return jsonify({
        'success': True,
        'message': 'Thank you! We\'ll be in touch shortly.'
    }), 200  # HTTP 200 OK


# ──────────────────────────────────────────────────────────
#  404 ERROR HANDLER
#  Returns a JSON 404 for API routes, HTML 404 for page routes.
# ──────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    """
    Handle 404 Not Found errors gracefully.
    API requests get JSON, page requests redirect to home.
    """
    # If the request was for an API endpoint, return JSON error
    if request.path.startswith('/api/') or request.is_json:
        return jsonify({'error': 'Resource not found.'}), 404
    # Otherwise, serve the main page (single-page app fallback)
    return send_from_directory(app.static_folder, 'index.html')


# ──────────────────────────────────────────────────────────
#  APP ENTRY POINT
#  Runs the Flask development server when executed directly.
#  debug=True enables:
#    - Auto-reload on file changes
#    - Detailed error pages in browser
#  Set debug=False and use gunicorn/uWSGI for production.
# ──────────────────────────────────────────────────────────
if __name__ == '__main__':
    # Determine port from environment variable (for deployment)
    # Falls back to 5000 for local development
    port = int(os.environ.get('PORT', 5000))

    print(f'\n☕ Cozy Café server starting...')
    print(f'   → Open browser at: http://localhost:{port}')
    print(f'   → Press CTRL+C to stop\n')

    app.run(
        host='0.0.0.0',   # Listens on all network interfaces
        port=port,
        debug=True         # Set to False in production!
    )
