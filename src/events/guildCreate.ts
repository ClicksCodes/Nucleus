import { MessageActionRow, MessageButton } from "discord.js";
import generateEmojiEmbed from "../utils/generateEmojiEmbed.js";
import getEmojiByName from "../utils/getEmojiByName";

export const event = 'guildCreate';

export const callback = async (client, guild) => {
    let pages = [
        new generateEmojiEmbed()
            .setTitle("Welcome to Nucleus")
            .setDescription(
                "Thanks for adding Nucleus to your server\n\n" +
                "On the next few pages you can find instructions on getting started, and commands you may want to set up\n\n" +
                "If you need support, have questions or want features, you can let us know in [Clicks](https://discord.gg/bPaNnxe)"
            )
            .setEmoji("NUCLEUS.LOGO")
            .setStatus("Danger"),
        new generateEmojiEmbed()
    ]
    let m = await guild.systemChannel.send({embeds: [
        new generateEmojiEmbed()
            .setTitle("Welcome")
            .setDescription(`One moment...`)
            .setStatus("Danger")
            .setEmoji("NUCLEUS.LOADING")
    ], fetchReply: true });
    let page = 0;

    let f = async () => {

    }

    while (true) {
        // edit interaction with pages[page]
        await m.edit({
            embeds: [pages[page].setFooter({text: `Page ${page + 1}/${pages.length}`})],
            components: [new MessageActionRow().addComponents([
                new MessageButton().setCustomId("left").setEmoji(getEmojiByName("CONTROL.LEFT", "id")).setDisabled(page === 0),
                new MessageButton().setCustomId("right").setEmoji(getEmojiByName("CONTROL.RIGHT", "id")).setDisabled(page === pages.length - 1)
            ])],
            fetchReply: true
        });
        // wait for interaction
        let interaction = await m.awaitMessageComponent({filter:f, componentType: "BUTTON", time: 60000});
        // change page variable accordingly
        if (interaction.component.customId == "left") {
            if (page > 0) page--;
        } else if (interaction.component.customId == "right") {
            if (page < pages.length - 1) page++;
        } else {
            await m.delete()
            break;
        }
        // break if required
    }
}