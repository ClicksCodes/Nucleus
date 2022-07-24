import client from "./client.js";

export default function (guild: string, channel: string, message: string) {
    client.noLog.push(`${guild}/${channel}/${message}`);
    setTimeout(() => {
        client.noLog = client.noLog.filter((i) => {return i !== `${guild}/${channel}/${message}`});
    }, 500);
}