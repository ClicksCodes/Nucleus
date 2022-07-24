async function convertCurlyBracketString(str, memberID, memberName, serverName, members): Promise<string> {
    let memberCount = (await members.fetch()).size
    let bots = (await members.fetch()).filter(m => m.user.bot).size
    str = str
        .replace("{member:mention}", memberID ? `<@${memberID}>` : "{member:mention}")
        .replace("{member:name}", memberName ? `${memberName}` : "{member:name}")
        .replace("{serverName}", serverName ? `${serverName}` : "{serverName}")
        .replace("{memberCount}", memberCount ? `${memberCount}` : "{memberCount}")
        .replace("{memberCount:bots}", bots ? `${bots}` : "{memberCount:bots}")
        .replace("{memberCount:humans}", (memberCount && bots) ? `${memberCount - bots}` : "{memberCount:humans}");

    return str
}

export default convertCurlyBracketString;
