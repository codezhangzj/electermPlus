/**
 * Small brand-colored database logos, shown on server cards so a connection
 * that has DB credentials configured is recognizable at a glance.
 *
 * These are simplified, self-drawn marks (not the official trademarked logos)
 * in each product's brand color — recognizable at ~18px without shipping
 * third-party assets.
 */

// MySQL — dolphin silhouette in its blue/teal brand color.
function MysqlLogo () {
  return (
    <svg viewBox='0 0 24 24' width='1em' height='1em' aria-hidden='true'>
      <path
        fill='#00758F'
        d='M2 15.5c2.2.1 3.8-.4 5-1.5.4-.4.7-.8 1-1.3.2.4.5.8.9 1.1 1 .8 2.4 1 4 .7-.3-.5-.7-.9-1.2-1.2-.6-.4-1-.7-1.1-1.4 1.7.2 3.1-.1 4.3-1 .5-.4 1-.9 1.3-1.6-.6.1-1.1.1-1.6 0 1.4-.6 2.4-1.5 3-2.9-.7.3-1.4.5-2.1.6.7-.5 1.2-1.1 1.5-2-1.4 1-2.9 1.4-4.5 1.1-.4-.4-.9-.7-1.5-.9-1.6-.5-3.1 0-4.1 1.2-.9 1.1-1 2.5-.4 4-.9-.1-1.6-.5-2.3-1.1.1 1 .6 1.7 1.4 2.2-.5 0-1-.1-1.4-.3.1.9.9 1.7 2 2-.6.2-1.2.3-1.9.2.5 1 1.7 1.6 3.3 1.5-1 1-2.4 1.6-4.2 1.9-.4.1-.8.1-1.2.1z'
      />
      <circle cx='9.3' cy='9.2' r='.9' fill='#fff' />
      <circle cx='9.3' cy='9.2' r='.4' fill='#00758F' />
    </svg>
  )
}

// PostgreSQL — elephant-blue rounded mark.
function PostgresLogo () {
  return (
    <svg viewBox='0 0 24 24' width='1em' height='1em' aria-hidden='true'>
      <circle cx='12' cy='12' r='11' fill='#336791' />
      <path
        fill='#fff'
        d='M12 4.5c-3.6 0-6 2.2-6 5.4 0 2 .8 4.4 1.8 6 .5.8 1.1 1.3 1.7 1.3.5 0 .8-.4.9-1 .1.6.5 1 1 1 .7 0 1.3-.6 1.8-1.4 1-1.6 1.8-3.9 1.8-5.9 0-3.2-2.4-5.4-6-5.4h-.2zm-1.6 4.1c.5 0 .9.5.9 1.1s-.4 1.1-.9 1.1-.9-.5-.9-1.1.4-1.1.9-1.1zm3.3.2c.4 0 .7.4.7.9s-.3.9-.7.9-.7-.4-.7-.9.3-.9.7-.9z'
      />
    </svg>
  )
}

// Redis — cube stack in its signature red.
function RedisLogo () {
  return (
    <svg viewBox='0 0 24 24' width='1em' height='1em' aria-hidden='true'>
      <path fill='#D82C20' d='M12 3l9 3.4-9 3.4-9-3.4z' />
      <path fill='#A41E11' d='M12 10.2l9-3.4v3.2l-9 3.4-9-3.4V6.8z' />
      <path fill='#D82C20' d='M12 14.6l9-3.4v3.2l-9 3.4-9-3.4v-3.2z' />
    </svg>
  )
}

const logos = {
  mysql: MysqlLogo,
  postgresql: PostgresLogo,
  redis: RedisLogo
}

export default function DbTypeLogo ({ dbType }) {
  const Logo = logos[dbType] || MysqlLogo
  return <Logo />
}
