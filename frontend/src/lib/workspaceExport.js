export function createWorkspaceExportFile(snapshot, now = new Date()) {
  const date = now.toISOString().slice(0, 10)
  return {
    filename: `pomogit-workspace-${date}.json`,
    contents: `${JSON.stringify(snapshot, null, 2)}\n`,
  }
}

export function downloadWorkspaceExport(snapshot, documentRef = document, urlApi = URL) {
  const file = createWorkspaceExportFile(snapshot)
  const url = urlApi.createObjectURL(new Blob([file.contents], { type: 'application/json' }))
  const link = documentRef.createElement('a')
  link.href = url
  link.download = file.filename
  documentRef.body.append(link)
  link.click()
  link.remove()
  urlApi.revokeObjectURL(url)
}
