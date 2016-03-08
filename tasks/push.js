'use strict';
var fs = require('fs'),
	path = require('path'),
	inquirer = require('inquirer'),

	ServiceNow = require('../services/snclient'),
	require_config = require("../helper/config_validator"),
	fileHelper = require("../helper/file_helper"),
	HashHelper = require('../helper/hash'),
    syncDataHelper = require('../helper/sync_data_validator');





module.exports = function (grunt) {
    grunt.registerTask('push', 'Push command.', function (folder_name, file_name) {
		var _config = {},
			done = this.async(),
			new_files = [],
			_sync_data = [],
			hash = [],
			snHelper = {};

		var prompt = function(){
			return new Promise(function(resolve,reject){
				var questions = [
					{
						type: "checkbox",
						name: "folders",
						message: "What folders do you want to push to your instance?",
						choices : Object.keys(_config.folders)
					},
					{
						type: "confirm",
						name: "no_query",
						message: "Do you want to push all files for the selected folders?"
					},
					{
						type: "input",
						name: "prefix",
						message: "Please enter a search term to use for finding files",
						when : function (answers){
							return (answers.no_query) ? false : true;
						}

					}
				];
				inquirer.prompt(questions, function (answers) {
					resolve(answers);
				});

			});

		};

		var updateRecord = function(parms){
			return new Promise(function(resolve,reject){
				snHelper.updateRecord(parms,function(err,obj){
					if(err){
						console.error("Error on updateRecord: ", err)
						reject(err);
					}
					else{
						resolve();
					}
				});
			});
		};

		var getRecord = function(new_file){

			return new Promise(function(resolve, reject){
				// check if file is on server
				var file_name = path.basename(new_files.file_name),
				config_folder = _config.folders[new_file.folder_name],
				getQuery =  config_folder.key + "=" + file_name,
				queryObj = {
					table : config_folder.table,
					query : getQuery
				};
				console.log(getQuery);
				snHelper.getRecords(queryObj,function(err,obj){
					if(err){
						console.log("Error getting records: ", err);
						reject(err);
					}
					else if(obj.result.length === 0){

						new_file.table = config_folder.table;
						new_file.key = config_folder.key;
						new_file.field = config_folder.field;
						new_file.extension = config_folder.extension;

						resolve(new_file);
					}
					else{
						console.log("record exists");
					}

				});
			})
		};

		var createRecords = function(records){
			return new Promise(function(resolve, reject){
				var counter = 0;
				for(var i = 0; i < records.length; i++){
					(function(index){
						var payload = {};
						payload[records[index].key] = path.basename(records[index].file_name,"." + records[i].extension);
						payload[records[index].field] = records[index].content;
						payload['direct'] = true;
						var postObj = {
							table : records[index].table,
							payload : payload
						};

						snHelper.createRecord(postObj,function(err, result){
							counter++;
							updateSyncData(records[index].file_name,result,records[index].field)

							if(counter === records.length){
								resolve();
							}
						})

					}(i));

				}
			});
		};

		var askToCreateNewFiles = function() {
			(function(){
				return new Promise(function(resolve, reject){
					var files = [];
					var counter = 0;
					for(var i = 0; i < new_files.length; i++){

						(function(index){
							getRecord(new_files[index]).then(function(new_file){
								counter++;
								files.push(new_file);
								if(counter === new_files.length)
								{
									resolve(files);
								}
							});

						}(i));

					}
				});
			}()).then(function(files){

				inquirer.prompt([{
					type : "checkbox",
					name : "records",
					message : "The following files do not have records on the instance. Select which ones you want to create",
					choices : files.map(function(d){ return { name : path.basename(d["file_name"]), value : d}}),
					default : true

				}],function(answers){
					createRecords(answers.records).then(function(){
						syncDataHelper.saveData(_sync_data);
					});

				});
			});
		};

		function updateSyncData(record, obj,content_field){
			var parms = {
				sys_id: obj.result.sys_id,
				sys_updated_on: obj.result.sys_created_on,
				sys_updated_by: obj.result.sys_created_by,
				hash: hash.hashContent(obj.result[content_field])
			};
			_sync_data[record] = parms;

		}

		syncDataHelper.loadData().then(function (sync_data) {
			_sync_data = sync_data;
			require_config().then(function (config) {
				_config = config;
				hash = HashHelper(sync_data);

				snHelper = new ServiceNow(config).setup()

				var pushRecords = function(folder_name){
					return new Promise(function(resolve, reject){
						var destination = path.join(process.cwd(), grunt.config("destination")),
							full_name = path.join(destination,folder_name),
							prefix = "",
							config_folder = config.folders[folder_name];



						if(file_name){
							file_name = config.project_prefix + file_name;
							full_name = path.join(full_name,file_name);
							if(config.folders[folder_name].extension){

								full_name = full_name + "." + config.folders[folder_name].extension;
							}
						}
						else if(grunt.config("push_prefix")){
							prefix = grunt.config("push_prefix") + "*";

							if(config_folder.extension){

								prefix = prefix + "." + config_folder.extension;
							}
						}
						else{
							prefix = config.project_prefix + "*";
						}

						var files = fileHelper.readFiles(full_name,prefix);


						files.then(function(all_files){
							var count = 0;
							var num_records = all_files.length;

							for(var i = 0; i <all_files.
								length; i++){

								(function(index){
									var record_name = path.basename(all_files[i].name),
										payload = {},
										record_path = path.join(destination,folder_name,record_name);

//									 check if sync_data doesn't exists for file
									if(!sync_data[record_path]){
										new_files.push({
											folder_name : folder_name,
											file_name : record_path,
											content : all_files[i].content

										});
										count++;
										if(count === num_records){
											resolve();
										}
									}

									else{
										payload[config.folders[folder_name].field] = all_files[i].content;
										payload['direct'] = true;
										var	parms = {
											table : config.folders[folder_name].table,
											sys_id : sync_data[record_path].sys_id,
											payload : payload
										};

										updateRecord(parms).then(function(){
											count++;
											if(count === num_records)
											{
												resolve();
											}
										})


									}
								})(i);
							}

						});
					});

				};

				if(!folder_name && !file_name){

					prompt().then(function (answers) {
						grunt.config.set("push_prefix",answers.prefix);

						var count = 0;
						for(var i = 0; i < answers.folders.length; i++){
							(function(){
								pushRecords(answers.folders[i]).then(function(){
									count++;
									if(count === answers.folders.length){
										askToCreateNewFiles();
										done();
									}
								});
							})();


						}

					});

				}
				else{
					pushRecords(folder_name).then(function(){
						askToCreateNewFiles().then(function(){
							done();
						})
					});
				}
			});
		});
    });
};
