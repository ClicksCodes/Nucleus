import * as fs from 'fs';

const dir = './data';
const files = fs.readdirSync(dir);

for (const file of files) {
    const rsmData = fs.readFileSync(`${dir}/${file}`, 'utf8');
    const nucleusData = ""

}
