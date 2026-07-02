/**
 * run command in remote terminal
 *
 * All metrics are collected with a single combined exec per refresh:
 * every sub command is prefixed with an echo marker, the combined output
 * is split back into sections and fed to the per-metric formatters.
 * The remote platform is detected once per session (uname -s) so
 * non-Linux servers get an explicit "unsupported" result instead of a
 * stream of failing GNU-specific commands.
 */

import { runCmd } from '../terminal/terminal-apis'
import { useEffect } from 'react'
import parseInt10 from '../../common/parse-int10'

export function formatActivities (str) {
  if (!str) {
    return {
      activities: []
    }
  }
  const r = str.split('\n')
    .map(a => a.trim())
    .filter(s => s)
    .map(st => {
      const arr = st.split(/ +/)
      return {
        pid: arr[0],
        user: arr[1],
        cpu: parseFloat(arr[2]),
        mem: parseInt10(arr[3]),
        cmd: arr.slice(4).join(' ')
      }
    }).filter(d => d.pid)
  return {
    activities: r
  }
}

export function formatDisks (str) {
  if (!str) {
    return {
      disks: []
    }
  }
  const r = str.split('\n')
    .slice(1)
    .map(s => {
      const arr = s.split(/ +/)
      return {
        filesystem: arr[0],
        size: arr[1],
        used: arr[2],
        avail: arr[3],
        usedPercent: arr[4],
        mount: arr[5]
      }
    })
    .filter(d => d.filesystem)
  return {
    disks: r
  }
}

export function formatCpu (str) {
  if (!str) {
    return {
      cpu: ''
    }
  }
  return {
    cpu: str.split(' ')[1]
  }
}

export function formatMem (str) {
  if (!str) {
    return {}
  }
  const names = ['mem', 'swap']
  return str
    .split('\n')
    .filter(d => d)
    .slice(1)
    .reduce((p, d, i) => {
      const arr = d.split(/\s+/)
      if (!arr[1]) {
        return p
      }
      p[names[i]] = {
        total: arr[1],
        used: arr[2],
        free: arr[3]
      }
      return p
    }, {})
}

const ipSplitReg = /\n[\d]{1,5}:\s+/
const ipNameReg = /inet\s+([\d]{1,3}\.[\d]{1,3}\.[\d]{1,3}\.[\d]{1,3})\/\d/

function formatIps (ips) {
  if (!ips) {
    return {}
  }
  const arr = ips.split(ipSplitReg)
  return arr.reduce((p, s) => {
    const name = s.replace(/^[\d]{1,5}:\s+/, '').split(/:\s+/)[0]
    const arr1 = s.match(ipNameReg)
    return {
      ...p,
      [name]: {
        ip: arr1 ? arr1[1] : ''
      }
    }
  }, {})
}

function formatTraffic (traffic, ipObj) {
  if (!traffic) {
    return ipObj
  }
  const arr = traffic.split(ipSplitReg)
  return arr.reduce((p, s) => {
    const name = s.replace(/^[\d]{1,5}:\s+/, '').split(/:\s+/)[0]
    const arr1 = s.split('\n')
    let download = 0
    let upload = 0
    const len = arr1.length
    for (let i = 0; i < len; i++) {
      const line = arr1[i]
      if (line.toLowerCase().trim().startsWith('rx')) {
        download = Number(arr1[i + 1].trim().split(/\s+/)[0])
      } else if (line.trim().toLowerCase().startsWith('tx')) {
        upload = Number(arr1[i + 1].trim().split(/\s+/)[0])
      }
    }
    if (!p[name]) {
      p[name] = {}
    }
    Object.assign(p[name], {
      download, upload
    })
    return p
  }, ipObj)
}

export function formatNetwork (traffic, ips) {
  const ipObj = formatIps(ips)
  return {
    network: formatTraffic(traffic, ipObj)
  }
}

export const terminalInfoCommands = [
  {
    name: 'uptime',
    cmd: 'uptime -p',
    formatter: d => ({ uptime: d.trim() })
  },
  {
    name: 'activities',
    cmd: 'ps --no-headers -o pid,user,%cpu,size,command ax | sort -b -k3 -r',
    formatter: formatActivities
  },
  {
    name: 'disks',
    cmd: 'df -h',
    formatter: formatDisks
  },
  {
    name: 'cpu',
    cmd: '(grep \'cpu \' /proc/stat;sleep 0.1;grep \'cpu \' /proc/stat)|awk -v RS="" \'{print "CPU "($13-$2+$15-$4)*100/($13-$2+$15-$4+$16-$5)"%"}\'',
    formatter: formatCpu
  },
  {
    name: 'mem',
    cmd: 'free -h',
    formatter: formatMem
  },
  {
    name: 'network',
    cmds: [
      'ip -s link',
      'ip addr'
    ],
    formatter: formatNetwork
  }
]

const infoMarker = '__ELECTERM_INFO__'
const defaultRefreshInterval = 5000

function getSubCommands (options) {
  return options.cmds || [options.cmd]
}

export function buildCombinedInfoCommand (commands = terminalInfoCommands) {
  const parts = []
  for (const options of commands) {
    getSubCommands(options).forEach((cmd, i) => {
      parts.push(`echo "${infoMarker}${options.name}_${i}"`)
      parts.push(cmd)
    })
  }
  return parts.join('; ')
}

export function parseCombinedInfoOutput (output = '') {
  const parts = String(output).split(new RegExp(`${infoMarker}(\\w+)\\r?\\n?`))
  const sections = {}
  // parts: [preamble, key1, text1, key2, text2, ...]
  for (let i = 1; i < parts.length - 1; i += 2) {
    sections[parts[i]] = parts[i + 1]
  }
  return sections
}

// platform per terminal session, so failed detections retry on next poll
const platformCache = new Map()

export async function detectRemotePlatform (pid) {
  if (platformCache.has(pid)) {
    return platformCache.get(pid)
  }
  const res = await runCmd(pid, 'uname -s 2>/dev/null || echo unknown')
  const platform = String(res || '').trim().split('\n')[0]
  if (platform) {
    platformCache.set(pid, platform)
  }
  return platform
}

export function isLinuxPlatform (platform) {
  return /linux/i.test(platform || '')
}

export async function fetchResourceSnapshot (pid, commands = terminalInfoCommands) {
  const platform = await detectRemotePlatform(pid)
  if (!platform) {
    throw new Error('no response from remote shell')
  }
  if (!isLinuxPlatform(platform)) {
    return {
      unsupportedPlatform: platform
    }
  }
  const output = await runCmd(pid, buildCombinedInfoCommand(commands))
  const sections = parseCombinedInfoOutput(output)
  const update = {}
  for (const options of commands) {
    const args = getSubCommands(options).map(
      (cmd, i) => sections[`${options.name}_${i}`] || ''
    )
    Object.assign(update, options.formatter(...args))
  }
  return update
}

function SnapshotPoller ({ pid, setState, interval = defaultRefreshInterval }) {
  useEffect(() => {
    let closed = false
    let timer
    const run = async () => {
      try {
        const update = await fetchResourceSnapshot(pid)
        if (!closed) {
          setState(update)
        }
      } catch (_) {
        // transient failures retry on next tick
      } finally {
        if (!closed) {
          timer = setTimeout(run, interval)
        }
      }
    }
    run()
    return () => {
      closed = true
      clearTimeout(timer)
    }
  }, [pid])
  return null
}

export default (props) => {
  if (!props.isRemote) {
    return null
  }
  return (
    <SnapshotPoller pid={props.pid} setState={props.setState} />
  )
}
