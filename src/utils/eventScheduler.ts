import { EventSchedulerDatabase } from './database';
import client from './client.js';

class EventScheduler {
    database: any;
    next: {timestamp: Date, data: object, responded: boolean} | {};

    constructor() {
        this.database = EventSchedulerDatabase;
        this.next = {};
    }

    async create(timestamp: Date, data: object) {
        await this.database.create(timestamp, data);
        if (this.next === {}) {
            this.next = this.next = await this.getNext();
            return
        }
        if (timestamp.getTime() < (this.next as {timestamp: Date}).timestamp.getTime()) {
            this.next = {timestamp: timestamp, data: data, responded: false};
        }
    }

    async getNext() {
        let entry = await this.database.getNext();
        if (entry) {
            this.next = entry;
        }
        return this.next;
    }

    async delete(timestamp: Date, data: object) {
        await this.database.delete(timestamp, data);
    } // TODO: add a loop
}

export default EventScheduler;