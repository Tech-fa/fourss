export const PLAYGROUND_FRAME_NAMESPACE = 'fourss-playground'

const FRAME_POLICY =
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; form-action 'none'; frame-src 'none'"

export function playgroundFrame(indexHtml: string, appJs: string, enabled: boolean, offMessage = 'This playground is turned off.') {
    const body = pageBody(indexHtml)
    const script = String(appJs || '').replace(/<\/script/gi, '<\\/script')
    const banner = enabled ? '' : `<p>${escapeText(offMessage)}</p>`
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${FRAME_POLICY}">
</head>
<body>
${banner}
${body}
<script>
(function () {
  var namespace = ${JSON.stringify(PLAYGROUND_FRAME_NAMESPACE)}
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
  window.playground = {
    sql: function (statement, params) {
      return hostCall('sql', { statement: statement, params: params || [] })
    },
    fetch: function (path, init) {
      var request = init || {}
      return hostCall('fetch', { path: path, method: request.method || 'GET', body: request.body })
    },
    api: function (path, init) {
      var request = init || {}
      function send(file) {
        return hostCall('api', {
          path: path,
          method: request.method || 'GET',
          body: request.body,
          file: file
        })
      }
      var file = request.file
      if (!file || typeof file.arrayBuffer !== 'function') return send(null)
      return file.arrayBuffer().then(function (buffer) {
        return send({
          name: file.name || 'attachment',
          type: file.type || 'application/octet-stream',
          buffer: buffer
        })
      })
    }
  }
  post({ type: 'ready' })
})()
</script>
<script>${script}</script>
</body>
</html>`
}

function escapeText(value: string) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

function pageBody(html: string) {
    const match = String(html || '').match(/<body[^>]*>([\s\S]*)<\/body>/i)
    const inner = match ? match[1] : String(html || '')
    return inner.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
}
