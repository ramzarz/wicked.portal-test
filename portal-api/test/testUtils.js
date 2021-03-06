'use strict';

/* global it, describe, before, beforeEach, after, afterEach, slow */

const assert = require('chai').assert;
const crypto = require('crypto');
const request = require('request');
const qs = require('querystring');
const consts = require('./testConsts');

const utils = {};

// utils.SCOPES = {

// }

utils.isPostgres = function () {
    return process.env.WICKED_STORAGE && process.env.WICKED_STORAGE.toLowerCase() == 'postgres';
};

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
    let thisGroup = [];
    if (group) {
        if (!Array.isArray(group))
            thisGroup = [group];
        else
            thisGroup = group;
    }
    request.post({
        url: consts.BASE_URL + 'users',
        json: true,
        headers: utils.makeHeaders(1, 'write_users'),
        body: {
            validated: validated,
            email: lastName.toLowerCase() + '@random.org',
            groups: thisGroup
        }
    },
        function (err, res, body) {
            if (201 != res.statusCode)
                throw Error("Creating user did not succeed: " + utils.getText(body));
            const jsonBody = utils.getJson(body);
            // console.log(jsonBody);
            callback(jsonBody.id);
        });
};

utils.makeHeaders = function (userId, scopes) {
    if (!userId && !utils.correlationId)
        return null;
    const headers = {};
    if (userId)
        headers['X-Authenticated-UserId'] = `sub=${userId}`;
    if (scopes)
        headers['X-Authenticated-Scope'] = scopes;

    if (utils.correlationId)
        headers['Correlation-Id'] = utils.correlationId;

    return headers;
};

utils.makeFilter = function (filter) {
    return `filter=${qs.escape(JSON.stringify(filter))}`;
};

utils.onlyScope = function (scopes) {
    const headers = {};
    if (scopes)
        headers['X-Authenticated-Scope'] = scopes;

    if (utils.correlationId)
        headers['Correlation-Id'] = utils.correlationId;
    return headers;
};

utils.getUser = function (userId, callback) {
    request({
        url: consts.BASE_URL + 'users/' + userId,
        headers: utils.makeHeaders(userId, 'read_users')
    }, function (err, res, body) {
        assert.isNotOk(err);
        assert.equal(200, res.statusCode, "Could not retrieve user: " + utils.getText(body));
        callback(utils.getJson(body));
    });
};

utils.deleteUser = function (userId, callback) {
    request.delete({
        url: consts.BASE_URL + 'users/' + userId,
        headers: utils.makeHeaders(userId, 'write_users')
    }, function (err, res, body) {
        assert.isNotOk(err);
        assert.equal(204, res.statusCode, "Deleting user " + userId + " did not succeed: " + utils.getText(body));
        callback();
    });
};

utils.setGroups = function (userId, groups, callback) {
    request.patch({
        url: consts.BASE_URL + 'users/' + userId,
        headers: utils.makeHeaders('1', 'write_users'), // Admin required
        json: true,
        body: {
            groups: groups
        }
    }, function (err, res, body) {
        assert.isNotOk(err);
        assert.equal(200, res.statusCode, 'Setting user groups failed: ' + utils.getText(body));
        callback();
    });
};

utils.createApplication = function (appId, appInfo, userId, callback) {
    let appName = appInfo;
    let redirectUri = null;
    let mainUrl = null;
    let description = null;
    if (typeof (appInfo) === 'object') {
        if (appInfo.name)
            appName = appInfo.name;
        if (appInfo.redirectUri)
            redirectUri = appInfo.redirectUri;
        if (appInfo.mainUrl)
            mainUrl = appInfo.mainUrl;
        if (appInfo.description)
            description = appInfo.description;
    }
    request.post({
        url: consts.BASE_URL + 'applications',
        headers: utils.makeHeaders(userId, 'write_applications'),
        json: true,
        body: {
            id: appId,
            name: appName,
            redirectUri: redirectUri,
            description: description,
            mainUrl: mainUrl
        }
    }, function (err, res, body) {
        assert.isNotOk(err);
        assert.equal(201, res.statusCode, 'Create application should return 201: ' + utils.getText(body));
        callback();
    });
};

utils.deleteApplication = function (appId, userId, callback) {
    request.delete({
        url: consts.BASE_URL + 'applications/' + appId,
        headers: utils.makeHeaders(userId, 'write_applications')
    }, function (err, res, body) {
        assert.isNotOk(err);
        assert.equal(204, res.statusCode, 'Delete application should return 204');
        callback();
    });
};

