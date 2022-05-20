import client from './client.js';

export default async function readConfig(guild: string): Promise<any> {
    return await client.database.read(guild);
}
