const exec = require('execa');
const path = require('path');
const semverMax = require('semver-max');
const semver = require('semver');
const _ = require('lodash');
const jira_matcher = /\d+-[A-Z]+(?!-?[a-zA-Z]{1,10})/g
const reverse = require('reverse-string');


let instance;

/**
 * Repo class object
 * @constructor
 */
function Repo(repoDir){
    if (_.isNil(instance)) {
        instance = this;
        instance.repoDir = repoDir; //Represents physical location on disk of local repository
        instance.repoUrl = ''; // Represents the upstream origin url of remote repository.
        instance.currentHeadSha = ''; //Represents commit sha of first checked out code.
        instance.highestTag = ''; //Represents highest semver valid tag in repository.
        instance.highestTag_sha = ''; //Represents commit sha of highestTag found in local repository.
        instance.debug = false; //If debug command line argument given, turns to true;
        return instance;
    } else {
        return instance;
    }
}

/**
 * Given array, will review each value and verify value is valid semantically versioned tag.
 * @param tags
 * @returns {Array}
 */
function filterAllTags(tags){
    let results = _.map(tags,(tag)=>{
        if (semver.valid(tag)){
            return tag;
        }
    })
    return _.compact(results);
}

/**
 * Windows doesn't have awk, grep, etc - So we have to perform version collections into array through other means.
 * @param rawTagStr
 * @returns {Array}
 */
function windowsGetNextVersion(rawTagStr) {
    let cursor = rawTagStr.split("\n");
    let versions = [];
    _.each(cursor,(ver)=>{
        let staged = ver.slice(51);
        // Annontated tags as a stringhave a ^{} that we need to remove..
        if (staged.indexOf("^{}")>0) {
            versions.push(staged.replace("^{}",""));
        } else {
            versions.push(staged);
        }
    });
    return versions;
}



function removeLineBreaks(str){
    return str.replace(/(\r\n|\n|\r)/gm,"").trim();
}

Repo.prototype.isRepo = function() {
    return new Promise((resolve,reject)=>{
        exec.shell('git rev-parse --git-dir', [],{cwd: instance.repoDir}).then(result => {
            let results = removeLineBreaks(result.stdout.toString());
            if (results.indexOf('.git') >= 0) {
                if (instance.debug){
                    console.log('Instance.debug:',instance.debug);
                }
                resolve(true);
            } else {
                reject('Unable to determine if directory:', instance.repoDir, 'is a legitimate repository.');
            }
        });
    });

};


Repo.prototype.getRemoteUrl = function(){
    return new Promise((resolve,reject)=>{
        return exec.shell(`cd ${instance.repoDir} && git remote get-url origin`).then(result => {
            let results = removeLineBreaks(result.stdout.toString());
            if (results != '') {
                instance.repoUrl = results;
                if (instance.debug){
                    console.log('Instance.repoUrl:',instance.repoUrl);
                }
                resolve(true);
            } else {
                reject('Unable to determine origin of present local repository');
            }
        });
    });
}

Repo.prototype.getCurrentHeadCommitSha = function(branch){
    this.branch = branch;
    return new Promise((resolve,reject)=>{
        let cmd = `git ls-remote ${instance.repoUrl} ${this.branch} | cut -c1-40`
        exec.shell(cmd).then(result =>{
            let sha = result.stdout.toString().replace(/(\r\n|\n|\r)/gm,"")
            if (sha =='') reject('Unable to determine commit sha of branch:'+ this.branch);
            instance.currentHeadSha = sha;
            if (instance.debug){
                console.log('Instance.currentHeadSha:', instance.currentHeadSha);
            }
            resolve(true); //Replace all line endings, (Windows, mac, linux)
        })
    })
}

Repo.prototype.evaulateHighestRepoTag = function (){
    return new Promise((resolve,reject)=>{
        // If jobrunner not executing on winblows.
        if (process.platform !== 'win32'){
            exec.shell(`git ls-remote --tags "${instance.repoUrl}" | awk '{print $2}' | grep -v '{}' | awk -F"/" '{print $3}' | sort -n -t. -k1,1 -k2,2 -k3,3`).then(result =>{
                let tags = result.stdout.split("\n");
                tags = filterAllTags(tags);
                if (tags.length == 0 || _.isNil(tags)){
                    reject('Unable to find any tags in repository');
                } else {
                    instance.highestTag = tags.reduce(semverMax);
                    if (instance.debug){
                        console.log('Instance.highestTag:',instance.highestTag);
                    }
                    resolve(true);
                }
            })
        }
        else {
            exec.shell(`git ls-remote --tags "${instance.repoUrl}"`).then(result =>{
                let tags = windowsGetNextVersion(result.stdout);
                tags = filterAllTags(tags);
                if (tags.length == 0 || _.isNil(tags)){
                    reject('Unable to find any tags in repository');
                } else {
                    instance.highestTag = tags.reduce(semverMax);
                    resolve(true);
                }
            })
        }
    })
};

