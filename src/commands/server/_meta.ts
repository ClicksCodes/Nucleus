import { command } from "../../utils/commandRegistration/slashCommandBuilder.js";

const name = "server";
const description = "Commands for the server";

const subcommand = await command(name, description, `server`);

export { name, description, subcommand as command };
