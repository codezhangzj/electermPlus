/**
 * user-controll.json controll
 */

const { dbAction } = require('./db')
const { userConfigId, userNoEncryptConfigId } = require('../common/constants')
const { getDbConfig } = require('./get-config')
const globalState = require('./glob-state')
const { safeEncrypt, isSafeEncrypted } = require('./safe-storage')

const configNoEncryptFields = ['allowMultiInstance']

function hasNoEncryptFields (userConfig) {
  for (const f of configNoEncryptFields) {
    if (f in userConfig) {
      return true
    }
  }
  return false
}

exports.saveUserConfig = async (userConfig) => {
  const q = {
    _id: userConfigId
  }
  delete userConfig.host
  delete userConfig.terminalTypes
  delete userConfig.tokenElecterm
  delete userConfig.server
  delete userConfig.port
  // Field-level encryption for the AI API key: the renderer only ever holds
  // the safeStorage ciphertext; ai.js decrypts right before the HTTP call.
  if (userConfig.apiKeyAI && !isSafeEncrypted(userConfig.apiKeyAI)) {
    userConfig.apiKeyAI = safeEncrypt(userConfig.apiKeyAI)
  }
  globalState.update('config', userConfig)
  const conf = await getDbConfig()
  if (hasNoEncryptFields(userConfig)) {
    const q1 = {
      _id: userNoEncryptConfigId
    }
    const noEncryptConfig = {}
    for (const f of configNoEncryptFields) {
      if (f in userConfig) {
        noEncryptConfig[f] = userConfig[f]
      }
    }
    await dbAction('data', 'update', q1, noEncryptConfig, {
      upsert: true
    })
  }
  return dbAction('data', 'update', q, {
    ...q,
    ...conf,
    ...userConfig
  }, {
    upsert: true
  })
}
