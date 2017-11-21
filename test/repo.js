const path = require('path');
const repo = require('./../libs/repo.js');
const repoDir= path.resolve(process.cwd(),'..','repo-test');
let assert = require('assert');

describe('repo',function(){
    describe('isRepo',function(){
        it('../repo-test is a repo, and should return true',function(){
            repo.isRepo(repoDir).should.equal('true');
        })
    })
});