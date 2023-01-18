import { AuditLogEvent, GuildAuditLogsEntry, Webhook } from "discord.js";
import type Discord from "discord.js";
import type { NucleusClient } from "../utils/client.js";
export const event = "webhookUpdate";

export async function callback(client: NucleusClient, channel: Discord.GuildChannel) {
    try {
        const { getAuditLog, log, NucleusColors, entry, renderUser, renderChannel, renderDelta } = client.logger;
        const auditCreate = (await getAuditLog(channel.guild, AuditLogEvent.WebhookCreate))
            .filter((entry: GuildAuditLogsEntry) => (entry.target as Webhook)!.id === channel.id)[0] as GuildAuditLogsEntry;
        const auditDelete = (await getAuditLog(channel.guild, AuditLogEvent.WebhookDelete))
            .filter((entry: GuildAuditLogsEntry) => (entry.target as Webhook)!.id === channel.id)[0] as GuildAuditLogsEntry;
        const auditUpdate = (await getAuditLog(channel.guild, AuditLogEvent.WebhookUpdate))
            .filter((entry: GuildAuditLogsEntry) => (entry.target as Webhook)!.id === channel.id)[0] as GuildAuditLogsEntry;

        if (!auditCreate && !auditUpdate && !auditDelete) return;
        let audit = auditCreate;
        let action: "Create" | "Update" | "Delete" = "Create";
        let list: Record<string, ReturnType<typeof entry> | string> = {};
        if (auditUpdate && auditUpdate.createdTimestamp > audit.createdTimestamp) {
            const { before, after } = auditUpdate.changes.reduce(
                (
                    acc: { before: Record<string, string>; after: Record<string, string> },
                    change: { key: string; new: string; old: string }
                ) => {
                    acc.before[change.key] = change.old;
                    acc.after[change.key] = change.new;
                    return acc;
                },
                { before: {}, after: {} }
            );
            if (before.name !== after.name)
                list["name"] = entry([before.name, after.name], `${before.name} -> ${after.name}`);
            if (before.channel_id !== after.channel_id)
                list["channel"] = entry(
                    [before.channel_id, after.channel_id],
                    renderChannel(await client.channels.fetch(before.channel_id)) +
                        " -> " +
                        renderChannel(await client.channels.fetch(after.channel_id))
                );
            if (!Object.keys(list).length) return;
            list["created"] = entry(
                auditUpdate.target.createdTimestamp,
                renderDelta(auditUpdate.target.createdTimestamp)
            );
            list["edited"] = entry(after.editedTimestamp, renderDelta(new Date().getTime()));
            list["editedBy"] = entry(auditUpdate.executor.id, renderUser(auditUpdate.executor));
            audit = auditUpdate;
            action = "Update";
        } else if (auditDelete && auditDelete.createdTimestamp > audit.createdTimestamp) {
            const { before } = auditDelete.changes.reduce(
                (
                    acc: { before: Record<string, string>; after: Record<string, string> },
                    change: { key: string; new: string; old: string }
                ) => {
                    acc.before[change.key] = change.old;
                    acc.after[change.key] = change.new;
                    return acc;
                },
                { before: {}, after: {} }
            );
            list = {
                name: entry(before.name, `${before.name}`),
                channel: entry(before.channel_id, renderChannel(await client.channels.fetch(before.channel_id))),
                created: entry(auditDelete.target.createdTimestamp, renderDelta(auditDelete.target.createdTimestamp)),
                deleted: entry(new Date().getTime(), renderDelta(new Date().getTime())),
                deletedBy: entry(
                    auditDelete.executor.id,
                    renderUser((await channel.guild.members.fetch(auditDelete.executor.id)).user)
                )
            };
            audit = auditDelete;
            action = "Delete";
        } else {
            const { before } = auditDelete.changes.reduce(
                (
                    acc: { before: Record<string, string>; after: Record<string, string> },
                    change: { key: string; new: string; old: string }
                ) => {
                    acc.before[change.key] = change.old;
                    acc.after[change.key] = change.new;
                    return acc;
                },
                { before: {}, after: {} }
            );
            list = {
                name: entry(before.name, `${before.name}`),
                channel: entry(before.channel_id, renderChannel(await client.channels.fetch(before.channel_id))),
                createdBy: entry(
                    auditCreate.executor.id,
                    renderUser((await channel.guild.members.fetch(auditCreate.executor.id)).user)
                ),
                created: entry(new Date().getTime(), renderDelta(new Date().getTime()))
            };
        }
        const cols = {
            Create: "green",
            Update: "yellow",
            Delete: "red"
        };
        const data = {
            meta: {
                type: "webhook" + action,
                displayName: `Webhook ${action}d`,
                calculateType: "webhookUpdate",
                color: NucleusColors[cols[action]],
                emoji: "WEBHOOK." + action.toUpperCase(),
                timestamp: new Date().getTime()
            },
            list: list,
            hidden: {
                guild: channel.guild.id
            }
        };
        log(data);
    } catch (e) {
        console.log(e);
    }
}
