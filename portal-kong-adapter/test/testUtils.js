var crypto = require('crypto');
var request = require('request');
var consts = require('./testConsts');

utils = {};

utils.createRandomId = function () {
    return crypto.randomBytes(5).toString('hex');
};

utils.getJson = function (ob) {
    if (ob instanceof String || typeof ob === "string")
        return JSON.parse(ob);
    return ob;
};

utils.getText = function (ob) {
    if (ob instanceof String || typeof ob === "string")
        return ob;
    return JSON.stringify(ob, null, 2);
};

utils.createUser = function (lastName, group, validated, callback) {
    var thisGroup = [];
    if (group)
        thisGroup = [group];
    request({
        method: 'POST',
        url: consts.BASE_URL + 'users',
        json: true,
        headers: utils.makeHeaders(),
        body: {
            firstName: 'Dummy',
            lastName: lastName,
            validated: validated,
            email: lastName.toLowerCase() + '@random.org',
            groups: thisGroup
        }
    },
        function (err, res, body) {
            if (201 != res.statusCode)
                throw Error("Creating user did not succeed: " + utils.getText(body));
            var jsonBody = utils.getJson(body);
            // console.log(jsonBody);
            callback(jsonBody.id);
        });
};

utils.makeHeaders = function (userId) {
    if (!userId && !utils.correlationId)
        return null;
    var headers = {};
    if (userId)
        headers['X-UserId'] = userId;
    if (utils.correlationId)
        headers['Correlation-Id'] = utils.correlationId;

    return headers;
};

utils.getUser = function (userId, callback) {
    request(
        {
            url: consts.BASE_URL + 'users/' + userId,
            headers: utils.makeHeaders(userId)
        },
        function (err, res, body) {
            if (200 != res.statusCode)
                throw Error("Could not retrieve user: " + utils.getText(body));
            callback(utils.getJson(body));
        });
};

utils.deleteUser = function (userId, callback) {
    request(
        {
            method: 'DELETE',
            url: consts.BASE_URL + 'users/' + userId,
            headers: utils.makeHeaders(userId)
        },
        function (err, res, body) {
            if (204 != res.statusCode)
                throw Error("Deleting user " + userId + " did not succeed: " + utils.getText(body));
            callback();
        });
};

utils.setGroups = function (userId, groups, callback) {
    request({
        method: 'PATCH',
        url: consts.BASE_URL + 'users/' + userId,
        headers: utils.makeHeaders('1'), // Admin required
        json: true,
        body: {
            groups: groups
        }
    }, function (err, res, body) {
        if (err)
            throw err;
        if (200 != res.statusCode)
            throw new Error('Setting user groups failed: ' + utils.getText(body));
        callback();
    });
};

utils.createApplication = function (appId, appInfo, userId, callback) {
    var appName = appInfo;
    var redirectUri = null;
    if (typeof (appInfo) === 'object') {
        if (appInfo.name)
            appName = appInfo.name;
        if (appInfo.redirectUri)
            redirectUri = appInfo.redirectUri;
    }
    request.post(
        {
            url: consts.BASE_URL + 'applications',
            headers: utils.makeHeaders(userId),
            json: true,
            body: {
                id: appId,
                name: appName,
                redirectUri: redirectUri
            }
        },
        function (err, res, body) {
            if (201 != res.statusCode)
                throw Error("Creating application failed:" + utils.getText(body));
            callback();
        });
};

utils.deleteApplication = function (appId, userId, callback) {
    request.delete(
        {
            url: consts.BASE_URL + 'applications/' + appId,
            headers: utils.makeHeaders(userId)
        },
        function (err, res, body) {
            if (204 != res.statusCode)
                throw Error("Deleting application failed: " + utils.getText(body));
            callback();
        }
    );
};

utils.addOwner = function (appId, userId, email, role, callback) {
    request.post(
        {
            url: consts.BASE_URL + 'applications/' + appId + '/owners',
            headers: utils.makeHeaders(userId),
            json: true,
            body: {
                email: email,
                role: role
            }
        },
        function (err, res, body) {
            if (201 != res.statusCode)
                throw Error("Could not add owner '" + email + "' to application '" + appId + "': " + utils.getText(body));
            callback();
        }
    );
};

utils.deleteOwner = function (appId, userId, email, callback) {
    request.delete(
        {
            url: consts.BASE_URL + 'applications/' + appId + '/owners?userEmail=' + email,
            headers: utils.makeHeaders(userId)
        },
        function (err, res, body) {
            if (200 != res.statusCode)
                throw Error("Deleting owner '" + email + "' from application '" + appId + "' failed: " + utils.getText(body));
            callback();
        });
};

