"use strict";
var http = require('http');
var restler = require('restler');
var url = require('url');
var util = require('util');

module.exports = restler.service(
    function (config) {

        var auth = new Buffer(config.auth, "base64").toString(),
            parts = auth.split(":"),
            username = parts[0],
            password = parts[1],
            clientOptions = {
                baseURL: "https://" + config.host
            };

        var headers = {
            'Content-Type': 'application/json',
            'Accepts': 'application/json'
        };

        this.baseURL = clientOptions.baseURL;

        this.defaults.username = username;
        this.defaults.password = password;
        this.defaults.headers = headers;

    },
    {},
    {
        setup: function setup() {
            var client = this;

            function validateResponse(result, res) {
//				logResponse(result, res);

                var help = '';

                if (result instanceof Error) {
                    var errorlist = {
                        'ECONNREFUSED': 'Missing interent connection or connection was refused!',
                        'ENOTFOUND': 'No connection available (do we have internet?)',
                        'ETIMEDOUT': 'Connection timed out. Internet down?'
                    };

                    help = errorlist[result.code] || "Something failed badly.. internet connectiond own?";

                    help += util.format('\ndetails: %j', result);

                    console.warn(help);
                    console.error(result);

                    return new Error(help);
                }

                if (res.statusCode !== 200 && res.statusCode !== 201) {

                    if (res.statusCode === 401) {
                        help = 'Check credentials.';
                    } else if (res.statusCode === 302) {
                        help = 'Verify JSON Web Service plugin is activated.';
                    }
                    var message = util.format('%s - %s', res.statusCode, http.STATUS_CODES[res.statusCode]);
                    if (help) {
                        message += ' - ' + help;
                    }
                    if (result instanceof Error) {
                        message += util.format('\ndetails: %j', result);
                    }
                    return new Error(message);
                }

                if (result instanceof Error) {
                    return result;
                }
                if (result.error) {
                    console.error('ERROR found in obj.error : ', result.error);
                    // DP TODO : Investigate: Error: json object is null
                    return new Error(result.error);
                    // this is actually not an error! It's just that the server didn't return anything to us
                    //return null;
                }

                if (!result.result) {
                    return new Error(util.format('Response missing "records" key: %j\nCheck server logs.', result));
                }
                return null;
            }

            function logResponse(result, res) {
                var resCode = res ? res.statusCode : 'no response';
                console.error('-------------------------------------------------------');
                console.error(res);
                console.error('-------------------------------------------------------');
            }

            function send(request) {
                var maxRecords = request.rows;
                var urlObj;

                if (request.sys_id) {
                    urlObj = {
                        pathname: '/api/now/table/' + request.table + "/" + request.sys_id

                    };
                }
                else {

                    urlObj = {
                        pathname: '/api/now/table/' + request.table,
                        query: {
                            'sysparm_query': request.parmValue || ""
                        }
                    };

                    if (maxRecords) {
                        urlObj.query.sysparm_limit = maxRecords;
                    }

                    if (request.order_by) {
                        urlObj.query.sysparm_query = urlObj.query.sysparm_query + "^ORDERBY" + request.order_by
                    }

                    if (request.order_by_desc) {
                        urlObj.query.sysparm_query = urlObj.query.sysparm_query + "^ORDERBYDESC" + request.order_by_desc
                    }

                }

                var path = url.format(urlObj);

                function handleResponse(result, res) {
                    var err = validateResponse(result, res, request);

                    request.callback(err, result);
                }

                try {
                    if (request.postObj) {
                        if (request.action === "create") {
                            client.post(path, {data: JSON.stringify(request.postObj)}).on("complete", handleResponse);
                        }
                        else if (request.action === "update") {
                            client.put(path, {data: JSON.stringify(request.postObj)}).on("complete", handleResponse);
                        }

                    }
                    else {
                        client.get(path).on("complete", handleResponse);
                    }
                } catch (err) {
                    console.error("Some connection error happened...", err);
                    process.exit(1);
                }
            }

            function getRecords(obj, callback) {

                var parms = {
                    table: obj.table,
                    parmName: 'query',
                    parmValue: obj.query,
                    order_by: obj.order_by,
                    order_by_desc: obj.order_by_desc,
                    rows: obj.limit,
                    callback: callback
                };

                send(parms);
            }

            function get(url, callback) {
                client.get(url).on("complete", function (result) {
                    callback(result);
                });
            }

            function post(url, params, callback) {
                client.post(url, {data: JSON.stringify(params)}).on("complete", callback);
            }

            function put(url, params, callback) {
                client.put(url, {data: JSON.stringify(params)}).on("complete", callback);
            }

            function del(url, callback) {
                client.del(url).on("complete", callback);
            }

            function updateRecord(obj, callback) {
                //hack for ui_page
                obj.payload['direct'] = true;
                var parms = {
                    table: obj.table,
                    sys_id: obj.sys_id,
                    action: 'update',
                    postObj: obj.payload,
                    callback: callback
                };

                send(parms);
            }

            function createRecord(obj, callback) {
                var parms = {
                    table: obj.table,
                    action: 'create',
                    postObj: obj.payload,
                    callback: callback
                };

                send(parms);
            }

            function postObjectify(url, input, callback) {
                client.post(url).on("success", function (result) {
                    callback(result);
                }).on("error", function (err) {
                    console.log("error");
                });

            }

            return {
                get: get,
                post: post,
                del: del,
                put: put,
                getRecords: getRecords,
                updateRecord: updateRecord,
                createRecord: createRecord,
                postObjectify: postObjectify
            };

        }
    });
