import client from "./client.js";

function generalException(location: string) {
    client.noLog.push(location);
    setTimeout(() => {
        client.noLog = client.noLog.filter((i: string) => {
            return i !== location;
        });
    }, 1000);
}

export function messageException(guild: string, channel: string, message: string) {
    generalException(`${guild}/${channel}/${message}`);
}

export function roleException(guild: string, user: string) {
    generalException(`${guild}/${user}`);
}

export function preloadPage(target: string, command: string, message: string) {
    client.preloadPage[target] = {
        command: command,
        argument: message
    }
    setTimeout(() => {
        const object = Object.entries(client.preloadPage).filter((entry) => {
            const [k, _] = entry
            return k !== target;
        })
        client.preloadPage = Object.fromEntries(object);
    }, 60 * 5 * 1000);
}