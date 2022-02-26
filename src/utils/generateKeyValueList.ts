function capitalize(s)
{
    return s[0].toUpperCase() + s.slice(1);
}

function keyValueList(data) {
    let out = "";
    Object.entries(data).map(([key, value]) => {
        out += `**${capitalize(key)}:** ${value}\n`
    })
    return out;
}

export default keyValueList;