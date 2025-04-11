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
                fnc: 'pushHandle'
            }, {
                reg: '^#?exloli推送本地漫画(\\d+)?$',
                fnc: 'pushLocal'
            }, {
                reg: '^#?exloli推送所有本地漫画$',
                fnc: 'pushAll'
            }]
        });
        this.task = {
            name: 'ExLoli-自动推送',
            fnc: () => this.pushHandle({ isTask: true }),
            cron: '*/5 * * * *',
            log: true
        };
    }

    async pushHandle(e) {
        if (!e.isTask && !e.isMaster) return e.reply(NOT_MASTER_REPLY) || true;
    
        const config = Config.getConfig();
        const index = e.msg?.match(/\d+$/)?.[0];
        let page;
    
        const logPush = ids => logger.mark(logger.blue('[Exloli PLUGIN]'), logger.cyan('开始推送漫画'), logger.green(ids));
        const getClient = isEx => new ExClient(isEx);
        const handleResponse = async (client, comics) => {
            logPush(comics.map(c => c.id));
            return client.requestComics(comics);
        };
    
        if (!index) {
            if (!config.push_list.user.length && !config.push_list.group.length) {
                return !e.isTask && e.reply("您还未配置推送窗口") || true;
            }
    
            const client = getClient(config.isEx);
            page = await client.requestPage(client.handleParam({}));
            let comics = e.isTask ? client.comicsFilter(page.comicList) : 
                [page.comicList.find(c => c.pages <= config.max_pages)];
    
            if (!comics.length || !comics[0]) return e.isTask ? 
                logger.mark(logger.blue('[Exloli PLUGIN]'), logger.yellow('未发现新的漫画')) : 
                e.reply("没有找到符合页数限制的漫画") || true;
    
            page.comicList = await handleResponse(client, e.isTask ? comics : [comics[0]]);
        } else {
            const cachedPage = await redis.get(`Yz:Exloli-plugin:search:${e.user_id}:page`);
            if (!cachedPage) return e.reply("你上次还未搜索过内容哦~");
            
            page = JSON.parse(cachedPage);
            const idx = parseInt(index) - 1;
            if (idx < 0 || idx >= page.comicList.length) return e.reply("输入的页码范围有误~");
            
            const comic = page.comicList[idx];
            page.comicList = await handleResponse(getClient(comic.link.includes('exhentai.org')), [comic]);
        }
    
        if (page.comicList?.length) {
            await this.pushComic(page.comicList, index ? e : false);
            !config.local_save && page.comicList.forEach(c => deleteComic(c));
        }
    
        return true;
    }

    async pushLocal(e) {
        const getPath = (...args) => path.join(pluginResources, 'comics', ...args);
        const comicPath = getPath();
    
        if (!fs.existsSync(comicPath) || !fs.readdirSync(comicPath).some(f => fs.statSync(getPath(f)).isDirectory())) 
            return e.reply("本地还未存储任何漫画");
    
        const directories = fs.readdirSync(comicPath).filter(f => fs.statSync(getPath(f)).isDirectory());
        if (!directories.length) return e.reply("本地还未存储任何漫画");
    
        const index = e.msg.match(/\d+$/)?.[0];
        if (!index) return e.reply("请指定要推送的本地漫画索引");
    
        const dirIndex = parseInt(index) - 1;
        if (dirIndex < 0 || dirIndex >= directories.length) return e.reply(`本地漫画索引 ${index} 不存在`);
    
        const dirName = directories[dirIndex];
        const infoFile = getPath(dirName, 'info.json');
    
        if (!fs.existsSync(infoFile)) return e.reply(`本地漫画 ${index} 的信息文件不存在`);
    
        try {
            const comicInfo = { ...JSON.parse(fs.readFileSync(infoFile)), dirName };
            await this.pushComic([comicInfo], e);
        } catch (err) {
            logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`读取本地漫画信息失败`), logger.red(err)) 
            && e.reply("读取本地漫画信息失败");
        }
    }

    async pushAll(e) {
        if (!e.isMaster) return e.reply(NOT_MASTER_REPLY) || true;
        
        const comicPath = path.join(pluginResources, 'comics');
        const getInfo = dir => {
            try {
                const info = path.join(comicPath, dir, 'info.json');
                return fs.existsSync(info) && { ...JSON.parse(fs.readFileSync(info)), dir };
            } catch (err) {
                logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan('读取本地漫画信息失败'), logger.red(err));
            }
        };
    
        const directories = fs.existsSync(comicPath) && fs.readdirSync(comicPath).filter(f => 
            fs.statSync(path.join(comicPath, f)).isDirectory()
        );
        
        if (!directories?.length) return e.reply("本地还未存储任何漫画");
        
        const allComicInfos = directories.map(getInfo).filter(Boolean);
        await (allComicInfos.length ? this.pushComic(allComicInfos, e) : e.reply("没有找到本地漫画信息"));
        
        return allComicInfos.length ? e.reply(`已成功推送 ${allComicInfos.length} 份本地漫画`) : true;
    }

    async pushComic(comicList, event = null) {
        const { push_list: pushList, push_pic: pushPic } = Config.getConfig();
        let targets = [];

        if (event) {
            const botId = event.self_id;
            const id = event.isGroup ? event.group_id : event.user_id;
            targets.push({
                botId,
                id,
                isGroup: event.isGroup
            });
        } else {
            targets = [
                ...pushList.user.map(u => ({
                    botId: u.split(':')[0],
                    id: u.split(':')[1],
                    isGroup: false
                })),
                ...pushList.group.map(g => ({
                    botId: g.split(':')[0],
                    id: g.split(':')[1],
                    isGroup: true
                }))
            ];
        }

        const allTasks = [];
        for (const comic of comicList) {
            const comicMessage = await this.createMessage(comic);

            for (const { botId, id, isGroup } of targets) {
                const bot = isGroup ?
                    Bot[botId]?.pickGroup(id) :
                    Bot[botId]?.pickUser(id);

                if (!bot) continue;

                allTasks.push(bot.sendMsg(comicMessage).catch(logger.error));
                if (pushPic) {
                    allTasks.push(bot.sendFile(comic.PDFfile).catch(logger.error));
                }
            }
        }

        await Promise.all(allTasks);
    }

    async createMessage(comic) {
        const message = ["ExLoli-PLUGIN 每日本子\n"];
        
        const addCover = async () => {
            try {
                const coverPath = path.join(pluginResources, 'comics', comic.dirName || comic.id, 'cover.webp');
                if (!fs.existsSync(coverPath)) return logger.warn(`封面文件不存在: ${coverPath}`);
                
                const processed = await sharp(await fs.readFileSync(coverPath)).blur(10).toBuffer();
                return segment.image(processed);
            } catch (err) {
                logger.error('处理封面图片失败:', err);
            }
        };
    
        const buildText = () => [
            `标题：${comic.title}`,
            ...(comic.tags ? Object.entries(comic.tags).map(([k, v]) => 
                `${k}：${v.map(i => `#${i}`).join(' ')}`) : []),
            `页数：${comic.pages}`,
            `点赞数：${comic.favorite}`,
            `上传时间：${comic.posted}`,
            `原始地址：${comic.link}`,
            `评分：${comic.star}`
        ].join('\n');
    
        const cover = await addCover();
        cover && message.push(cover);
        message.push(buildText());
    
        return message;
    }
}