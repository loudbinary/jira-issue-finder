const exec = require('child_process').execSync;
const path = require('path');

/**
 * Repo class object
 * @constructor
 */
function Repo(){
    /**
     * Ensures given path is a git repository
     * @param repoDir
     * @returns {boolean}
     */
   this.isRepo = function(repoDir) {
       let results = exec('git rev-parse --git-dir',{cwd:repoDir}).toString();
       results = removeLineBreaks(results);
       if (results == '.git'){
           console.log('true');
           return true;
       } else {
           console.log('false');
           return false;
       }
   };
}
function removeLineBreaks(str){
    return str.replace(/(\r\n|\n|\r)/gm,"").trim();
}

module.exports = new Repo();