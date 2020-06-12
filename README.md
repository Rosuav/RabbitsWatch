Rabbit's Watch
==============

Keep track of notes about your viewers.

* For each viewer:
  - Allow streamer to record arbitrary notes (textarea, no semantics)
  - Allow recording of timezone
  - Ping a back-end API to find out the current UTC offset of that tz
    - Yes, I know this will be wrong around DST transitions. Not worth the
      hassle. JS doesn't have any facilities for tzdata and it'd be huge.
  - Show the viewers on screen when they first chat. Highlight new arrivals
    and highlight people we've never seen before.
* Recommend that viewers go to https://rabbits-watch.herokuapp.com/tz and then
  copy/paste the command. That'll get a reliable timezone descriptor.

Requirements:

* pytz unless we're going to try to go with the stdlib
* Python+Flask API for data management and for tz lookups
