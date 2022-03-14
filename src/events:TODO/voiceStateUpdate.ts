const {addLog} = require('../scripts/addLogs');
const JsonDiff = require('json-diff');
module.exports = {
    name:'voiceStateUpdate',
    once:false,
    async execute(oldState, newState) {
        let os = {
            channel:oldState.channel ? oldState.channel.id : null,
            serverDeaf:oldState.serverDeaf,
            serverMute:oldState.serverMute,
            selfDeaf:oldState.selfDeaf,
            selfMute:oldState.selfMute,
            selfVideo:oldState.selfVideo,
            streaming:oldState.streaming,
            id:oldState.id,
            requestToSpeakTimestamp:oldState.requestToSpeakTimestamp
        }

        let ns = {
            channel:newState.channel ? newState.channel.id : null,
            serverDeaf:newState.serverDeaf,
            serverMute:newState.serverMute,
            selfDeaf:newState.selfDeaf,
            selfMute:newState.selfMute,
            selfVideo:newState.selfVideo,
            streaming:newState.streaming,
            id:newState.id,
            requestToSpeakTimestamp:newState.requestToSpeakTimestamp
        }

        let data = JsonDiff.diff(os, ns, {full: true});

        addLog(oldState.guild.id, data);
    }
}