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
	const tz = span.dataset.tz, utcoffset = span.dataset.utcoffset;
	if (!tz) return set_content(span, "timezone unknown");
	//TODO: Actually do the conversions, heh
	return set_content(span, tz);
}

function save_notes() {
	const li = this.closest("li"); if (!li) return;
	console.log("Updating notes for", li.querySelector("b").innerText);
	fetch_json("/update", {uid: li.dataset.id, notes: li.querySelector("textarea").value});
}

const viewernames = {};
async function ensure_viewer(uid, displayname) {
	if (viewernames[uid] === displayname) return;
	//We haven't seen the person (or name has changed). Add them to
	//the list (and highlight), or adjust.
	console.log("Updating", uid, "to have dispname", displayname);
	const user = await fetch_json("/update", {uid, displayname});
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
		set_content(li.querySelector("b"), user.displayname);
		update_time(li.querySelector("span"));
	}
}

ComfyJS.onChat = ( user, message, flags, self, extra ) => {
	console.log("Chat:", message, extra);
	ensure_viewer(extra.userId, extra.displayName);
};

ComfyJS.onCommand = ( user, command, message, flags, extra ) => {
	console.log("Command:", command, extra);
	ensure_viewer(extra.userId, extra.displayName);
	if (command === "tz") {
		//Record the timezone specified by the user
		fetch_json("/update", {
			uid: extra.userId,
			displayname: extra.displayName,
			tz: message,
		});
	}
}

ComfyJS.Init(streamer.login);
