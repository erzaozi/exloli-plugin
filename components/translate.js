import Config from "./Config.js"
import fetch from "node-fetch"
import fs from 'fs'
import schedule from "node-schedule"
import { HttpsProxyAgent } from "https-proxy-agent"
import { pluginResources } from "../model/path.js"

const TRANS_DB_PATH = `${pluginResources}/translate/db.text.json`

schedule.scheduleJob("0 0 */1 * *", updateTransDb)

async function updateTransDb() {
    let config = Config.getConfig()
    let agent
    if (config.proxy.enable) {
        let proxy = 'http://' + config.proxy.host + ':' + config.proxy.port
        agent = new HttpsProxyAgent(proxy)
    }
    if (!fs.existsSync(`${pluginResources}/translate`)) {
        fs.mkdirSync(`${pluginResources}/translate`)
    }
    try {
        let latestVersion = (await (await fetch('https://api.github.com/repos/EhTagTranslation/Database/releases', { agent })).json())[0].tag_name
        if (config.translate_db_version !== latestVersion) {
            logger.mark(`[Exloli-Plugin]发现新版翻译文件:${latestVersion}`)
            const db = await (await fetch(`https://github.com/EhTagTranslation/Database/releases/download/${latestVersion}/db.text.json`, { agent })).json()
            fs.writeFileSync(TRANS_DB_PATH, JSON.stringify(db))
            config.translate_db_version = latestVersion
            Config.setConfig(config)
            logger.mark(`[Exloli-Plugin]更新新版翻译文件:${latestVersion}`)
        }
    } catch (err) {
        logger.error(`[Exloli-Plugin]更新翻译文件失败，当前使用版本:${config.translate_db_version}`)
    }
}

async function getTransDb() {
    try {
        if (!fs.existsSync(TRANS_DB_PATH)) {
            await updateTransDb()
        }
        return JSON.parse(fs.readFileSync(TRANS_DB_PATH), 'utf-8')
    } catch (err) {
        logger.error(`[Exloli-Plugin]获取翻译文件失败`)
    }
}

export default getTransDb