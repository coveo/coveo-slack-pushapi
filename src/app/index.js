

var PushClient = require('./PushClient');

var token = process.env.SLACK_API_TOKEN || '';
var pushtoken = process.env.COVEO_PUSH_TOKEN || '';
var organizationId = process.env.COVEO_ORGANIZATIONID || '';
var sourceId = process.env.COVEO_SOURCEID || '';


// START

var myPushClient = new PushClient(token, organizationId, sourceId, pushtoken);
myPushClient.start();