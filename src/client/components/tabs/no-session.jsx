import HomeDashboard from '../home-dashboard/home-dashboard.jsx'
import './no-session.styl'

export default function NoSessionPanel ({ height, onNewTab, onNewSsh, batch }) {
  if (window.store.showHomeDashboard) {
    return null
  }
  return (
    <HomeDashboard
      height={height}
      onNewTab={onNewTab}
      onNewSsh={onNewSsh}
      batch={batch}
    />
  )
}