utils.addOwner = function (appId, userId, email, role, callback) {
    request.post({
        url: consts.BASE_URL + 'applications/' + appId + '/owners',
        headers: utils.makeHeaders(userId, 'write_applications'),
        json: true,
        body: {
            email: email,
            role: role
        }
    }, function (err, res, body) {
        assert.isNotOk(err);
        assert.equal(201, res.statusCode, "Could not add owner '" + email + "' to application '" + appId + "': " + utils.getText(body));
        callback();
    });
};

utils.deleteOwner = function (appId, userId, email, callback) {
    request.delete({
        url: consts.BASE_URL + 'applications/' + appId + '/owners?userEmail=' + email,
        headers: utils.makeHeaders(userId, 'write_applications')
    }, function (err, res, body) {
        assert.isNotOk(err);
        assert.equal(200, res.statusCode, "Deleting owner '" + email + "' from application '" + appId + "' failed: " + utils.getText(body));
        callback();
    });
};

utils.addSubscription = function (appId, userId, apiId, plan, apikey, callback) {
    request.post({
        url: consts.BASE_URL + 'applications/' + appId + '/subscriptions',
        headers: utils.makeHeaders(userId, 'write_subscriptions'),
        json: true,
        body: {
            application: appId,
            api: apiId,
            plan: plan,
            apikey: apikey
        }
    }, function (err, res, body) {
        assert.isNotOk(err);
        assert.equal(201, res.statusCode, "Could not add subscription: " + utils.getText(body));
        callback(null, utils.getJson(body));
    });
};

utils.deleteSubscription = function (appId, userId, apiId, callback) {
    request.delete({
        url: consts.BASE_URL + 'applications/' + appId + '/subscriptions/' + apiId,
        headers: utils.makeHeaders(userId, 'write_subscriptions')
    }, function (err, res, body) {
        assert.isNotOk(err);
        assert.equal(204, res.statusCode, "Could not delete subscription: " + utils.getText(body));
        callback();
    });
};

utils.approveSubscription = function (appId, apiId, adminUserId, callback) {
    request.patch({
        url: consts.BASE_URL + 'applications/' + appId + '/subscriptions/' + apiId,
        headers: utils.makeHeaders(adminUserId, 'write_subscriptions'),
        json: true,
        body: { approved: true }
    }, function (err, res, body) {
        assert.isNotOk(err);
        assert.equal(200, res.statusCode, "Could not approve subscription for app " + appId + " to API " + apiId);
        callback();
    });
};

utils.createListener = function (listenerId, listenerUrl, callback) {
    request.put({
        url: consts.BASE_URL + 'webhooks/listeners/' + listenerId,
        headers: utils.makeHeaders('1', 'webhooks'),
        json: true,
        body: {
            id: listenerId,
            url: listenerUrl
        }
    }, function (err, apiResponse, apiBody) {
        assert.isNotOk(err);
        assert.equal(200, apiResponse.statusCode, "Could not create listener: " + utils.getText(apiBody));
        callback();
    });
};

utils.deleteListener = function (listenerId, callback) {
    request.delete({
        url: consts.BASE_URL + 'webhooks/listeners/' + listenerId,
        headers: utils.makeHeaders('1', 'webhooks')
    }, function (err, apiResponse, apiBody) {
        assert.isNotOk(err);
        assert.equal(204, apiResponse.statusCode, "Could not delete listener: " + utils.getText(apiBody));
        callback();
    });
};

utils.generateCrap = (len) => {
    return 'X'.repeat(len);
};

// Utility function to assert that a request was rejected due to a faulty/wrong scope
utils.assertScopeReject = (res, body) => {
    const jsonBody = utils.getJson(body);
    assert.equal(403, res.statusCode, 'Expected status code 403 for scope reject');
    assert.equal(403, jsonBody.code, 'Scope reject has to have status 403');
    assert.isOk(jsonBody.message, 'Body must have a message property');
    assert.isTrue(jsonBody.message.indexOf('Forbidden, missing required scope') >= 0, 'Unexpected error message');
};

// Utility function to assert that a request was rejected because it was called via
// the API Gateway (e.g. globals or such)
utils.assertKongReject = (res, body) => {
    const jsonBody = utils.getJson(body);
    assert.equal(403, res.statusCode, 'Expected status code 403 for Kong reject');
    assert.isOk(jsonBody.message, 'Body must have a message property');
    assert.isTrue(jsonBody.message.indexOf('Not allowed from outside network.') >= 0, 'Unexpected error message');
};

// Utility function to assert that a request was reject, but that it was NOT because
// the scope was wrong.
utils.assertNotScopeReject = (res, body) => {
    const jsonBody = utils.getJson(body);
    assert.equal(403, res.statusCode, 'Expected status code 403');
    if (jsonBody && jsonBody.message) {
        assert.isFalse(jsonBody.message.indexOf('Forbidden, missing required scope') >= 0, 'Unexpected error message');
    }
};

module.exports = utils;
