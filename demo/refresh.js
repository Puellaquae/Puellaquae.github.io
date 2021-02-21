var fs = require('fs')
var fetch = require('node-fetch');

function abort() {
     process.emit("exit")
     process.reallyExit(10)
}

fs.readFile('demo/token.js', (err, data) => {
     if (err) {
          console.error(err)
          abort()
     } else {
          let t = data.toString()
          eval(t)
          console.log('got old token')
          console.log(refreshToken)
          fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                    headers: {
                         'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: 'client_id=' + clientId + '&scope=offline_access Files.ReadWrite&refresh_token=' + refreshToken + '&client_secret=' + process.env.client_secret + '&grant_type=refresh_token',
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
                         fs.writeFile('demo/token.js', 'var clientId = "' + clientId + '"\nvar refreshToken = "' + refreshToken + '"', e => {
                              if (e) {
                                   console.log(e)
                                   abort()
                              } else {
                                   console.log('saved!')
                              }
                         })
                    }
               })
     }
})