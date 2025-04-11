import fs from "fs";
import plugin from '../../../lib/plugins/plugin.js';
import puppeteer from "../../../lib/puppeteer/puppeteer.js";
import path from 'path';
import { _path } from "../model/path.js";
import { deleteComic } from "../utils/store.js";

const COMICS_PATH = path.join(_path, 'plugins', 'exloli-plugin', 'resources', 'comics');
const LIST_TEMP_PATH = path.join(_path, 'plugins', 'exloli-plugin', 'resources', 'listTemp', 'listTemp.html');

export class LocalComics extends plugin {
    constructor() {
        super({
            name: 'ExLoli-本地漫画',
            dsc: 'ExLoli 本地漫画',
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
        });
    }

    async localComics(e) {
        try {
            if (!fs.existsSync(COMICS_PATH)) return e.reply("本地还未存储任何漫画");
            const directories = fs.readdirSync(COMICS_PATH).filter((file) => {
                return fs.statSync(path.join(COMICS_PATH, file)).isDirectory();
            });
            if (directories.length === 0) return e.reply("本地还未存储任何漫画");

            const reg = e.msg.match(/第([1-9][0-9]*)页/);
            const page = reg ? Number(reg[1]) : 1;
            const totalPage = Math.ceil(directories.length / 100);

            if (page <= totalPage) {
                const startIndex = (page - 1) * 100;
                const endIndex = Math.min(startIndex + 100, directories.length);
                const currentPageDirectories = directories.slice(startIndex, endIndex);

                const comicList = currentPageDirectories.map((dir) => ({
                    list1: dir,
                    list2: path.join(COMICS_PATH, dir, 'cover.webp')
                }));

                const base64 = await puppeteer.screenshot("exloli-plugin", {
                    saveId: "exloliComics",
                    tplFile: LIST_TEMP_PATH,
                    sidebar: `第${page}/${totalPage}页`,
                    _path,
                    imgType: "png",
                    header: 'Exloli-Plugin本地漫画',
                    seqNumber: startIndex,
                    column: [comicList],
                    list1: "标题",
                    list2: "封面",
                    notice: '使用#exloli本地漫画第x页来查看对应页\n使用#exloli删除本地漫画1,2,3清理本地漫画\n使用#exloli删除全部本地漫画清理全部本地漫画',
                });
                e.reply(base64);
            } else {
                e.reply('请检查页面范围');
            }
            return true;
        } catch (error) {
            logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`获取本地漫画列表失败`), logger.red(error));
            e.reply('获取本地漫画列表失败，请检查后台日志');
            return true;
        }
    }

    async deleteLocalComics(e) {
        try {
            if (!fs.existsSync(COMICS_PATH)) return e.reply("本地还未存储任何漫画");
            const directories = fs.readdirSync(COMICS_PATH).filter((file) => {
                return fs.statSync(path.join(COMICS_PATH, file)).isDirectory();
            });
            if (directories.length === 0) return e.reply("本地还未存储任何漫画");

            if (e.msg.includes("全部")) {
                const deletedComics = [];
                for (const dir of directories) {
                    const comic = { id: dir };
                    try {
                        deleteComic(comic);
                        deletedComics.push(dir);
                    } catch (error) {
                        logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`删除本地漫画 ${dir} 失败`), logger.red(error));
                    }
                }
                await e.reply(`已尝试清空所有本地漫画，成功删除 ${deletedComics.length} 本`);
                return true;
            }

            const comicsToDeleteMatch = e.msg.match(/本地漫画(([1-9][0-9]*[,，]?)*)/)?.[1];
            if (comicsToDeleteMatch) {
                const indicesToDelete = comicsToDeleteMatch.split(/[,，]/)
                    .filter(ele => !!ele && !isNaN(ele))
                    .map(ele => Number(ele))
                    .filter(index => index >= 1 && index <= directories.length);

                const deletedComics = [];
                const failedToDelete = [];

                for (const index of indicesToDelete) {
                    const dirName = directories[index - 1];
                    const comic = { id: dirName };
                    try {
                        deleteComic(comic);
                        deletedComics.push(index);
                    } catch (error) {
                        logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`删除本地漫画 ${dirName} 失败`), logger.red(error));
                        failedToDelete.push(index);
                    }
                }

                const successMessage = deletedComics.length > 0 ? `已清空漫画 ${deletedComics.join(",")}` : '';
                const failMessage = failedToDelete.length > 0 ? `，删除漫画 ${failedToDelete.join(",")} 失败` : '';

                if (successMessage || failMessage) {
                    await e.reply(successMessage + failMessage);
                } else {
                    await e.reply("没有找到要删除的本地漫画");
                }
                return true;
            }
            return false;
        } catch (error) {
            logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`删除本地漫画失败`), logger.red(error));
            e.reply('删除本地漫画失败，请检查后台日志');
            return true;
        }
    }
}