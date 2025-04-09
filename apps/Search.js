import ExClient from '../components/Core.js';
import plugin from '../../../lib/plugins/plugin.js';
import { CATEGORY } from '../components/Core.js';

const USER_SEARCH_PARAM_KEY = 'Yz:Exloli-plugin:search:';
const NOT_MASTER_REPLY = '臭萝莉控滚开啊！变态！！';
const SEARCH_TIMEOUT = 60;

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
        });
    }

    async search(e) {
        if (!e.isMaster) {
            e.reply(NOT_MASTER_REPLY);
            return true;
        }
        const userId = e.user_id;
        const defaultParam = { step: 0 };
        await redis.set(USER_SEARCH_PARAM_KEY + userId, JSON.stringify(defaultParam), { EX: SEARCH_TIMEOUT });
        e.reply("请输入你要搜索的词条，并用“,”分隔\n1.如不需要请填“无”,\n2.采用默认设置可回复“默认”");
        this.setContext("getInfo", e.isGroup, SEARCH_TIMEOUT, "操作已超时，请重新发送指令");
    }

    async changePage(e) {
        const userId = this.e.user_id;
        const cachedPage = await redis.get(USER_SEARCH_PARAM_KEY + userId + ':page');
        if (!cachedPage) return e.reply("你上次还未搜索过内容或者记录太久远了喵~");

        let page = JSON.parse(cachedPage);
        let pageType;

        if (e.msg.includes("上")) {
            pageType = page.prev ? "prev" : null;
            if (pageType) e.reply("正在搜索上一页的内容喵~");
            else return e.reply("当前页没有上一页喵~");
        } else if (e.msg.includes("下")) {
            pageType = page.next ? "next" : null;
            if (pageType) e.reply("正在搜索下一页的内容喵~");
            else return e.reply("当前页没有下一页喵~");
        } else if (e.msg.includes("第一")) {
            pageType = page.first ? "first" : null;
            if (pageType) e.reply("正在搜索第一页的内容喵~");
            else return e.reply("当前页不能去到第一页喵~");
        } else if (e.msg.includes("最后")) {
            pageType = page.last ? "last" : null;
            if (pageType) e.reply("正在搜索最后一页的内容喵~");
            else return e.reply("当前页不能去到最后一页喵~");
        }

        if (pageType) {
            const exClient = new ExClient(page[pageType].includes("exhentai.org"));
            const newPage = await exClient.requestPage(exClient.handleParam({ ...page, type: pageType }));
            if (newPage.comicList.length === 0) {
                await this.e.reply("未搜索到结果");
            } else {
                await redis.set(USER_SEARCH_PARAM_KEY + userId + ':page', JSON.stringify(newPage), { EX: 3600 });
                this.e.reply(Bot.makeForwardMsg(this.createPageMessage(newPage.comicList)));
            }
        }
        return true;
    }

    async getInfo() {
        const userId = this.e.user_id;
        const paramKey = USER_SEARCH_PARAM_KEY + userId;
        const cachedParam = await redis.get(paramKey);
        if (!cachedParam) {
            this.finish("getInfo", this.e.isGroup);
            return this.e.reply("搜索参数已过期，请重新发送 #exloli搜索");
        }
        const userParam = JSON.parse(cachedParam);

        switch (userParam.step) {
            case 0:
                if (this.e.msg.includes("默认")) {
                    userParam.search_param = [];
                } else if (this.e.msg.includes("无")) {
                    userParam.search_param = [''];
                } else {
                    userParam.search_param = this.e.msg.split(/[，,]/);
                }
                userParam.step = 1;
                await redis.set(paramKey, JSON.stringify(userParam), { EX: SEARCH_TIMEOUT });
                await this.e.reply("请输入你要搜索的漫画类型\n1.全选可回复“全选”\n2.采用默认设置可回复“默认”\n3.如需要特定词条请回复数字序号并用“,”分隔\n\n\
1.同人 2.漫画 3.美术CG\n4.游戏CG 5.欧美 6.无H\n7.图集 8.Coser 9.亚洲\n10.杂项");
                break;
            case 1:
                if (this.e.msg.includes("默认")) {
                    userParam.category = {};
                } else if (this.e.msg.includes("全选")) {
                    userParam.category = Object.fromEntries(Object.values(CATEGORY).map(key => [key, true]));
                } else {
                    userParam.category = Object.fromEntries(Object.values(CATEGORY).map(key => [key, false]));
                    const numbers = this.e.msg.trim().split(/[，,]/);
                    numbers.forEach(element => {
                        if (CATEGORY.hasOwnProperty(element)) {
                            userParam.category[CATEGORY[element]] = true;
                        }
                    });
                }
                userParam.step = 2;
                await redis.set(paramKey, JSON.stringify(userParam), { EX: SEARCH_TIMEOUT });
                await this.e.reply("请输入最低星级0-5\n1.如采用默认设置可回复“默认”");
                break;
            case 2:
                if (!this.e.msg.includes("默认")) {
                    const star = Number(this.e.msg);
                    if (!isNaN(star) && star <= 5 && star >= 0) {
                        userParam.f_srdd = Math.floor(star);
                    } else {
                        await this.e.reply("星级输入有误，请重新输入或回复“默认”");
                        return;
                    }
                } else {
                    userParam.f_srdd = 0;
                }
                userParam.step = 3;
                await redis.set(paramKey, JSON.stringify(userParam), { EX: SEARCH_TIMEOUT });
                await this.e.reply("是否使用里站\n1.是请回复“是”");
                break;
            case 3:
                userParam.isEx = this.e.msg === "是";
                userParam.step = -1;
                await redis.set(paramKey, JSON.stringify(userParam), { EX: SEARCH_TIMEOUT });
                break;
        }

        if (userParam.step === -1) {
            this.finish("getInfo", this.e.isGroup);
            await this.e.reply("正在为您搜索中");
            const exClient = new ExClient(userParam.isEx);
            const page = await exClient.requestPage(exClient.handleParam(userParam));
            if (page.comicList.length === 0) {
                await this.e.reply("未搜索到结果");
            } else {
                await redis.set(USER_SEARCH_PARAM_KEY + userId + ':page', JSON.stringify(page), { EX: 3600 });
                this.e.reply(Bot.makeForwardMsg(this.createPageMessage(page.comicList)));
            }
            await redis.del(paramKey);
        }
    }

    createPageMessage(comicList) {
        const message = [];
        comicList.forEach((comic, index) => {
            message.push({ message: `${index + 1}. 标题：${comic.title} 页数：${comic.pages}\n上传时间：${comic.posted}\n原始地址：${comic.link}` });
        });
        message.push({ message: "查看当前页指定内容:\n“exloli推送1”\n切换页:\n“exloli第一页”，\n“exloli上一页”，\n“exlolo下一页”，\n“exloli最后一页”" });
        return message;
    }
}