export const PLAYGROUND_FRAME_NAMESPACE = 'fourss-playground'

export const IFRAME_BOOTSTRAP = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; frame-src 'none'">
</head>
<body>
<div id="root"></div>
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
    if (data.namespace !== namespace) return
    if (data.type === 'result' && pending[data.id]) {
      var waiter = pending[data.id]
      delete pending[data.id]
      if (data.ok) waiter.resolve(data.value)
      else waiter.reject(new Error(data.error || 'Request failed'))
      return
    }
    if (data.type !== 'run') return
    var page = data.page || {}
    if (page.enabled === false) {
      var banner = document.createElement('p')
      banner.textContent = 'This playground is turned off.'
      document.body.insertBefore(banner, document.body.firstChild)
    }
    var host = {
      page: page,
      get: function (entityType, entityId) {
        return hostCall('get', { entityType: entityType, entityId: entityId })
      },
      list: function (entityType, query) {
        return hostCall('list', { entityType: entityType, query: query || {} })
      },
      save: function (body) {
        return hostCall('save', body || {})
      },
      remove: function (entityType, entityId) {
        return hostCall('remove', { entityType: entityType, entityId: entityId })
      },
      fail: function (message) {
        return hostCall('fail', { message: String(message || '') })
      }
    }
    var produced = new Function('host', String(data.source || '') + '\\n;return typeof render==="function"?render:null;')(host)
    if (typeof produced === 'function') produced(host, document.getElementById('root'))
  })
  post({ type: 'ready' })
})()
</script>
</body>
</html>`
