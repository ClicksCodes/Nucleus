import { LoadingEmbed } from "./../../utils/defaultEmbeds.js";
import Discord, {
    CommandInteraction,
    GuildMember,
    ActionRowBuilder,
    ButtonBuilder,
    MessageComponentInteraction,
    ButtonStyle,
    PermissionResolvable,
    APISelectMenuOption,
    StringSelectMenuBuilder
} from "discord.js";
import type { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import getEmojiByName from "../../utils/getEmojiByName.js";
import generateKeyValueList from "../../utils/generateKeyValueList.js";
import createPageIndicator from "../../utils/createPageIndicator.js";
import client from "../../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
        .setName("about")
        .setDescription("Shows info about a user")
        .addUserOption((option) =>
            option.setName("user").setDescription("The user to get info about | Default: Yourself")
        );

class Embed {
    embed: EmojiEmbed = new EmojiEmbed();
    title: string = "";
    description = "";
    pageId = 0;

    setEmbed(embed: EmojiEmbed) {
        this.embed = embed;
        return this;
    }
    setTitle(title: string) {
        this.title = title;
        return this;
    }
    setDescription(description: string) {
        this.description = description;
        return this;
    }
    setPageId(pageId: number) {
        this.pageId = pageId;
        return this;
    }
}

const callback = async (interaction: CommandInteraction): Promise<void> => {
    const guild = interaction.guild!;
    const member = (interaction.options.getMember("user") ?? interaction.member) as Discord.GuildMember;
    await userAbout(guild, member, interaction);
}

async function userAbout(guild: Discord.Guild, member: Discord.GuildMember, interaction: Discord.CommandInteraction | Discord.ContextMenuCommandInteraction) {
    await member.user.fetch()
    await member.fetch()
    await interaction.reply({
        embeds: LoadingEmbed,
        fetchReply: true,
        ephemeral: true
    });
    const { renderUser, renderDelta } = client.logger;
    const flags: string[] = [];
    if (
        [
            "438733159748599813", // Pinea
            "317731855317336067", // Mini
            "261900651230003201", // Coded
            "511655498676699136" // Zan
        ].includes(member.user.id)
    ) {
        flags.push("NUCLEUSDEVELOPER");
    }
    if (
        (await client.guilds.cache.get("684492926528651336")?.members.fetch())
            ?.filter((m: GuildMember) => m.roles.cache.has("760896837866749972"))
            ?.map((m: GuildMember) => m.id)
            .includes(member.user.id)
    ) {
        flags.push("CLICKSDEVELOPER");
    }
    if (member.user.flags) { member.user.flags.toArray().map((flag) => { flags.push(flag.toString()); }); }
    if (member.user.bot) { flags.push("BOT"); }
    // Check if they are boosting the server
    if (member.premiumSince) { flags.push("BOOSTER"); }
    const nameReplacements: Record<string, string> = {
        NUCLEUSDEVELOPER: "**Nucleus Developer**",
        CLICKSDEVELOPER: "Clicks Developer",
        BOT: "Bot",
        BOOSTER: "Server Booster",
        HypeSquadOnlineHouse1: "Hypesquad Bravery",
        HypeSquadOnlineHouse2: "Hypesquad Brilliance",
        HypeSquadOnlineHouse3: "Hypesquad Balance",
        Hypesquad: "Hypesquad Events",
        PremiumEarlySupporter: "Early Supporter",
        BugHunterLevel1: "Bug Hunter Level 1",
        BugHunterLevel2: "Bug Hunter Level 2",
        Partner: "Partnered Server Owner",
        Staff: "Discord Staff",
        VerifiedDeveloper: "Verified Bot Developer"
        // ActiveDeveloper
        // CertifiedModerator
        // Quarantined https://discord-api-types.dev/api/discord-api-types-v10/enum/UserFlags#Quarantined
        // Spammer https://discord-api-types.dev/api/discord-api-types-v10/enum/UserFlags#Spammer
        // VerifiedBot
    };
    const members = await guild.members.fetch();
    const membersArray = [...members.values()];
    membersArray.sort((a, b) => {
        if (a.joinedTimestamp === null) return 1;
        if (b.joinedTimestamp === null) return -1;
        return a.joinedTimestamp - b.joinedTimestamp;
    });
    const joinPos = membersArray.findIndex((m) => m.id === member.user.id);

    const roles = member.roles.cache.filter((r) => r.id !== guild.id).sort();
    let s = "";
    let count = 0;
    let ended = false;
    for (const roleId in roles) {
        const string = `<@&${roleId}>, `;
        if (s.length + string.length > 1000) {
            ended = true;
            s += `and ${roles.size - count} more`;
            break;
        }
        count++;
        s += string;
    }
    if (s.length > 0 && !ended) s = s.slice(0, -2);

    let perms = "";
    const permsArray: Record<string, string> = {
        Administrator: "Administrator",
        ManageGuild: "Manage Server",
        ManageRoles: "Manage Roles",
        ManageChannels: "Manage Channels",
        KickMembers: "Kick Members",
        BanMembers: "Ban Members",
        ModerateMembers: "Moderate Members",
        ManageNicknames: "Manage Nicknames",
        ManageWebhooks: "Manage Webhooks",
        ManageMessages: "Manage Messages",
        ViewAuditLog: "View Audit Log",
        MentionEveryone: "Mention Everyone"
    };
    Object.keys(permsArray).map((perm) => {
        const hasPerm = member.permissions.has(perm as PermissionResolvable);
        perms += `${getEmojiByName("CONTROL." + (hasPerm ? "TICK" : "CROSS"))} ${permsArray[perm]}\n`;
    });

    let selectPaneOpen = false;

    const embeds = [
        new Embed()
            .setEmbed(
                new EmojiEmbed()
                    .setTitle("User Info: General")
                    .setStatus("Success")
                    .setEmoji("MEMBER.JOIN")
                    .setDescription(
                        flags.map((flag) => {
                            if (nameReplacements[flag]) {
                                const emoji = getEmojiByName(`BADGES.${flag}`)
                                if (emoji) return (emoji + " " + nameReplacements[flag] + "\n");
                                else return nameReplacements[flag] + "\n";
                            }
                        }).join("") + "\n" +
                        generateKeyValueList({
                            member: renderUser(member.user),
                            nickname: member.nickname ?? "*None set*",
                            id: `\`${member.id}\``,
                            "joined the server": renderDelta(member.joinedTimestamp!),
                            "joined discord": renderDelta(member.user.createdTimestamp),
                            "boost status": member.premiumSince
                                ? `Started boosting ${renderDelta(member.premiumSinceTimestamp!)}`
                                : "*Not boosting*",
                            "join position": `${joinPos + 1}`
                        })
                    )
                    .setThumbnail(member.user.displayAvatarURL())
            )
            .setTitle("General")
            .setDescription("General information about the user")
            .setPageId(0),
        new Embed()
            .setEmbed(
                new EmojiEmbed()
                    .setTitle("User Info: Roles")
                    .setStatus("Success")
                    .setEmoji("GUILD.ROLES.CREATE")
                    .setDescription(
                        generateKeyValueList({
                            member: renderUser(member.user),
                            id: `\`${member.id}\``,
                            roles: `${member.roles.cache.size - 1}`  // FIXME
                        }) +
                            "\n" +
                            (s.length > 0 ? s : "*None*") +
                            "\n"
                    )
            )
            .setTitle("Roles")
            .setDescription("Roles the user has")
            .setPageId(1),
        new Embed()
            .setEmbed(
                new EmojiEmbed()
                    .setTitle("User Info: Key Permissions")
                    .setStatus("Success")
                    .setEmoji("GUILD.ROLES.CREATE")
                    .setDescription(
                        generateKeyValueList({
                            member: renderUser(member.user),
                            id: `\`${member.id}\``
                        }) +
                            "\n" +
                            perms
                    )
            )
            .setTitle("Key Permissions")
            .setDescription("Key permissions the user has")
            .setPageId(2)
    ];
    if (member.user.bannerURL() ) { embeds[0]!.embed.setImage(member.user.bannerURL()!); }
    let page = 0;
    let timedOut = false;
    for (const embed of embeds) {
        embed.embed.setDescription(embed.embed.description + "\n" + createPageIndicator(embeds.length, embed.pageId));
    }
    while (!timedOut) {
        const em = embeds[page]!.embed;

        let selectPane: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];

        if (selectPaneOpen) {
            const options: APISelectMenuOption[] = [];
            embeds.forEach((embed) => {
                options.push({
                    label: embed.title,
                    value: embed.pageId.toString(),
                    description: embed.description || ""
                });
            });
            selectPane = [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    new Discord.StringSelectMenuBuilder()
                        .addOptions(options)
                        .setCustomId("page")
                        .setMaxValues(1)
                        .setPlaceholder("Choose a page...")
                )
            ];
        }
        const m = await interaction.editReply({
            embeds: [em],
            components: selectPane.concat([
                new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new ButtonBuilder()
                        .setEmoji(getEmojiByName("CONTROL.LEFT", "id"))
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId("left")
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setEmoji(getEmojiByName("CONTROL.MENU", "id"))
                        .setStyle(selectPaneOpen ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setCustomId("select")
                        .setDisabled(false),
                    new ButtonBuilder()
                        .setEmoji(getEmojiByName("CONTROL.RIGHT", "id"))
                        .setCustomId("right")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === embeds.length - 1)
                ])
            ])
        });
        let i: MessageComponentInteraction;
        try {
            i = await m.awaitMessageComponent({ time: 300000 });
        } catch {
            timedOut = true;
            continue;
        }
        i.deferUpdate();
        if (i.customId === "left") {
            if (page > 0) page--;
            selectPaneOpen = false;
        } else if (i.customId === "right") {
            if (page < embeds.length - 1) page++;
            selectPaneOpen = false;
        } else if (i.customId === "select") {
            selectPaneOpen = !selectPaneOpen;
        } else if (i.customId === "page" && i.isStringSelectMenu()) {
            page = parseInt(i.values[0]!);
            selectPaneOpen = false;
        }
    }
    const em = embeds[page]!.embed;
    em.setDescription(em.description + " | Message closed");
    await interaction.editReply({
        embeds: [em],
        components: []
    });
};

const check = () => {
    return true;
};

export { command };
export { callback };
export { check };
export { userAbout };