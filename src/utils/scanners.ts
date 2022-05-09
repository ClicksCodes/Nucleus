import * as us from 'unscan'
import fetch from 'node-fetch'
import { writeFileSync } from 'fs'
import generateFileName from './temp/generateFileName.js'
import * as path from 'path'
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function testNSFW(link: string): Promise<JSON> {
    const image = (await (await fetch(link)).buffer()).toString('base64')
    let fileName = generateFileName(link.split('/').pop().split('.').pop())
    let p = path.join(__dirname, '/temp', fileName)
    writeFileSync(p, image, 'base64')
    let result = await us.nsfw.file(p)
    return result
}

export async function testMalware(link: string): Promise<JSON> {
    const file = (await (await fetch(link)).buffer()).toString('base64')
    let fileName = generateFileName(link.split('/').pop().split('.').pop())
    let p = path.join(__dirname, '/temp', fileName)
    writeFileSync(p, file, 'base64')
    let result = await us.malware.file(p)
    return result
}

export async function testLink(link: string): Promise<JSON> {
    return await us.link.scan(link)
}
