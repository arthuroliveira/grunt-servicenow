'use strict';
var fs = require('fs'),
    path = require('path'),
	inquirer = require('inquirer'),
    ServiceNow = require('../services/snclient'),
    require_config = require("../helper/config_validator"),
	fileHelper = require("../helper/file_helper"),
    HashHelper = require('../helper/hash'),
    syncDataHelper = require('../helper/sync_data_validator');


function makeDestination(dest){
	return path.join(process.cwd(),dest);
}


module.exports = function (grunt) {
    grunt.registerTask('pull', 'Pull command.', function (folder_name,file_name) {
		var _config = {},
			_query = "",
			_hash = {},
			_sync_data = {};
        var done = this.async();
		var destination = makeDestination(grunt.config('destination'));


		var prompt = function(){
			return new Promise(function(resolve,reject){
				var questions = [
					{
						type: "checkbox",
						name: "folders",
						message: "What record types do you want to pull from?",
						choices : Object.keys(_config.folders)

					}, {
						type: "input",
						name: "prefix",
						message: "Please enter a search term to use for finding records",
						default : _config.project_prefix
						//when : function (answers){
						//	return (answers.no_query) ? false : true;
						//}
					}
				];
				inquirer.prompt(questions, function (answers) {
					resolve(answers);
				});

			});

		};

		var makeQuery = function(folder_name, file_name,prefix){
			var query = "",
				key = _config.folders[folder_name].key;

			// if file name exists pull the specific file
			if(file_name){
				query =  key + "=" + _config.project_prefix + file_name;
			}
			// if prefix specified in pullLike or via prompt use STARTSWITH
			else if(prefix)
			{
				query = key + "STARTSWITH" + prefix;

			}
			// otherwise always use the prefix
			else{
				query = key + "STARTSWITH" + _config.project_prefix;
			}

			_query = query;
		}

		var updateSyncData = function(obj,folder_name){

			return new Promise(function(resolve,reject){
				var config_object = _config.folders[folder_name],
					files_to_save = [];

				for(var i = 0; i < obj.result.length; i++){
					var result = obj.result[i],
						file_name = result[config_object.key];

					if(config_object.extension){
						file_name = file_name + "." + config_object.extension;
					}

					var dest = path.join(destination, folder_name,file_name);

					var content = result[config_object.field];

					files_to_save[dest] = content;
					_sync_data[dest] = {
						sys_id: result.sys_id,
						sys_updated_on: result.sys_updated_on,
						sys_updated_by: result.sys_updated_by,
						hash: _hash.hashContent(content)
					};
					if(i === obj.result.length-1){
						resolve(files_to_save);
					}
				}
			});
		}

		syncDataHelper.loadData().then(function (sync_data) {
			_sync_data = sync_data,
				_hash = HashHelper(sync_data);

			require_config().then(function (config) {
				_config = config;

				var snHelper = new ServiceNow(config);

				var pullRecords = function(folder_name){
					return new Promise(function(resolve,reject){

						var obj = {
							table : config.folders[folder_name].table,
							query : _query
						};

						snHelper.setup().getRecords(obj,function(err,obj){
							if (obj.result.length === 0){
								reject("No records found matched your query: " + _query);
							}

							updateSyncData(obj,folder_name).then(function(files_to_save){
								fileHelper.saveFiles(files_to_save
									).then(function(){
										syncDataHelper.saveData(sync_data);
										resolve();
									},function(err){
										console.error("Save file failed", err);
										reject(err);
									});

							});
						});
					});

				}
				if(!folder_name && !file_name){
					prompt().then(function(answers){
						var count = 0;
						for(var i = 0; i < answers.folders.length; i++){

							(function(){
								makeQuery(answers.folders[i], null,answers.prefix);
								pullRecords(answers.folders[i]).then(function(){
									count++;
									if(count == answers.folders.length){
										done();
									}
								});
							})();

						}
					});
				}
				else{
					makeQuery(folder_name,file_name);
					pullRecords(folder_name).then(function(){
						done();
					},function(err){
						console.error("\nThere was a problem completing this for: " + folder_name + "\n",err);
						done();
					})
				}
			});
		},function(err){
			console.log("Problem loading sync data.");
		});

    });
};
