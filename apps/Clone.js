import plugin from '../../../lib/plugins/plugin.js'
import _ from 'lodash'
import Log from '../utils/logs.js'
import { pluginRoot } from '../model/path.js'
import simpleGit from 'simple-git'
import fs from 'fs'

const accessToken = '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';
const username = 'erzaozi';
const repositoryUrl = 'https://github.com/erzaozi/exlolicomic.git';


export class Clone extends plugin {
  constructor() {
    super({
      /** 功能名称 */
      name: 'EXLOLI-克隆数据库',
      /** 功能描述 */
      dsc: 'EXLOLI 克隆数据库',
      event: 'message',
      /** 优先级，数字越小等级越高 */
      priority: 1009,
      rule: [
        {
          /** 命令正则匹配 */
          reg: '^#?exloli克隆$',
          /** 执行方法 */
          fnc: 'clone'
        }
      ]
    })
  }

    async clone(e) {
        // 判断是否为管理员
        if (!e.isMaster) return false
        // 判断是否克隆了数据库
        const exlolicomic_path = `${pluginRoot}/exlolicomic`
        if (!fs.existsSync(exlolicomic_path)) {
            await e.reply('正在尝试克隆数据库，请稍后')
            const git = simpleGit()
            try {
                await git.clone(repositoryUrl.replace('https://', `https://${username}:${accessToken}@`), exlolicomic_path)
            } catch (err) {
                Log.e(err)
                await e.reply('克隆失败，请检查网络或更新插件')
            }
        } else {
            await e.reply('数据库已存在，插件已经准备好推送啦')
        }
        return true
    }
}