utils.addSubscription = function (appId, userId, apiId, plan, apikey, callback) {
    request.post(
        {
            url: consts.BASE_URL + 'applications/' + appId + '/subscriptions',
            headers: utils.makeHeaders(userId),
            json: true,
            body: {
                application: appId,
                api: apiId,
                plan: plan,
                apikey: apikey
            }
        },
        function (err, res, body) {
            if (201 != res.statusCode)
                throw Error("Could not add subscription: " + utils.getText(body));
            callback(null, utils.getJson(body));
        });
};

utils.deleteSubscription = function (appId, userId, apiId, callback) {
    request.delete(
        {
            url: consts.BASE_URL + 'applications/' + appId + '/subscriptions/' + apiId,
            headers: utils.makeHeaders(userId)
        },
        function (err, res, body) {
            if (204 != res.statusCode)
                throw Error("Could not delete subscription: " + utils.getText(body));
            callback();
        });
};

utils.approveSubscription = function (appId, apiId, adminUserId, callback) {
    request.patch({
        url: consts.BASE_URL + 'applications/' + appId + '/subscriptions/' + apiId,
        headers: { 'X-UserId': adminUserId },
        json: true,
        body: { approved: true }
    }, function (err, res, body) {
        if (err || 200 != res.statusCode)
            throw new Error("Could not approve subscription for app " + appId + " to API " + apiId);
        callback();
    });
};

utils.createListener = function (listenerId, listenerUrl, callback) {
    request.put({
        url: consts.BASE_URL + 'webhooks/listeners/' + listenerId,
        headers: utils.makeHeaders('1'),
        json: true,
        body: {
            id: listenerId,
            url: listenerUrl
        }
    }, function (err, apiResponse, apiBody) {
        if (err)
            throw err;
        if (200 != apiResponse.statusCode)
            throw new Error("Could not create listener: " + utils.getText(apiBody));
        callback();
    });
};

utils.deleteListener = function (listenerId, callback) {
    request.delete({
        url: consts.BASE_URL + 'webhooks/listeners/' + listenerId,
        headers: utils.makeHeaders('1')
    }, function (err, apiResponse, apiBody) {
        if (err)
            throw err;
        if (204 != apiResponse.statusCode)
            throw new Error("Could not delete listener: " + utils.getText(apiBody));
        callback();
    });
};

utils.findWithName = function (someArray, name) {
    for (var i = 0; i < someArray.length; ++i) {
        if (someArray[i].name === name)
            return someArray[i];
    }
    return null;
};

utils.awaitEmptyQueue = function (queueName, userId, callback) {
    var maxCount = 50;
    var timeOut = 500;
    var _awaitEmptyQueue = function (tryCount) {
        //console.log('_awaitEmptyQueue(), try ' + tryCount + ': ' + queueName);
        if (tryCount >= maxCount)
            return callback(new Error('awaitEmptyQueue: Max count of ' + maxCount + ' was reached: ' + tryCount));
        request.get({
            url: consts.BASE_URL + 'webhooks/events/' + queueName,
            headers: utils.makeHeaders(userId)
        }, function (err, res, body) {
            if (err)
                return callback(err);
            if (res.statusCode !== 200)
                return callback(new Error('awaitEmptyQueue: GET of events for ' + queueName + ' returns status code ' + res.statusCode));
            var queue = utils.getJson(body);
            //console.log(queue);
            if (queue.length === 0)
                return callback(null);
            setTimeout(_awaitEmptyQueue, timeOut, tryCount + 1);
        });
    };

    // Let the queue build up first before hammering the API.
    setTimeout(_awaitEmptyQueue, 500, 0);
};

utils.kongGet = function (url, expectedStatusCode, callback) {
    var thisCallback = callback;
    var thisStatusCode = expectedStatusCode;
    if (!callback &&
        (typeof(expectedStatusCode) == 'function')) {
        thisCallback = expectedStatusCode;
        thisStatusCode = 200;
    }
    request.get({
        url: consts.KONG_ADMIN_URL + url
    }, function (err, res, body) {
        if (err)
            throw err;
        if (res.statusCode !== thisStatusCode)
            throw new Error('kongGet of ' + url + ' return unexpected status code: ' + res.statusCode + ' vs. expected ' + thisStatusCode);
        thisCallback(null, {
            res: res,
            body: utils.getJson(body)
        });
    });
};

module.exports = utils;