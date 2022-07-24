import humanizeDuration from 'humanize-duration';
export const event = 'webhookUpdate'

export async function callback(client, channel) {
    try {
        const { getAuditLog, log, NucleusColors, entry, renderUser, renderChannel, renderDelta } = client.logger
        let auditLogCreate = getAuditLog(channel.guild, 'WEBHOOK_CREATE');
        let auditLogUpdate = getAuditLog(channel.guild, 'WEBHOOK_UPDATE');
        let auditLogDelete = getAuditLog(channel.guild, 'WEBHOOK_DELETE');
        [auditLogCreate, auditLogUpdate, auditLogDelete] = await Promise.all([auditLogCreate, auditLogUpdate, auditLogDelete]);
        let auditCreate = auditLogCreate.entries.filter(entry => entry.target.channelId == channel.id).first();
        let auditUpdate = auditLogUpdate.entries.filter(entry => entry.target.channelId == channel.id).first();
        let auditDelete = auditLogDelete.entries.filter(entry => entry.target.channelId == channel.id).first();
        if (!auditCreate && !auditUpdate && !auditDelete) return;
        let audit = auditCreate;
        let action = "Create";
        let list = {} as any;
        if (auditUpdate && auditUpdate.createdTimestamp > audit.createdTimestamp) {
            let {before, after} = auditUpdate.changes.reduce(
                (acc, change) => { acc.before[change.key] = change.old; acc.after[change.key] = change.new; return acc; },
                {before: {}, after: {}}
            );
            if (before.name !== after.name) list['name'] = entry([before.name, after.name], `${before.name} -> ${after.name}`)
            if (before.channel_id !== after.channel_id) list['channel'] = entry([before.channel_id, after.channel_id], renderChannel(await client.channels.fetch(before.channel_id)) + ` -> ` + renderChannel(await client.channels.fetch(after.channel_id)))
            if (!(Object.keys(list)).length) return;
            list.created = entry(auditUpdate.target.createdTimestamp, renderDelta(auditUpdate.target.createdTimestamp));
            list.edited = entry(after.editedTimestamp, renderDelta(new Date().getTime()));
            list.editedBy = entry(auditUpdate.executor.id, renderUser(auditUpdate.executor));
            audit = auditUpdate;
            action = "Update"
        } else if (auditDelete && auditDelete.createdTimestamp > audit.createdTimestamp) {
            let {before, after} = auditDelete.changes.reduce(
                (acc, change) => { acc.before[change.key] = change.old; acc.after[change.key] = change.new; return acc; },
                {before: {}, after: {}}
            );
            list = {
                name: entry(before.name, `${before.name}`),
                channel: entry(before.channel_id, renderChannel(await client.channels.fetch(before.channel_id))),
                created: entry(auditDelete.target.createdTimestamp, renderDelta(auditDelete.target.createdTimestamp)),
                deleted: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                deletedBy: entry(auditDelete.executor.id, renderUser((await channel.guild.members.fetch(auditDelete.executor.id)).user)),
            }
            audit = auditDelete;
            action = "Delete"
        } else {
            let {before, after} = auditDelete.changes.reduce(
                (acc, change) => { acc.before[change.key] = change.old; acc.after[change.key] = change.new; return acc; },
                {before: {}, after: {}}
            );
            list = {
                name: entry(before.name, `${before.name}`),
                channel: entry(before.channel_id, renderChannel(await client.channels.fetch(before.channel_id))),
                createdBy: entry(auditCreate.executor.id, renderUser((await channel.guild.members.fetch(auditCreate.executor.id)).user)),
                created: entry(new Date().getTime(), renderDelta(new Date().getTime())),
            }
        }
        let cols = {
            "Create": "green",
            "Update": "yellow",
            "Delete": "red",
        }
        let data = {
            meta: {
                type: 'webhook' + action,
                displayName: `Webhook ${action}d`,
                calculateType: 'webhookUpdate',
                color: NucleusColors[cols[action]],
                emoji: "WEBHOOK." + action.toUpperCase(),
                timestamp: new Date().getTime()
            },
            list: list,
            hidden: {
                guild: channel.guild.id
            }
        }
        log(data);
    } catch(e) { console.log(e) }
}
