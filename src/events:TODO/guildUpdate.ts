const {addLog} = require('../scripts/addLogs');
const JsonDiff = require('json-diff');

module.exports = {
    name:'guildUpdate',
    once:false,
    async execute(oldGuild, newGuild) {

        if(!newGuild.available) {
            return addLog(newGuild.id, {id:newGuild.id,unavailable:true});
        }

        let og = {
            afkChannel: oldGuild.afkChannel ? oldGuild.afkChannel.id : null,
            afkTimeout: oldGuild.afkTimeout,
            available: oldGuild.available,
            banner: oldGuild.banner,
            description: oldGuild.description,
            discoverySplash: oldGuild.discoverySplash,
            explicitContentFilter: oldGuild.explicitContentFilter,
            features: oldGuild.features,
            icon: oldGuild.icon,
            id: oldGuild.id,
            large: oldGuild.large,
            maximumBitrate: oldGuild.maximumBitrate,
            maximumMembers: oldGuild.maximumMembers,
            mfaLevel: oldGuild.mfaLevel,
            name: oldGuild.name,
            nsfwLevel: oldGuild.nsfwLevel,
            ownerid: oldGuild.ownerId,
            partnered: oldGuild.partnered,
            preferredLocale: oldGuild.preferredLocale,
            premiumProgressBarEnabled: oldGuild.premiumProgressBarEnabled,
            premiumSubscriptionCount: oldGuild.premiumSubscriptionCount,
            premiumTier: oldGuild.premiumTier,
            publicUpdatesChannel: oldGuild.publicUpdatesChannel ? oldGuild.publicUpdatesChannel.id : null,
            rulesChannel: oldGuild.rulesChannel ? oldGuild.rulesChannel.id : null,
            splash: oldGuild.splash,
            systemChannel: oldGuild.systemChannel ? oldGuild.systemChannel.id : null,
            vanityURLCode: oldGuild.vanityURLCode,
            verificationLevel: oldGuild.verificationLevel,
            verified: oldGuild.verified,
            widgetChannel: oldGuild.widgetChannel ? oldGuild.widgetChannel.id : null,
            widgetEnabled: oldGuild.widgetEnabled,
        }
        let ng = {
            afkChannel: newGuild.afkChannel ? newGuild.afkChannel.id : null,
            afkTimeout: newGuild.afkTimeout,
            available: newGuild.available,
            banner: newGuild.banner,
            description: newGuild.description,
            discoverySplash: newGuild.discoverySplash,
            explicitContentFilter: newGuild.explicitContentFilter,
            features: newGuild.features,
            icon: newGuild.icon,
            id: newGuild.id,
            large: newGuild.large,
            maximumBitrate: newGuild.maximumBitrate,
            maximumMembers: newGuild.maximumMembers,
            mfaLevel: newGuild.mfaLevel,
            name: newGuild.name,
            nsfwLevel: newGuild.nsfwLevel,
            ownerid: newGuild.ownerId,
            partnered: newGuild.partnered,
            preferredLocale: newGuild.preferredLocale,
            premiumProgressBarEnabled: newGuild.premiumProgressBarEnabled,
            premiumSubscriptionCount: newGuild.premiumSubscriptionCount,
            premiumTier: newGuild.premiumTier,
            publicUpdatesChannel: newGuild.publicUpdatesChannel ? newGuild.publicUpdatesChannel.id : null,
            rulesChannel: newGuild.rulesChannel ? newGuild.rulesChannel.id : null,
            splash: newGuild.splash,
            systemChannel: newGuild.systemChannel ? newGuild.systemChannel.id : null,
            vanityURLCode: newGuild.vanityURLCode,
            verificationLevel: newGuild.verificationLevel,
            verified: newGuild.verified,
            widgetChannel: newGuild.widgetChannel ? newGuild.widgetChannel.id : null,
            widgetEnabled: newGuild.widgetEnabled,
        }

        let data = JsonDiff.diff(og, ng, {full:true});
        addLog(newGuild.id, data);
    }
}