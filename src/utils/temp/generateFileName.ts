import * as fs from "fs";
import * as crypto from "crypto";
import client from "../client.js";
import * as path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function generateFileName(ending: string): Promise<string> {
    let fileName = crypto.randomBytes(35).toString("hex");
    fileName = fileName.replace(/([a-zA-Z0-9]{8})/g, "$1-");
    if (fs.existsSync(`./${fileName}`)) {
        fileName = await generateFileName(ending);
    }
    await client.database.eventScheduler.schedule("deleteFile", (Date.now() + 60 * 1000).toString(), {
        fileName: `${fileName}.${ending}`
    });
    return path.join(__dirname, fileName + "." + ending);
}
