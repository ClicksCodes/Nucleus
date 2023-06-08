import { command } from "../../utils/commandRegistration/slashCommandBuilder.js";

const name = "user";
const description = "Commands for user info";

const subcommand: Awaited<ReturnType<typeof command>> = await command(name, description, `user`);

export { name, description, subcommand as command };
