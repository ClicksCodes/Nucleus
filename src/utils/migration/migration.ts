import * as fs from 'fs';
import client from "../client.js";
import _ from "lodash";

const dir = './data';
const files = fs.readdirSync(dir);

for (const file of files) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rsmData: any;
    try {
        rsmData = JSON.parse(fs.readFileSync(`${dir}/${file}`, 'utf8'));
    } catch { continue }
    if (!rsmData.version || rsmData.version < 3) continue;
    const nucleusData = await client.database.guilds.read(rsmData.guild_info.id)
    const rsmToNucleus = {
        id: rsmData.guild_info.id,
        version: 1,
        singleEventNotifications: {},
        filters: {
            images: {
                NSFW: rsmData.images?.nsfw,
                size: rsmData.images?.toosmall,
            },
            malware: null,
            wordFilter: {
                enabled: true,
                words: {
                    strict: rsmData.wordfilter?.strict,
                    loose: rsmData.wordfilter?.soft,
                },
                allowed: {
                    users: rsmData.wordfilter?.ignore?.members,
                    roles: rsmData.wordfilter?.ignore?.roles,
                    channels: rsmData.wordfilter?.ignore?.channels,
                },
            },
            invite: {
                enabled: rsmData.invite?.enabled,
                allowed: {
                    channels: rsmData.invite?.whitelist?.members,
                    roles: rsmData.invite?.whitelist?.roles,
                    users: rsmData.invite?.whitelist?.channels,
                },
            }
        },
        welcome: {
            enabled: true,
            role: rsmData.welcome?.role,
            channel: rsmData.welcome?.message?.channel,
            message: rsmData.welcome?.message?.text ?? null,
        },
        logging: {
            logs: {
                enabled: true,
                channel: rsmData.log_info?.log_channel,
            },
            staff: {
                channel: rsmData.log_info?.staff,
            }
        },
        verify: {
            enabled: true,
            role: rsmData.verify_role,
        },
        tickets: {
            enabled: true,
            category: rsmData.modmail?.cat,
            supportRole: rsmData.modmail?.mention,
            maxTickets: rsmData.modmail?.max,
        },
        tags: rsmData.tags
    } as Partial<ReturnType<typeof client.database.guilds.read>>;
    // console.log(rsmToNucleus)
    const merged = _.merge(nucleusData, rsmToNucleus);
    // console.log(merged)
    await client.database.guilds.write(merged.id, merged);

}
