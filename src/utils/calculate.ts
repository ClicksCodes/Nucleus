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
]

const tickets = [
    "support",
    "report",
    "question",
    "issue",
    "suggestion",
    "other"
]

const toHexInteger = (permissions, array?) => {
    if (!array) {
        array = logs;
    }
    let int = 0n;

    for(let perm of permissions) {
        int += BigInt(2 ** array.indexOf(perm));
    }
    return int.toString(16)
}

const toHexArray = (permissionsHex, array?) => {
    if (!array) {
        array = logs;
    }
    let permissions = [];
    let int = (BigInt("0x" + permissionsHex)).toString(2).split('').reverse();
    for (let index in int) {
        if (int[index] == "1" && array.length > index) {
            permissions.push(array[index]);
        }
    }
    return permissions;
}

export {
    toHexInteger,
    toHexArray,
    tickets,
    logs
}