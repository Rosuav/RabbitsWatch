import choc, {set_content} from "https://rosuav.github.io/shed/chocfactory.js";
import "https://cdn.jsdelivr.net/npm/comfy.js/dist/comfy.min.js"; const ComfyJS = window.ComfyJS;
const {TEXTAREA} = choc;

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
	} else {
		//Update
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
