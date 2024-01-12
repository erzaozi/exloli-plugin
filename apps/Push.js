import plugin from '../../../lib/plugins/plugin.js'
import _ from 'lodash'
import { pluginRoot } from '../model/path.js'
import fs from 'fs'
import Config from '../components/Config.js';
import simpleGit from 'simple-git';
import schedule from 'node-schedule'
import Log from '../utils/logs.js'

const accessToken = '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';
const username = 'erzaozi';
const repositoryUrl = 'https://github.com/erzaozi/exlolicomic.git';

// 每10分钟检查一次push函数
schedule.scheduleJob('*/10 * * * *', async () => {
    this.push();
});

export class Push extends plugin {
    constructor() {
        super({
            /** 功能名称 */
            name: 'EXLOLI-推送',
            /** 功能描述 */
            dsc: 'EXLOLI 推送',
            event: 'message',
            /** 优先级，数字越小等级越高 */
            priority: 1009,
            rule: [
                {
                    /** 命令正则匹配 */
                    reg: '^#?exloli推送$',
                    /** 执行方法 */
                    fnc: 'push'
                }
            ]
        })
    }

    async push(e) {
        // 判断是否克隆了数据库
        const exlolicomic_path = `${pluginRoot}/exlolicomic`
        if (fs.existsSync(exlolicomic_path)) {
            // 读取配置
            let comic_list_data = Config.getComicList();
            const git = simpleGit();
            try {
                await git.cwd(exlolicomic_path).pull(repositoryUrl, 'main', { '--rebase': 'true' });
                let comic_list_data_new = Config.getComicList();
                // 两个数组的差集
                let diff = _.differenceWith(comic_list_data_new, comic_list_data, _.isEqual);
                if (diff.length > 0) {
                    // 有新的漫画
                    // 读取配置
                    let config = Config.getConfig();
                    const push_list = config.push_list;
                    const user_list = push_list.user;
                    const group_list = push_list.group;
                    // 组合推送
                    diff.forEach(comic => {
                        let ComicMsg = 'EXLOLI-PLUGIN 每日萝莉本子推送\n\n';
                        ComicMsg += `标题：${comic.title}\n`;
                        for (const key in comic.info) {
                            ComicMsg += `${key}：`;
                            comic.info[key].forEach(item => {
                                ComicMsg += `#${item} `;
                            });
                            ComicMsg += '\n';
                        }
                        ComicMsg += `原始链接：${comic.link}\n`;
                        ComicMsg += `发布时间：${comic.posted}\n`;
                        ComicMsg += `上传者：${comic.uploader}\n`;
                        ComicMsg += `页数：${comic.pages}\n`;

                        // 遍历用户
                        user_list.forEach(user => {
                            // 推送漫画
                            diff.forEach(comic => {
                                try {
                                    Bot.pickUser(user).sendMsg([segment.image(comic.cover), segment.text(ComicMsg)])
                                } catch (err) {
                                    Log.e(err);
                                }
                            });
                        });
                        // 遍历群组
                        group_list.forEach(group => {
                            // 推送漫画
                            diff.forEach(comic => {
                                try {
                                    Bot.pickGroup(group).sendMsg([segment.image(comic.cover), segment.text(ComicMsg)])
                                } catch (err) {
                                    Log.e(err);
                                }
                            });
                        });
                    });
                    Log.i('有新的漫画，已推送');
                } else {
                    // 没有新的漫画
                    Log.i('没有新的漫画');
                }
            } catch (err) {
                Log.e(err);
            }
        }
    }
}