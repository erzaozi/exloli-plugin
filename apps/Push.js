import fs from "fs"
import ExClient from '../components/Core.js'
import plugin from '../../../lib/plugins/plugin.js'
import Config from '../components/Config.js'
import sharp from "sharp"
import path from "path"
import { deleteComic } from '../utils/store.js'
import { pluginResources } from '../model/path.js'


export class Push extends plugin {
    constructor() {
        super({
            name: 'ExLOLI-推送',
            dsc: 'ExLOLI 推送',
            event: 'message',
            priority: 1009,
            rule: [{
                reg: '^#?exloli推送(\\d+)?$',
                fnc: 'push'
            }, {
                reg: '^#?exloli推送本地漫画(\\d+)?$',
                fnc: 'pushLocalComic'
            }]
        })
        this.task = {
            name: '[Exloli-Plugin]自动推送',
            fnc: () => this.push({ isTask: true, msg: "exloli推送" }),
            cron: '*/5 * * * *',
            log: true
        }
    }

    async push(e) {
        if (!e.isTask && !e.isMaster) {
            e.reply('臭萝莉控滚开啊！变态！！')
            return true
        }

        if (Config.getConfig().push_list.user.length === 0 && Config.getConfig().push_list.group.length === 0) {
            if (!e.isTask) e.reply("您还未配置推送窗口")
            return true
        }

        let index = e.msg.match(/\d+$/)?.[0]
        let page
        if (!index) {
            let exClient = new ExClient(Config.getConfig().isEx)
            page = await exClient.requestPage(exClient.handleParam({}))
            if (e.isTask) {
                page.comicList = exClient.comicsFilter(page.comicList)
                if (page.comicList.length === 0) {
                    logger.info("[Exloli-Plugin] 未发现新的漫画")
                    return
                }
                else {
                    logger.mark(`[Exloli-Plugin] 推送漫画 \n====================\n ${page.comicList.map(i => i?.id).join(",")} \n====================`)
                    page.comicList = await exClient.requestComics(page.comicList)
                }
            }
            else {
                page.comicList = [page.comicList.find(comic => comic.pages <= Config.getConfig().max_pages)]
                logger.mark(`[Exloli-Plugin] 推送漫画 \n====================\n ${page.comicList.map(i => i?.id).join(",")} \n====================`)
                page.comicList = await exClient.requestComics([page.comicList[0]])
            }
        } else {
            index = index - 1
            page = JSON.parse(await redis.get(`Yz:Exloli-plugin:${this.e.user_id}`))
            if (!page) return e.reply("你上次还未搜索过内容哦~")
            if (index < 0 || index >= page.comicList.length - 1) return e.reply("输入的页码范围有误~")
            let exClient = new ExClient(page.comicList[index].link.includes("exhentai.org"))
            logger.mark(`[Exloli-Plugin] 推送漫画 \n====================\n ${page.comicList.map(i => i?.id).join(",")} \n====================`)
            page.comicList = await exClient.requestComics([page.comicList[index]])
        }
        await this.pusher(page.comicList)
        if (!Config.getConfig().local_save) {
            page.comicList.map(comic => { deleteComic(comic) })
        }
        return true
    }

    async pushLocalComic(e) {
        if (!fs.existsSync(`${pluginResources}/comics`)) return e.reply("本地还未存储任何漫画")
        const directories = fs.readdirSync(`${pluginResources}/comics`).filter((file) => {
            return fs.statSync(path.join(`${pluginResources}/comics`, file)).isDirectory()
        })
        if (directories.length === 0) return e.reply("本地还未存储任何漫画")
        const index = e.msg.match(/\d+$/)?.[0]
        if (index) {
            const dirName = directories[index - 1]
            if (fs.existsSync(`${pluginResources}/comics/${dirName}/info.json`)) {
                const comicInfo = { ...JSON.parse(fs.readFileSync(`${pluginResources}/comics/${dirName}/info.json`)), dirName }
                await this.pusher([comicInfo])
            }
        }
    }

    async pusher(comicList) {
        const { push_list: pushList, push_pic: pushPic } = Config.getConfig()
        const { user: userList, group: groupList } = pushList
        await Promise.all(comicList.map(async comic => {
            const comicMessage = await this.createComicMessage(comic)

            userList.forEach(async user => {
                try {
                    await Bot[user.split(':')[0]]?.pickUser(user.split(':')[1]).sendMsg(comicMessage)
                    if (pushPic) {
                        await Bot[user.split(':')[0]]?.pickUser(user.split(':')[1]).sendFile(comic.PDFfile)
                    }
                } catch (error) {
                    logger.error(error)
                }
            });

            groupList.forEach(async group => {
                try {
                    await Bot[group.split(':')[0]]?.pickGroup(group.split(':')[1]).sendMsg(comicMessage)
                    if (Config.getConfig().push_pic) {
                        await Bot[group.split(':')[0]]?.pickGroup(group.split(':')[1]).sendFile(comic.PDFfile)
                    }
                } catch (error) {
                    logger.error(error)
                }
            });
        }))
    }

    async createComicMessage(comic) {
        let message = ["ExLOLI-PLUGIN 每日本子\n\n"]
        try {
            const coverPic = await sharp(`${pluginResources}/comics/${comic.dirName}/0.png`).blur(10).toBuffer()
            if (coverPic) message.push(segment.image(coverPic))
        } catch (err) { }
        let text = ''
        Object.entries(comic.tags).forEach(([key, values]) => {
            text += `${key}：${values.map(item => `#${item}`).join(' ')}\n`;
        })
        text += `页数：${comic.pages}\n点赞数：${comic.favorite}\n上传时间：${comic.posted}\n原始地址：${comic.link}\n评分：${comic.star}`
        message.push(text)
        return message
    }
}
