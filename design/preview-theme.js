// Native, URL-based appearance controls for standalone HTML review only.
(() => {
  const root = document.documentElement
  const url = new URL(location.href)
  let palette = url.searchParams.get('theme') === 'sage' ? 'sage' : 'electric'
  let choice = ['light', 'dark'].includes(url.searchParams.get('mode')) ? url.searchParams.get('mode') : 'system'
  const system = matchMedia('(prefers-color-scheme: dark)')
  function apply() {
    root.dataset.palette = palette
    root.dataset.mode = choice === 'system' ? (system.matches ? 'dark' : 'light') : choice
    refresh()
  }
  function refresh() {
    for (const link of document.querySelectorAll('a[href]')) {
      const target = new URL(link.href)
      if (!/(entry|pages)-preview\.html$/.test(target.pathname) || target.origin !== location.origin) continue
      target.searchParams.set('theme', palette); target.searchParams.set('mode', choice)
      if (new URL(location.href).searchParams.get('concept') === 'violet') target.searchParams.set('concept', 'violet')
      const navigation = new URL(location.href).searchParams.get('nav')
      if (navigation) target.searchParams.set('nav', navigation)
      link.href = target.href
    }
    for (const image of document.querySelectorAll('[data-theme-art]')) {
      image.src = palette === 'electric' ? 'assets/electric-dither.png' : 'assets/thread-dither.svg'
    }
    for (const image of document.querySelectorAll('[data-photo]')) {
      const stem = image.dataset.photo
      const suffix = palette === 'sage' && root.dataset.mode === 'light' ? '' : `-${palette}-${root.dataset.mode}`
      const variant = url.searchParams.get('concept') === 'violet' && suffix ? '-violet' : ''
      const prefix = `assets/${stem}${variant}${suffix}`
      image.src = `${prefix}-desktop.png`
      image.closest('picture').querySelector('source').srcset = `${prefix}-mobile.png`
      image.closest('a').href = image.src
    }
  }
  window.refreshPreviewAppearance = refresh
  window.getPreviewAppearance = () => ({ palette, mode: choice })
  window.setPreviewAppearance = (nextPalette, nextMode) => {
    palette = nextPalette === 'sage' ? 'sage' : 'electric'
    choice = ['light', 'dark'].includes(nextMode) ? nextMode : 'system'
    const target = new URL(location.href)
    target.searchParams.set('theme', palette); target.searchParams.set('mode', choice)
    history.replaceState(history.state, '', target)
    apply()
    const fields = document.querySelectorAll('.theme-picker select')
    if (fields.length) { fields[0].value = palette; fields[1].value = choice }
  }
  // Canonicalize once so hash links preserve the in-memory preview instead of reloading it.
  url.searchParams.set('theme', palette); url.searchParams.set('mode', choice)
  history.replaceState(history.state, '', url)
  apply()
  system.addEventListener('change', () => { if (choice === 'system') apply() })
  document.addEventListener('DOMContentLoaded', () => {
    const ribbon = document.querySelector('.review-ribbon,.prototype')
    if (!ribbon) return
    const picker = document.createElement('details')
    picker.className = 'theme-picker'
    picker.innerHTML = '<summary>Appearance</summary><div class="theme-options"><label>Color theme<select aria-label="Color theme"><option value="electric">Electric · purple / pink</option><option value="sage">Sage · green</option></select></label><label>Brightness<select aria-label="Brightness"><option value="system">Use device setting</option><option value="light">Light</option><option value="dark">Dark</option></select></label><p>HTML proposal only. Appearance carries between these previews in the URL.</p><a href="entry-preview.html#home">Product homepage</a><a href="pages-preview.html?scene=workspace">Workspace</a><a href="pages-preview.html?scene=board">Board</a></div>'
    ribbon.append(picker)
    const fields = picker.querySelectorAll('select')
    fields[0].value = palette; fields[1].value = choice
    picker.addEventListener('change', () => {
      window.setPreviewAppearance(fields[0].value, fields[1].value)
    })
    document.addEventListener('click', (event) => { if (!picker.contains(event.target) || event.target.closest('.theme-options a')) picker.open = false })
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && picker.open) { picker.open = false; picker.querySelector('summary').focus() } })
    refresh()
  })
})()
