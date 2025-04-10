import fs from "fs";
import ExClient from '../components/Core.js';
import plugin from '../../../lib/plugins/plugin.js';
import Config from '../components/Config.js';
import sharp from "sharp";
import path from "path";
import { deleteComic } from '../utils/store.js';
import { pluginResources } from '../model/path.js';

const NOT_MASTER_REPLY = '臭萝莉控滚开啊！变态！！';

export class Push extends plugin {
    constructor() {
        super({
            name: 'ExLoli-推送',
            dsc: 'ExLoli 推送',
            event: 'message',
            priority: 1009,
            rule: [{
                reg: '^#?exloli推送(\\d+)?$',
                fnc: 'push'
            }, {
                reg: '^#?exloli推送本地漫画(\\d+)?$',
                fnc: 'pushLocalComic'
            }, {
                reg: '^#?exloli推送所有本地漫画$',
                fnc: 'pushAllLocalComics'
            }]
        });
        this.task = {
            name: 'ExLoli-自动推送',
            fnc: () => this.push({ isTask: true, msg: "exloli推送" }),
            cron: '*/5 * * * *',
            log: true
        };
    }

    async push(e) {
        if (!e.isTask && !e.isMaster) {
            e.reply(NOT_MASTER_REPLY);
            return true;
        }

        const config = Config.getConfig();
        if (config.push_list.user.length === 0 && config.push_list.group.length === 0) {
            if (!e.isTask) e.reply("您还未配置推送窗口");
            return true;
        }

        let index = e.msg.match(/\d+$/)?.[0];
        let page;
        const exClient = new ExClient(config.isEx);

        if (!index) {
            page = await exClient.requestPage(exClient.handleParam({}));
            if (e.isTask) {
                page.comicList = exClient.comicsFilter(page.comicList);
                if (page.comicList.length === 0) {
                    logger.mark(logger.blue('[Exloli PLUGIN]'), logger.yellow(`未发现新的漫画`));
                    return;
                } else {
                    logger.mark(logger.blue('[Exloli PLUGIN]'), logger.cyan(`开始推送漫画`), logger.green(page.comicList.map(i => i?.id).join(",")));
                    page.comicList = await exClient.requestComics(page.comicList);
                }
            } else {
                const firstComic = page.comicList.find(comic => comic.pages !== undefined && comic.pages <= config.max_pages);
                if (firstComic) {
                    logger.mark(logger.blue('[Exloli PLUGIN]'), logger.cyan(`开始推送漫画`), logger.green([firstComic.id].join(",")));
                    page.comicList = await exClient.requestComics([firstComic]);
                } else {
                    e.reply("没有找到符合页数限制的漫画");
                    return true;
                }
            }
        } else {
            index = parseInt(index) - 1;
            const redisKey = `Yz:Exloli-plugin:search:${e.user_id}:page`;
            const cachedPage = await redis.get(redisKey);
            if (!cachedPage) return e.reply("你上次还未搜索过内容哦~");
            page = JSON.parse(cachedPage);
            if (index < 0 || index >= page.comicList.length) return e.reply("输入的页码范围有误~");
            const isExLink = page.comicList[index].link.includes("exhentai.org");
            const specificExClient = new ExClient(isExLink);
            logger.mark(logger.blue('[Exloli PLUGIN]'), logger.cyan(`开始推送漫画`), logger.green([page.comicList[index]?.id].join(",")));
            page.comicList = await specificExClient.requestComics([page.comicList[index]]);
        }

        if (page?.comicList?.length > 0) {
            await this.pusher(page.comicList);
            if (!config.local_save) {
                page.comicList.forEach(comic => deleteComic(comic));
            }
        }

        return true;
    }

