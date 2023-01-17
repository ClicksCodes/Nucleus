const logs = [
    "channelUpdate",
    "emojiUpdate",
    "stickerUpdate",
    "guildUpdate",
    "guildMemberUpdate",
    "guildMemberPunish",
    "guildRoleUpdate",
    "guildInviteUpdate",
    "messageUpdate",
    "messageDelete",
    "messageDeleteBulk",
    "messageReactionUpdate",
    "messageMassPing",
    "messageAnnounce",
    "threadUpdate",
    "webhookUpdate",
    "guildMemberVerify",
    "autoModeratorDeleted",
    "nucleusSettingsUpdated",
    "ticketUpdate"
];

const tickets = ["support", "report", "question", "issue", "suggestion", "other"];

const toHexInteger = (permissions: string[], array?: string[]): string => {
    if (!array) {
        array = logs;
    }
    let int = 0n;

    for (const perm of permissions) {
        int += BigInt(2 ** array.indexOf(perm));
    }
    return int.toString(16);
};

const toHexArray = (permissionsHex: string, array?: string[]): string[] => {
    if (!array) {
        array = logs;
    }
    const permissions: string[] = [];
    const int = BigInt("0x" + permissionsHex)
        .toString(2)
        .split("")
        .reverse();
    for (const index in int) {
        if (int[index] === "1" && array.length > parseInt(index)) {
            permissions.push(array[index]!);
        }
    }
    return permissions;
};

export { toHexInteger, toHexArray, tickets, logs };
