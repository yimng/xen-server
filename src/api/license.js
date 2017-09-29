import fs from 'fs-extra'
import * as child from 'child_process'
import streamToNewBuffer from '../stream-to-new-buffer'
// ===================================================================

export function clean () {
  return this.clean()
}

clean.permission = 'admin'

// -------------------------------------------------------------------

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
    throw new Error('The licnse is invalidsignature')
  }
  if (!trust) {
    throw new Error('The licnse is not trusted')
  }
  if (!validfinger) {
    throw new Error('The licnse is invalid finger')
  }
  console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$")
  console.log(JSON.parse(results[1].toString()))
  console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$")
  return JSON.parse(results[1].toString())
}

getLicense.permission = 'admin'
getLicense.description = 'Gets existing License'


