Rabbit's Watch
==============

Keep track of notes about your viewers.

* Log in with Twitch (OAuth2)
* For each viewer:
  - Allow streamer to record arbitrary notes (textarea, no semantics)
  - Allow recording of timezone
  - Ping a back-end API to find out the current UTC offset of that tz
    - Yes, I know this will be wrong around DST transitions. Not worth the
      hassle. JS doesn't have any facilities for tzdata and it'd be huge.
  - Show the viewers on screen when they first chat. Highlight new arrivals
    and highlight people we've never seen before.

Requirements:

* PostgreSQL database for general data retention
* pytz unless we're going to try to go with the stdlib
* ComfyJS front end Twitch connection for simplicity
* Choc Factory UI
* Python+Flask API for data management and for tz lookups
