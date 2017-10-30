import fs from 'fs-extra'
import * as child from 'child_process'
import streamToNewBuffer from '../stream-to-new-buffer'
import os from 'os'
// ===================================================================

export function clean () {
  return this.clean()
}

clean.permission = 'admin'

// -------------------------------------------------------------------
export async function startTrial() {
    const licensefile = '/etc/trial'
    let now = new Date();
    let expire = now.setDate(now.getDate() + 30);
    let trial = {
      edition: 4,
      plan: 'trial',
      expire: expire,
    }
    fs.outputJsonSync(licensefile, trial)
}

startTrial.permission = 'admin'

export async function importLicense () {
  return {
    $sendTo: await this.registerHttpRequest(async (req, res) => {
      const tmpfile = '/tmp/lic_tmp'
      const licensefile = '/etc/license'
      const dest = fs.createWriteStream(tmpfile)
      req.pipe(dest)

      const src = fs.createReadStream(tmpfile)
      const de = child.spawn('gpg', ['--homedir', '/opt/xensource/gpg', '--status-fd', '2', '--decrypt'])
      src.pipe(de.stdin)
      let results = await Promise.all([streamToNewBuffer(de.stderr), streamToNewBuffer(de.stdout)])

      console.log(results[0].toString())
      console.log(results[1].toString())
      let validsig = false
      let trust = false
      let validfinger = false
      let lines = results[0].toString().split('\n')
      lines.forEach(function(line) {
        if (line.startsWith('[GNUPG:] GOODSIG')) {
          validsig = true
        }
      })
      lines.forEach(function(line) {
        if (line.startsWith('[GNUPG:] TRUST_ULTIMATE')) {
          trust = true
        }
      })
      lines.forEach(function(line) {
        if (line.startsWith('[GNUPG:] VALIDSIG')) {
          let finger = line.split(' ')[2]  
          if (finger === 'A83BAA6F2FD3B493256FE753D544C62C6AE03E6D') {
            validfinger = true
          }
        }
      })
      if (!validsig) {
        res.writeHead(200, 'invalidsig')
        res.end()
        return
      }
      if (!trust) {
        res.writeHead(200, 'untrusted')
        res.end()
        return
      }
      if (!validfinger) {
        res.writeHead(200, 'invalidfinger')
        res.end()
        return
      }
      let license = JSON.parse(results[1].toString())
      let cpus = os.cpus()
      let model = cpus[0].model
      let networks = os.networkInterfaces()
      let cpumodel = cpus[0].model
      let macs = []
      let keys = Object.keys(networks)
      for (var key of keys) {
        let ifc = networks[key]
        macs.push(ifc[0].mac)
      }
      let validmac = false
      for (var mac of macs) {
        if (mac === license.mac) {
          validmac = true
          break
        }
      }
      let validcpu = cpumodel === license.cpu
      if (!validmac) {
        res.writeHead(200, 'invalidmac')
        res.end()
        return
      }
      if (!validcpu) {
        res.writeHead(200, 'invalidcpu')
        res.end()
        return
      }
      fs.copySync(tmpfile, licensefile)
      res.end('license successfully imported')
    })
  }
}

importLicense.permission = 'admin'

export async function getLicense () {
  const licensefile = '/etc/license'
  const trial= '/etc/trial'
  console.log('verify the license file exists or not')
  console.log(fs.pathExistsSync(licensefile))
  if (!fs.pathExistsSync(licensefile)) {
    if (!fs.pathExistsSync(trial)) {
      console.log('>>>>>>>>>>>>>>>>>>>>the license file is not existing')
      return {
        edition: 1,
        plan: 'free',
        state: 'default',
        message: 'This license is free'
      }
    } else {
      return fs.readJsonSync(trial)
    }
  }
  console.log('start verify license>>>>>>>>>>>>>>>>>>>>>>>>>>')

  const src = fs.createReadStream(licensefile)
  const de = child.spawn('gpg', ['--homedir', '/opt/xensource/gpg', '--status-fd', '2', '--decrypt'])
  src.pipe(de.stdin)
  let results = await Promise.all([streamToNewBuffer(de.stderr), streamToNewBuffer(de.stdout)])

  let validsig = false
  let trust = false
  let validfinger = false
  let lines = results[0].toString().split('\n')
  lines.forEach(function(line) {
    if (line.startsWith('[GNUPG:] GOODSIG')) {
      validsig = true
    }
  })
  lines.forEach(function(line) {
    if (line.startsWith('[GNUPG:] TRUST_ULTIMATE')) {
      trust = true
    }
  })
  lines.forEach(function(line) {
    if (line.startsWith('[GNUPG:] VALIDSIG')) {
      let finger = line.split(' ')[2]  
      if (finger === 'A83BAA6F2FD3B493256FE753D544C62C6AE03E6D') {
        validfinger = true
      }
    }
  })
  if (!validsig) {
    return {
      edition: 1,
      plan: 'free',
      message: 'The license is invalid signature'
    }
  }
  if (!trust) {
    return {
      edition: 1,
      plan: 'free',
      message: 'The license is not trusted'
    }
  }
  if (!validfinger) {
    return {
      edition: 1,
      plan: 'free',
      message: 'The license is invalid finger print'
    }
  }
  let license = JSON.parse(results[1].toString())
  console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$")
  console.log(license)
  console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$")
  let cpus = os.cpus()
  console.log(cpus)
  let model = cpus[0].model
  let networks = os.networkInterfaces()
  console.log(networks)
  let cpumodel = cpus[0].model
  console.log(cpumodel)
  let macs = []
  let keys = Object.keys(networks)
  for (var key of keys) {
    let ifc = networks[key]
    macs.push(ifc[0].mac)
  }
  console.log(macs)
  let validmac = false
  for (var mac of macs) {
    if (mac === license.mac) {
      validmac = true
      break
    }
  }
  let validcpu = cpumodel === license.cpu
  console.log(license.mac)
  console.log(license.cpu)
  console.log('>>>>>>>>>>>>>>>>>>>>>>>>validmac' + validmac)
  console.log('>>>>>>>>>>>>>>>>>>>>>>>>validcpu' + validcpu)
  if (!validmac) {
    return {
      edition: 1,
      plan: 'free',
      message: 'The mac info is not apply for this vStorage'
    }
  }
  if (!validcpu) {
    return {
      edition: 1,
      plan: 'free',
      message: 'The cpu info in license is not apply for this vStorage'
    }
  }
  return license
}

getLicense.permission = 'admin'
getLicense.description = 'Gets existing License'


export async function applyLicense() {
  return {
    $getFrom: await this.registerHttpRequest((req, res) => {
      res.writeHead(200, 'OK', {
        'content-disposition': 'attachment'
      })
      let cpus = os.cpus()
      let networks = os.networkInterfaces()
      let macs = []
      let keys = Object.keys(networks)
      for (let key of keys) {
        if (key === 'lo')
          continue
        let ifc = networks[key]
        macs.push(ifc[0].mac)
      }
      let license = {
        edition: '4',
        plan: 'premium',
        mac: macs[0],
        cpu: cpus[0].model
      }
      const encrypt = child.spawn('gpg', ['--homedir', '/opt/xensource/gpg', '--recipient', 'halsign', '--encrypt'])
      let str = JSON.stringify(license)
      encrypt.stdin.write(str)
      encrypt.stdin.end()
      encrypt.stdout.pipe(res)
      return
    },
    undefined,
    { suffix: '/license.request' })
  }
}
applyLicense.permission = 'admin'

