#!/usr/bin/env node
const Repo = require('./../libs/repo.js');
const repoDir= process.cwd();
const repo = new Repo(repoDir);
const args = require('args');
const Promise = require('bluebird');

args
    .option('branch', 'Branch to interrogate highest sha number, and then display all jira ids since tag')
    .option('debug', 'If enabled, shows details but will mess up simplicity of output')

const flags = args.parse(process.argv);

if (flags.debug) {
    repo.debug = true;
}

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

