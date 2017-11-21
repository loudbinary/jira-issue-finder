const path = require('path');
const Repo = require('./../libs/repo.js');
const repo = new Repo();
const osHomedir = require('os-homedir');
const repoDir= path.resolve(osHomedir(),'repo-test');
let assert = require('assert');

describe('repo',function(){
    describe('isRepo',function(){
        it('repo-test is a repo, and should return true',function(){
            repo.isRepo(repoDir).then((result)=>{
                assert.equal(result,true);
            })
        })
    })
});