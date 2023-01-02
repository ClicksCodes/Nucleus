import { LoadingEmbed } from "./../../utils/defaultEmbeds.js";
import Discord, {
    CommandInteraction,
    GuildMember,
    Message,
    ActionRowBuilder,
    Component,
    ButtonBuilder,
    MessageComponentInteraction,
    ButtonStyle
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
    embed: Discord.EmbedBuilder;
    title: string;
    description = "";
    pageId = 0;
    setEmbed(embed: Discord.EmbedBuilder) {
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
    if (!interaction.guild) return;
    const { renderUser, renderDelta } = client.logger;
    const member = (interaction.options.getMember("user") ?? interaction.member) as Discord.GuildMember;
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
    member.user.flags.toArray().map((flag) => {
        flags.push(flag.toString());
    });
    if (member.user.bot) {
        flags.push("BOT");
    }
    // Check if they are boosting the server
    if (member.premiumSince) {
        flags.push("BOOSTER");
    }
    const nameReplacements = {
        NUCLEUSDEVELOPER: "**Nucleus Developer**",
        CLICKSDEVELOPER: "Clicks Developer",
        HOUSE_BRAVERY: "Hypesquad Bravery",
        HOUSE_BRILLIANCE: "Hypesquad Brilliance",
        HOUSE_BALANCE: "Hypesquad Balance",
        HYPESQUAD_EVENTS: "Hypesquad Events",
        EARLY_SUPPORTER: "Early Supporter",
        BUGHUNTER_LEVEL_1: "Bug Hunter Level 1",
        BUGHUNTER_LEVEL_2: "Bug Hunter Level 2",
        PARTNERED_SERVER_OWNER: "Partnered Server Owner",
        DISCORD_EMPLOYEE: "Discord Staff",
        EARLY_VERIFIED_BOT_DEVELOPER: "Verified Bot Developer",
        BOT: "Bot",
        BOOSTER: "Server Booster"
    };
    const members = await interaction.guild.members.fetch();
    const membersArray = [...members.values()];
    membersArray.sort((a, b) => {
        if (a.joinedTimestamp === null) return 1;
        if (b.joinedTimestamp === null) return -1;
        return a.joinedTimestamp - b.joinedTimestamp;
    });
    const joinPos = membersArray.findIndex((m) => m.id === member.user.id);

    const roles = member.roles.cache.filter((r) => r.id !== interaction.guild!.id).sort();
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
    const permsArray = {
        ADMINISTRATOR: "Administrator",
        MANAGE_GUILD: "Manage Server",
        MANAGE_ROLES: "Manage Roles",
        MANAGE_CHANNELS: "Manage Channels",
        KICK_MEMBERS: "Kick Members",
        BAN_MEMBERS: "Ban Members",
        MODERATE_MEMBERS: "Moderate Members",
        MANAGE_NICKNAMES: "Manage Nicknames",
        MANAGE_WEBHOOKS: "Manage Webhooks",
        MANAGE_MESSAGES: "Manage Messages",
        VIEW_AUDIT_LOG: "View Audit Log",
        MENTION_EVERYONE: "Mention Everyone"
    };
    Object.keys(permsArray).map((perm) => {
        const hasPerm = member.permissions.has(perm as Discord.PermissionString);
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
                        flags
                            .map((flag) => {
                                if (nameReplacements[flag]) {
                                    return getEmojiByName(`BADGES.${flag}`) + " " + nameReplacements[flag];
                                }
                            })
                            .join("\n") +
                            "\n\n" +
                            generateKeyValueList({
                                member: renderUser(member.user),
                                nickname: member.nickname ?? "*None set*",
                                id: `\`${member.id}\``,
                                "joined the server": renderDelta(member.joinedTimestamp),
                                "joined discord": renderDelta(member.user.createdTimestamp),
                                "boost status": member.premiumSince
                                    ? `Started boosting ${renderDelta(member.premiumSinceTimestamp)}`
                                    : "*Not boosting*",
                                "join position": `${joinPos + 1}`
                            })
                    )
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setImage((await member.user.fetch()).bannerURL({ format: "gif" }))
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
                            roles: `${member.roles.cache.size - 1}`
                        }) +
                            "\n" +
                            (s.length > 0 ? s : "*None*") +
                            "\n"
                    )
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
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
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            )
            .setTitle("Key Permissions")
            .setDescription("Key permissions the user has")
            .setPageId(2)
    ];
    const m = (await interaction.reply({
        embeds: LoadingEmbed,
        fetchReply: true,
        ephemeral: true
    })) as Message;
    let page = 0;
    let timedOut = false;
    while (!timedOut) {
        const em = new Discord.EmbedBuilder(embeds[page].embed);
        em.setDescription(em.description + "\n" + createPageIndicator(embeds.length, page));
        let selectPane = [];

        if (selectPaneOpen) {
            const options: MessageSelectOptionData[] = [];
            embeds.forEach((embed) => {
                options.push({
                    label: embed.title,
                    value: embed.pageId.toString(),
                    description: embed.description || ""
                });
            });
            selectPane = [
                new ActionRowBuilder().addComponents([
                    new Discord.SelectMenuBuilder()
                        .addOptions(options)
                        .setCustomId("page")
                        .setMaxValues(1)
                        .setPlaceholder("Choose a page...")
                ])
            ];
        }
        await interaction.editReply({
            embeds: [em],
            components: selectPane.concat([
                new ActionRowBuilder().addComponents([
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
        if ((i.component as Component).customId === "left") {
            if (page > 0) page--;
            selectPaneOpen = false;
        } else if ((i.component as Component).customId === "right") {
            if (page < embeds.length - 1) page++;
            selectPaneOpen = false;
        } else if ((i.component as Component).customId === "select") {
            selectPaneOpen = !selectPaneOpen;
        } else if ((i.component as Component).customId === "page") {
            page = parseInt((i as SelectMenuInteraction).values[0]);
            selectPaneOpen = false;
        }
    }
    const em = new Discord.EmbedBuilder(embeds[page].embed);
    em.setDescription(em.description + "\n" + createPageIndicator(embeds.length, page) + " | Message closed");
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
