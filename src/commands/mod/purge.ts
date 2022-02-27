import Discord, { CommandInteraction, GuildChannel, GuildMember, TextChannel } from "discord.js";
import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { WrappedCheck } from "jshaiku";
import confirmationMessage from "../../utils/confirmationMessage.js";
import EmojiEmbed from "../../utils/generateEmojiEmbed.js";
import keyValueList from "../../utils/generateKeyValueList.js";
import getEmojiByName from "../../utils/getEmojiByName.js";

const command = (builder: SlashCommandSubcommandBuilder) =>
    builder
    .setName("purge")
    .setDescription("Bulk deletes messages in a channel")
    .addIntegerOption(option => option
        .setName("amount")
        .setDescription("The amount of messages to delete")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(50))
    .addChannelOption(option => option.setName("channel").setDescription("The channel to purge messages from").setRequired(false))
    .addUserOption(option => option.setName("user").setDescription("The user to purge messages from").setRequired(false))
    .addStringOption(option => option.setName("reason").setDescription("The reason for the purge").setRequired(false))

const callback = async (interaction: CommandInteraction) => {
    let channel = (interaction.options.getChannel("channel") as GuildChannel) ?? interaction.channel
    let thischannel
    if ((interaction.options.getChannel("channel") as GuildChannel) == null) {
        thischannel = true
    } else {
        thischannel = (interaction.options.getChannel("channel") as GuildChannel).id == interaction.channel.id
    }
    if (!(["GUILD_TEXT", "GUILD_NEWS", "GUILD_NEWS_THREAD", "GUILD_PUBLIC_THREAD", "GUILD_PRIVATE_THREAD"].includes(channel.type.toString()))) {
        return await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("CHANNEL.PURGE.RED")
                    .setTitle("Purge")
                    .setDescription("You cannot purge this channel")
                    .setStatus("Danger")
            ],
            components: [],
            ephemeral: true,
        })
    }
    // TODO:[Modals] Replace this with a modal
    if ( !interaction.options.getInteger("amount") ) {
        await interaction.reply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("CHANNEL.PURGE.RED")
                    .setTitle("Purge")
                    .setDescription("Select how many messages to delete")
                    .setStatus("Danger")
            ],
            components: [],
            ephemeral: true,
            fetchReply: true
        })
        let deleted = []
        while (true) {
            let m = await interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setEmoji("CHANNEL.PURGE.RED")
                        .setTitle("Purge")
                        .setDescription("Select how many messages to delete. You can continue clicking until all messages are cleared.")
                        .setStatus("Danger")
                ],
                components: [
                    new Discord.MessageActionRow().addComponents([
                        new Discord.MessageButton()
                            .setCustomId("1")
                            .setLabel("1")
                            .setStyle("SECONDARY"),
                        new Discord.MessageButton()
                            .setCustomId("3")
                            .setLabel("3")
                            .setStyle("SECONDARY"),
                        new Discord.MessageButton()
                            .setCustomId("5")
                            .setLabel("5")
                            .setStyle("SECONDARY")
                        ]),
                        new Discord.MessageActionRow().addComponents([
                        new Discord.MessageButton()
                            .setCustomId("10")
                            .setLabel("10")
                            .setStyle("SECONDARY"),
                        new Discord.MessageButton()
                            .setCustomId("25")
                            .setLabel("25")
                            .setStyle("SECONDARY"),
                        new Discord.MessageButton()
                            .setCustomId("50")
                            .setLabel("50")
                            .setStyle("SECONDARY")
                    ]),
                    new Discord.MessageActionRow().addComponents([
                        new Discord.MessageButton()
                            .setCustomId("done")
                            .setLabel("Done")
                            .setStyle("SUCCESS")
                            .setEmoji(getEmojiByName("CONTROL.TICK", "id"))
                    ])
                ]
            })
            let component;
            try {
                component = await (m as Discord.Message).awaitMessageComponent({filter: (m) => m.user.id === interaction.user.id, time: 2.5 * 60 * 1000});
            } catch (e) { break; }
            component.deferUpdate();
            if (component.customId === "done") break;
            let amount;
            try { amount = parseInt(component.customId); } catch { break; }
            await (channel as TextChannel).bulkDelete(amount, true); // TODO: Add to deleted list | TODO: Support for users
        }
        if (deleted.length === 0) return await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("CHANNEL.PURGE.RED")
                    .setTitle("Purge")
                    .setDescription("No messages were deleted")
                    .setStatus("Danger")
            ],
            components: []
        })
        return await interaction.editReply({
            embeds: [
                new EmojiEmbed()
                    .setEmoji("CHANNEL.PURGE.GREEN")
                    .setTitle("Purge")
                    .setDescription(`Deleted ${deleted.length} messages`)
                    .setStatus("Success")
            ],
            components: []
        })
    } else {
        if (await new confirmationMessage(interaction)
            .setEmoji("CHANNEL.PURGE.RED")
            .setTitle("Purge")
            .setDescription(keyValueList({
                "channel": `<#${channel.id}> (${(channel as GuildChannel).name})` + (thischannel ? " [This channel]" : ""),
                "amount": interaction.options.getInteger("amount").toString(),
                "reason": `\n> ${interaction.options.getString("reason") ? interaction.options.getString("reason") : "*No reason provided*"}`
            }))
            .setColor("Danger")
    //        pluralize("day", interaction.options.getInteger("amount"))
    //        const pluralize = (word: string, count: number) => { return count === 1 ? word : word + "s" }
        .send()) {
            try {
                let messages = await (channel as TextChannel).bulkDelete(interaction.options.getInteger("amount"), true) // TODO: Support for users
                let out = ""
                messages.reverse().forEach(message => {
                    out += `${message.author.username}#${message.author.discriminator} (${message.author.id})\n`
                    let lines = message.content.split("\n")
                    lines.forEach(line => {out += `> ${line}\n`}) // TODO: Humanize timestamp
                    out += `\n\n`
                }) // TODO: Upload as file
                await interaction.editReply({embeds: [new EmojiEmbed()
                    .setEmoji(`CHANNEL.PURGE.GREEN`)
                    .setTitle(`Purge`)
                    .setDescription("Messages cleared")
                    .setStatus("Success")
                ], components: []})
            } catch {
                await interaction.editReply({embeds: [new EmojiEmbed()
                    .setEmoji("CHANNEL.PURGE.RED")
                    .setTitle(`Purge`)
                    .setDescription("Something went wrong and no messages were deleted")
                    .setStatus("Danger")
                ], components: []})
            }
        } else {
            await interaction.editReply({embeds: [new EmojiEmbed()
                .setEmoji("CHANNEL.PURGE.GREEN")
                .setTitle(`Purge`)
                .setDescription("No changes were made")
                .setStatus("Success")
            ], components: []})
        }
    }
}

const check = (interaction: CommandInteraction, defaultCheck: WrappedCheck) => {
    // Allow the owner to purge
    if ((interaction.member as GuildMember).id == interaction.guild.ownerId) return true
    // Check if the user has manage_messages permission
    if (! (interaction.member as GuildMember).permissions.has("MANAGE_MESSAGES")) throw "You do not have the `manage_messages` permission";
    // Check if nucleus has the manage_messages permission
    if (! interaction.guild.me.permissions.has("MANAGE_MESSAGES")) throw "I do not have the `manage_messages` permission";
    // Allow warn
    return true
}

export { command, callback, check };