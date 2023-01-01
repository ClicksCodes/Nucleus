import { command } from "../../utils/commandRegistration/slashCommandBuilder.js";

const name = "nucleus";
const description = "Commands relating to Nucleus itself";

const subcommand = await command(name, description, `nucleus`)

export { name, description, subcommand as command };
