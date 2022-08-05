import { Agenda } from "@hokify/agenda";
import client from "./client.js";
import * as fs from "fs";
import * as path from "path";
import config from "../config/main.json" assert {type: "json"};

class EventScheduler {
    private agenda: Agenda;

    constructor() {
        this.agenda = new Agenda({db: {address: config.mongoUrl + "Nucleus", collection: "eventScheduler"}});

        this.agenda.define("unmuteRole", async (job) => {
            const guild = await client.guilds.fetch(job.attrs.data.guild);
            const user = await guild.members.fetch(job.attrs.data.user);
            const role = await guild.roles.fetch(job.attrs.data.role);
            await user.roles.remove(role);
            await job.remove();
        });
        this.agenda.define("deleteFile", async (job) => {
            fs.rm(path.resolve("dist/utils/temp", job.attrs.data.fileName), client._error);
            await job.remove();
        });
        this.agenda.define("naturalUnmute", async (job) => {
            const { log, NucleusColors, entry, renderUser, renderDelta } = client.logger;
            const guild = await client.guilds.fetch(job.attrs.data.guild);
            const user = await guild.members.fetch(job.attrs.data.user);
            if (user.communicationDisabledUntil === null) return;
            try { await client.database.history.create(
                "unmute", user.guild.id, user.user, null, null, null, null
            );} catch (e) { client._error(e); }
            const data = {
                meta: {
                    type: "memberUnmute",
                    displayName: "Unmuted",
                    calculateType: "guildMemberPunish",
                    color: NucleusColors.green,
                    emoji: "PUNISH.MUTE.GREEN",
                    timestamp: new Date().getTime()
                },
                list: {
                    memberId: entry(user.user.id, `\`${user.user.id}\``),
                    name: entry(user.user.id, renderUser(user.user)),
                    unmuted: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                    unmutedBy: entry(null, "*Time out ended*")
                },
                hidden: {
                    guild: guild.id
                }
            };
            log(data);
        });
    }

    async start() {
        await new Promise(resolve => this.agenda.once("ready", resolve));
        this.agenda.start();
        return this;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async schedule(name: string, time: string, data: any) {
        await this.agenda.schedule(time, name, data);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cancel(name: string, data: any) {
        this.agenda.cancel({name, data});
    }
}

export default EventScheduler;