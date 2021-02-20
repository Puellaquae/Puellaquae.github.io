class One {
    //clientId: string
    //refreshToken: string
    //accessToken: string

    constructor(client_id, refresh_token, filename, onGet) {
        this.clientId = client_id
        this.refreshToken = refresh_token
        this.filename = filename
        this.onGet = onGet
        this.content = []
        this.Refresh()
    }

    async Refresh() {
        if (this.refreshToken != null) {
            let res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'client_id=' + this.clientId + '&scope=offline_access Files.ReadWrite&refresh_token=' + this.refreshToken + '&grant_type=refresh_token',
                method: 'POST'
            })
            let resj = await res.json()
            this.accessToken = resj.access_token
            this.refreshToken = resj.refresh_token
            this.Poll()
        }
    }

    async Poll() {
        if (this.accessToken != null) {
            let res = await fetch('https://graph.microsoft.com/v1.0/me/drive/root:/' + this.filename + '?select=@microsoft.graph.downloadUrl', {
                headers: {
                    'Authorization': 'bearer ' + this.accessToken
                }
            })
            let resj = await res.json()
            let link = resj['@microsoft.graph.downloadUrl']
            if (link != null) {
                fetch(link).then(r => r.json()).then(r => {
                    this.content = r
                    this.onGet(r)
                })
            }
        }
    }

    Update() {
        if (this.accessToken != null) {
            fetch('https://graph.microsoft.com/v1.0/me/drive/root:/' + this.filename + ':/content', {
                    headers: {
                        'Authorization': 'bearer ' + this.accessToken
                    },
                    body: JSON.stringify(this.content),
                    method: 'PUT'
                })
                .catch(e => console.log(e))
        }
    }
}