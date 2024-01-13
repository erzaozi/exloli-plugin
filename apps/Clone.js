import Plugin from '../../../lib/plugins/plugin.js';
import Log from '../utils/logs.js';
import { pluginRoot } from '../model/path.js';
import simpleGit from 'simple-git';
import fs from 'fs';

const GITHUB_TOKEN = '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';
const GITHUB_USERNAME = 'erzaozi';
const REPOSITORY_URL = 'https://github.com/erzaozi/exlolicomic.git';

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
      await e.reply('数据库已存在，插件已经准备好推送啦');
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
    await e.reply('正在尝试克隆数据库，请稍后');
    const git = simpleGit();
    try {
      const cloneUrl = REPOSITORY_URL.replace('https://', `https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@`);
      await git.clone(cloneUrl, repositoryPath);
    } catch (err) {
      Log.e(err);
      await e.reply('克隆失败，请检查网络或更新插件');
    }
  }
}
