import { command } from "../../utils/commandRegistration/slashCommandBuilder.js";

const name = "tags";
const description = "manage server tags";

const subcommand: Awaited<ReturnType<typeof command>> = await command(name, description, `tags`);

export { name, description, subcommand as command };
