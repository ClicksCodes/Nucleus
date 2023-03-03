import { command } from "../../utils/commandRegistration/slashCommandBuilder.js";

const name = "mod";
const description = "Perform moderator actions";

const subcommand = await command(name, description, `mod`);

export { name, description, subcommand as command };