// View the slack nodejs library @ https://github.com/slackhq/node-slack-sdk
// or https://www.npmjs.com/package/@slack/client

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

// Init the slack rtm client with a MemoryDataStore
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

// This is called every time there's a new message visible to the bot on slack
PushClient.prototype.handleNewMessage = function(message) {
    var _this = this;

    // Build the body of the message containing all the metadata fields necessary
    var document = _this.buildMessageDocument(message);

    // Logging
    console.log(`Sending message from ${_this.rtm.dataStore.getUserById(message.user).name} 
                in channel ${_this.rtm.dataStore.getChannelGroupOrDMById(message.channel).name} 
                @ ${message.ts}`);

    // Push the message as a document to the pushAPI
    _this.pushDocument(JSON.stringify(document), document.documentId);
}

PushClient.prototype.pushDocument = function(documentBody, documentId) {
    var _this = this;

    var server = 'push.cloud.coveo.com'
    var APIversion = 'v1'

    // This sends a request to 
    // https://push.cloud.coveo.com/v1/organizations/{orgID}/sources/{sourceID}/documents?documentId={documentID}
    // With the body containing the document metadata we constructed from the message
    request({
        url: `https://${server}/${APIversion}/organizations/${_this.organizationId}/sources/${_this.sourceId}/documents`,
        qs: { documentId: documentId },
        method: 'PUT',
        headers: {
            'content-type': 'application/json',
            'Authorization': 'Bearer ' + _this.pushtoken
        },
        body: documentBody
    }, function(error, response, body) {
        if (error) { // Handle errors here, for example you could retry X number of times
            console.error(error);
        } else if (response.statusCode == 202) { // Success
            console.log('Success!');
        }
    });
}

PushClient.prototype.buildMessageDocument = function(message) {
    var _this = this;

    // Get the channel name of the message
    var channel = _this.rtm.dataStore.getChannelGroupOrDMById(message.channel).name;
    channel = (channel === 'undefined') ? 'Direct Message' : channel; // Direct messages have a channel name = 'undefined'
    var timeStr = message.ts.replace('.', '');

    // Build a documentId which is the URI of a message (This format is the uri slack uses for it's archive)
    var documentId = `https://${_this.team.name}.slack.com/archives/${channel}/p${timeStr}`;

    var user = _this.rtm.dataStore.getUserById(message.user).name || '';

    var body = {
        documentId: documentId,
        message: message.text,
        Data: message.text,
        team: _this.team.name,
        channel: channel,
        type: message.type,
        user: user,
        timestamp: message.ts
    }

    return body;
}

PushClient.prototype.bindEvents = function() {
    var _this = this;
    this.rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function onAuthenticated(rtmStartData) { _this.handleAuthenticated(rtmStartData); });
    this.rtm.on(RTM_EVENTS.MESSAGE, function onRtmMessage(message) { _this.handleNewMessage(message); });
    this.rtm.on(RTM_EVENTS.REACTION_ADDED, function onRtmReactionAdded(reaction) { _this.handleReaction(reaction); });
    this.rtm.on(RTM_EVENTS.REACTION_REMOVED, function onRtmReactionRemoved(reaction) { _this.handleReactionRemoved(reaction); });
}