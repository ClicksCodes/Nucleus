export const event = "stickerUpdate";

export async function callback(client, oe, ne) {
    const { getAuditLog, log, NucleusColors, entry, renderDelta, renderUser } =
        client.logger;

    if (oe.name === ne.name) return;
    const auditLog = await getAuditLog(ne.guild, "EMOJI_UPDATE");
    const audit = auditLog.entries.first();
    if (audit.executor.id === client.user.id) return;

    const changes = {
        stickerId: entry(ne.id, `\`${ne.id}\``),
        edited: entry(ne.createdTimestamp, renderDelta(ne.createdTimestamp)),
        editedBy: entry(
            audit.executor.id,
            renderUser((await ne.guild.members.fetch(audit.executor.id)).user)
        ),
        name: entry([oe.name, ne.name], `\`:${oe.name}:\` -> \`:${ne.name}:\``)
    };
    const data = {
        meta: {
            type: "stickerUpdate",
            displayName: "Sticker Edited",
            calculateType: "stickerUpdate",
            color: NucleusColors.yellow,
            emoji: "GUILD.EMOJI.EDIT",
            timestamp: audit.createdTimestamp
        },
        list: changes,
        hidden: {
            guild: ne.guild.id
        }
    };
    log(data);
}
