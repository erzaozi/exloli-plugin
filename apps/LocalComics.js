import fs from "fs"
import plugin from '../../../lib/plugins/plugin.js'
import puppeteer from "../../../lib/puppeteer/puppeteer.js"
import path from 'path'
import { _path } from "../model/path.js"
import { deleteComic } from "../utils/store.js"

const COMICS_PATH = `${_path}/plugins/exloli-plugin/resources/comics`

export class LocalComics extends plugin {
    constructor() {
        super({
            name: 'ExLOLI-本地漫画',
            dsc: 'ExLOLI 本地漫画',
            event: 'message',
            priority: 1009,
            rule: [{
                reg: '^#?exloli本地漫画(第[1-9][0-9]*页)?$',
                fnc: 'localComics'
            },
            {
                reg: '^#?exloli删除(全部)?本地漫画([1-9][0-9]*[,，]?)*$',
                fnc: 'deleteLocalComics'
            }]
        })
    }

    async localComics(e) {
        if (!fs.existsSync(COMICS_PATH)) return e.reply("本地还未存储任何漫画")
        const directories = fs.readdirSync(COMICS_PATH).filter((file) => {
            return fs.statSync(path.join(COMICS_PATH, file)).isDirectory()
        })
        if (directories.length === 0) return e.reply("本地还未存储任何漫画")
        const reg = e.msg.match(/第([1-9][0-9]*)页/)
        const page = reg ? Number(reg[1]) : 1
        const totalPage = Math.ceil(directories.length / 100)
        if (page <= totalPage) {
            const comicList = directories.map((dir) => {
                return {
                    list1: dir,
                    list2: `${COMICS_PATH}/${dir}/0.png`
                }
            })
            const index = page ? (page - 1) * 100 : 0
            const displayComicList = [comicList.slice(index, index + 100)]
            const base64 = await puppeteer.screenshot("exloli-plugin", {
                saveId: "exloliComics",
                tplFile: `${_path}/plugins/exloli-plugin/resources/listTemp/listTemp.html`,
                sidebar: `第${page}/${totalPage}页`,
                _path,
                imgType: "png",
                header: 'Exloli-Plugin本地漫画',
                seqNumber: index,
                column: displayComicList,
                list1: "标题",
                list2: "封面",
                notice: '使用#exloli本地漫画第x页来查看对应页\n使用#exloli删除本地漫画1,2,3清理本地漫画\n使用#exloli删除全部本地漫画清理全部本地漫画',
            });
            e.reply(base64);
        } else {
            e.reply('请检查页面范围');
        }
        return true;
    }
    async deleteLocalComics(e) {
        if (!fs.existsSync(COMICS_PATH)) return e.reply("本地还未存储任何漫画")
        const directories = fs.readdirSync(COMICS_PATH).filter((file) => {
            return fs.statSync(path.join(COMICS_PATH, file)).isDirectory()
        })
        if (directories.length === 0) return e.reply("本地还未存储任何漫画")
        if (e.msg.includes("全部")) {
            const comicList = directories.map(dir => ({ dirName: dir }))
            comicList.map(comic => deleteComic(comic))
            await e.reply("已清空所有本地漫画")
            return true
        }
        let comics = e.msg.match(/本地漫画(([1-9][0-9]*[,，]?)*)/)?.[1]
        if (comics) {
            const comics2DelIndex = comics.split(/[,，]/).filter(ele => !!ele && !isNaN(ele)).map(ele => Number(ele)).filter(index => index <= directories.length)
            const comicList = comics2DelIndex.map(index => ({ dirName: directories[index - 1] }))
            comicList.map(comic => deleteComic(comic))
            await e.reply(`已清空漫画${comics2DelIndex.join(",")}`)
            return true
        }
    }
}
