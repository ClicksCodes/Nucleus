async function convertCurlyBracketString(str, memberID, memberName, serverName, members): Promise<string> {
    let memberCount = (await members.fetch()).size
    let bots = (await members.fetch()).filter(m => m.user.bot).size
    str = str
        .replace("{@}", `<@${memberID}>`)
        .replace("{server}", `${serverName}`)
        .replace("{name}", `${memberName}`)
        .replace("{count}", `${memberCount}`)
        .replace("{count:bots}", `${bots}`)
        .replace("{count:humans}", `${memberCount - bots}`);

    return str
}

export default convertCurlyBracketString;