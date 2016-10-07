var PushClient = require('./PushClient');

// TOKEN TO CONNECT TO SLACK
var token = process.env.SLACK_API_TOKEN || '';
// TOKEN TO PUSH TO THE COVEO PUSH API
var pushtoken = process.env.COVEO_PUSH_TOKEN || '';
// ID OF THE COVEO ORGANIZATION TO PUSH TO
var organizationId = process.env.COVEO_ORGANIZATIONID || '';
// ID OF THE SOURCE TO PUSH TO
var sourceId = process.env.COVEO_SOURCEID || '';


// START THE SLACK PUSH CLIENT
var myPushClient = new PushClient(token, organizationId, sourceId, pushtoken);
myPushClient.start();