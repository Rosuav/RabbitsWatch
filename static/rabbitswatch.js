import choc, {set_content} from "https://rosuav.github.io/shed/chocfactory.js";
import "https://cdn.jsdelivr.net/npm/comfy.js/dist/comfy.min.js"; const ComfyJS = window.ComfyJS;
const {TEXTAREA} = choc;

let active = false; //True if we (appear to) have a connection, false on critical error
ComfyJS.onChatMode = () => active = true;

console.log(streamer);

async function update_viewer(data) {
	console.log("Updating viewer:", data);
	const result = await (await fetch("/update", {
		credentials: "include",
		headers: {"Content-Type": "application/json"},
		method: "POST",
		body: JSON.stringify(data),
	})).json();
	console.log("Response:", result);
}
ComfyJS.onChat = ( user, message, flags, self, extra ) => {
	//If we haven't seen the person, add them to the list (and highlight)
};

ComfyJS.onCommand = ( user, command, message, flags, extra ) => {
	console.log("Command:", command, extra);
	if (command === "tz") {
		//Record the timezone specified by the user
		update_viewer({
			uid: extra.userId,
			displayname: extra.displayName,
			tz: message,
		});
	}
}

ComfyJS.Init(streamer.login);
