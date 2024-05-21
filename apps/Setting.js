import plugin from '../../../lib/plugins/plugin.js'
import _ from 'lodash'
import Config from '../components/Config.js';
import { CATEGORY } from '../components/Core.js';

export class Setting extends plugin {
    constructor() {
        super({
            /** 功能名称 */
            name: 'ExLOLI-推送开关',
            /** 功能描述 */
            dsc: 'ExLOLI 推送开关',
            event: 'message',
            /** 优先级，数字越小等级越高 */
            priority: 1009,
            rule: [
                {
                    /** 命令正则匹配 */
                    reg: '^#?exloli(开启|关闭)推送$',
                    /** 执行方法 */
                    fnc: 'setting',
                },
                {
                    /** 命令正则匹配 */
                    reg: '^#?exloli(开启|关闭)发送漫画$',
                    /** 执行方法 */
                    fnc: 'sendPic',
                },
                {
                    reg: '^#?exloli(开启|关闭)保存漫画$',
                    fnc: 'savePic',
                },
                {
                    reg: '^#?exloli设置(sk|id|hash|igneous)(.*)$',
                    fnc: 'setCookie',
                },
                {
                    reg: '^#?exloli查看推送标签$',
                    fnc: 'checkCategory',
                },
                {
                    reg: '^#?exloli(开启|关闭)推送标签(\\d)+$',
                    fnc: 'switchCategory',
                },
                {
                    reg: '^#?exloli设置推送关键词(.*)?$',
                    fnc: 'setKeywords',
                },
                {
                    reg: '^#?exloli设置最低星级(\\d)+$',
                    fnc: 'setLowestlevel',
                },
                {
                    reg: '^#?exloli设置最大页码(\\d)+$',
                    fnc: 'setMaximumPage',
                },
                {
                    reg: '^#?exloli设置(表|里)站',
                    fnc: 'setIsEx',
                },
                {
                    reg: '^#?exloli(开启|关闭)代理',
                    fnc: 'setProxy',
                },
                {
                    reg: '^#?exloli设置代理地址(.*)',
                    fnc: 'setProxyAdd',
                }
            ]
        })
    }

    async setting(e) {
        if (!e.isMaster) {
            e.reply('臭萝莉控滚开啊！变态！！');
            return true;
        }

        let config = Config.getConfig();

        const isGroupMessage = !!e.group_id;
        const list = isGroupMessage ? config.push_list.group : config.push_list.user;
        const id = isGroupMessage ? `${e.self_id}:${e.group_id}` : `${e.self_id}:${e.user_id}`;
        const isOpening = e.msg.includes('开启');

        const index = list.indexOf(id);
        const isAlready = index !== -1;

        if (isOpening) {
            if (isAlready) {
                await e.reply('推送已经开启了哦~');
            } else {
                list.push(id);
                Config.setConfig(config);
                await e.reply('推送已经开启了哦~');
            }
        } else {
            if (isAlready) {
                list.splice(index, 1);
                Config.setConfig(config);
                await e.reply('推送已经关闭了哦~');
            } else {
                await e.reply('推送已经关闭了哦~');
            }
        }
    }

    async sendPic(e) {
        if (!e.isMaster) {
            e.reply('臭萝莉控滚开啊！变态！！');
            return true;
        }
        const isOpening = e.msg.includes('开启');
        let config = Config.getConfig();
        if (isOpening) {
            config.push_pic = true
            await e.reply("已打开漫画推送，")
        } else {
            config.push_pic = false
            await e.reply("已关闭漫画推送")
        }
        Config.setConfig(config);
        return true
    }

    async savePic(e) {
        if (!e.isMaster) {
            e.reply('臭萝莉控滚开啊！变态！！')
            return true
        }
        const isOpening = e.msg.includes('开启')
        let config = Config.getConfig()
        if (isOpening) {
            config.local_save = true
            await e.reply("已打开保存漫画(记得及时清理哦)，保存路径为插件目录下resources/comics文件夹")
        } else {
            config.local_save = false
            await e.reply("已关闭保存漫画")
        }
        Config.setConfig(config)
        return true
    }

