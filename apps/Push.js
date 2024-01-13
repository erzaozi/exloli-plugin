import fs from 'fs';
import _ from 'lodash';
import simpleGit from 'simple-git';
import schedule from 'node-schedule';
import { pluginRoot } from '../model/path.js';
import Config from '../components/Config.js';
import Log from '../utils/logs.js';
import plugin from '../../../lib/plugins/plugin.js';

// 组合合并转发函数
async function mergeForward(picList) {
    picList.forEach(pic => {
        let forwardMsg = [];
        forwardMsg.push({
            user_id: Bot.uin,
            nickname: Bot.nickname,
            message: segment.image(pic)
          });
    });
    return forwardMsg;
}

// 推送漫画函数
async function pushComics(comicDifferences, pushConfig) {
    const { user: userList, group: groupList } = pushConfig;
    comicDifferences.forEach(comic => {
        let comicMessage = createComicMessage(comic);

        // Push to users
        userList.forEach(user => {
            try {
                Bot.pickUser(user).sendMsg(["EXLOLI-PLUGIN 每日萝莉本子\n\n", segment.image(comic.cover), comicMessage]);
                Bot.pickUser(user).sendForwardMsg(mergeForward(comic.pages_url));
            } catch (error) {
                Log.e(error);
            }
        });

        // Push to groups
        groupList.forEach(group => {
            try {
                Bot.pickGroup(group).sendMsg(["EXLOLI-PLUGIN 每日萝莉本子\n\n", segment.image(comic.cover), comicMessage]);
                Bot.pickGroup(group).sendForwardMsg(mergeForward(comic.pages_url));
            } catch (error) {
                Log.e(error);
            }
        });
    });
}

// 创建漫画信息
function createComicMessage(comic) {
    let message = `\n${comic.title}\n\n上传时间：${comic.posted}(${comic.uploader})\n`;
    Object.entries(comic.info).forEach(([key, values]) => {
        message += `${key}：${values.map(item => `#${item}`).join(' ')}\n`;
    });
    message += `页数：${comic.pages}\n原始地址：${comic.link}`;
    return message;
}

// 检查并更新漫画
async function checkAndUpdateComics() {
    const comicsPath = `${pluginRoot}/exlolicomic`;
    if (fs.existsSync(comicsPath)) {
        let currentComicList = Config.getComicList();
        const git = simpleGit();
        try {
            const GITHUB_TOKEN = Config.getConfig().lolicon_token
            const GITHUB_USERNAME = 'erzaozi';
            await git.cwd(comicsPath).pull(`https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@mirror.ghproxy.com/https://github.com/erzaozi/exlolicomic.git`, 'main', { '--rebase': 'true' });
            let updatedComicList = Config.getComicList();
            let comicDifferences = _.differenceWith(updatedComicList, currentComicList, _.isEqual);

            if (comicDifferences.length > 0) {
                let pushConfig = Config.getConfig().push_list;
                await pushComics(comicDifferences, pushConfig);
                Log.i('有新的漫画，已推送：' + comicDifferences.map(comic => comic.title).join(', '));
            } else {
                Log.i('没有新的漫画，最新漫画更新时间：' + updatedComicList[0].posted);
            }
        } catch (error) {
            Log.e(error);
        }
    }
}

// 每10分钟检查一次
schedule.scheduleJob('*/1 * * * *', checkAndUpdateComics);

export class Push extends plugin {
    constructor() {
        super({
            name: 'EXLOLI-推送',
            dsc: 'EXLOLI 推送',
            event: 'message',
            priority: 1009,
            rule: [{
                reg: '^#?exloli推送$',
                fnc: 'push'
            }]
        });
    }

    async push() {
        await checkAndUpdateComics();
    }
}
