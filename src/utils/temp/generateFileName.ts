import * as fs from 'fs';
import * as crypto from 'crypto';

export default function generateFileName(ending: string): string {
    let fileName = crypto.randomBytes(35).toString('hex');
    fileName = fileName.replace(/([a-zA-Z0-9]{8})/g, '$1-');
    if (fs.existsSync(`./${fileName}`)) {
        fileName = generateFileName(ending);
    }
    return fileName + '.' + ending;
}