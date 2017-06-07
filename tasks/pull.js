'use strict';

var fs = require('fs'),
    path = require('path'),
    inquirer = require('inquirer'),
    ServiceNow = require('../services/snclient'),
    require_config = require("../helper/config_validator"),
    fileHelper = require("../helper/file_helper"),
    HashHelper = require('../helper/hash'),
    util = require('../helper/util'),
    syncDataHelper = require('../helper/sync_data_validator'),
    DESTINATION;

require_config().then(function (config) {
    DESTINATION = config.app_dir;
});


module.exports = function (grunt) {
    grunt.registerTask('pull', 'Pull command.', function (folder_name, file_name) {
        var done = this.async();
        var force_update = grunt.option('force') || grunt.config('force');

        syncDataHelper.loadData().then(function (sync_data) {
            require_config().then(function (config) {
                var hash = HashHelper(sync_data);
                var snService = new ServiceNow(config).setup();

                var askQuestions = function () {
                    return new Promise(function (resolve, reject) {
                        var questions = [
                            {
                                type: "checkbox",
                                name: "folders",
                                message: "What record types do you want to pull from?",
                                choices: Object.keys(config.folders)

                            }, {
                                type: "input",
                                name: "prefix",
                                message: "Please enter a search term to use for finding records",
                                default: config.project_prefix
                                //when : function (answers){
                                //	return (answers.no_query) ? false : true;
                                //}
                            }
                        ];
                        inquirer.prompt(questions, function (answers) {
                            if (answers.prefix == config.project_prefix) {
                                if (config.libs) {
                                    config.libs.push(answers.prefix);
                                    answers.prefix = config.libs;
                                } else {
                                    answers.prefix = [answers.prefix];
                                }
                            } else {
                                answers.prefix = [answers.prefix];
                            }
                            resolve(answers);
                        });
                    });

                };

                var pullRecords = function (folder_name, file_name, exact_filename) {

                    return new Promise(function (resolve, reject) {
                        var operator = "STARTSWITH";
                        if (exact_filename) {
                            operator = "=";
                        }

                        var obj = {
                            table: config.folders[folder_name].table,
                            query: config.folders[folder_name].key + operator + file_name
                        };

                        snService.getRecords(obj, function (err, obj) {
                            var files_to_save = {},
                                files_different = {},
                                sync_data_different = {},
                                hashComparePromises = [],
                                hashComparePromise,
                                filename,
                                file_path;
                            obj.result.forEach(function (element) {
                                (function () {
                                    var custom_folder = config.folders[folder_name].folder;
                                    var content = element[config.folders[folder_name].field];
                                    filename = element[config.folders[folder_name].name] || element.name || element[config.folders[folder_name].key];
                                    file_path = path.join(custom_folder || folder_name, filename);

                                    if ('extension' in config.folders[folder_name]) {
                                        file_path = file_path + "." + config.folders[folder_name].extension;
                                    }
                                    var dest = path.join(DESTINATION, file_path);

                                    hashComparePromise = hash.compareHash(dest);
                                    hashComparePromises.push(hashComparePromise);

                                    hashComparePromise.then(function (hash_same) {
                                        // console.log(element)
                                        if (hash_same) {
                                            files_to_save[dest] = content;
                                            sync_data[dest] = {
                                                sys_id: element.sys_id,
                                                sys_updated_on: element.sys_updated_on,
                                                sys_updated_by: element.sys_updated_by,
                                                table: element.sys_class_name,
                                                field: folder_name,
                                                hash: hash.hashContent(content)
                                            };
                                        } else {
                                            files_different[dest] = content;
                                            sync_data_different[dest] = {
                                                sys_id: element.sys_id,
                                                sys_updated_on: element.sys_updated_on,
                                                sys_updated_by: element.sys_updated_by,
                                                table: element.sys_class_name,
                                                field: folder_name,
                                                hash: hash.hashContent(content)
                                            };
                                        }
                                    });
                                })();
                            });
                            Promise.all(hashComparePromises).then(function () {
                                if (Object.keys(files_different).length > 0) {
                                    console.log('You have mande changes to the following files.');
                                    for (var key in files_different) {
                                        console.log(" - " + key)
                                    }
                                    console.log('Do you want to overwrite your changes?');

                                    var questions = [{
                                        type: "confirm",
                                        name: "overwrite",
                                        message: "Do you want to overwrite your local changes??",
                                        default: false

                                    }];
                                    inquirer.prompt(questions, function (answers) {
                                        if (answers.overwrite) {
                                            files_to_save = util.mergeObject(files_to_save, files_different)
                                            sync_data = util.mergeObject(sync_data, sync_data_different);
                                        }
                                        fileHelper.saveFiles(files_to_save).then(function (files_saved) {
                                            resolve(files_saved);
                                        });
                                    });
                                } else {
                                    fileHelper.saveFiles(files_to_save).then(function (files_saved) {
                                        resolve(files_saved);
                                    });
                                }
                            });

                        });
                    });

                };

                if (!folder_name && !file_name) {
                    askQuestions().then(function (answers) {
                        var promises = [];
                        answers.folders.forEach(function (folder) {
                            answers.prefix.forEach(function (searchPrefix) {
                                promises.push(pullRecords(folder, searchPrefix, false));
                            });
                        });

                        Promise.all(promises).then(function (files_saved) {
                            console.log('Files saved: ');
                            files_saved.forEach(function (folder) {
                                folder.forEach(function (item) {
                                    console.log(' - ' + item);
                                });
                            });
                            // console.log(sync_data)
                            syncDataHelper.saveData(sync_data).then(function () {
                                done();
                            });
                        });
                    });
                } else {
                    var file_name_or_prefix = file_name || config.project_prefix;
                    var exact_filename = false;
                    if (file_name) {
                        exact_filename = true;
                    }

                    pullRecords(folder_name, file_name_or_prefix, exact_filename).then(function (files_saved) {
                        console.log('Files saved: ');
                        files_saved.forEach(function (item) {
                            console.log(' - ' + item);
                        });
                        syncDataHelper.saveData(sync_data).then(function () {
                            done();
                        });
                    }, function (err) {
                        console.error("\nThere was a problem completing this for: " + folder_name + "\n", err);
                        done();
                    })
                }
            });
        });
    });
};
