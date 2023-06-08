import { command } from "../../utils/commandRegistration/slashCommandBuilder.js";

const name = "nucleus";
const description = "Commands relating to Nucleus itself";

const subcommand: Awaited<ReturnType<typeof command>> = await command(
    name,
    description,
    `nucleus`,
    undefined,
    undefined,
    undefined,
    undefined,
    true
);

export { name, description, subcommand as command };
