import choc, {set_content, DOM, on} from "https://rosuav.github.io/shed/chocfactory.js";
import "https://cdn.jsdelivr.net/npm/comfy.js/dist/comfy.min.js"; const ComfyJS = window.ComfyJS;
const {B, BR, BUTTON, LI, SPAN, TEXTAREA} = choc;

let active = false; //True if we (appear to) have a connection, false on critical error
ComfyJS.onChatMode = () => active = true;

console.log(streamer);

async function fetch_json(url, data) {
	const opt = {credentials: "include"};
	if (data) {
		opt.method = "POST";
		opt.body = JSON.stringify(data);
		opt.headers = {"Content-Type": "application/json"};
	}
	return await (await fetch(url, opt)).json();
}

function update_time(span) {
	const tz = span.dataset.tz, utcoffset = +span.dataset.utcoffset;
	if (!tz) return set_content(span, "timezone unknown");
	//This is hacky but it kinda works. We have a UTC offset that comes
	//from the server's calculation of how many seconds different this
	//time zone is from UTC (say, 10800 for UTC+3), so we ask "what time
	//will it be in UTC this many seconds from now?".
	const there = new Date(+new Date + utcoffset * 1000);
	let tm = ((there.getUTCHours() % 12) || 12) + ":"
		+ ("0" + there.getUTCMinutes()).slice(-2)
		+ (there.getUTCHours() > 12 ? " PM" : " AM");
	if (there.getUTCDay() != new Date().getDay()) {
		//It's a different day there and here. Show the day of week.
		tm = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][there.getUTCDay()] + " " + tm;
	}
	return set_content(span, tz + " - " + tm);
}

function save_notes() {
	const li = this.closest("li"); if (!li) return;
	console.log("Updating notes for", li.querySelector("b").innerText);
	fetch_json("/update", {uid: li.dataset.id, notes: li.querySelector("textarea").value});
}

const viewernames = {};
async function ensure_viewer(uid, displayname, tz) {
	if (!tz && viewernames[uid] === displayname) return;
	viewernames[uid] = displayname;
	//We haven't seen the person (or name has changed). Add them to
	//the list (and highlight), or adjust.
	console.log("Updating", uid, "to have dispname", displayname);
	if (tz) console.log("Also setting tz to", tz);
	const upd = {uid, displayname};
	if (tz) upd.tz = tz;
	const user = await fetch_json("/update", upd);
	const li = DOM(`li[data-id="${uid}"]`);
	if (!li) {
		//Insert into beginning of UL
		DOM("main > ul").prepend(LI({"data-id": uid}, [
			B(user.displayname), " (",
				update_time(SPAN({"data-tz": user.tz, "data-utcoffset": user.utcoffset})),
			")", BR(),
			TEXTAREA({rows: 4, cols: 80}, user.notes), BR(),
			BUTTON({onclick: save_notes}, "Save"),
		]));

	} else {
		//Update
		const tm = li.querySelector("span");
		tm.dataset.tz = user.tz; tm.dataset.utcoffset = user.utcoffset;
		set_content(li.querySelector("b"), user.displayname);
		update_time(tm);
	}
}

ComfyJS.onChat = ( user, message, flags, self, extra ) => {
	console.log("Chat:", message, extra);
	ensure_viewer(extra.userId, extra.displayName);
};

ComfyJS.onCommand = ( user, command, message, flags, extra ) => {
	console.log("Command:", command, extra);
	if (command === "tz") {
		//Record the timezone specified by the user
		ensure_viewer(extra.userId, extra.displayName, message);
		return;
	}
	ensure_viewer(extra.userId, extra.displayName);
}

ComfyJS.Init(streamer.login);
