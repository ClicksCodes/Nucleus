import { command } from "../../utils/commandRegistration/slashCommandBuilder.js";

const name = "settings";
const description = "Change bot settings";


const subcommand = await command(name, description, "settings")

export { name, description, subcommand as command};
