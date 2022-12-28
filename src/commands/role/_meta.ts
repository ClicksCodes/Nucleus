import { command } from "../../utils/commandRegistration/slashCommandBuilder.js";

const name = "role";
const description = "Change roles for users";

const subcommand = await command(name, description, `role`);

export { name, description, subcommand as command };
