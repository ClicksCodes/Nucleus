import { AuditLogEvent, GuildAuditLogsEntry, GuildChannel, Webhook } from "discord.js";
import type Discord from "discord.js";
import type { NucleusClient } from "../utils/client.js";
export const event = "webhookUpdate";

interface accType {
    before: Record<string, string>;
    after: Record<string, string>;
}

export async function callback(client: NucleusClient, channel: Discord.GuildChannel) {
    try {
        const { getAuditLog, isLogging, log, NucleusColors, entry, renderUser, renderChannel, renderDelta } = client.logger;
        if (!await isLogging(channel.guild.id, "webhookUpdate")) return;
        const auditCreate = (await getAuditLog(channel.guild, AuditLogEvent.WebhookCreate))
            .filter((entry: GuildAuditLogsEntry | null) => (entry?.target) ? (entry.target as Webhook)!.channelId === channel.id : false)[0];
        const auditDelete = (await getAuditLog(channel.guild, AuditLogEvent.WebhookDelete, 0))
            .filter((entry: GuildAuditLogsEntry | null) => (entry?.target) ? (entry.target as Webhook)!.channelId === channel.id : false)[0];
        const auditUpdate = (await getAuditLog(channel.guild, AuditLogEvent.WebhookUpdate, 0))
            .filter((entry: GuildAuditLogsEntry | null) => (entry?.target) ? (entry.target as Webhook)!.channelId === channel.id : false)[0];
        if (!auditCreate && !auditUpdate && !auditDelete) return;
        let action: "Create" | "Update" | "Delete" = "Create";
        let list: Record<string, ReturnType<typeof entry> | string> = {};
        const createTimestamp = auditCreate ? auditCreate.createdTimestamp : 0;
        const deleteTimestamp = auditDelete ? auditDelete.createdTimestamp : 0;
        const updateTimestamp = auditUpdate ? auditUpdate.createdTimestamp : 0;
        if (updateTimestamp > createTimestamp && updateTimestamp > deleteTimestamp && auditUpdate) {
            const { before, after } = auditUpdate.changes.reduce((acc: accType, change) => {
                    acc.before[change.key] = change.old?.toString()!;
                    acc.after[change.key] = change.new?.toString()!;
                    return acc;
                },
                { before: {}, after: {} }
            );
            if (before["name"] !== after["name"])
                list["name"] = entry([before["name"]!, after["name"]!], `${before["name"]} -> ${after["name"]}`);
            if (before["channel_id"] !== after["channel_id"])
                list["channel"] = entry(
                    [before["channel_id"]!, after["channel_id"]!],
                    renderChannel(await client.channels.fetch(before["channel_id"]!) as GuildChannel) +
                        " -> " +
                        renderChannel(await client.channels.fetch(after["channel_id"]!) as GuildChannel)
                );
            if (!Object.keys(list).length) return;
            list["created"] = entry(
                (auditUpdate.target! as Extract<GuildAuditLogsEntry, {createdTimestamp: number}>).createdTimestamp,
                renderDelta((auditUpdate.target! as Extract<GuildAuditLogsEntry, {createdTimestamp: number}>).createdTimestamp)
            );
            list["edited"] = entry(after["editedTimestamp"]!, renderDelta(Date.now()));
            list["editedBy"] = entry(auditUpdate.executor!.id, renderUser(auditUpdate.executor!));
            action = "Update";
        } else if (deleteTimestamp > createTimestamp && deleteTimestamp > updateTimestamp && auditDelete) {
            const { before } = auditDelete.changes.reduce((acc: accType, change) => {
                    acc.before[change.key] = change.old?.toString()!;
                    acc.after[change.key] = change.new?.toString()!;
                    return acc;
                },
                { before: {}, after: {} }
            );
            list = {
                name: entry(before["name"]!, `${before["name"]}`),
                channel: entry(before["channel_id"]!, renderChannel((await client.channels.fetch(before["channel_id"]!)) as GuildChannel)),
                created: entry((auditDelete.target! as Extract<GuildAuditLogsEntry, {createdTimestamp: number}>).createdTimestamp, renderDelta((auditDelete.target! as Extract<GuildAuditLogsEntry, {createdTimestamp: number}>).createdTimestamp)),
                deleted: entry(Date.now(), renderDelta(Date.now())),
                deletedBy: entry(
                    auditDelete.executor!.id,
                    renderUser((await channel.guild.members.fetch(auditDelete.executor!.id)).user)
                )
            };
            action = "Delete";
        } else {
            const { before } = auditDelete!.changes.reduce((acc: accType, change) => {
                    acc.before[change.key] = change.old?.toString()!;
                    acc.after[change.key] = change.new?.toString()!;
                    return acc;
                },
                { before: {}, after: {} }
            );
            list = {
                name: entry(before["name"]!, `${before["name"]}`),
                channel: entry(before["channel_id"]!, renderChannel(await client.channels.fetch(before["channel_id"]!) as GuildChannel)),
                createdBy: entry(
                    auditCreate!.executor!.id,
                    renderUser((await channel.guild.members.fetch(auditCreate!.executor!.id)).user)
                ),
                created: entry(Date.now(), renderDelta(Date.now()))
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
                color: NucleusColors[cols[action] as keyof typeof NucleusColors],
                emoji: "WEBHOOK." + action.toUpperCase(),
                timestamp: Date.now()
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
