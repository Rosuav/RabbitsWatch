import choc, {set_content} from "https://rosuav.github.io/shed/chocfactory.js";
import "https://cdn.jsdelivr.net/npm/comfy.js/dist/comfy.min.js"; const ComfyJS = window.ComfyJS;
const {TEXTAREA} = choc;

let active = false; //True if we (appear to) have a connection, false on critical error
ComfyJS.onChatMode = () => active = true;

let channel = localStorage.getItem("rabbitswatch_channel");

ComfyJS.onChat = ( user, message, flags, self, extra ) => {
	//If we haven't seen the person, add them to the list (and highlight)
};

ComfyJS.onCommand = ( user, command, message, flags, extra ) => {
	if (command === "tz") {
		//Record the timezone specified by the user
	}
}

if (channel) ComfyJS.init(channel);
