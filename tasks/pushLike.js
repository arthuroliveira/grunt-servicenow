module.exports = function (grunt) {
	grunt.registerTask('pushLike', 'Push wrapper to add prefix.', function (folder_name,prefix) {

		grunt.config.set("push_prefix",prefix);

		grunt.task.run("push:" + folder_name);
	});
}
