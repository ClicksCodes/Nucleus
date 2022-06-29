import { HaikuClient } from 'jshaiku';
import express from 'express';
import bodyParser from 'body-parser';
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
import structuredClone from '@ungap/structured-clone';
import client from '../utils/client.js';


const jsonParser = bodyParser.json();
const app = express();
const port = 10000;

const runServer = (client: HaikuClient) => {
    app.get('/', (req, res) => {
        res.status(200).send(client.ws.ping);
    });

    app.post('/verify/:code', jsonParser, async function (req, res) {
        const code = req.params.code;
        const secret = req.body.secret;
        const { log, NucleusColors, entry, renderUser } = client.logger
        if (secret === client.config.verifySecret) {
            let guild = await client.guilds.fetch(client.verify[code].gID);
            if (!guild) { return res.status(404) }
            let member = await guild.members.fetch(client.verify[code].uID);
            if (!member) { return res.status(404) }
            if (member.roles.cache.has(client.verify[code].rID)) { return res.status(200) }
            await member.roles.add(client.verify[code].rID);

            let interaction = client.verify[code].interaction;
            if (interaction) {
                interaction.editReply({embeds: [new EmojiEmbed()
                    .setTitle("Verify")
                    .setDescription(`Verification complete`)
                    .setStatus("Success")
                    .setEmoji("MEMBER.JOIN")
                ], components: []});
            }
            try {
                let data = {
                    meta:{
                        type: 'memberVerify',
                        displayName: 'Member Verified',
                        calculateType: 'guildMemberVerify',
                        color: NucleusColors.green,
                        emoji: "CONTROL.BLOCKTICK",
                        timestamp: new Date().getTime()
                    },
                    list: {
                        id: entry(member.id, `\`${member.id}\``),
                        member: entry(member.id, renderUser(member))
                    },
                    hidden: {
                        guild: guild.id
                    }
                }
                log(data);
            } catch {}
            res.sendStatus(200);
        } else {
            res.sendStatus(403);
        }
    });

    app.patch('/verify/:code', (req, res) => {
        const code = req.params.code;
        try {
            let interaction = client.verify[code].interaction;
            if (interaction) {
                interaction.editReply({embeds: [new EmojiEmbed()
                    .setTitle("Verify")
                    .setDescription(`Verify was opened in another tab or window, please complete the CAPTCHA there to continue`)
                    .setStatus("Success")
                    .setEmoji("MEMBER.JOIN")
                ]});
            }
        } catch {}
        res.sendStatus(200);
    })

    app.get('/verify/:code', jsonParser, function (req, res) {
        const code = req.params.code;
        if (client.verify[code]) {
            let data = structuredClone(client.verify[code])
            delete data.interaction;
            return res.status(200).send(data);
        }
        return res.sendStatus(404);
    })

    app.listen(port);
}

export default runServer;