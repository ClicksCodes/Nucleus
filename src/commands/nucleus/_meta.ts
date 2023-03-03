import { command } from "../../utils/commandRegistration/slashCommandBuilder.js";

const name = "nucleus";
const description = "Commands relating to Nucleus itself";

const subcommand = await command(name, description, `nucleus`, undefined, undefined, undefined, undefined, true);

export { name, description, subcommand as command };
