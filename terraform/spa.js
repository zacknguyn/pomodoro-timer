function handler(event) {
  var request = event.request;
  // This function is associated only with the static behavior, never API requests.
  if (request.uri.split('/').pop().indexOf('.') === -1) request.uri = '/index.html';
  return request;
}
