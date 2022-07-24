import { Agenda } from "agenda/es.js";
import client from './client.js';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config/main.json' assert {type: 'json'};

class EventScheduler {
    private agenda: Agenda;

    constructor() {
        this.agenda = new Agenda({db: {address: config.mongoUrl + "Nucleus", collection: 'eventScheduler'}})

        this.agenda.define("unmuteRole", async (job: Agenda.job) => {
            let guild = await client.guilds.fetch(job.attrs.data.guild);
            let user = await guild.members.fetch(job.attrs.data.user);
            let role = await guild.roles.fetch(job.attrs.data.role);
            await user.roles.remove(role);
            await job.remove();
        })
        this.agenda.define("deleteFile", async (job: Agenda.job) => {
            fs.rm(path.resolve("dist/utils/temp", job.attrs.data.fileName), (err) => {})
            await job.remove();
        })
        this.agenda.define("naturalUnmute", async (job: Agenda.job) => {
            const { log, NucleusColors, entry, renderUser, renderDelta } = client.logger
            let guild = await client.guilds.fetch(job.attrs.data.guild);
            let user = await guild.members.fetch(job.attrs.data.user);
            if (user.communicationDisabledUntil === null) return
            try { await client.database.history.create(
                "unmute", user.guild.id, user.user, null, null, null, null
            )} catch {}
            let data = {
                meta: {
                    type: 'memberUnmute',
                    displayName: 'Unmuted',
                    calculateType: 'guildMemberPunish',
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
            }
            log(data);
        })
    }

    async start() {
        await new Promise(resolve => this.agenda.once('ready', resolve));
        this.agenda.start()
        return this
    }

    async schedule(name: string, time: string, data: any) {
        await this.agenda.schedule(time, name, data)
    }

    cancel(name: string, data: Object) {
        this.agenda.cancel({name, data})
    }
}

export default EventScheduler;