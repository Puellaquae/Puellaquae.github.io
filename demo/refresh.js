function abort() {
     process.emit("exit")
     process.reallyExit(10)
}

const {
     Octokit
 } = require("@octokit/core")
 
 var fetch = require('node-fetch');
 
 const octokit = new Octokit({
     auth: process.env.GistAuth
 })
 
 var clientId = "58c536e5-d57e-4160-abc8-83a11e040807"
 var gistId = 'c4ab586d153ecf56b386ac2db0728263'
 
 
 octokit.request('GET /gists/{gist_id}', {
     gist_id: gistId
 }).then(r => r.data).then(r => {
     let refreshToken = r.files["token.txt"].content
     console.log('Got Old Token')
     console.log(refreshToken)
     fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
             headers: {
                 'Content-Type': 'application/x-www-form-urlencoded',
                 'Origin': 'http://localhost/index.html'
             },
             body: 'client_id=' + clientId + '&scope=offline_access Files.ReadWrite&refresh_token=' + refreshToken + '&grant_type=refresh_token',
             method: 'POST'
         })
         .then(r => r.json())
         .then(res => {
             refreshToken = res.refresh_token
             if (refreshToken == null || refreshToken == undefined) {
                 console.log(JSON.stringify(res, null, 2))
                 abort()
             } else {
                 console.log('got new token')
                 console.log(refreshToken)
                 octokit.request('PATCH /gists/{gist_id}', {
                     gist_id: gistId,
                     files: {
                         "token.txt": {
                             'content': refreshToken
                         }
                     }
                 })
             }
         })
 })