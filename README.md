# ServiceNow Grunt Tasks
Grunt tasks used to work with pushing and pullin records to a ServiceNow instance

### Installation

You need Grunt CLI installed globally:
```sh
$ npm install -g grunt-cli
```

```sh
$ npm install grunt-servicenow --save-dev
```

### Tasks
- [watchAndPush](#watchAndPush) - Monitor all directories for changes and push to instance
- [pull](#pull) - Grab changes to records from instance and bring down
- [push](#push) - Grab local changes and push to instance
- [runserver](#runserver) - Run a local server that proxies REST requests to the defined instance

## init <a name="init"></a>
This sets up the configuration file with a hash of your instance credentials, insstance name, and project prefix

```sh
$ grunt init
```
![grunt init](https://raw.githubusercontent.com/arthuroliveira/grunt-servicenow/develop/images/gruntinitTask.gif "Animation that shows init task")

**This is a mandatory tasks to run for all instance related tasks.**
## watchAndPush <a name="watchAndPush"></a>
```sh
$ grunt watch
$ grunt watch:FolderName
```
## pull <a name="pull"></a>

### With Prompts
This task will prompt what record type(s) you want to pull down
```sh
$ grunt pull 
```

### Specific Record Type
This pulls down all records in the given record type (e.g. ui_pages, content_css). By default, we will only pull down files prefixed with whatever **project prefix** you specified during `grunt init`.

You can access any record type specified in `.sn-config.json`


```sh
$ grunt pull:RecordType
```

### Specific Record
This pulls down a specific record from a specific record type (e.g. a ui\_page called __project\_prefixrecordName__). By default, we will prepend the name you specify with the **project prefix** you specified during `grunt init`.

```sh
$ grunt pull:RecordType:RecordName
```

## pullLike
Wraps the pull task and adds a prefix to search a given record type (e.g. find all ui\_pages that start with __prefix__). This enables you to override the prefix specified in `.sn-config.json` or pull down a file with a specific name.

```sh
$ grunt pullLike:RecordType:prefix
```

## push <a name="push"></a>

### With Prompts
This task will prompt what folders you wan to update from and ask for a file wildcard 

```sh
$ grunt push
```

### Specifc Folder
This updates all records from the files in the given folder (e.g. ui/_pages, content/_css). You can access any folder specified in `.sn-config.json`

**Note** If you want to use a prefix for finding records, use `grunt push` or `grunt pushLike`

```sh
$ grunt push:FolderName
```

### Specific File
This updates a specific record from a specific folder (e.g. a ui\_page called __fileName__).

```sh
$ grunt push:FolderName:FileName
```

## pushLike
Wraps the push task and adds a prefix to search a given folder (e.g. find all ui\_pages that start with __prefix__)

```sh
$ grunt pullLike:FolderName:prefix
```

## runserver <a name="runserver"></a>
```sh
$ grunt runserver #default port 3000
$ grunt runserver:PORT
```
### Version
0.0.1

License
----

MIT

