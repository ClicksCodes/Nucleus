import * as fs from "fs";
import * as crypto from "crypto";
import client from "../client.js";
import * as path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function generateFileName(ending: string): string {
    let fileName = crypto.randomBytes(35).toString("hex");
    fileName = fileName.replace(/([a-zA-Z0-9]{8})/g, "$1-");
    if (fs.existsSync(`./${fileName}`)) {
        fileName = generateFileName(ending);
    }
    client.database.eventScheduler.schedule(
        "deleteFile",
        new Date().getTime() + 60 * 1000,
        { fileName: `${fileName}.${ending}` }
    );
    return path.join(__dirname, fileName + "." + ending);
}
