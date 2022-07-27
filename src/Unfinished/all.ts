import { LoadingEmbed } from './../utils/defaultEmbeds.js';
import Discord, { CommandInteraction, GuildMember, MessageActionRow, MessageButton, MessageSelectMenu } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import getEmojiByName from "../utils/getEmojiByName.js";
import addPlural from "../utils/plurals.js";
import client from "../utils/client.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder // TODO: DON'T RELEASE THIS
    .setName("all")
    .setDescription("Gives or removes a role from everyone")

class Filter {
    name: string;
    data: object;
    checkFunction: (member) => boolean;
    inverted: boolean = false;
    constructor(name: (data) => string | string, data: object, check: (member) => boolean) {
        if (typeof name === "function") { this.name = name(data);
        } else { this.name = name; }
        this.data = data;
        this.checkFunction = check;
    }
    flip() { this.inverted = true; return this; }
    check(member) {
        if (this.inverted) return !this.checkFunction(member)
        else return this.checkFunction(member)
    }
}

const filterList = {
    member: {
        render: "Member",
        has: {
            render: "has",
            role: (role) => ( new Filter((data) => `Member has role <@&${data.role}>`, {role: role, type: Discord.Role, render: "role"}, (member) => { return member.roles.cache.has(role)}))
        },
        joined: {
            render: "joined",
            before: (date) => ( new Filter((data) => `Joined server before <t:${Math.round(date.getTime() / 1000)}:D>`, {date: date, type: Date, render: "before"}, (member) => {
                return member.joinedTimestamp < date.getTime()
            }))
        },
        nickname: {
            render: "Nickname",
            set: () => ( new Filter((data) => `Member has a nickname set"`, {render: "set"}, (member) => { return member.nickname !== null})),
            includes: (name) => ( new Filter((data) => `Nickname includes "${name}"`, {nickname: name, type: String, render: "includes"}, (member) => {
                return member.displayName.includes(name)})),
            startsWith: (name) => ( new Filter((data) => `Nickname starts with "${name}"`, {nickname: name, type: String, render: "starts with"}, (member) => {
                return member.displayName.startsWith(name)})),
            endsWith: (name) => ( new Filter((data) => `Nickname ends with "${name}"`, {nickname: name, type: String, render: "ends with"}, (member) => {
                return member.displayName.endsWith(name)}))
        }
    },
    account: {
        render: "Account",
        created: {
            render: "created",
            before: (date) => ( new Filter((data) => `Account created before <t:${Math.round(date.getTime() / 1000)}:D>`, {date: date, type: Date, render: "before"}, (member) => {
                return member.user.createdTimestamp < date.getTime()
            }))
        },
        is: {
            render: "is",
            human: () => ( new Filter((data) => `Member is a human`, {human: true, render: "human"}, (member) => { return !member.bot })),
        },
        username: {
            render: "Username",
            includes: (name) => ( new Filter((data) => `Nickname includes "${name}"`, {nickname: name, type: String, render: "includes"}, (member) => {
                return member.user.name.includes(name)})),
            startsWith: (name) => ( new Filter((data) => `Nickname starts with "${name}"`, {nickname: name, type: String, render: "starts with"}, (member) => {
                return member.user.name.startsWith(name)})),
            endsWith: (name) => ( new Filter((data) => `Nickname ends with "${name}"`, {nickname: name, type: String, render: "ends with"}, (member) => {
                return member.user.name.endsWith(name)}))
        }
    }
}

const callback = async (interaction: CommandInteraction) => {
    await interaction.reply({embeds: LoadingEmbed, ephemeral: true, fetchReply: true})
    let filters: Filter[] = [
        filterList.member.has.role("959901346000154674"),
        filterList.member.nickname.startsWith("Pinea"),
        filterList.member.joined.before(new Date(2022, 1)).flip()
    ]
    let all = true;
    while (true) {
        let count = 0;
        let affected = []
        let members = interaction.guild.members.cache
        if (all) {
            members.forEach(member => {
                let applies = true;
                filters.forEach(filter => { if (!filter.check(member)) { applies = false } })
                if (applies) { affected.push(member) }
            })
        } else {
            members.forEach(member => {
                let applies = false;
                filters.forEach(filter => { if (filter.check(member)) { applies = true } })
                if (applies) { affected.push(member) }
            })
        }
        await interaction.editReply({embeds: [new EmojiEmbed()
            .setTitle("Role all")
            .setDescription((all ? "All of the following must be true:" : "Any of the following must be true") + "\n" +
                filters.map((f) => {
                    count ++;
                    return (count === 1 ? getEmojiByName("ICONS.FILTER") : (all ? "**and** " : "**or** ")) +
                        (f.inverted ? "**not** " : "") + `${f.name}`
                }).join("\n") + "\n\n" + `This will affect ${addPlural(affected.length, "member")}`)
            .setEmoji("GUILD.ROLES.CREATE")
            .setStatus("Success")
        ], components: [
            new MessageActionRow().addComponents([new MessageSelectMenu().setOptions(filters.map((f, index) => ({
                label: (f.inverted ? "(Not) " : "") + f.name,
                value: index.toString()
            }))).setMinValues(1).setMaxValues(filters.length).setCustomId("select").setPlaceholder("Remove a filter")]),
            new MessageActionRow().addComponents([
                new MessageButton()
                    .setLabel("Apply")
                    .setStyle("PRIMARY")
                    .setCustomId("apply")
                    .setEmoji(client.emojis.cache.get(getEmojiByName("CONTROL.TICK", "id")))
                    .setDisabled(affected.length === 0),
                new MessageButton()
                    .setLabel("Add filter")
                    .setStyle("PRIMARY")
                    .setCustomId("add")
                    .setEmoji(client.emojis.cache.get(getEmojiByName("ICONS.FILTER", "id")))
                    .setDisabled(filters.length >= 25)
            ])
        ]})
        break
    }
}

const check = async (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    let member = (interaction.member as GuildMember)
    let me = (interaction.guild.me as GuildMember)
    if (!me.permissions.has("MANAGE_ROLES")) throw "I do not have the *Manage Roles* permission";
    // Allow the owner to role anyone
    if (member.id === interaction.guild.ownerId) return true
    // Check if the user has manage_roles permission
    if (! member.permissions.has("MANAGE_ROLES")) throw "You do not have the *Manage Roles* permission";
    // Allow role
    return true;
}

export { command };
export { callback };
export { check };