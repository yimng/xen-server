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
      expire: expire,
    }
    fs.outputJsonSync(licensefile, trial)
}

startTrial.permission = 'admin'

export async function importLicense () {
  return {
    $sendTo: await this.registerHttpRequest(async (req, res) => {
      const licensefile = '/etc/license'
      const dest = fs.createWriteStream(licensefile)
      req.pipe(dest)
      const src = fs.createReadStream(licensefile)
      const de = child.spawn('gpg', ['--status-fd', '2', '--decrypt'])
      src.pipe(de.stdin)
      de.stderr.on('data', (data) => {
        console.log(`gpg stderr:\n${data}`)
      })

      de.stdout.on('data', (data) => {
        console.log(`gpg stdout:\n${data}`)
        this.importLicense(JSON.parse(data))
      })

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
        state: 'default',
        message: 'No license file found'
      }
    } else {
      return fs.readJsonSync(trial)
    }
  }
  console.log('start verify license>>>>>>>>>>>>>>>>>>>>>>>>>>')

  const src = fs.createReadStream(licensefile)
  const de = child.spawn('gpg', ['--status-fd', '2', '--decrypt'])
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
      if (finger === '462F56EE9B344DBDE3136F12F3EA515A80173E5C') {
        validfinger = true
      }
    }
  })
  if (!validsig) {
    return {
      edition: 1,
      message: 'The license is invalid signature'
    }
  }
  if (!trust) {
    return {
      edition: 1,
      message: 'The license is not trusted'
    }
  }
  if (!validfinger) {
    return {
      edition: 1,
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
      message: 'The mac info is not apply for this vStorage'
    }
  }
  if (!validcpu) {
    return {
      edition: 1,
      message: 'The cpu info in license is not apply for this vStorage'
    }
  }
  return license
}

getLicense.permission = 'admin'
getLicense.description = 'Gets existing License'


