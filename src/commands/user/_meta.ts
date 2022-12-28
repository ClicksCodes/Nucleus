import { command } from "../../utils/commandRegistration/slashCommandBuilder.js";

const name = "user";
const description = "Commands for user info";

const subcommand = await command(name, description, `user`);

export { name, description, subcommand as command };
