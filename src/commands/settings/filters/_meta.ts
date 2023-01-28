import { group } from "../../../utils/commandRegistration/slashCommandBuilder.js";

const name = "filters";
const description = "Settings for filters";

const subcommand = await group(name, description, `settings/filters`)

export { name, description, subcommand as command};
