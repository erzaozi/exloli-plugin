import plugin from '../../../lib/plugins/plugin.js'
import _ from 'lodash'
import { pluginRoot } from '../model/path.js'
import fs from 'fs'
import Config from '../components/Config.js';

export class Setting extends plugin {
    constructor() {
        super({
            /** 功能名称 */
            name: 'EXLOLI-推送开关',
            /** 功能描述 */
            dsc: 'EXLOLI 推送开关',
            event: 'message',
            /** 优先级，数字越小等级越高 */
            priority: 1009,
            rule: [
                {
                    /** 命令正则匹配 */
                    reg: '^#?exloli(开启|关闭)推送$',
                    /** 执行方法 */
                    fnc: 'setting',
                }
            ]
        })
    }

    async setting(e) {
        let config = Config.getConfig();
    
        const isGroupMessage = !!e.group_id;
        const list = isGroupMessage ? config.push_list.group : config.push_list.user;
        const id = isGroupMessage ? e.group_id : e.user_id;
        const isOpening = e.msg.includes('开启');

        // 判断是否克隆了数据库
        if (isOpening) {
            const exlolicomic_path = `${pluginRoot}/exlolicomic`
            if (!fs.existsSync(exlolicomic_path)) {
                await e.reply('检测到没有克隆数据库，请使用 #exloli克隆 命令克隆数据库再使用推送功能哦~');
                return true;
            }
        }
    
        if (isGroupMessage && e.sender.role !== 'owner' && e.sender.role !== 'admin') {
            await e.reply('只有管理员才可以开启推送哦~');
            return true;
        }
    
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
    
}