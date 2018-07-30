'use strict';

/* global it, describe, before, beforeEach, after, afterEach, slow, URL */

const assert = require('chai').assert;
const request = require('request');
const utils = require('./testUtils');
const consts = require('./testConsts');

describe('Resource Owner Password Grant', function () {

    this.slow(500);

    let ids;
    before(function (done) {
        this.timeout(5000);
        const now = new Date();
        utils.initAppsAndSubscriptions(function (err, idsAndSecrets) {
            assert.isNotOk(err);
            assert.isOk(idsAndSecrets);
            ids = idsAndSecrets;
            console.log('Before handler took ' + (new Date() - now) + 'ms.');
            done();
        });
    });

    after(function (done) {
        utils.destroyAppsAndSubcriptions(done);
    });

    describe('basic failure checks', function () {
        it('should reject calls with a faulty grant type', function (done) {
            const client = ids.trusted;
            const user = ids.users.normal;
            utils.authPost(`local/api/echo/token`, {
                client_id: client.clientId,
                client_secret: client.clientSecret,
                username: user.email,
                password: user.password
            }, function (err, res, body) {
                assert.isNotOk(err);
                assert.equal(400, res.statusCode);
                assert.equal('invalid_request', body.error);
                assert.equal(body.error_description, 'grant_type is missing.');
                done();
            });
        });

        it('should reject calls with an invalid client id', function (done) {
            const client = ids.trusted;
            const user = ids.users.normal;
            utils.authPost(`local/api/echo/token`, {
                grant_type: 'password',
                client_id: client.clientId + 'X',
                client_secret: client.clientSecret,
                username: user.email,
                password: user.password
            }, function (err, res, body) {
                assert.isNotOk(err);
                assert.equal(res.statusCode, 400);
                assert.equal('invalid_request', body.error);
                assert.equal(body.error_description, 'could not validate client_id and API subscription');
                done();
            });
        });

        it('should reject calls without a client secret (confidential apps)', function (done) {
            const client = ids.trusted;
            const user = ids.users.normal;
            utils.authPost(`local/api/echo/token`, {
                grant_type: 'password',
                client_id: client.clientId,
                username: user.email,
                password: user.password
            }, function (err, res, body) {
                assert.isNotOk(err);
                assert.equal(res.statusCode, 401);
                assert.equal(body.error, 'invalid_request');
                assert.equal(body.error_description, 'A confidential application must also pass its client_secret');
                done();
            });
        });

        it('should reject calls with an invalid client secret', function (done) {
            const client = ids.trusted;
            const user = ids.users.normal;
            utils.authPost(`local/api/echo/token`, {
                grant_type: 'password',
                client_id: client.clientId,
                client_secret: client.clientSecret + 'X',
                username: user.email,
                password: user.password
            }, function (err, res, body) {
                assert.isNotOk(err);
                assert.equal(res.statusCode, 401);
                assert.equal(body.error, 'invalid_request');
                assert.equal(body.error_description, 'Invalid client secret');
                done();
            });
        });

        it('should reject calls from a subscription which is not trusted', function (done) {
            const client = ids.confidential;
            const user = ids.users.normal;
            utils.authPost(`local/api/echo/token`, {
                grant_type: 'password',
                client_id: client.clientId,
                client_secret: client.clientSecret,
                username: user.email,
                password: user.password
            }, function (err, res, body) {
                assert.isNotOk(err);
                assert.equal(res.statusCode, 400);
                assert.equal(body.error, 'invalid_request');
                assert.equal(body.error_description, 'only trusted application subscriptions can retrieve tokens via the password grant.');
                done();
            });
        });

        it('should reject calls with client_secret from a trusted subscription which is not confidential', function (done) {
            const client = ids.public;
            const user = ids.users.normal;
            utils.authPost(`local/api/echo/token`, {
                grant_type: 'password',
                client_id: client.clientId,
                client_secret: client.clientSecret,
                username: user.email,
                password: user.password
            }, function (err, res, body) {
                assert.isNotOk(err);
                assert.equal(res.statusCode, 401);
                assert.equal(body.error, 'unauthorized_client');
                assert.isTrue(body.error_description.startsWith('client_secret is being passed'));
                done();
            });
        });
    });

    describe('basic success cases', function () {
        it('should be possible to retrieve an access token as a trusted application', function (done) {
            const client = ids.trusted;
            const user = ids.users.normal;
            utils.authPost(`local/api/echo/token`, {
                grant_type: 'password',
                client_id: client.clientId,
                client_secret: client.clientSecret,
                username: user.email,
                password: user.password
            }, function (err, res, body) {
                assert.isNotOk(err);
                assert.equal(res.statusCode, 200);
                assert.isOk(body.access_token);
                assert.isOk(body.refresh_token);
                assert.equal(body.token_type, 'bearer');
                done();
            });
        });

        it('should be possible to retrieve an access token as a trusted public application', function (done) {
            const client = ids.public;
            const user = ids.users.normal;
            utils.authPost(`local/api/echo/token`, {
                grant_type: 'password',
                client_id: client.clientId,
                username: user.email,
                password: user.password
            }, function (err, res, body) {
                assert.isNotOk(err);
                assert.equal(res.statusCode, 200);
                assert.isOk(body.access_token);
                assert.isOk(body.refresh_token);
                assert.equal(body.token_type, 'bearer');
                done();
            });
        });
    });
});