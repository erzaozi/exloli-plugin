import fs from 'fs';
import path from 'path';
import Config from '../components/Config.js';
import Plugin from '../../../lib/plugins/plugin.js';
import puppeteer from "../../../lib/puppeteer/puppeteer.js";
import { pluginRoot } from '../model/path.js';
import { _path } from '../model/path.js';

export class ComicList extends Plugin {
    constructor() {
        super({
            name: 'ExLOLI-全部本子',
            dsc: 'ExLOLI 全部本子',
            event: 'message',
            priority: 1009,
            rule: [{
                reg: '^#?exloli(本子)?列表(第[1-9][0-9]*页)?$',
                fnc: 'getComicList'
            }]
        });
    }

    async getComicList(e) {
        const comicsPath = `${pluginRoot}/exlolicomic`
        if (fs.existsSync(comicsPath) && fs.existsSync(path.join(comicsPath, 'db.lolicon.yaml'))) {
            const comicList = parseComic(Config.getComicList())
            const reg = e.msg.match(/第([1-9][0-9]*)页/)
            const page = reg ? Number(reg[1]) : 1
            const pageTotal = Math.ceil(comicList.length / 100)
            if (!page || page <= pageTotal) {
                const index = page ? (page - 1) * 100 : 0
                const displayComicList = [comicList.slice(index, index + 100)]
                const base64 = await puppeteer.screenshot("exloli-plugin", {
                    saveId: "exloliComics",
                    tplFile: `${_path}/plugins/exloli-plugin/resources/listTemp/listTemp.html`,
                    sidebar: `第${page}/${pageTotal}页`,
                    _path,
                    imgType: "png",
                    header: 'exloli',
                    seqNumber: index,
                    column: displayComicList,
                    list1: "标题",
                    notice:
                        '使用#exloli本子列表第x页来查看对应页，使用#exlolix推送指定序号本子',
                });
                e.reply(base64);
            } else {
                e.reply('请检查页面范围');
            }
            return true;
        }
    }
}

function parseComic(comiclist) {
    return comiclist.map(comic => {
        return {
            list1: comic.title
        }
    })
}