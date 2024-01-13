import Plugin from '../../../lib/plugins/plugin.js';
import Log from '../utils/logs.js';
import Config from '../components/Config.js';
import { pluginRoot } from '../model/path.js';
import simpleGit from 'simple-git';
import fs from 'fs';

export class Clone extends Plugin {
  constructor() {
    super({
      name: 'EXLOLI-克隆数据库',
      dsc: 'EXLOLI 克隆数据库',
      event: 'message',
      priority: 1009,
      rule: [{
        reg: '^#?exloli克隆$',
        fnc: 'clone'
      }]
    });
  }

  async clone(e) {
    if (!this.isAdministrator(e)) {
      return false;
    }

    const repositoryPath = `${pluginRoot}/exlolicomic`;
    if (this.isRepositoryCloned(repositoryPath)) {
      await e.reply('数据库已存在，插件已经准备好推送啦！sensei准备好了吗？');
    } else {
      await this.cloneRepository(e, repositoryPath);
    }

    return true;
  }

  isAdministrator(e) {
    return e.isMaster;
  }

  isRepositoryCloned(repositoryPath) {
    return fs.existsSync(repositoryPath);
  }

  async cloneRepository(e, repositoryPath) {
    await e.reply('正在尝试克隆数据库，变态sensei别着急~');
    const git = simpleGit();
    try {
      const GITHUB_TOKEN = Config.getConfig().lolicon_token
      const GITHUB_USERNAME = 'erzaozi';
      await git.clone(`https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@mirror.ghproxy.com/https://github.com/erzaozi/exlolicomic.git`, repositoryPath);
      await e.reply('克隆成功，插件已经准备好推送啦！sensei注意身体哦！');
    } catch (err) {
      Log.e(err);
      await e.reply('克隆失败，肯定不是插件的问题！请检查网络或更新插件再试试吧~');
    }
  }
}
