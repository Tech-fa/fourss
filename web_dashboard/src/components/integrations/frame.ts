export const INTEGRATION_FRAME_NAMESPACE = 'fourss-integration'

const FRAME_POLICY =
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; form-action 'none'; frame-src 'none'"

export function integrationFrame(html: string, js: string) {
    const body = pageBody(html)
    const script = String(js || '').replace(/<\/script/gi, '<\\/script')
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${FRAME_POLICY}">
</head>
<body>
${body}
<script>
(function () {
  var namespace = ${JSON.stringify(INTEGRATION_FRAME_NAMESPACE)}
  var pending = {}
  function post(message) {
    parent.postMessage(Object.assign({ namespace: namespace }, message), '*')
  }
  function hostCall(method, payload) {
    var id = String(Date.now()) + '-' + Math.random()
    return new Promise(function (resolve, reject) {
      pending[id] = { resolve: resolve, reject: reject }
      post({ type: 'call', id: id, method: method, payload: payload })
    })
  }
  window.addEventListener('message', function (event) {
    if (event.source !== window.parent) return
    var data = event.data || {}
    if (data.namespace !== namespace || data.type !== 'result' || !pending[data.id]) return
    var waiter = pending[data.id]
    delete pending[data.id]
    if (data.ok) waiter.resolve(data.value)
    else waiter.reject(new Error(data.error || 'Request failed'))
  })
  window.integration = {
    api: function (path, init) {
      var request = init || {}
      return hostCall('api', { path: path, method: request.method || 'POST', body: request.body })
    },
    open: function (url) {
      return hostCall('open', { url: String(url || '') })
    },
    setStatus: function (text) {
      return hostCall('setStatus', { text: String(text || '') })
    }
  }
  post({ type: 'ready' })
})()
</script>
<script>${script}</script>
</body>
</html>`
}

function pageBody(html: string) {
    const match = String(html || '').match(/<body[^>]*>([\s\S]*)<\/body>/i)
    const inner = match ? match[1] : String(html || '')
    return inner.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
}
