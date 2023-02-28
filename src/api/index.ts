import type { Guild, GuildMember } from 'discord.js';
import type { NucleusClient } from '../utils/client.js';
//@ts-expect-error
import express from "express";
//@ts-expect-error
import bodyParser from "body-parser";
import EmojiEmbed from "../utils/generateEmojiEmbed.js";
//@ts-expect-error
import structuredClone from "@ungap/structured-clone";

const jsonParser = bodyParser.json();
const app = express();
const port = 10000;

const runServer = (client: NucleusClient) => {
    app.get("/", (_req: express.Request, res: express.Response) => {
        res.status(200).send(client.ws.ping);
    });

    app.post("/verify/:code", jsonParser, async function (req: express.Request, res: express.Response) {
        const code = req.params.code;
        const secret = req.body.secret;
        if (secret === client.config.verifySecret) {
            const guild = await client.guilds.fetch(client.verify[code]!.gID) as Guild | null;
            if (!guild) {
                return res.status(404);
            }
            const member = await guild.members.fetch(client.verify[code]!.uID) as GuildMember | null;
            if (!member) {
                return res.status(404);
            }
            if (member.roles.cache.has(client.verify[code]!.rID)) {
                return res.status(200);
            }
            await member.roles.add(client.verify[code]!.rID);

            const interaction = client.verify[code]!.interaction;
            interaction.editReply({
                embeds: [
                    new EmojiEmbed()
                        .setTitle("Verify")
                        .setDescription("Verification complete! You can now dismiss this message")
                        .setStatus("Success")
                        .setEmoji("MEMBER.JOIN")
                ],
                components: []
            });
            client.verify = Object.keys(client.verify)
                .filter((k) => k !== code)
                .reduce((obj, key) => {return { ...obj, [key]: client.verify[key]}}, {});
            const { log, NucleusColors, entry, renderUser, renderDelta } = client.logger;
            try {
                const data = {
                    meta: {
                        type: "memberVerify",
                        displayName: "Member Verified",
                        calculateType: "guildMemberVerify",
                        color: NucleusColors.green,
                        emoji: "CONTROL.BLOCKTICK",
                        timestamp: Date.now()
                    },
                    list: {
                        member: entry(member.id, renderUser(member.user)),
                        verified: entry(member.joinedTimestamp, renderDelta(member.joinedTimestamp!))
                    },
                    hidden: {
                        guild: guild.id
                    }
                };
                log(data);
            } catch {
                res.sendStatus(500);
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(403);
        }
    });

    app.get("/verify/:code", jsonParser, function (req: express.Request, res: express.Response) {
        const code = req.params.code;
        if (client.verify[code]) {
            try {
                const interaction = client.verify[code]!.interaction;
                interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setTitle("Verify")
                            .setDescription(
                                "Verify was opened in another tab or window, please complete the check there to continue"
                            )
                            .setStatus("Success")
                            .setEmoji("MEMBER.JOIN")
                    ]
                });
            } catch {
                return res.sendStatus(410);
            }
            const data = structuredClone(client.verify[code]);
            delete data.interaction;
            return res.status(200).send(data);
        }
        return res.sendStatus(404);
    });

    app.post("/rolemenu/:code", jsonParser, async function (req: express.Request, res: express.Response) {
        const code = req.params.code;
        const secret = req.body.secret;
        if (secret === client.config.verifySecret) {
            const guild = await client.guilds.fetch(client.roleMenu[code]!.guild) as Guild | null;
            if (!guild) {
                return res.status(404);
            }
            const member = await guild.members.fetch(client.roleMenu[code]!.user) as GuildMember | null;
            if (!member) {
                return res.status(404);
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(403);
        }
    });

    app.get("/rolemenu/:code", jsonParser, function (req: express.Request, res: express.Response) {
        const code = req.params.code;
        if (client.roleMenu[code] !== undefined) {
            try {
                const interaction = client.roleMenu[code]!.interaction;
                interaction.editReply({
                    embeds: [
                        new EmojiEmbed()
                            .setTitle("Roles")
                            .setDescription(
                                "The role menu was opened in another tab or window, please select your roles there to continue"
                            )
                            .setStatus("Success")
                            .setEmoji("GUILD.GREEN")
                    ],
                    components: []
                });
            } catch {
                return res.sendStatus(410);
            }
            const data = structuredClone(client.roleMenu[code]);
            delete data.interaction;
            console.log(data);
            return res.status(200).send(data);
        }
        return res.sendStatus(404);
    });

    app.get("/transcript/:code/human", jsonParser, async function (req: express.Request, res: express.Response) {
        const code = req.params.code;
        if (code === undefined) return res.status(400).send("No code provided");
        const entry = await client.database.transcripts.read(code);
        if (entry === null) return res.status(404).send("Could not find a transcript by that code");
        // Convert to a human readable format
        const data = client.database.transcripts.toHumanReadable(entry);
        return res.status(200).send(data);
    });

    app.get("/transcript/:code", jsonParser, async function (req: express.Request, res: express.Response) {
        const code = req.params.code;
        if (code === undefined) return res.status(400).send("No code provided");
        const entry = await client.database.transcripts.read(code);
        if (entry === null) return res.status(404).send("Could not find a transcript by that code");
        // Convert to a human readable format
        return res.status(200).send(entry);
    });

    app.listen(port);
};

export default runServer;
