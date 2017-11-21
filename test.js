const path = require('path');
const Repo = require('./libs/repo.js');
const osHomedir = require('os-homedir');
const repoDir= path.resolve(osHomedir(),'repo-test');
const repo = new Repo(repoDir);

let assert = require('assert');


//Verify given directory is a repository.
// repoDir will be provided via command line.

repo.isRepo().then(()=>{
    repo.getRemoteUrl().then(() =>{
        repo.getCurrentHeadCommitSha('master')
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

