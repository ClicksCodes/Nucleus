import { command } from "../../utils/commandRegistration/slashCommandBuilder.js";

const name = "ticket";
const description = "Manage modmail tickets";

const subcommand = await command(name, description, `ticket`);

export { name, description, subcommand as command };
