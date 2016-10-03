var RtmClient = require('@slack/client').RtmClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var MemoryDataStore = require('@slack/client').MemoryDataStore;
var request = require('request');

module.exports = PushClient;

function PushClient(slacktoken, organizationId, sourceId, pushtoken) {
    this.slacktoken = slacktoken || '';
    this.organizationId = organizationId || '';
    this.sourceId = sourceId || '';
    this.pushtoken = pushtoken || '';
    this.init();
    this.bindEvents();
}

PushClient.prototype.init = function() {
    this.rtm = new RtmClient(this.slacktoken, {
        logLevel: 'error',
        dataStore: new MemoryDataStore()
    });
}

PushClient.prototype.start = function() {
    this.rtm.start();
}

PushClient.prototype.handleAuthenticated = function(rtmStartData) {
    this.rtmStartData = rtmStartData;
    this.team = rtmStartData.team;
}

PushClient.prototype.handleNewMessage = function(message) {
    var _this = this;

    var channel = _this.rtm.dataStore.getChannelGroupOrDMById(message.channel).name;
    channel = (channel !== 'undefined') ? channel : message.channel;
    var timeStr = message.ts.replace('.', '');
    var documentId = `https://${_this.team.name}.slack.com/archives/${channel}/p${timeStr}`;
    var body = _this.buildMessageBodyString(message);

    console.log(`Sending message from ${_this.rtm.dataStore.getUserById(message.user).name} 
                in channel ${_this.rtm.dataStore.getChannelGroupOrDMById(message.channel).name} 
                @ ${message.ts}`);

    request({
        url: `https://push.cloud.coveo.com/v1/organizations/${_this.organizationId}/sources/${_this.sourceId}/documents`,
        qs: { documentId: documentId },
        method: 'PUT',
        headers: {
            'content-type': 'application/json',
            'Authorization': _this.pushtoken
        },
        body: body
    }, function(error, response, body) {
        if (error) {
            console.error(error);
        }
    });
}

PushClient.prototype.handleReaction = function(reaction) {
    console.log('Reaction added: ', JSON.stringify(reaction));
}

PushClient.prototype.handleReactionRemoved = function(reaction) {
    console.log('Reaction removed: ', reaction);
}

PushClient.prototype.buildMessageBodyString = function(message) {
    var _this = this;
    var channel = _this.rtm.dataStore.getChannelGroupOrDMById(message.channel).name;
    if (channel === 'undefined') channel = 'Direct Message';
    var user = _this.rtm.dataStore.getUserById(message.user).name || '';

    var body = {
        message: message.text,
        Data: message.text,
        team: _this.team.name,
        channel: channel,
        type: message.type,
        user: user,
        timestamp: message.ts
    }

    return JSON.stringify(body);
}

PushClient.prototype.bindEvents = function() {
    var _this = this;
    this.rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function onAuthenticated(rtmStartData) { _this.handleAuthenticated(rtmStartData); });
    this.rtm.on(RTM_EVENTS.MESSAGE, function onRtmMessage(message) { _this.handleNewMessage(message); });
    this.rtm.on(RTM_EVENTS.REACTION_ADDED, function onRtmReactionAdded(reaction) { _this.handleReaction(reaction); });
    this.rtm.on(RTM_EVENTS.REACTION_REMOVED, function onRtmReactionRemoved(reaction) { _this.handleReactionRemoved(reaction); });
}