import Config from "./Config.js";
import fetch from "node-fetch";
import fs from 'fs';
import schedule from "node-schedule";
import { HttpsProxyAgent } from "https-proxy-agent";
import { pluginResources } from "../model/path.js";
import path from 'path';

const TRANS_DB_PATH = path.join(pluginResources, 'translate', 'db.text.json');
const TRANSLATE_DIR_PATH = path.join(pluginResources, 'translate');

let proxyAgent = null;

function setupProxyAgent() {
    const config = Config.getConfig();
    if (config.proxy.enable && config.proxy.host && config.proxy.port) {
        const proxy = `http://${config.proxy.host}:${config.proxy.port}`;
        proxyAgent = new HttpsProxyAgent(proxy);
    } else {
        proxyAgent = null;
    }
}

schedule.scheduleJob("0 0 */1 * *", updateTransDb);

async function updateTransDb() {
    const config = Config.getConfig();
    if (!fs.existsSync(TRANSLATE_DIR_PATH)) {
        fs.mkdirSync(TRANSLATE_DIR_PATH);
    }
    try {
        setupProxyAgent();
        const response = await fetch('https://api.github.com/repos/EhTagTranslation/Database/releases', { agent: proxyAgent });
        if (!response.ok) {
            logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`获取翻译文件版本信息失败`), logger.red(response.status, response.statusText));
            return;
        }
        const releases = await response.json();
        if (!releases || releases.length === 0) {
            logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.red(`未找到翻译文件版本信息`));
            return;
        }
        const latestVersion = releases[0].tag_name;
        if (config.translate_db_version !== latestVersion) {
            logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`发现新版翻译文件`), logger.yellow(latestVersion));
            const dbResponse = await fetch(`https://github.com/EhTagTranslation/Database/releases/download/${latestVersion}/db.text.json`, { agent: proxyAgent });
            if (!dbResponse.ok) {
                logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`下载新版翻译文件失败`), logger.red(dbResponse.status, dbResponse.statusText));
                return;
            }
            const db = await dbResponse.json();
            fs.writeFileSync(TRANS_DB_PATH, JSON.stringify(db));
            config.translate_db_version = latestVersion;
            Config.setConfig(config);
            logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`更新翻译文件成功`), logger.green(latestVersion));
        } else {
            logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`当前翻译文件已是最新版本`), logger.green(config.translate_db_version));
        }
    } catch (error) {
        logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`更新翻译文件失败，当前使用版本`), logger.red(config.translate_db_version));
    }
}

async function getTransDb() {
    try {
        if (!fs.existsSync(TRANS_DB_PATH)) {
            logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`翻译文件不存在，尝试更新...`));
            await updateTransDb();
            if (!fs.existsSync(TRANS_DB_PATH)) {
                logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`更新翻译文件后仍然不存在，无法获取`));
                return null;
            }
        }
        const data = fs.readFileSync(TRANS_DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(` 获取翻译文件失败`), logger.red(error));
        return null;
    }
}

export default getTransDb;