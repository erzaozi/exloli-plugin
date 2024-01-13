import fs from 'fs';
import _ from 'lodash';
import simpleGit from 'simple-git';
import schedule from 'node-schedule';
import { pluginRoot } from '../model/path.js';
import Config from '../components/Config.js';
import Log from '../utils/logs.js';
import plugin from '../../../lib/plugins/plugin.js';

const repositoryUrl = 'https://github.com/erzaozi/exlolicomic.git';

// 推送漫画函数
async function pushComics(comicDifferences, pushConfig) {
    const { user: userList, group: groupList } = pushConfig;
    comicDifferences.forEach(comic => {
        let comicMessage = createComicMessage(comic);

        // Push to users
        userList.forEach(user => {
            try {
                Bot.pickUser(user).sendMsg([comicMessage, segment.image(comic.cover)]);
            } catch (error) {
                Log.e(error);
            }
        });

        // Push to groups
        groupList.forEach(group => {
            try {
                Bot.pickGroup(group).sendMsg([comicMessage, segment.image(comic.cover)]);
            } catch (error) {
                Log.e(error);
            }
        });
    });
}

// 创建漫画信息
function createComicMessage(comic) {
    let message = 'EXLOLI-PLUGIN 每日萝莉本子推送\n\n';
    message += `标题：${comic.title}\n发布时间：${comic.posted}\n上传者：${comic.uploader}\n页数：${comic.pages}\n`;
    Object.entries(comic.info).forEach(([key, values]) => {
        message += `${key}：${values.map(item => `#${item}`).join(' ')}\n`;
    });
    message += `原始链接：${comic.link}`;
    return message;
}

// 检查并更新漫画
async function checkAndUpdateComics() {
    const comicsPath = `${pluginRoot}/exlolicomic`;
    if (fs.existsSync(comicsPath)) {
        let currentComicList = Config.getComicList();
        const git = simpleGit();
        try {
            await git.cwd(comicsPath).pull(repositoryUrl, 'main', { '--rebase': 'true' });
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
schedule.scheduleJob('*/10 * * * *', checkAndUpdateComics);

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
