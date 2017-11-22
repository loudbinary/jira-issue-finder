#!/usr/bin/env node
const Repo = require('./../libs/repo.js');
const repoDir= process.cwd();
const repo = new Repo(repoDir);
const args = require('args');
const Promise = require('bluebird');
const _ = require('lodash');

args
    .option('branch', 'Show all jira-ids between current branch head to ancestor of branch argument(merge)')
    .option('since', 'Returns jira-ids in commits since <last-tag,midnight,noon,yesterday>','midnight')
    .option('debug', 'If enabled, shows details but will mess up simplicity of output',false)
    .option('repoDir', 'Physical location of local repository clone',process.cwd())

const flags = args.parse(process.argv);

if (flags.debug) {
    repo.debug = true;
}

if (flags.repoDir){
    repo.repoDir = flags.repoDir;
}


if (flags.since){
    repo.getJiraIdsSince(flags.since).then(()=>{
        console.log(repo.jiraIds.toString());
    })
}
if (flags.branch){
    repo.isRepo().then(()=>{
        repo.getRemoteUrl().then(() =>{
            repo.getCurrentHeadCommitSha(flags.branch)
                .then(()=>{
                    repo.evaulateHighestRepoTag()
                        .then(()=>{
                            repo.getLatestTagCommitSha().then(()=>{
                                repo.getJiraIds().then(()=>{
                                    console.log(repo.jiraIds.toString());
                                })
                            })

                        })
                })
        })
    })
}