    async setCookie(e) {
        if (!e.isMaster) {
            e.reply('臭萝莉控滚开啊！变态！！')
            return true
        }
        const value = e.msg.replace(/^#?exloli设置(sk|id|hash|igneous)/, '').trim()
        let config = Config.getConfig()
        if (e.msg.includes("sk")) {
            config.ex_account.sk = value
            await e.reply("sk已保存")
        } else if (e.msg.includes("id")) {
            config.ex_account.ipb_member_id = value
            await e.reply("ipb_member_id已保存")
        } else if (e.msg.includes("hash")) {
            config.ex_account.ipb_pass_hash = value
            await e.reply("ipb_pass_hash已保存")
        } else {
            config.ex_account.igneous = value
            await e.reply("igneous已保存")
        }
        Config.setConfig(config)
        return true
    }

    async checkCategory(e) {
        if (!e.isMaster) {
            e.reply('臭萝莉控滚开啊！变态！！')
            return true;
        }
        let msg = ["=====Exloli-Plugin标签====="]
        let config = Config.getConfig()
        for (let key in CATEGORY) {
            msg.push(`${key}.${CATEGORY[key]}: ${config.category.includes(CATEGORY[key]) ? "开启" : "关闭"}`)
        }
        await e.reply(msg.join("\n"))
    }

    async switchCategory(e) {
        if (!e.isMaster) {
            e.reply('臭萝莉控滚开啊！变态！！')
            return true
        }
        const isOpening = e.msg.includes('开启') ? true : false
        const index = e.msg.replace(/^#?exloli(开启|关闭)推送标签/, '').trim()
        let config = Config.getConfig()
        if (CATEGORY.hasOwnProperty(index)) {
            let isAlready = config.category.indexOf(CATEGORY[index]) !== -1
            if (isOpening) {
                if (isAlready) {
                    await e.reply(`${CATEGORY[index]}已经开启了哦~`)
                } else {
                    config.category.push(CATEGORY[index])
                    Config.setConfig(config)
                    await e.reply(`${CATEGORY[index]}已经开启了哦~`)
                }
            } else {
                if (isAlready) {
                    config.category.splice(index, 1)
                    Config.setConfig(config)
                    await e.reply(`${CATEGORY[index]}已经关闭了哦~`)
                } else {
                    await e.reply(`${CATEGORY[index]}已经关闭了哦~`)
                }
            }
        } else {
            await e.reply("修改失败，请检查输入的序号，可发送 #exloli查看推送标签 获取当前标签以及序号")
        }
    }

    async setKeywords(e) {
        if (!e.isMaster) {
            e.reply('臭萝莉控滚开啊！变态！！')
            return true
        }
        let config = Config.getConfig()
        const keywordsStr = e.msg.replace(/^#?exloli设置推送关键词/, "")
        if (keywordsStr === '') {
            config.search_param = []
            await e.reply(`推送搜索关键词已清空`)
        } else {
            const keywords = keywordsStr.split(/[，,]/)
            config.search_param = keywords
            await e.reply(`推送搜索关键词已修改`)
        }
        Config.setConfig(config)
        return true
    }

    async setLowestlevel(e) {
        if (!e.isMaster) {
            e.reply('臭萝莉控滚开啊！变态！！')
            return true
        }
        let config = Config.getConfig()
        const level = e.msg.replace(/^#?exloli设置最低星级/, '').trim()
        if (!isNaN(level) && Number(level) <= 5 && Number(level) >= 0) {
            config.f_srdd = Math.floor(Number(level))
            await e.reply(`最低星级已修改为${level}`)
            Config.setConfig(config)
        } else {
            await e.reply(`修改失败，星级为0-5，请检查输入`)
        }
        return true
    }

    async setMaximumPage(e) {
        if (!e.isMaster) {
            e.reply('臭萝莉控滚开啊！变态！！')
            return true
        }
        let config = Config.getConfig()
        const pageNumber = e.msg.replace(/^#?exloli设置最大页码/, '').trim()
        if (!isNaN(pageNumber) && Number(pageNumber) > 0) {
            config.max_pages = Math.floor(Number(pageNumber))
            await e.reply(`最大页码已修改为${pageNumber}`)
            Config.setConfig(config)
        } else {
            await e.reply(`修改失败，请检查输入`)
        }
        return true
    }

    async setIsEx(e) {
        if (!e.isMaster) {
            e.reply('臭萝莉控滚开啊！变态！！')
            return true;
        }
        const isEx = e.msg.includes('里')
        let config = Config.getConfig()
        if (isEx) {
            config.isEx = true
            await e.reply("已切换至里站")
        } else {
            config.isEx = false
            await e.reply("已切换至表站")
        }
        Config.setConfig(config);
        return true
    }

    async setProxy(e) {
        if (!e.isMaster) {
            e.reply('臭萝莉控滚开啊！变态！！')
            return true;
        }
        const isOpening = e.msg.includes('开启')
        let config = Config.getConfig()
        if (isOpening) {
            config.proxy.enable = true
            await e.reply("已开启代理")
        } else {
            config.proxy.enable = false
            await e.reply("已关闭代理")
        }
        Config.setConfig(config);
        return true
    }

    async setProxyAdd(e) {
        if (!e.isMaster) {
            e.reply('臭萝莉控滚开啊！变态！！')
            return true;
        }
        let config = Config.getConfig()
        const checkAdd = /(((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)):(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[1-9][0-9]{1,3}|[0-9])/
        const address = e.msg.match(checkAdd)
        if (address) {
            config.proxy.host = address[1]
            config.proxy.port = address[5]
            await e.reply(`代理地址已修改为${address[1]}:${address[5]}`)
            Config.setConfig(config)
        } else {
            await e.reply("修改失败，请检查输入，例如: 127.0.0.1:7890")
        }
        return
    }
}