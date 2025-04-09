import ExClient from '../components/Core.js'
import plugin from '../../../lib/plugins/plugin.js'
import { CATEGORY } from '../components/Core.js'

let UserParam = {}

export class Search extends plugin {
    constructor() {
        super({
            name: 'ExLoli-搜索',
            dsc: 'ExLoli 搜索',
            event: 'message',
            priority: 1009,
            rule: [{
                reg: '^#?exloli搜索$',
                fnc: 'search'
            }, {
                reg: '^#?exloli(上|下|第|最后)一页$',
                fnc: 'changePage'
            }]
        })
    }

    async search(e) {
        if (!e.isMaster) {
            e.reply('臭萝莉控滚开啊！变态！！')
            return true
        }
        UserParam[e.user_id] = { step: 0 }
        e.reply("请输入你要搜索的词条，并用“,”分隔\n1.如不需要请填“无”,\n2.采用默认设置可回复“默认”")
        this.setContext("getInfo", e.isGroup, 60, "操作已超时，请重新发送指令")
    }
    async changePage(e) {
        let page = JSON.parse(await redis.get(`Yz:Exloli-plugin:${this.e.user_id}`))
        if (!page) return e.reply("你上次还未搜索过内容或者记录太久远了喵~")
        if (e.msg.includes("上")) {
            if (page.prev) {
                page.type = "prev"
                e.reply("正在搜索上一页的内容喵~")
            }
            else return e.reply("当前页没有上一页喵~")
        } else if (e.msg.includes("下")) {
            if (page.next) {
                page.type = "next"
                e.reply("正在搜索下一页的内容喵~")
            }
            else return e.reply("当前页没有下一页喵~")
        } else if (e.msg.includes("第一")) {
            if (page.first) {
                page.type = "first"
                e.reply("正在搜索第一页的内容喵~")
            }
            else return e.reply("当前页不能去到第一页喵~")
        } else if (e.msg.includes("最后")) {
            if (page.last) {
                page.type = "last"
                e.reply("正在搜索最后一页的内容喵~")
            }
            else return e.reply("当前页不能去到最后一页喵~")
        }
        let exClient = new ExClient(page[page.type].includes("exhentai.org"))
        page = await exClient.requestPage(exClient.handleParam(page))
        if (page.comicList.length === 0) {
            await this.e.reply("未搜索到结果")
        } else {
            redis.set(`Yz:Exloli-plugin:${this.e.user_id}`, JSON.stringify(page), { EX: 3600 })
            this.e.reply(Bot.makeForwardMsg(this.createPageMessage(page.comicList)))
        }
        return true
    }
    async getInfo() {
        switch (UserParam[this.e.user_id].step) {
            case 0:
                if (this.e.msg.includes("默认")) { }
                else if (this.e.msg.includes("无")) {
                    UserParam[this.e.user_id].search_param = ['']
                }
                else {
                    UserParam[this.e.user_id].search_param = this.e.msg.split(/[，,]/)
                }
                UserParam[this.e.user_id].step = 1
                await this.e.reply("请输入你要搜索的漫画类型\n1.全选可回复“全选”\n2.采用默认设置可回复“默认”\n3.如需要特定词条请回复数字序号并用“,”分隔\n\n\
1.同人 2.漫画 3.美术CG\n4.游戏CG 5.欧美 6.无H\n7.图集 8.Coser 9.亚洲\n10.杂项")
                break
            case 1:
                if (this.e.msg.includes("默认")) { }
                else if (this.e.msg.includes("全选")) {
                    UserParam[this.e.user_id].category = {}
                    for (let key in CATEGORY) {
                        UserParam[this.e.user_id].category[CATEGORY[key]] = true
                    }
                } else {
                    UserParam[this.e.user_id].category = {}
                    for (let key in CATEGORY) {
                        UserParam[this.e.user_id].category[CATEGORY[key]] = false
                    }
                    let number = this.e.msg.trim().split(/[，,]/)
                    number.forEach(element => {
                        if (CATEGORY.hasOwnProperty(element)) {
                            UserParam[this.e.user_id].category[CATEGORY[element]] = true
                        }
                    })
                }
                await this.e.reply("请输入最低星级0-5\n1.如采用默认设置可回复“默认”")
                UserParam[this.e.user_id].step = 2
                break
            case 2:
                if (this.e.msg.includes("默认")) { }
                else {
                    if (!isNaN(this.e.msg) && Number(this.e.msg) <= 5 && Number(this.e.msg) >= 0)
                        UserParam[this.e.user_id].f_srdd = Math.floor(Number(this.e.msg))
                }
                await this.e.reply("是否使用里站\n1.是请回复“是”")
                UserParam[this.e.user_id].step = 3
                break
            case 3:
                if (this.e.msg === "是") UserParam[this.e.user_id].isEx = true
                else UserParam[this.e.user_id].isEx = false
                UserParam[this.e.user_id].step = -1
                break
        }
        if (UserParam[this.e.user_id].step === -1) {
            this.finish("getInfo", this.e.isGroup)
            await this.e.reply("正在为您搜索中")
            let exClient = new ExClient(UserParam[this.e.user_id].isEx)
            let page = await exClient.requestPage(exClient.handleParam(UserParam[this.e.user_id]))
            if (page.comicList.length === 0) {
                await this.e.reply("未搜索到结果")
            } else {
                redis.set(`Yz:Exloli-plugin:${this.e.user_id}`, JSON.stringify(page), { EX: 3600 })
                this.e.reply(Bot.makeForwardMsg(this.createPageMessage(page.comicList)))
            }
            delete UserParam[this.e.user_id]
        }
    }
    createPageMessage(comicList) {
        let message = []
        comicList.forEach((comic, index) => {
            message.push({ message: `${index + 1}. 标题：${comic.title}页数：${comic.pages}\n上传时间：${comic.posted}\n原始地址：${comic.link}` })
        })
        message.push({ message: "查看当前页指定内容:\n“exloli推送1”\n切换页:\n“exloli第一页”，\n“exloli上一页”，\n“exlolo下一页”，\n“exloli最后一页”" })
        return message
    }
}