/**
 * Get commit sha of [instance.latest_tag] found in repository, and if not possible assign [instance.latest_tag_sha] to
 * current commit sha, which simply means no jira ids will be found for some given unknown, and don't really care reason
 * right now....
 * @param instance
 * @return {Promise}
 */
Repo.prototype.getLatestTagCommitSha = function(){
    return new Promise((resolve)=>{
        exec.shell(`git ls-remote ${instance.repoUrl} | grep "${instance.highestTag}" | cut -b 1-40`).then(result =>{
            let results = result.stdout.toString().replace(/(\r\n|\n|\r)/gm,"##LF##");
            let foundShas = _.compact(results.split("##LF##")); //Compact to remove any possible empty array items.
            instance.highestTag_sha = foundShas[foundShas.length-1];
            if (instance.highestTag_sha !='') resolve(true);
            if (instance.debug){
                console.log('Instance.highestTag:', instance.highestTag_sha);
            }
            resolve('Unable to find commit sha of highestTag ' + instance.highestTag);
        })
    })
}

Repo.prototype.getJiraIdsSince = function(since){
    return new Promise((resolve,reject)=>{
        let cmd = `cd ${instance.repoDir} && git log --since=${since} --oneline --no-abbrev-commit`
        if (instance.debug){
            console.log('Executing cmd:',cmd);
        }

        exec.shell(cmd).then(result =>{
            let results = result.stdout;
            if (results != null){
                let newArray = [];
                if (results.indexOf('\n') === -1){
                    //newArray = _.dropRight(_.split(results,'\n',results.length));
                    newArray.push(results)
                } else {
                    newArray.push(results);
                }
                //let newArray = _.dropRight(_.split(results,'\n',results.length));
                let notes = newArray.map((item)=>{
                    // Javascript has no look behind, reverse to fool it.
                    return reverse(item.substring(item.indexOf(' '),item.length).trim())
                });

                let jiraIds = notes.map((item)=>{
                    let results = item.match(jira_matcher);
                    if (results) {
                        return reverse(results.toString())
                    }
                })
                jiraIds = _.uniq(jiraIds.filter((n)=> {return n != undefined}));


                let merged = _.map(jiraIds,(item)=>{
                    if (item.indexOf(',') != -1) {
                        return item.split(',');
                    } else {
                        return item;
                    }
                })
                instance.jiraIds = _.flattenDeep(merged);
                instance.jiraIds = _.uniqWith(instance.jiraIds,_.isEqual)
                if (instance.debug){
                    console.log('Found', instance.jiraIds.length,' jira ids');
                }
                resolve(true);
            } else {
                resolve('No jira ids found for evaluated tags ' + tag);
            }
        })
    })
}
Repo.prototype.getJiraIds = function() {
    return new Promise((resolve,reject)=>{
        //let tag = instance.highestTag_sha + '..' + instance.currentHeadSha;
        let tag = instance.currentHeadSha + '..' + instance.highestTag_sha;
        if (instance.highestTag_sha == instance.currentHeadSha){
            resolve('Commit shas match, no jira ids available.')
        }
        let cmd = `cd ${instance.repoDir} && git log ${tag} --oneline --no-abbrev-commit`;
        if (instance.debug){
            console.log('Executing cmd:',cmd);
        }
        exec.shell(cmd).then(result =>{
            let results = result.stdout;
            if (results != null){
                let newArray = _.dropRight(_.split(results,'\n',results.length));
                let notes = newArray.map((item)=>{
                    // Javascript has no look behind, reverse to fool it.
                    return reverse(item.substring(item.indexOf(' '),item.length).trim())
                });

                let jiraIds = notes.map((item)=>{
                    let results = item.match(jira_matcher);
                    if (results) {
                        return reverse(results.toString())
                    }
                })
                jiraIds = _.uniq(jiraIds.filter((n)=> {return n != undefined}));


                let merged = _.map(jiraIds,(item)=>{
                    if (item.indexOf(',') != -1) {
                        return item.split(',');
                    } else {
                        return item;
                    }
                })
                instance.jiraIds = _.flattenDeep(merged);
                instance.jiraIds = _.uniqWith(instance.jiraIds,_.isEqual)
                if (instance.debug){
                    console.log('Found', instance.jiraIds.length,' jira ids');
                }

                resolve(true);
            } else {
                resolve('No jira ids found for evaluated tags ' + tag);
            }
        })

    })

}

module.exports = Repo;