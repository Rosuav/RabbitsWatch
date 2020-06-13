import datetime
import os
import sys
import pytz
from pprint import pprint
from flask import Flask, request, redirect, session, url_for, g, render_template, jsonify, Response, Markup
from authlib.integrations.requests_client import OAuth2Session
import requests

try:
	import config
except ImportError:
	# Construct a config object out of the environment
	import config_sample as config
	failed = []
	# Hack: Some systems like to give us a DATABASE_URL instead of a DATABASE_URI
	if "DATABASE_URL" in os.environ: os.environ["DATABASE_URI"] = os.environ["DATABASE_URL"]
	for var in dir(config):
		if var.startswith("__"): continue # Ignore dunders
		if var in os.environ: setattr(config, var, os.environ[var])
		else: failed.append(var)
	if failed:
		print("Required config variables %s not found - see config_sample.py" % ", ".join(failed), file=sys.stderr)
		sys.exit(1)
	sys.modules["config"] = config # Make the config vars available elsewhere

import database
app = Flask(__name__)
app.secret_key = config.SESSION_SECRET or base64.b64encode(os.urandom(12))

# Override Flask's forcing of Location headers to be absolute, since it
# gets stuff flat-out wrong. Also, the spec now says that relative
# headers are fine (and even when the spec said that the Location should
# to be absolute, everyone accepted relative URIs).
if os.environ.get("OVERRIDE_REDIRECT_HTTPS"):
	from werkzeug.middleware.proxy_fix import ProxyFix
	app.wsgi_app = ProxyFix(app.wsgi_app) # Grab info from Forwarded headers
	_redirect = redirect
	def redirect(*a, **kw):
		resp = _redirect(*a, **kw)
		resp.autocorrect_location_header = False
		return resp
	_url_for = url_for
	def url_for(*a, **kw): return _url_for(*a, **kw).replace("http://", "https://")

@app.route("/")
def mainpage():
	if "twitch_token" not in session:
		return render_template("login.html")
	user = session["twitch_user"]
	return render_template("index.html",
		streamer=user,
	)

@app.route("/update", methods=["POST"])
def update():
	pprint(request.json)
	twitchid = session["twitch_user"]["id"]
	uid = request.json["uid"]
	update = {col: request.json[col]
		for col in ("displayname", "notes")
		if col in request.json}
	if "tz" in request.json:
		# Validate the timezone name before saving it
		try:
			pytz.timezone(request.json["tz"])
			update["tz"] = request.json["tz"]
		except pytz.exceptions.UnknownTimeZoneError:
			# Silently ignore any unknown timezones
			# Should we return an error and save nothing? Return a warning?
			pass
	viewer = database.update_viewer(twitchid, uid, update)
	if viewer["tz"]:
		# Add a UTC offset if there's a timezone
		now = datetime.datetime.now().astimezone(pytz.timezone(viewer["tz"]))
		viewer["utcoffset"] = int(now.utcoffset().total_seconds())
	return jsonify(viewer)

@app.route("/login")
def login():
	twitch = OAuth2Session(config.CLIENT_ID, config.CLIENT_SECRET,
		scope="")
	uri, state = twitch.create_authorization_url("https://id.twitch.tv/oauth2/authorize",
		redirect_uri=os.environ.get("OVERRIDE_REDIRECT_URI") or url_for("authorized", _external=True))
	session["login_state"] = state
	return redirect(uri)

@app.route("/login/authorized")
def authorized():
	if "error" in request.args:
		# User cancelled the auth flow - discard auth (most likely there won't be any)
		session.pop("twitch_token", None)
		return redirect(url_for("mainpage"))
	twitch = OAuth2Session(config.CLIENT_ID, config.CLIENT_SECRET,
		state=session["login_state"])
	resp = twitch.fetch_access_token("https://id.twitch.tv/oauth2/token",
		code=request.args["code"],
		# For some bizarre reason, we need to pass this information along.
		client_id=config.CLIENT_ID, client_secret=config.CLIENT_SECRET,
		redirect_uri=url_for("authorized", _external=True))
	if "access_token" not in resp:
		# Something went wrong with the retrieval. No idea what or why,
		# so I'm doing a cop-out and just dumping to console.
		print("Unable to log in")
		pprint(resp)
		print("Returning generic failure.")
		raise Exception
	r = requests.get("https://api.twitch.tv/helix/users", headers={
		"Client-ID": config.CLIENT_ID,
		"Authorization": "Bearer " + resp["access_token"],
	})
	r.raise_for_status()
	user = r.json()["data"][0]
	database.ensure_user(user["id"], user["login"], user["display_name"])
	session["twitch_user"] = user
	session["twitch_refresh_token"] = resp["refresh_token"]
	# Storing twitch_token is last. If you have this, you have everything.
	# (Kinda like the Gondoliers.)
	session["twitch_token"] = resp["access_token"]
	return redirect(url_for("mainpage"))

@app.route("/logout")
def logout():
	session.pop("twitch_token", None)
	return redirect(url_for("mainpage"))

@app.route("/whoami")
def helloworld():
	if "twitch_user" in session:
		return jsonify({"user": session["twitch_user"]["display_name"]})
	return jsonify({"user": None})

@app.route("/tz")
def tz():
	return """
<div id=tz></div>
<script>
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
document.getElementById("tz").innerHTML = "Copy and paste this into chat: !tz " + tz;
</script>
"""

if __name__ == "__main__":
	import logging
	logging.basicConfig(level=logging.INFO)
	app.run()
else:
	# Worker startup. This is the place to put any actual initialization work
	# as it won't be done on master startup.
	...