    async pushLocalComic(e) {
        if (!fs.existsSync(path.join(pluginResources, 'comics'))) return e.reply("本地还未存储任何漫画");
        const directories = fs.readdirSync(path.join(pluginResources, 'comics')).filter((file) => {
            return fs.statSync(path.join(pluginResources, 'comics', file)).isDirectory();
        });
        if (directories.length === 0) return e.reply("本地还未存储任何漫画");
        const index = e.msg.match(/\d+$/)?.[0];
        if (index) {
            const dirIndex = parseInt(index) - 1;
            if (dirIndex >= 0 && dirIndex < directories.length) {
                const dirName = directories[dirIndex];
                const infoFilePath = path.join(pluginResources, 'comics', dirName, 'info.json');
                if (fs.existsSync(infoFilePath)) {
                    try {
                        const comicInfo = { ...JSON.parse(fs.readFileSync(infoFilePath)), dirName };
                        await this.pusher([comicInfo]);
                    } catch (error) {
                        logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`读取本地漫画信息失败`), logger.red(error));
                        e.reply("读取本地漫画信息失败");
                    }
                } else {
                    e.reply(`本地漫画 ${index} 的信息文件不存在`);
                }
            } else {
                e.reply(`本地漫画索引 ${index} 不存在`);
            }
        } else {
            e.reply(`请指定要推送的本地漫画索引`);
        }
    }

    async pushAllLocalComics(e) {
        if (!e.isMaster) {
            e.reply(NOT_MASTER_REPLY);
            return true;
        }
        if (!fs.existsSync(path.join(pluginResources, 'comics'))) return e.reply("本地还未存储任何漫画");
        const directories = fs.readdirSync(path.join(pluginResources, 'comics')).filter((file) => {
            return fs.statSync(path.join(pluginResources, 'comics', file)).isDirectory();
        });
        if (directories.length === 0) return e.reply("本地还未存储任何漫画");

        const allComicInfos = [];
        for (const dirName of directories) {
            const infoFilePath = path.join(pluginResources, 'comics', dirName, 'info.json');
            if (fs.existsSync(infoFilePath)) {
                try {
                    allComicInfos.push({ ...JSON.parse(fs.readFileSync(infoFilePath)), dirName });
                } catch (error) {
                    logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`读取本地漫画信息失败`), logger.red(error));
                }
            }
        }

        if (allComicInfos.length > 0) {
            await this.pusher(allComicInfos);
            e.reply(`已开始推送 ${allComicInfos.length} 本本地漫画`);
        } else {
            e.reply("没有找到本地漫画信息");
        }
    }

    async pusher(comicList) {
        const { push_list: pushList, push_pic: pushPic } = Config.getConfig()
        const { user: userList, group: groupList } = pushList

        const allTasks = []

        for (const comic of comicList) {
            const comicMessage = await this.createComicMessage(comic)

            for (const user of userList) {
                const [botId, userId] = user.split(':')
                const bot = Bot[botId]?.pickUser(userId)
                allTasks.push(
                    bot?.sendMsg(comicMessage).catch(logger.error)
                )
                if (pushPic) {
                    allTasks.push(
                        bot?.sendFile(comic.PDFfile).catch(logger.error)
                    )
                }
            }

            for (const group of groupList) {
                const [botId, groupId] = group.split(':')
                const bot = Bot[botId]?.pickGroup(groupId)
                allTasks.push(
                    bot?.sendMsg(comicMessage).catch(logger.error)
                )
                if (pushPic) {
                    allTasks.push(
                        bot?.sendFile(comic.PDFfile).catch(logger.error)
                    )
                }
            }
        }

        await Promise.all(allTasks)
    }

    async createComicMessage(comic) {
        const message = ["ExLoli-PLUGIN 每日本子\n"];
        try {
            const coverPath = path.join(pluginResources, 'comics', comic.dirName || comic.id.toString(), 'cover.webp');
            if (fs.existsSync(coverPath)) {
                const buffer = await fs.readFileSync(coverPath);
                const coverPic = await sharp(buffer).blur(10).toBuffer();
                if (coverPic) message.push(segment.image(coverPic));
            } else {
                logger.warn(`封面文件不存在: ${coverPath}`);
            }
        } catch (err) {
            logger.error('处理封面图片失败:', err);
        }
        let text = `标题：${comic.title}\n`;
        if (comic.tags) {
            Object.entries(comic.tags).forEach(([key, values]) => {
                text += `${key}：${values.map(item => `#${item}`).join(' ')}\n`;
            });
        }
        text += `页数：${comic.pages}\n点赞数：${comic.favorite}\n上传时间：${comic.posted}\n原始地址：${comic.link}\n评分：${comic.star}`;
        message.push(text);
        return message;
    }
}