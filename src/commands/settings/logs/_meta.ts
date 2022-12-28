import { group } from "../../../utils/commandRegistration/slashCommandBuilder.js";

const name = "logs";
const description = "Settings for logging";

const subcommand = await group(name, description, `settings/logs`)

export { name, description, subcommand as command};
